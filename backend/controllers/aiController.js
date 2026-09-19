import mongoose from "mongoose";
import userModel from "../models/user.model.js";
// Adjust these two import paths/model names if yours differ.
import postModel from "../models/post.model.js";
import reelModel from "../models/reel.model.js";
import { AIError, isAIConfigured } from "../config/gemini.js";
import {
  generateCaption,
  generateBio,
  generateCommentForImageUrl,
  chatWithAI,
  generateReplySuggestions,
} from "../services/ai.service.js";
import {
  VALID_CAPTION_TONES,
  VALID_BIO_TONES,
  VALID_COMMENT_TONES,
  MAX_INSTRUCTION_LENGTH,
  MAX_BIO_INPUT_LENGTH,
  MAX_CHAT_MESSAGE_LENGTH,
  MAX_CHAT_MESSAGES,
  MAX_REPLY_CONTEXT_MESSAGES,
  MAX_REPLY_MESSAGE_LENGTH,
  DEFAULT_AI_MODEL,
} from "../constants/ai.js";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const asTrimmedString = (value, maxLength) => {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  return maxLength ? trimmed.slice(0, maxLength) : trimmed;
};

/**
 * Single place where AI failures become HTTP responses. AIError carries its
 * own status; anything else is an unexpected bug and becomes a 500.
 */
const handleAIError = (error, res, context) => {
  if (error instanceof AIError) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      code: error.code,
    });
  }

  console.log(`[AI] Unexpected error in ${context}:`, error);
  return res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};

// ---------------------------------------------------------------------------
// GET /api/ai/health
// ---------------------------------------------------------------------------

export const getAIStatus = async (req, res) => {
  return res.status(200).json({
    success: true,
    configured: isAIConfigured(),
    model: DEFAULT_AI_MODEL,
    features: ["caption", "bio", "comment", "chat", "reply"],
  });
};

// ---------------------------------------------------------------------------
// POST /api/ai/caption      multipart/form-data
// fields: image (file, required), tone (optional), instruction (optional)
//
// Unchanged: this is for captioning a photo the user is about to post,
// before it ever reaches Cloudinary, so it still needs a real file upload.
// ---------------------------------------------------------------------------

export const createCaption = async (req, res) => {
  try {
    if (!req.file || !req.file.buffer?.length) {
      return res.status(400).json({
        success: false,
        message: "An image is required in the 'image' field.",
      });
    }

    const tone = asTrimmedString(req.body?.tone) || "default";

    if (!VALID_CAPTION_TONES.includes(tone)) {
      return res.status(400).json({
        success: false,
        message: `Invalid tone. Allowed: ${VALID_CAPTION_TONES.join(", ")}`,
      });
    }

    const instruction = asTrimmedString(req.body?.instruction, MAX_INSTRUCTION_LENGTH);

    const result = await generateCaption({
      imageBuffer: req.file.buffer,
      mimeType: req.file.mimetype,
      tone,
      instruction: instruction || undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Caption generated successfully",
      caption: result.caption,
      tone: result.tone,
    });
  } catch (error) {
    return handleAIError(error, res, "createCaption");
  }
};

// ---------------------------------------------------------------------------
// POST /api/ai/bio          application/json
// body: { tone?, currentBio?, info?, instruction? }
//
// Read-only with respect to the database. The generated bio is returned for
// the user to review; saving still goes through the existing editProfile
// endpoint.
// ---------------------------------------------------------------------------

