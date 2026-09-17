// Central AI service.
//
// Controllers call the feature functions here and never construct Gemini
// payloads themselves. To add a new AI feature later, add a function to
// this file — the transport, retries, key handling and error mapping are
// already solved in config/gemini.js.

import axios from "axios";
import { callGemini, AIError } from "../config/gemini.js";
import {
  CAPTION_TONES,
  CAPTION_SYSTEM_PROMPT,
  BIO_TONES,
  BIO_SYSTEM_PROMPT,
  COMMENT_TONES,
  COMMENT_SYSTEM_PROMPT,
  CHAT_SYSTEM_PROMPT,
  MAX_CHAT_MESSAGES,
  MAX_CHAT_TOTAL_CHARS,
  MAX_GENERATED_BIO_LENGTH,
  MAX_GENERATED_CAPTION_LENGTH,
  MAX_GENERATED_COMMENT_LENGTH,
  MAX_IMAGE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
} from "../constants/ai.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Generic escape hatch — any future feature can call this directly with
 * its own prompt and get all the reliability handling for free.
 */
export const runAI = async ({ systemInstruction, contents, generationConfig, model }) =>
  callGemini({ systemInstruction, contents, generationConfig, model });

/**
 * Models sometimes wrap output in quotes or markdown fences despite being
 * told not to. Strip that before it reaches the UI.
 */
const cleanOutput = (text, maxLength) => {
  let cleaned = text.trim();

  cleaned = cleaned.replace(/^```[a-z]*\s*/i, "").replace(/```$/, "").trim();

  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'")) ||
    (cleaned.startsWith("“") && cleaned.endsWith("”"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Drop a leading "Caption:" / "Bio:" / "Comment:" label if the model added one.
  cleaned = cleaned.replace(/^(caption|bio|comment)\s*:\s*/i, "").trim();

  if (maxLength && cleaned.length > maxLength) {
    // Trim on a word boundary so we don't cut mid-word.
    const slice = cleaned.slice(0, maxLength);
    const lastSpace = slice.lastIndexOf(" ");
    cleaned = (lastSpace > maxLength * 0.6 ? slice.slice(0, lastSpace) : slice).trim();
  }

  return cleaned;
};

/**
 * Wraps untrusted user text so the model treats it as content to work on
 * rather than as new instructions.
 */
const asUserBlock = (label, value) => `${label}:\n"""\n${value}\n"""`;

// ---------------------------------------------------------------------------
// Remote image fetching (server-side only) — used by the "suggest comment"
// feature so the browser never has to touch the Cloudinary URL directly
// (avoids CORS entirely, and stops the client from being able to point the
// AI at an arbitrary image by faking a URL — we only ever fetch a URL that
// came from a MongoDB document, never from the request body).
// ---------------------------------------------------------------------------

// Add any other hosts you serve post/reel media from (e.g. a CDN in front
// of Cloudinary) here. Kept local to this file rather than constants/ai.js
// since it's specific to this one trust boundary.
const ALLOWED_REMOTE_IMAGE_HOSTNAMES = ["res.cloudinary.com"];

const isAllowedImageHost = (urlString) => {
  try {
    const { hostname, protocol } = new URL(urlString);
    return (
      protocol === "https:" &&
      ALLOWED_REMOTE_IMAGE_HOSTNAMES.some(
        (allowedHost) => hostname === allowedHost || hostname.endsWith(`.${allowedHost}`)
      )
    );
  } catch {
    return false;
  }
};

/**
 * Fetches an image URL (expected to be a Cloudinary asset URL pulled from
 * our own database) into a Buffer + mimeType, ready for Gemini's inlineData.
 * Never call this with a URL that came directly from client input.
 */
const fetchImageFromUrl = async (imageUrl) => {
  if (!imageUrl || !isAllowedImageHost(imageUrl)) {
    throw new AIError("The post image could not be verified.", 400, "AI_BAD_IMAGE_SOURCE");
  }

  let response;

  try {
    response = await axios.get(imageUrl, {
      responseType: "arraybuffer",
      timeout: 15000,
      maxContentLength: MAX_IMAGE_BYTES,
      maxBodyLength: MAX_IMAGE_BYTES,
      validateStatus: (status) => status === 200,
    });
  } catch (error) {
    if (error.code === "ECONNABORTED") {
      throw new AIError("Timed out fetching the post image. Try again.", 504, "AI_IMAGE_FETCH_TIMEOUT");
    }

    if (
      error.message?.includes("maxContentLength") ||
      error.message?.includes("maxBodyLength")
    ) {
      throw new AIError("The post image is too large to analyze.", 413, "AI_IMAGE_TOO_LARGE");
    }

    throw new AIError("Couldn't retrieve the post image right now.", 502, "AI_IMAGE_FETCH_FAILED");
  }

  const mimeType = response.headers?.["content-type"]?.split(";")[0]?.trim();

  if (!mimeType || !ALLOWED_IMAGE_MIME_TYPES.includes(mimeType)) {
    throw new AIError("Unsupported image type for AI analysis.", 415, "AI_UNSUPPORTED_IMAGE_TYPE");
  }

  const imageBuffer = Buffer.from(response.data);

  if (!imageBuffer.length) {
    throw new AIError("The post image appears to be empty.", 400, "AI_EMPTY_IMAGE");
  }

  return { imageBuffer, mimeType };
};

// ---------------------------------------------------------------------------
// Feature 1 — caption generation from an image
// ---------------------------------------------------------------------------

/**
 * @param {Object} params
 * @param {Buffer} params.imageBuffer  raw bytes from multer memory storage
 * @param {string} params.mimeType
 * @param {string} [params.tone]       one of VALID_CAPTION_TONES
 * @param {string} [params.instruction] free-text extra instruction
 */
export const generateCaption = async ({ imageBuffer, mimeType, tone = "default", instruction }) => {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new AIError("No image was provided.", 400, "AI_BAD_REQUEST");
  }

  const toneInstruction = CAPTION_TONES[tone] || CAPTION_TONES.default;

  const promptParts = [toneInstruction];

  if (instruction) {
    promptParts.push(
      `The user also asked for the following. Follow it unless it conflicts with your rules:\n${asUserBlock(
        "User instruction",
        instruction
      )}`
    );
  }

  promptParts.push("Now write the caption for the attached image. Output the caption only.");

  const contents = [
    {
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType,
            data: imageBuffer.toString("base64"),
          },
        },
        { text: promptParts.join("\n\n") },
      ],
    },
  ];

  const { text, model } = await callGemini({
    contents,
    systemInstruction: CAPTION_SYSTEM_PROMPT,
    generationConfig: {
      temperature: tone === "professional" ? 0.6 : 1.0,
      maxOutputTokens: 300,
    },
  });

  return {
    caption: cleanOutput(text, MAX_GENERATED_CAPTION_LENGTH),
    tone,
    model,
  };
};

