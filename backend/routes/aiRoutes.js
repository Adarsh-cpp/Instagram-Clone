import express from "express";

import { authUser } from "../middlewares/authMiddleware.js";

import { aiImageUpload, handleAiUploadError } from "../config/multerAi.js";
import {
  captionRateLimit,
  bioRateLimit,
  commentRateLimit,
  chatRateLimit,
} from "../middlewares/aiRateLimit.js";
import {
  createCaption,
  createBio,
  createComment,
  chat,
  getAIStatus,
} from "../controllers/aiController.js";

const router = express.Router();

// Every AI route requires a logged-in user. Rate limiting runs after auth so
// the limiter can key on the user id rather than a shared NAT'd IP.
router.use(authUser);

// GET /api/ai/health — lets the frontend hide AI buttons if the key is absent
router.get("/health", getAIStatus);

// POST /api/ai/caption — multipart/form-data, field name "image"
// (unchanged — captioning a not-yet-posted photo still needs a real upload)
router.post(
  "/caption",
  captionRateLimit,
  aiImageUpload.single("image"),
  handleAiUploadError,
  createCaption
);

// POST /api/ai/bio — JSON
router.post("/bio", bioRateLimit, createBio);

// POST /api/ai/comment — JSON: { postId | reelId, mediaIndex?, tone?, instruction? }
// No multer here anymore: the backend resolves the image itself from
// MongoDB/Cloudinary instead of accepting an uploaded file.
router.post("/comment", commentRateLimit, createComment);

// POST /api/ai/chat — JSON
router.post("/chat", chatRateLimit, chat);

export default router;