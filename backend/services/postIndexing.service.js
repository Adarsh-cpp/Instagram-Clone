// Background indexing of posts for semantic search.
//
// Flow for one post:
//   claim (atomic) -> build frame URLs -> download frames -> ONE vision call
//   -> build search document -> embed -> write back (only if still claimed)
//
// Safety properties:
//  - Post creation never waits on this and never fails because of it.
//  - A post is claimed with an atomic findOneAndUpdate, so two server
//    instances (or a retry racing the sweeper) can't process it twice.
//  - Deleted posts: the final write is an updateOne filtered by _id +
//    status "processing", so a vanished post just matches nothing.
//  - Crashes/restarts: a "processing" post whose lock is stale is picked up
//    again by the sweeper.
//  - Free-tier friendly: concurrency 1, a gap between jobs, a global pause
//    on 429, and a slow drip for legacy posts.

import axios from "axios";
import postModel from "../models/post.model.js";
import { callGemini, embedText, AIError, isAIConfigured } from "../config/gemini.js";
import {
  POST_ANALYSIS_MODEL,
  POST_ANALYSIS_SYSTEM_PROMPT,
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_AI_FRAMES_PER_POST,
  VIDEO_FRAME_OFFSETS,
  AI_IMAGE_MAX_WIDTH,
  AI_INDEX_MAX_ATTEMPTS,
  AI_INDEX_CONCURRENCY,
  AI_INDEX_MIN_GAP_MS,
  AI_INDEX_RETRY_DELAY_MS,
  AI_INDEX_STALE_LOCK_MS,
  AI_INDEX_RATE_LIMIT_COOLDOWN_MS,
  AI_INDEX_SWEEP_INTERVAL_MS,
  AI_INDEX_BATCH_PER_SWEEP,
  MAX_ANALYSIS_DESCRIPTION_LENGTH,
  MAX_ANALYSIS_LIST_ITEMS,
  MAX_ANALYSIS_TAGS,
} from "../constants/ai.js";

// ---------------------------------------------------------------------------
// Frame URLs (Cloudinary does the resizing / frame extraction for us)
// ---------------------------------------------------------------------------

const CLOUDINARY_HOST = "res.cloudinary.com";

const isCloudinaryUrl = (urlString) => {
  try {
    const { hostname, protocol } = new URL(urlString);
    return (
      protocol === "https:" &&
      (hostname === CLOUDINARY_HOST || hostname.endsWith(`.${CLOUDINARY_HOST}`))
    );
  } catch {
    return false;
  }
};

// Inserts a transformation right after "/upload/".
const withTransformation = (url, transformation) => {
  const marker = "/upload/";
  const index = url.indexOf(marker);
  if (index === -1) return url;
  const head = url.slice(0, index + marker.length);
  return `${head}${transformation}/${url.slice(index + marker.length)}`;
};

// Cloudinary's URL extension decides the delivered format, so force .jpg
// to guarantee a type Gemini accepts (png/webp/heic originals included).
const toJpg = (url) => url.replace(/\.[a-z0-9]+(\?.*)?$/i, ".jpg");

const imageFrameUrl = (url) =>
  toJpg(withTransformation(url, `c_limit,w_${AI_IMAGE_MAX_WIDTH},q_auto,f_jpg`));

// Cloudinary can render a still from a video at a percentage of its duration.
const videoFrameUrl = (url, offset) =>
  toJpg(withTransformation(url, `so_${offset},c_limit,w_${AI_IMAGE_MAX_WIDTH},q_auto,f_jpg`));

const sampleEvenly = (items, max) => {
  if (items.length <= max) return items;
  const picked = [];
  for (let i = 0; i < max; i++) {
    picked.push(items[Math.round((i * (items.length - 1)) / (max - 1))]);
  }
  return picked;
};

export const buildFrameUrls = (media = []) => {
  const videoOnly = media.length === 1 && media[0]?.mediaType === "video";
  const frames = [];

  for (const item of media) {
    if (!item?.url) continue;

    if (item.mediaType === "video") {
      const offsets = videoOnly ? VIDEO_FRAME_OFFSETS : ["50p"];
      offsets.forEach((offset) => frames.push(videoFrameUrl(item.url, offset)));
    } else {
      frames.push(imageFrameUrl(item.url));
    }
  }

  return sampleEvenly(frames, MAX_AI_FRAMES_PER_POST);
};

