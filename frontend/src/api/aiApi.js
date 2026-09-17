// src/api/aiApi.js
//
// The single place the frontend talks to the backend AI endpoints.
// Mirrors the existing convention used across the app: absolute URL to the
// Express server + a Bearer token pulled from localStorage.
//
// No Gemini key, model name or provider detail ever exists on this side —
// the browser only ever sees our own /api/ai/* routes.

import axios from "axios";

const BASE_URL = import.meta.env.VITE_SERVER_URL

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ---------------------------------------------------------------------------
// Tone catalogs — ids MUST match the backend's VALID_CAPTION_TONES /
// VALID_BIO_TONES / VALID_COMMENT_TONES, labels are what the user sees.
// ---------------------------------------------------------------------------

export const CAPTION_TONES = [
  { id: "default", label: "Generate Caption" },
  { id: "funny", label: "Make it Funny" },
  { id: "professional", label: "Make it Professional" },
  { id: "minimal", label: "Make it Minimal" },
  { id: "poetic", label: "Make it Poetic" },
];

export const BIO_TONES = [
  { id: "generate", label: "Generate Bio" },
  { id: "improve", label: "Improve Bio" },
  { id: "shorter", label: "Make it Shorter" },
  { id: "professional", label: "Make it Professional" },
  { id: "creative", label: "Make it Creative" },
];

// Suggests a comment to leave on a post — separate tone set from
// CAPTION_TONES because the intent is different (reacting to someone
// else's photo, not describing your own).
export const COMMENT_TONES = [
  { id: "default", label: "Suggest Comment" },
  { id: "funny", label: "Make it Funny" },
  { id: "supportive", label: "Make it Supportive" },
  { id: "question", label: "Ask a Question" },
  { id: "minimal", label: "Make it Minimal" },
];

// Only the last N turns are sent upstream. The backend trims again on its
// side — this just avoids shipping a huge payload over the wire.
export const AI_CHAT_CONTEXT_SIZE = 16;

// ---------------------------------------------------------------------------
// Error handling
//
// The backend always answers failures as { success: false, message }, so the
// server-supplied message (rate limits, blocked content, oversized image) is
// preferred and the caller's fallback is only used when there is no response
// at all — a dead server or a dropped connection.
// ---------------------------------------------------------------------------

export const getAiErrorMessage = (error, fallback) => {
  if (axios.isCancel?.(error) || error?.code === "ERR_CANCELED") return "";
  return error?.response?.data?.message || fallback;
};

// ---------------------------------------------------------------------------
// POST /api/ai/caption  (multipart/form-data)
// ---------------------------------------------------------------------------

export const generateAiCaption = async ({
  imageFile,
  tone = "default",
  instruction,
  signal,
}) => {
  if (!imageFile) throw new Error("No image selected");

  const formData = new FormData();
  formData.append("image", imageFile, imageFile.name || "image.jpg");
  formData.append("tone", tone);
  if (instruction) formData.append("instruction", instruction);

  const { data } = await axios.post(`${BASE_URL}/api/ai/caption`, formData, {
    headers: { ...getAuthHeaders(), "Content-Type": "multipart/form-data" },
    signal,
  });

  return data.caption || "";
};

// ---------------------------------------------------------------------------
// POST /api/ai/bio  (JSON)
//
// Returns the text only. Saving stays with the existing edit-profile form —
// the backend never writes the bio itself.
// ---------------------------------------------------------------------------

export const generateAiBio = async ({
  tone = "generate",
  currentBio,
  info,
  signal,
}) => {
  const { data } = await axios.post(
    `${BASE_URL}/api/ai/bio`,
    {
      tone,
      ...(currentBio ? { currentBio } : {}),
      ...(info ? { info } : {}),
    },
    { headers: getAuthHeaders(), signal }
  );

  return data.bio || "";
};

// ---------------------------------------------------------------------------
// POST /api/ai/comment  (JSON)
//
// Suggests a comment for a post or reel the user is currently viewing.
// Deliberately does NOT take an image or an image URL — only the id of the
// post/reel (and which media slide, for a carousel post). The backend loads
// the Cloudinary URL itself from MongoDB, so the browser never has to fetch
// the Cloudinary asset (which was hitting CORS) and never gets a chance to
// point the AI at an arbitrary image.
// ---------------------------------------------------------------------------

export const generateAiComment = async ({
  postId,
  reelId,
  mediaIndex,
  tone = "default",
  instruction,
  signal,
}) => {
  if (!postId && !reelId) {
    throw new Error("A postId or reelId is required");
  }

  const { data } = await axios.post(
    `${BASE_URL}/api/ai/comment`,
    {
      ...(postId ? { postId } : {}),
      ...(reelId ? { reelId } : {}),
      ...(Number.isInteger(mediaIndex) ? { mediaIndex } : {}),
      tone,
      ...(instruction ? { instruction } : {}),
    },
    { headers: getAuthHeaders(), signal }
  );

  return data.comment || "";
};

// ---------------------------------------------------------------------------
// POST /api/ai/chat  (JSON)
//
// `messages` is the conversation so far, newest user message LAST. This is
// what gives the AI its context — "make the second one funny" only resolves
// because the previous turns travel with the request.
// ---------------------------------------------------------------------------

export const sendAiChatMessage = async ({ messages, signal }) => {
  const trimmed = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-AI_CHAT_CONTEXT_SIZE)
    .map((m) => ({ role: m.role, content: m.content }));

  const { data } = await axios.post(
    `${BASE_URL}/api/ai/chat`,
    { messages: trimmed },
    { headers: getAuthHeaders(), signal }
  );

  return data.reply || "";
};

// ---------------------------------------------------------------------------
// GET /api/ai/health — optional, lets the UI hide AI entry points when the
// server has no API key configured.
// ---------------------------------------------------------------------------

export const getAiStatus = async () => {
  const { data } = await axios.get(`${BASE_URL}/api/ai/health`, {
    headers: getAuthHeaders(),
  });
  return data;
};