// The ONLY module in the backend that knows the Gemini API exists.
//
// Everything above it (services, controllers, routes) deals in plain
// objects and never sees the API key, the endpoint, or the wire format.
// Swapping Gemini for another provider later means rewriting this file
// and nothing else.
//
// Uses the global fetch shipped with Node 18+ (same as the Nominatim
// calls in post.controller.js), so no HTTP dependency is needed.

import { DEFAULT_AI_MODEL } from "../constants/ai.js";

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

const REQUEST_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2; // retries only, so up to 3 attempts total
const BASE_BACKOFF_MS = 800;

/**
 * Typed error so the controller layer can map AI failures to the right
 * HTTP status without inspecting strings.
 */
export class AIError extends Error {
  constructor(message, statusCode = 502, code = "AI_ERROR") {
    super(message);
    this.name = "AIError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const isAIConfigured = () => Boolean(process.env.GEMINI_API_KEY?.trim());

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableStatus = (status) =>
  status === 429 || status === 500 || status === 502 || status === 503 || status === 504;

// Matches gemini-3-pro-preview, gemini-3.1-pro-preview, gemini-3.6-flash,
// gemini-3.8-flash, etc. Anything that isn't 3.x is treated as the legacy
// (2.x and below) request shape.
const isGemini3xModel = (model) => /^gemini-3(\.\d+)?-/.test(model);
const isGemini25Model = (model) => /^gemini-2\.5-/.test(model);

/**
 * Gemini 2.5 and Gemini 3.x use incompatible request shapes, and mixing
 * fields from one into the other is a hard 400 from the API (e.g. sending
 * both thinkingBudget and thinkingLevel). This is the single place that
 * adapts our generic generationConfig to whichever family `model` belongs
 * to, so callers never have to think about model-specific wire formats.
 *
 *  - Gemini 2.5: `thinkingConfig.thinkingBudget` (0 disables thinking on
 *    Flash/Lite). 2.5 models spend output tokens on internal "thinking",
 *    which can return an empty text part when maxOutputTokens is small,
 *    so we switch it off.
 *  - Gemini 3.x: `thinkingConfig.thinkingLevel` (string enum). Thinking
 *    cannot be fully disabled on 3.x, so we ask for "minimal" (the
 *    lowest level Flash models support) to keep latency/cost down and
 *    leave more of maxOutputTokens for the actual answer. `temperature`,
 *    `topP` and `topK` are ignored by 3.x today and Google has said a
 *    future model may reject requests that include them, so we strip
 *    them rather than send stale 2.5-era tuning values.
 */
const adaptGenerationConfigForModel = (model, generationConfig) => {
  if (isGemini3xModel(model)) {
    const { temperature, topP, topK, candidateCount, ...rest } = generationConfig;
    return {
      ...rest,
      thinkingConfig: { thinkingLevel: "minimal" },
    };
  }

  if (isGemini25Model(model)) {
    return { ...generationConfig, thinkingConfig: { thinkingBudget: 0 } };
  }

  return generationConfig;
};

/**
 * Pulls the plain text out of a Gemini response and turns every "no usable
 * output" case into a meaningful AIError instead of an empty string.
 */
const extractText = (data) => {
  const blockReason = data?.promptFeedback?.blockReason;
  if (blockReason) {
    throw new AIError(
      "The request was blocked by the AI safety filters. Try different content.",
      422,
      "AI_BLOCKED"
    );
  }

  const candidate = data?.candidates?.[0];

  if (!candidate) {
    throw new AIError("The AI returned an empty response. Please try again.", 502, "AI_EMPTY");
  }

  if (candidate.finishReason === "SAFETY" || candidate.finishReason === "PROHIBITED_CONTENT") {
    throw new AIError(
      "The AI could not respond to this content. Try rephrasing or using a different image.",
      422,
      "AI_BLOCKED"
    );
  }

  const text = (candidate.content?.parts || [])
    .map((part) => part.text || "")
    .join("")
    .trim();

  if (!text) {
    if (candidate.finishReason === "MAX_TOKENS") {
      throw new AIError(
        "The AI response was cut short. Please try again.",
        502,
        "AI_TRUNCATED"
      );
    }
    throw new AIError("The AI returned an empty response. Please try again.", 502, "AI_EMPTY");
  }

  return text;
};

/**
 * Low-level call. Handles auth, timeout, retries and error translation.
 *
 * @param {Object}   options
 * @param {Array}    options.contents           Gemini `contents` array
 * @param {string}   [options.systemInstruction]
 * @param {Object}   [options.generationConfig]
 * @param {string}   [options.model]
 * @returns {Promise<{ text: string, model: string }>}
 */
export const callGemini = async ({
  contents,
  systemInstruction,
  generationConfig = {},
  model = DEFAULT_AI_MODEL,
}) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    // Deliberately vague to the client, loud in the logs.
    console.error("[AI] GEMINI_API_KEY is missing from the environment");
    throw new AIError("AI features are not configured on this server.", 503, "AI_NOT_CONFIGURED");
  }