const fetchFrame = async (url) => {
  if (!isCloudinaryUrl(url)) {
    throw new AIError("The media could not be verified.", 400, "AI_BAD_IMAGE_SOURCE");
  }

  const response = await axios.get(url, {
    responseType: "arraybuffer",
    timeout: 15000,
    maxContentLength: MAX_IMAGE_BYTES,
    maxBodyLength: MAX_IMAGE_BYTES,
    validateStatus: (status) => status === 200,
  });

  const mimeType = response.headers?.["content-type"]?.split(";")[0]?.trim();
  if (!mimeType || !ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    throw new AIError("Unsupported image type for AI analysis.", 415, "AI_UNSUPPORTED_IMAGE_TYPE");
  }

  const buffer = Buffer.from(response.data);
  if (!buffer.length) throw new AIError("Empty image.", 400, "AI_EMPTY_IMAGE");

  return { mimeType, data: buffer.toString("base64") };
};

// ---------------------------------------------------------------------------
// Vision analysis + embedding document
// ---------------------------------------------------------------------------

const toList = (value, maxItems = MAX_ANALYSIS_LIST_ITEMS, maxLength = 60) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const item of value) {
    if (typeof item !== "string") continue;
    const cleaned = item.trim().toLowerCase().slice(0, maxLength);
    if (!cleaned || seen.has(cleaned)) continue;
    seen.add(cleaned);
    out.push(cleaned);
    if (out.length >= maxItems) break;
  }
  return out;
};

const parseAnalysis = (raw) => {
  const text = (raw || "")
    .trim()
    .replace(/^```[a-z]*\s*/i, "")
    .replace(/```$/, "")
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    try {
      parsed = match ? JSON.parse(match[0]) : null;
    } catch {
      parsed = null;
    }
  }

  if (!parsed || typeof parsed !== "object" || typeof parsed.description !== "string") {
    throw new AIError("The AI returned an unreadable analysis.", 502, "AI_BAD_OUTPUT");
  }

  const description = parsed.description.trim().slice(0, MAX_ANALYSIS_DESCRIPTION_LENGTH);
  if (!description) throw new AIError("The AI returned an empty analysis.", 502, "AI_EMPTY");

  return {
    description,
    attributes: {
      objects: toList(parsed.objects),
      people: toList(parsed.people),
      clothing: toList(parsed.clothing),
      activities: toList(parsed.activities),
      colors: toList(parsed.colors),
      setting: toList(parsed.setting),
      text: toList(parsed.text, 6, 80),
    },
    tags: toList(parsed.tags, MAX_ANALYSIS_TAGS, 40),
  };
};

const analyzeFrames = async (frames) => {
  const contents = [
    {
      role: "user",
      parts: [
        ...frames.map((frame) => ({ inlineData: { mimeType: frame.mimeType, data: frame.data } })),
        {
          text:
            frames.length > 1
              ? "These images are from a single post. Produce the JSON search metadata for the post as a whole."
              : "Produce the JSON search metadata for this image.",
        },
      ],
    },
  ];

  const { text, model } = await callGemini({
    contents,
    systemInstruction: POST_ANALYSIS_SYSTEM_PROMPT,
    model: POST_ANALYSIS_MODEL,
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 1500,
      responseMimeType: "application/json",
    },
  });

  return { ...parseAnalysis(text), model };
};

const line = (label, values) =>
  Array.isArray(values) && values.length ? `${label}: ${values.join(", ")}` : null;