// ---------------------------------------------------------------------------
// Feature 2 — bio generation / improvement
// ---------------------------------------------------------------------------

/**
 * Pure text generation. This function NEVER writes to the database — the
 * caller returns the result to the client and the user decides whether to
 * save it through the existing editProfile endpoint.
 *
 * @param {Object} params
 * @param {string} [params.tone]        one of VALID_BIO_TONES
 * @param {string} [params.currentBio]  the user's existing bio
 * @param {string} [params.info]        keywords / interests / job etc.
 * @param {string} [params.instruction] extra free-text instruction
 * @param {Object} [params.profile]     { username, fullname } for light context
 */
export const generateBio = async ({
  tone = "generate",
  currentBio,
  info,
  instruction,
  profile = {},
}) => {
  const toneInstruction = BIO_TONES[tone] || BIO_TONES.generate;

  const promptParts = [toneInstruction];

  if (profile.fullname || profile.username) {
    promptParts.push(
      `Profile context (use only if helpful, never state it verbatim): name "${
        profile.fullname || ""
      }", username "${profile.username || ""}".`
    );
  }

  if (currentBio) {
    promptParts.push(asUserBlock("Existing bio", currentBio));
  }

  if (info) {
    promptParts.push(asUserBlock("Information about the user", info));
  }

  if (instruction) {
    promptParts.push(
      `Extra instruction from the user (follow unless it conflicts with your rules):\n${asUserBlock(
        "User instruction",
        instruction
      )}`
    );
  }

  promptParts.push(
    `Write the bio now. Output the bio text only, maximum ${MAX_GENERATED_BIO_LENGTH} characters.`
  );

  const contents = [{ role: "user", parts: [{ text: promptParts.join("\n\n") }] }];

  const { text, model } = await callGemini({
    contents,
    systemInstruction: BIO_SYSTEM_PROMPT,
    generationConfig: {
      temperature: tone === "professional" ? 0.6 : 1.0,
      maxOutputTokens: 256,
    },
  });

  return {
    bio: cleanOutput(text, MAX_GENERATED_BIO_LENGTH),
    tone,
    model,
  };
};

// ---------------------------------------------------------------------------
// Feature 3 — comment suggestion from an image
// ---------------------------------------------------------------------------
// Deliberately mirrors generateCaption's shape (same image-in, text-out
// pipeline) rather than sharing code with it — captions and comments have
// different system prompts, tone sets and length limits, and are called
// from different screens, so keeping them as separate functions means a
// future change to one (e.g. caption hashtag rules) can't silently affect
// the other.

/**
 * @param {Object} params
 * @param {Buffer} params.imageBuffer  raw bytes
 * @param {string} params.mimeType
 * @param {string} [params.tone]        one of VALID_COMMENT_TONES
 * @param {string} [params.instruction] free-text extra instruction
 */