  if (!Array.isArray(contents) || contents.length === 0) {
    throw new AIError("No content was provided to the AI.", 400, "AI_BAD_REQUEST");
  }

  const body = {
    contents,
    generationConfig: adaptGenerationConfigForModel(model, {
      temperature: 0.9,
      topP: 0.95,
      maxOutputTokens: 512,
      ...generationConfig,
    }),
  };

  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${GEMINI_BASE_URL}/${model}:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Header instead of ?key= so the secret never lands in a URL log.
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        return { text: extractText(data), model };
      }

      // --- non-2xx ---------------------------------------------------------
      const errorPayload = await response.json().catch(() => null);
      const upstreamMessage = errorPayload?.error?.message || response.statusText;

      console.error(
        `[AI] Gemini responded ${response.status} (attempt ${attempt + 1}):`,
        upstreamMessage
      );

      if (isRetryableStatus(response.status) && attempt < MAX_RETRIES) {
        await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
        continue;
      }

      if (response.status === 429) {
        throw new AIError(
          "The AI service is busy right now (rate limit reached). Please try again in a minute.",
          429,
          "AI_RATE_LIMITED"
        );
      }

      if (response.status === 400) {
        throw new AIError(
          "The AI could not process this request. Try a smaller image or shorter text.",
          400,
          "AI_BAD_REQUEST"
        );
      }

      if (response.status === 401 || response.status === 403) {
        // Almost always a bad/expired key — never surface that to the client.
        throw new AIError("AI features are unavailable right now.", 503, "AI_NOT_CONFIGURED");
      }

      if (response.status === 404) {
        // Almost always a retired/renamed model id (DEFAULT_AI_MODEL is
        // stale) rather than something the request did — surface it
        // distinctly in the logs so it isn't confused with a bad key.
        console.error(
          `[AI] Model "${model}" was not found (404). It may have been retired — check DEFAULT_AI_MODEL.`
        );
        throw new AIError("AI features are unavailable right now.", 503, "AI_NOT_CONFIGURED");
      }

      throw new AIError(
        "The AI service is temporarily unavailable. Please try again.",
        503,
        "AI_UNAVAILABLE"
      );
    } catch (error) {
      clearTimeout(timeout);

      // Our own errors are final — don't retry them.
      if (error instanceof AIError) throw error;

      lastError = error;

      const isAbort = error.name === "AbortError";
      console.error(
        `[AI] Request failed (attempt ${attempt + 1}):`,
        isAbort ? "timed out" : error.message
      );

      if (attempt < MAX_RETRIES) {
        await sleep(BASE_BACKOFF_MS * Math.pow(2, attempt));
        continue;
      }

      throw new AIError(
        isAbort
          ? "The AI took too long to respond. Please try again."
          : "Could not reach the AI service. Please try again.",
        504,
        isAbort ? "AI_TIMEOUT" : "AI_NETWORK"
      );
    }
  }

  throw new AIError(
    lastError?.message || "The AI service is unavailable.",
    503,
    "AI_UNAVAILABLE"
  );
};