/** The single string that gets embedded. Used for indexing and caption refreshes. */
export const buildEmbeddingDocument = ({ description, attributes = {}, tags = [], caption, locationName }) =>
  [
    description ? `Description: ${description}` : null,
    line("Objects", attributes.objects),
    line("People", attributes.people),
    line("Clothing", attributes.clothing),
    line("Activities", attributes.activities),
    line("Colors", attributes.colors),
    line("Setting", attributes.setting),
    line("Text in image", attributes.text),
    line("Tags", tags),
    caption?.trim() ? `Caption: ${caption.trim()}` : null,
    locationName?.trim() ? `Location: ${locationName.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 6000);

// ---------------------------------------------------------------------------
// Claiming + state transitions
// ---------------------------------------------------------------------------

const eligibleFilter = (now) => ({
  $and: [
    {
      $or: [
        { "ai.status": "pending" },
        { "ai.status": "failed", "ai.attempts": { $lt: AI_INDEX_MAX_ATTEMPTS } },
        {
          "ai.status": "processing",
          "ai.lockedAt": { $lt: new Date(now.getTime() - AI_INDEX_STALE_LOCK_MS) },
          "ai.attempts": { $lt: AI_INDEX_MAX_ATTEMPTS },
        },
      ],
    },
    { $or: [{ "ai.nextAttemptAt": null }, { "ai.nextAttemptAt": { $lte: now } }] },
  ],
});

const claimPost = async (postId, force) => {
  const now = new Date();

  const filter = force
    ? { _id: postId, "ai.status": { $ne: "processing" } }
    : { _id: postId, ...eligibleFilter(now) };

  const update = force
    ? { $set: { "ai.status": "processing", "ai.lockedAt": now, "ai.attempts": 1 } }
    : { $set: { "ai.status": "processing", "ai.lockedAt": now }, $inc: { "ai.attempts": 1 } };

  return postModel
    .findOneAndUpdate(filter, update, { new: true, timestamps: false })
    .select("+ai")
    .lean();
};

const failPost = async (post, error) => {
  const code = error instanceof AIError ? error.code : "AI_UNEXPECTED";
  const message = (error?.message || "unknown error").slice(0, 200);
  const now = Date.now();

  const set = { "ai.lastError": `${code}: ${message}`, "ai.lockedAt": null };
  let inc = null;

  if (code === "AI_BLOCKED") {
    // Safety filter: retrying won't help.
    set["ai.status"] = "skipped";
    set["ai.nextAttemptAt"] = null;
  } else if (code === "AI_RATE_LIMITED") {
    // Not the post's fault: don't burn an attempt, pause the whole queue.
    pausedUntil = now + AI_INDEX_RATE_LIMIT_COOLDOWN_MS;
    set["ai.status"] = "pending";
    set["ai.nextAttemptAt"] = new Date(pausedUntil);
    inc = { "ai.attempts": -1 };
  } else if (code === "AI_NOT_CONFIGURED") {
    set["ai.status"] = "pending";
    set["ai.nextAttemptAt"] = new Date(now + 10 * 60 * 1000);
    inc = { "ai.attempts": -1 };
  } else {
    const attempts = post.ai?.attempts ?? 1;
    set["ai.status"] = "failed";
    set["ai.nextAttemptAt"] =
      attempts >= AI_INDEX_MAX_ATTEMPTS ? null : new Date(now + AI_INDEX_RETRY_DELAY_MS * attempts);
  }

  await postModel.updateOne(
    { _id: post._id, "ai.status": "processing" },
    { $set: set, ...(inc && { $inc: inc }) },
    { timestamps: false }
  );
};

// ---------------------------------------------------------------------------
// Indexing one post
// ---------------------------------------------------------------------------

/**
 * @param {string|ObjectId} postId
 * @param {{ force?: boolean }} [options]  force = re-analyse even if already done
 * @returns {Promise<"done"|"skipped"|"failed">}
 */
export const indexPost = async (postId, { force = false } = {}) => {
  const post = await claimPost(postId, force);
  if (!post) return "skipped"; // deleted, already done, locked elsewhere, or not due yet

  try {
    const frameUrls = buildFrameUrls(post.media);

    if (frameUrls.length === 0) {
      await postModel.updateOne(
        { _id: post._id, "ai.status": "processing" },
        { $set: { "ai.status": "skipped", "ai.lockedAt": null, "ai.lastError": "no_media" } },
        { timestamps: false }
      );
      return "skipped";
    }

    const results = await Promise.allSettled(frameUrls.map(fetchFrame));
    const frames = results.filter((r) => r.status === "fulfilled").map((r) => r.value);

    if (frames.length === 0) {
      throw new AIError("Could not load any media for analysis.", 502, "AI_IMAGE_FETCH_FAILED");
    }

    const analysis = await analyzeFrames(frames);

    const document = buildEmbeddingDocument({
      description: analysis.description,
      attributes: analysis.attributes,
      tags: analysis.tags,
      caption: post.caption,
      locationName: post.location?.name,
    });

    const embedding = await embedText({ text: document, taskType: "RETRIEVAL_DOCUMENT" });

    await postModel.updateOne(
      { _id: post._id, "ai.status": "processing" },
      {
        $set: {
          "ai.status": "done",
          "ai.description": analysis.description,
          "ai.attributes": analysis.attributes,
          "ai.tags": analysis.tags,
          "ai.embedding": embedding.values,
          "ai.model": analysis.model,
          "ai.embeddingModel": embedding.model,
          "ai.processedAt": new Date(),
          "ai.lockedAt": null,
          "ai.nextAttemptAt": null,
          "ai.lastError": null,
        },
      },
      { timestamps: false }
    );

    return "done";
  } catch (error) {
    await failPost(post, error).catch((e) =>
      console.error("[AI] could not record indexing failure:", e.message)
    );
    return "failed";
  }
};

export const reindexPost = (postId) => indexPost(postId, { force: true });

/**
 * Cheap path for when only the caption/location changed: re-embed using the
 * stored description. No vision call. Call from editPost if captions are editable.
 */
export const refreshPostEmbedding = async (postId) => {
  if (!isAIConfigured()) return false;

  const post = await postModel.findOne({ _id: postId, "ai.status": "done" }).select("+ai").lean();
  if (!post?.ai) return false;

  const document = buildEmbeddingDocument({
    description: post.ai.description,
    attributes: post.ai.attributes,
    tags: post.ai.tags,
    caption: post.caption,
    locationName: post.location?.name,
  });

  const { values, model } = await embedText({ text: document, taskType: "RETRIEVAL_DOCUMENT" });

  await postModel.updateOne(
    { _id: post._id, "ai.status": "done" },
    { $set: { "ai.embedding": values, "ai.embeddingModel": model } },
    { timestamps: false }
  );

  return true;
};

// ---------------------------------------------------------------------------
// In-process queue (one job at a time by default, with a gap between jobs)
// ---------------------------------------------------------------------------

const queue = [];
const queued = new Set();
let active = 0;
let pausedUntil = 0;
let pumpTimer = null;

const schedulePump = (delay) => {
  if (pumpTimer) return;
  pumpTimer = setTimeout(() => {
    pumpTimer = null;
    pump();
  }, delay);
  pumpTimer.unref?.();
};

const pump = () => {
  while (active < AI_INDEX_CONCURRENCY && queue.length > 0) {
    const wait = pausedUntil - Date.now();
    if (wait > 0) {
      schedulePump(wait + 50);
      return;
    }

    const id = queue.shift();
    active += 1;

    indexPost(id)
      .catch((error) => console.error(`[AI] indexing ${id} crashed:`, error.message))
      .finally(() => {
        active -= 1;
        queued.delete(id);
        schedulePump(AI_INDEX_MIN_GAP_MS);
      });
  }
};

/** Fire-and-forget. Safe to call for any post, any number of times. */
export const enqueuePostIndexing = (postId) => {
  if (!isAIConfigured()) return;
  const id = String(postId);
  if (queued.has(id)) return;
  queued.add(id);
  queue.push(id);
  pump();
};

// ---------------------------------------------------------------------------
// Sweeper: retries, crash recovery, and slow backfill of legacy posts
// ---------------------------------------------------------------------------

/** Marks the newest posts that predate this feature as pending. */
export const markLegacyPostsPending = async (limit = AI_INDEX_BATCH_PER_SWEEP) => {
  const legacy = await postModel
    .find({ "ai.status": { $exists: false }, "media.0": { $exists: true } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select("_id")
    .lean();

  if (legacy.length === 0) return 0;

  await postModel.updateMany(
    { _id: { $in: legacy.map((p) => p._id) }, "ai.status": { $exists: false } },
    { $set: { "ai.status": "pending", "ai.attempts": 0 } },
    { timestamps: false }
  );

  return legacy.length;
};

export const processPendingBatch = async (limit = AI_INDEX_BATCH_PER_SWEEP) => {
  if (!isAIConfigured()) return 0;

  const now = new Date();

  // Posts that crashed mid-run and are out of attempts: give up cleanly.
  await postModel.updateMany(
    {
      "ai.status": "processing",
      "ai.lockedAt": { $lt: new Date(now.getTime() - AI_INDEX_STALE_LOCK_MS) },
      "ai.attempts": { $gte: AI_INDEX_MAX_ATTEMPTS },
    },
    { $set: { "ai.status": "failed", "ai.lastError": "stalled", "ai.lockedAt": null } },
    { timestamps: false }
  );

  const findDue = () =>
    postModel.find(eligibleFilter(now)).sort({ createdAt: -1 }).limit(limit).select("_id").lean();

  let due = await findDue();

  // Nothing due: optionally drip-feed legacy posts into the queue.
  if (due.length === 0 && process.env.AI_AUTO_BACKFILL === "true") {
    if ((await markLegacyPostsPending(limit)) > 0) due = await findDue();
  }

  due.forEach((p) => enqueuePostIndexing(p._id));
  return due.length;
};

let sweeper = null;

/** Call once after the database connection is open. */
export const startPostIndexingWorker = () => {
  if (sweeper) return;

  if (!isAIConfigured()) {
    console.warn("[AI] GEMINI_API_KEY not set — post indexing worker disabled");
    return;
  }

  const tick = () =>
    processPendingBatch().catch((error) => console.error("[AI] sweep failed:", error.message));

  const first = setTimeout(tick, 10 * 1000);
  first.unref?.();

  sweeper = setInterval(tick, AI_INDEX_SWEEP_INTERVAL_MS);
  sweeper.unref?.();

  console.log("[AI] post indexing worker started");
};