export const createBio = async (req, res) => {
  try {
    const tone = asTrimmedString(req.body?.tone) || "generate";

    if (!VALID_BIO_TONES.includes(tone)) {
      return res.status(400).json({
        success: false,
        message: `Invalid tone. Allowed: ${VALID_BIO_TONES.join(", ")}`,
      });
    }

    const info = asTrimmedString(req.body?.info, MAX_BIO_INPUT_LENGTH);
    const instruction = asTrimmedString(req.body?.instruction, MAX_INSTRUCTION_LENGTH);
    let currentBio = asTrimmedString(req.body?.currentBio, MAX_BIO_INPUT_LENGTH);

    // Light, read-only profile context + fallback for the existing bio.
    const user = await userModel
      .findById(req.user._id)
      .select("username fullname bio")
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const placeholderBio = "Edit the profile to add a bio....";

    if (!currentBio && user.bio && user.bio !== placeholderBio) {
      currentBio = user.bio.slice(0, MAX_BIO_INPUT_LENGTH);
    }

    const needsExistingBio = tone === "improve" || tone === "shorter";

    if (needsExistingBio && !currentBio) {
      return res.status(400).json({
        success: false,
        message: "There is no existing bio to work with. Send 'currentBio' or use tone 'generate'.",
      });
    }

    if (!needsExistingBio && !currentBio && !info && !instruction) {
      return res.status(400).json({
        success: false,
        message: "Tell the AI something about you — send 'info', 'currentBio' or 'instruction'.",
      });
    }

    const result = await generateBio({
      tone,
      currentBio: currentBio || undefined,
      info: info || undefined,
      instruction: instruction || undefined,
      profile: { username: user.username, fullname: user.fullname },
    });

    return res.status(200).json({
      success: true,
      message: "Bio generated successfully",
      bio: result.bio,
      tone: result.tone,
      // explicit so the frontend never assumes the profile changed
      saved: false,
    });
  } catch (error) {
    return handleAIError(error, res, "createBio");
  }
};

// ---------------------------------------------------------------------------
// POST /api/ai/comment      application/json
// body: { postId? , reelId?, mediaIndex?, tone?, instruction? }
//
// Exactly one of postId / reelId must be sent. The frontend never sends an
// image or an image URL — the backend loads the post/reel from MongoDB,
// takes ITS OWN copy of the Cloudinary URL from that trusted document, and
// only then fetches and analyzes the image. This is also why the frontend
// no longer has to fight Cloudinary's CORS policy: the browser never
// requests the image at all for this feature.
// ---------------------------------------------------------------------------

export const createComment = async (req, res) => {
  try {
    const { postId, reelId, mediaIndex } = req.body || {};

    if (!postId && !reelId) {
      return res.status(400).json({
        success: false,
        message: "Provide either 'postId' or 'reelId'.",
      });
    }

    if (postId && reelId) {
      return res.status(400).json({
        success: false,
        message: "Provide only one of 'postId' or 'reelId', not both.",
      });
    }

    const targetId = postId || reelId;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid id supplied.",
      });
    }

    const tone = asTrimmedString(req.body?.tone) || "default";

    if (!VALID_COMMENT_TONES.includes(tone)) {
      return res.status(400).json({
        success: false,
        message: `Invalid tone. Allowed: ${VALID_COMMENT_TONES.join(", ")}`,
      });
    }

    const instruction = asTrimmedString(req.body?.instruction, MAX_INSTRUCTION_LENGTH);

    let imageUrl = null;

    if (postId) {
      // Adjust "media" / "mediaType" / "url" below if your Post schema
      // names these fields differently.
      const post = await postModel.findById(postId).select("media").lean();

      if (!post) {
        return res.status(404).json({ success: false, message: "Post not found." });
      }

      const media = Array.isArray(post.media) ? post.media : [];

      const parsedIndex = Number.parseInt(mediaIndex, 10);
      const index = Number.isInteger(parsedIndex) && parsedIndex >= 0 ? parsedIndex : 0;

      const selectedMedia = media[index] || media[0];

      if (!selectedMedia?.url) {
        return res.status(404).json({
          success: false,
          message: "This post has no image to analyze.",
        });
      }

      // The AI can only look at a still image — reject videos explicitly
      // rather than silently sending something Gemini will choke on.
      if (selectedMedia.mediaType && selectedMedia.mediaType !== "image") {
        return res.status(422).json({
          success: false,
          message: "AI comments currently work on photos only, not videos.",
        });
      }

      imageUrl = selectedMedia.url;
    } else {
      // Adjust "media.thumbnailUrl" / "media.url" below if your Reel
      // schema names these fields differently.
      const reel = await reelModel.findById(reelId).select("media").lean();

      if (!reel) {
        return res.status(404).json({ success: false, message: "Reel not found." });
      }

      imageUrl = reel.media?.thumbnailUrl || reel.media?.url || null;

      if (!imageUrl) {
        return res.status(404).json({
          success: false,
          message: "This reel has no image to analyze.",
        });
      }
    }

    const result = await generateCommentForImageUrl({
      imageUrl,
      tone,
      instruction: instruction || undefined,
    });

    return res.status(200).json({
      success: true,
      message: "Comment generated successfully",
      comment: result.comment,
      tone: result.tone,
    });
  } catch (error) {
    return handleAIError(error, res, "createComment");
  }
};

