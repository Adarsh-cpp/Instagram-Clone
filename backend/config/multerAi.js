// Dedicated multer instance for AI image input.
//
// Memory storage on purpose: the buffer goes straight to Gemini as inline
// base64 and is then discarded. Caption generation must NOT create a
// Cloudinary asset — the user may never actually post the photo.

import multer from "multer";
import { MAX_IMAGE_BYTES, ALLOWED_IMAGE_MIME_TYPES } from "../constants/ai.js";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
    const error = new Error("Unsupported image type. Use JPEG, PNG, WEBP or HEIC.");
    error.code = "UNSUPPORTED_IMAGE_TYPE";
    return cb(error, false);
  }
  cb(null, true);
};

export const aiImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
    fields: 10,
  },
});

/**
 * Multer throws before the controller runs, so without this an oversized
 * upload would fall through to the generic 500 handler. Mount it directly
 * after the upload middleware in the route chain.
 */
export const handleAiUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({
      success: false,
      message: `Image is too large. Maximum size is ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))}MB.`,
    });
  }

  if (err.code === "LIMIT_FILE_COUNT" || err.code === "LIMIT_UNEXPECTED_FILE") {
    return res.status(400).json({
      success: false,
      message: "Send exactly one image in the 'image' field.",
    });
  }

  if (err.code === "UNSUPPORTED_IMAGE_TYPE") {
    return res.status(415).json({ success: false, message: err.message });
  }

  console.log("[AI] Upload error:", err);
  return res.status(400).json({ success: false, message: "Invalid image upload." });
};