// Hybrid post search: caption/hashtag/tag matching + semantic vector search,
// merged with Reciprocal Rank Fusion. Also hosts the username search so the
// controller can answer posts + users in one request.
//
// Vector search uses MongoDB Atlas $vectorSearch. If that stage isn't
// available (self-hosted/local Mongo, index missing), it falls back to
// in-app cosine similarity over the most recent indexed posts so search
// keeps working, just less efficiently.
//
// Relevance: vector results are filtered twice (absolute floor + distance
// from the best match) so unrelated posts never show up just because they
// happen to be the "nearest" ones. Short queries (1-2 words) are a weak
// signal for embeddings, so they get a stricter floor AND an exact keyword
// match against the AI description/tags.

import mongoose from "mongoose";
import postModel from "../models/post.model.js";
import userModel from "../models/user.model.js";
import { embedText, isAIConfigured } from "../config/gemini.js";
import {
  SEMANTIC_INDEX_NAME,
  SEMANTIC_MIN_SCORE,
  SEMANTIC_RELATIVE_MARGIN,
  SEMANTIC_DEBUG,
  SEMANTIC_NUM_CANDIDATES,
  SEMANTIC_RESULT_LIMIT,
  SEMANTIC_FALLBACK_SCAN_LIMIT,
  MIN_SEMANTIC_QUERY_LENGTH,
  MAX_SEMANTIC_QUERY_LENGTH,
  QUERY_EMBEDDING_CACHE_SIZE,
  QUERY_EMBEDDING_CACHE_TTL_MS,
} from "../constants/ai.js";

// Queries with this many words or fewer count as "short".
const SHORT_QUERY_MAX_WORDS = 2;

// Extra similarity required for short queries (added on top of
// SEMANTIC_MIN_SCORE). Override with SEMANTIC_SHORT_QUERY_EXTRA.
const parsedExtra = parseFloat(process.env.SEMANTIC_SHORT_QUERY_EXTRA);
const SHORT_QUERY_EXTRA_FLOOR = Number.isNaN(parsedExtra) ? 0.05 : parsedExtra;

const toObjectId = (id) => new mongoose.Types.ObjectId(String(id));

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const normalizeQuery = (query) =>
  String(query || "").trim().replace(/\s+/g, " ").slice(0, MAX_SEMANTIC_QUERY_LENGTH);