// ---------------------------------------------------------------------------
// POST /api/ai/chat         application/json
//
// Accepts either:
//   { messages: [{ role: "user" | "assistant", content: "..." }, ...] }
// or:
//   { message: "...", history: [...] }
//
// The newest user message must be last.
// ---------------------------------------------------------------------------

export const chat = async (req, res) => {
  try {
    const body = req.body || {};

    let messages = [];

    if (Array.isArray(body.messages)) {
      messages = body.messages;
    } else if (typeof body.message === "string") {
      const history = Array.isArray(body.history) ? body.history : [];
      messages = [...history, { role: "user", content: body.message }];
    } else {
      return res.status(400).json({
        success: false,
        message: "Send either 'messages' (array) or 'message' (string).",
      });
    }

    if (messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one message is required.",
      });
    }

    // Hard ceiling before any work is done — protects against a client
    // dumping a 10,000-message array at us.
    if (messages.length > 100) {
      return res.status(413).json({
        success: false,
        message: `Too many messages. Send at most the last ${MAX_CHAT_MESSAGES} turns.`,
      });
    }

    const sanitized = [];

    for (const msg of messages) {
      if (!msg || typeof msg !== "object") continue;

      const role = msg.role === "assistant" || msg.role === "model" ? "assistant" : "user";
      const content = typeof msg.content === "string" ? msg.content : "";

      if (content.length > MAX_CHAT_MESSAGE_LENGTH) {
        return res.status(413).json({
          success: false,
          message: `Each message must be under ${MAX_CHAT_MESSAGE_LENGTH} characters.`,
        });
      }

      if (!content.trim()) continue;

      sanitized.push({ role, content: content.trim() });
    }

    if (sanitized.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    if (sanitized[sanitized.length - 1].role !== "user") {
      return res.status(400).json({
        success: false,
        message: "The last message must be from the user.",
      });
    }

    const result = await chatWithAI({
      messages: sanitized,
      profile: { username: req.user?.username },
    });

    return res.status(200).json({
      success: true,
      message: "Reply generated successfully",
      reply: result.reply,
      // convenience shape so the client can push it straight into its list
      data: { role: "assistant", content: result.reply, createdAt: new Date() },
      contextMessages: result.contextMessages,
    });
  } catch (error) {
    return handleAIError(error, res, "chat");
  }
};

// ---------------------------------------------------------------------------
// POST /api/ai/reply-suggestions   application/json
// body: { messages: [{ sender: "me" | "friend", text: "..." }, ...] }
//
// Oldest first, newest last. The client sends only the last few text
// messages of the open DM. Read-only: nothing is stored or sent to the
// friend — the user taps a suggestion, edits it if they like, and sends it
// through the normal message endpoint.
// ---------------------------------------------------------------------------

export const suggestReplies = async (req, res) => {
  try {
    const body = req.body || {};

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Send 'messages' as a non-empty array.",
      });
    }

    // Same ceiling idea as /chat: refuse absurd payloads before any work.
    if (body.messages.length > 100) {
      return res.status(413).json({
        success: false,
        message: `Too many messages. Send at most the last ${MAX_REPLY_CONTEXT_MESSAGES}.`,
      });
    }

    const sanitized = [];

    for (const msg of body.messages) {
      if (!msg || typeof msg !== "object") continue;

      const sender = msg.sender === "me" ? "me" : "friend";
      // clipped rather than rejected — a very long DM shouldn't block replies
      const text = asTrimmedString(msg.text, MAX_REPLY_MESSAGE_LENGTH);

      if (!text) continue;

      sanitized.push({ sender, text });
    }

    const context = sanitized.slice(-MAX_REPLY_CONTEXT_MESSAGES);

    if (!context.some((msg) => msg.sender === "friend")) {
      return res.status(400).json({
        success: false,
        message: "There is no message from your friend to reply to.",
      });
    }

    const result = await generateReplySuggestions({ messages: context });

    return res.status(200).json({
      success: true,
      message: "Suggestions generated successfully",
      suggestions: result.suggestions,
    });
  } catch (error) {
    return handleAIError(error, res, "suggestReplies");
  }
};