export const generateComment = async ({ imageBuffer, mimeType, tone = "default", instruction }) => {
  if (!Buffer.isBuffer(imageBuffer) || imageBuffer.length === 0) {
    throw new AIError("No image was provided.", 400, "AI_BAD_REQUEST");
  }

  const toneInstruction = COMMENT_TONES[tone] || COMMENT_TONES.default;

  const promptParts = [toneInstruction];

  if (instruction) {
    promptParts.push(
      `The user also asked for the following. Follow it unless it conflicts with your rules:\n${asUserBlock(
        "User instruction",
        instruction
      )}`
    );
  }

  promptParts.push(
    "Now write the comment for the attached post image. Output the comment only."
  );

  const contents = [
    {
      role: "user",
      parts: [
        {
          inlineData: {
            mimeType,
            data: imageBuffer.toString("base64"),
          },
        },
        { text: promptParts.join("\n\n") },
      ],
    },
  ];

  const { text, model } = await callGemini({
    contents,
    systemInstruction: COMMENT_SYSTEM_PROMPT,
    generationConfig: {
      temperature: tone === "question" ? 0.8 : 1.0,
      maxOutputTokens: 200,
    },
  });

  return {
    comment: cleanOutput(text, MAX_GENERATED_COMMENT_LENGTH),
    tone,
    model,
  };
};

/**
 * Same as generateComment, but takes a remote image URL (already resolved
 * from MongoDB by the controller) instead of a Buffer. This is what backs
 * the "suggest comment on this post/reel" feature: the frontend never
 * handles the image at all, so there's no Cloudinary CORS problem and no
 * chance of the client pointing the AI at an arbitrary URL — the caller
 * must have already fetched imageUrl from a trusted DB document.
 *
 * @param {Object} params
 * @param {string} params.imageUrl
 * @param {string} [params.tone]
 * @param {string} [params.instruction]
 */
export const generateCommentForImageUrl = async ({ imageUrl, tone = "default", instruction }) => {
  const { imageBuffer, mimeType } = await fetchImageFromUrl(imageUrl);

  return generateComment({ imageBuffer, mimeType, tone, instruction });
};

// ---------------------------------------------------------------------------
// Feature 4 — multi-turn chatbot
// ---------------------------------------------------------------------------

/**
 * Trims and normalises the client-supplied history into Gemini `contents`.
 *
 * Three jobs:
 *  1. keep only the most recent MAX_CHAT_MESSAGES entries
 *  2. keep the total character count under MAX_CHAT_TOTAL_CHARS
 *  3. guarantee the first entry has role "user" — Gemini rejects a history
 *     that opens with a model turn
 */
const normalizeChatHistory = (messages) => {
  const mapped = messages
    .map((msg) => {
      const role = msg.role === "assistant" || msg.role === "model" ? "model" : "user";
      const content = typeof msg.content === "string" ? msg.content.trim() : "";
      return { role, content };
    })
    .filter((msg) => msg.content.length > 0);

  // 1. keep the tail
  let trimmed = mapped.slice(-MAX_CHAT_MESSAGES);

  // 2. drop from the front until we're under the character budget
  let totalChars = trimmed.reduce((sum, m) => sum + m.content.length, 0);
  while (trimmed.length > 1 && totalChars > MAX_CHAT_TOTAL_CHARS) {
    totalChars -= trimmed[0].content.length;
    trimmed = trimmed.slice(1);
  }

  // 3. must start on a user turn
  while (trimmed.length > 0 && trimmed[0].role === "model") {
    trimmed = trimmed.slice(1);
  }

  return trimmed.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));
};

/**
 * @param {Object} params
 * @param {Array<{role: string, content: string}>} params.messages
 *        Full conversation including the newest user message last.
 * @param {Object} [params.profile] { username, fullname }
 */
export const chatWithAI = async ({ messages, profile = {} }) => {
  const contents = normalizeChatHistory(messages);

  if (contents.length === 0) {
    throw new AIError("No valid messages were provided.", 400, "AI_BAD_REQUEST");
  }

  if (contents[contents.length - 1].role !== "user") {
    throw new AIError("The last message must be from the user.", 400, "AI_BAD_REQUEST");
  }

  const systemInstruction = profile.username
    ? `${CHAT_SYSTEM_PROMPT}\n\nYou are talking to a user whose username is "${profile.username}".`
    : CHAT_SYSTEM_PROMPT;

  const { text, model } = await callGemini({
    contents,
    systemInstruction,
    generationConfig: {
      temperature: 0.9,
      maxOutputTokens: 1024,
    },
  });

  return {
    reply: text.trim(),
    model,
    // how many history turns were actually sent upstream, handy for debugging
    contextMessages: contents.length,
  };
};