const queryWords = (query) =>
  query
    .toLowerCase()
    .replace(/^[#@]/, "")
    .split(" ")
    .filter(Boolean);

const isShortQuery = (query) => queryWords(query).length <= SHORT_QUERY_MAX_WORDS;

// ---------------------------------------------------------------------------
// Query embedding cache (a repeated search costs zero AI calls)
// ---------------------------------------------------------------------------

const queryCache = new Map(); // key -> { values, expires }

const getQueryEmbedding = async (query) => {
  const key = query.toLowerCase();
  const hit = queryCache.get(key);

  if (hit && hit.expires > Date.now()) return hit.values;

  const { values } = await embedText({ text: query, taskType: "RETRIEVAL_QUERY" });

  if (queryCache.size >= QUERY_EMBEDDING_CACHE_SIZE) {
    queryCache.delete(queryCache.keys().next().value); // evict oldest
  }
  queryCache.set(key, { values, expires: Date.now() + QUERY_EMBEDDING_CACHE_TTL_MS });

  return values;
};

// ---------------------------------------------------------------------------
// Result shaping (same shape as getFeedPosts so the frontend can reuse its
// post card).
//
// Visibility: the app has no private accounts or blocking, and getFeedPosts
// shows every post to every signed-in user, so search applies the same rule
// (the route is behind authUser). If you add private accounts later, put the
// extra $match right after the $unwind below.
// ---------------------------------------------------------------------------

const resultStages = () => [
  { $lookup: { from: "users", localField: "author", foreignField: "_id", as: "author" } },
  { $unwind: "$author" },
  { $lookup: { from: "users", localField: "taggedUsers", foreignField: "_id", as: "taggedUsers" } },
  {
    $project: {
      caption: 1,
      media: 1,
      aspectRatio: 1,
      likes: 1,
      commentsCount: 1,
      createdAt: 1,
      location: 1,
      score: 1,
      "author._id": 1,
      "author.username": 1,
      "author.profilePic": 1,
      "author.role": 1,
      "taggedUsers._id": 1,
      "taggedUsers.username": 1,
      "taggedUsers.profilePic": 1,
    },
  },
];

// ---------------------------------------------------------------------------
// Lexical search (caption / hashtag / AI tag / AI description keywords)
// ---------------------------------------------------------------------------

const buildLexicalMatch = (query) => {
  const captionRegex = new RegExp(escapeRegex(query), "i");
  const tag = query.replace(/^#/, "").toLowerCase();

  const branches = [{ caption: captionRegex }, { "ai.tags": tag }];

  // Short queries ("green", "red car", "garden"): every word must appear as a
  // whole word in the AI description, or be one of the AI tags. This is exact,
  // so a photo with no green in it can never match "green".
  if (isShortQuery(query)) {
    const words = queryWords(query).filter((w) => w.length >= 3);

    if (words.length > 0) {
      branches.push({
        $and: words.map((word) => ({
          $or: [
            { "ai.description": new RegExp(`\\b${escapeRegex(word)}\\b`, "i") },
            { "ai.tags": word },
          ],
        })),
      });
    }
  }

  return { $or: branches };
};

const lexicalSearch = async (query, limit) =>
  postModel.aggregate([
    { $match: buildLexicalMatch(query) },
    { $sort: { createdAt: -1, _id: -1 } },
    { $limit: limit * 2 },
    ...resultStages(),
    { $sort: { createdAt: -1, _id: -1 } },
  ]);

// ---------------------------------------------------------------------------
// Vector search
// ---------------------------------------------------------------------------

const atlasVectorSearch = (queryVector, limit, floor) =>
  postModel.aggregate([
    {
      $vectorSearch: {
        index: SEMANTIC_INDEX_NAME,
        path: "ai.embedding",
        queryVector,
        numCandidates: SEMANTIC_NUM_CANDIDATES,
        limit: Math.min(limit * 3, 100),
        filter: { "ai.status": "done" },
      },
    },
    { $addFields: { score: { $meta: "vectorSearchScore" } } },
    { $match: { score: { $gte: floor } } },
    ...resultStages(),
    { $sort: { score: -1 } },
  ]);

const bruteForceVectorSearch = async (queryVector, limit, floor) => {
  const rows = await postModel.aggregate([
    { $match: { "ai.status": "done" } },
    { $sort: { createdAt: -1 } },
    { $limit: SEMANTIC_FALLBACK_SCAN_LIMIT },
    { $project: { embedding: "$ai.embedding" } },
  ]);

  const scored = [];
  for (const row of rows) {
    const vector = row.embedding;
    if (!Array.isArray(vector) || vector.length !== queryVector.length) continue;

    let dot = 0;
    for (let i = 0; i < vector.length; i++) dot += vector[i] * queryVector[i];

    const score = (1 + dot) / 2; // same 0..1 scale as Atlas cosine scores
    if (score >= floor) scored.push({ _id: row._id, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, Math.min(limit * 3, 100));
  if (top.length === 0) return [];

  const scoreById = new Map(top.map((s) => [String(s._id), s.score]));

  const docs = await postModel.aggregate([
    { $match: { _id: { $in: top.map((s) => s._id) } } },
    ...resultStages(),
  ]);

  return docs
    .map((doc) => ({ ...doc, score: scoreById.get(String(doc._id)) }))
    .sort((a, b) => b.score - a.score);
};

/**
 * Keeps only genuinely relevant hits. `items` must be sorted best-first.
 * A result survives if it clears the absolute floor AND is within
 * SEMANTIC_RELATIVE_MARGIN of the best match.
 */
const applyRelevanceCutoff = (query, items, floor) => {
  if (SEMANTIC_DEBUG) {
    const preview = items
      .slice(0, 10)
      .map((p) => `${p.score?.toFixed(3)} "${(p.caption || "").slice(0, 30)}" (${p._id})`);
    console.log(
      `[search:debug] "${query}" floor=${floor.toFixed(3)} -> ${items.length} candidates above floor`,
      preview
    );
  }

  if (items.length === 0) return items;

  const best = items[0].score;
  const cutoff = Math.max(floor, best - SEMANTIC_RELATIVE_MARGIN);

  const kept = items.filter((item) => item.score >= cutoff);

  if (SEMANTIC_DEBUG) {
    console.log(
      `[search:debug] best=${best.toFixed(3)} cutoff=${cutoff.toFixed(3)} kept=${kept.length}/${items.length}`
    );
  }

  return kept;
};

let warnedAboutFallback = false;

const semanticSearch = async (query, limit) => {
  // One-word / two-word queries are a weak signal for embeddings, so demand more.
  const floor = SEMANTIC_MIN_SCORE + (isShortQuery(query) ? SHORT_QUERY_EXTRA_FLOOR : 0);

  try {
    const queryVector = await getQueryEmbedding(query);

    try {
      const raw = await atlasVectorSearch(queryVector, limit, floor);
      return { items: applyRelevanceCutoff(query, raw, floor), used: true };
    } catch (error) {
      if (!warnedAboutFallback) {
        warnedAboutFallback = true;
        console.warn(
          "[search] $vectorSearch unavailable, using in-app similarity fallback:",
          error.message
        );
      }
      const raw = await bruteForceVectorSearch(queryVector, limit, floor);
      return { items: applyRelevanceCutoff(query, raw, floor), used: true };
    }
  } catch (error) {
    // Embedding/AI failure must never break search — degrade to lexical only.
    console.error("[search] semantic search skipped:", error.message);
    return { items: [], used: false };
  }
};

// ---------------------------------------------------------------------------
// Reciprocal Rank Fusion
// ---------------------------------------------------------------------------

const RRF_K = 60;

const fuse = (lists, limit) => {
  const merged = new Map();

  for (const { source, items } of lists) {
    items.forEach((post, rank) => {
      const id = String(post._id);
      const entry = merged.get(id) || { post, rrf: 0, sources: new Set() };
      entry.rrf += 1 / (RRF_K + rank + 1);
      entry.sources.add(source);
      merged.set(id, entry);
    });
  }

  return [...merged.values()].sort((a, b) => b.rrf - a.rrf).slice(0, limit);
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * @param {Object} params
 * @param {string} params.query
 * @param {string|ObjectId} params.userId  the signed-in viewer
 * @param {number} [params.limit]
 * @returns {Promise<{ posts: Array, semanticUsed: boolean }>}
 */
export const hybridSearchPosts = async ({ query, userId, limit = 20 }) => {
  const q = normalizeQuery(query);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), SEMANTIC_RESULT_LIMIT);

  // "#tag" / "@name" style queries are exact-match intents: skip the AI call.
  const wantsSemantic =
    isAIConfigured() && q.length >= MIN_SEMANTIC_QUERY_LENGTH && !/^[#@]\S*$/.test(q);

  const [lexicalItems, semantic] = await Promise.all([
    lexicalSearch(q, safeLimit),
    wantsSemantic ? semanticSearch(q, safeLimit) : { items: [], used: false },
  ]);

  const fused = fuse(
    [
      { source: "text", items: lexicalItems },
      { source: "semantic", items: semantic.items },
    ],
    safeLimit
  );

  const viewer = await userModel.findById(toObjectId(userId)).select("savedPosts").lean();
  const saved = new Set((viewer?.savedPosts || []).map(String));

  const posts = fused.map(({ post, sources }) => {
    const { score, ...rest } = post;
    return { ...rest, isSaved: saved.has(String(post._id)), matchedBy: [...sources] };
  });

  return { posts, semanticUsed: semantic.used };
};

/** Username / full-name search (same matching the app already uses for tagging). */
export const searchUsersByName = async ({ query, limit = 10 }) => {
  const q = normalizeQuery(query).replace(/^@/, "");
  if (q.length < 2) return [];

  const regex = new RegExp(escapeRegex(q), "i");

  return userModel
    .find({
      username: { $exists: true, $ne: "" },
      $or: [{ username: regex }, { fullname: regex }],
    })
    .select("username fullname profilePic")
    .limit(limit)
    .lean();
};