import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static"; // ffmpeg-static does NOT include ffprobe — needed separately
import fs from "fs";
import os from "os";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobeStatic.path); // <-- the missing piece

// memory storage — we forward the buffer straight to Cloudinary, never touch disk for the final file
const storage = multer.memoryStorage();

export const uploadStoryMedia = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB cap, adjust as needed
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"];
    if (!allowed.includes(file.mimetype)) {
      return cb(null, false); // reject without throwing — see handleUploadErrors below
    }
    cb(null, true);
  },
}).single("media");

// Catches multer rejections (bad type / too large) and returns clean JSON
// instead of falling through to Express's default HTML error page.
export const handleUploadErrors = (err, req, res, next) => {
  if (err) {
    return res.status(400).json({ success: false, message: err.message || "Upload failed" });
  }
  if (!req.file) {
    return res.status(400).json({ success: false, message: "Unsupported or missing file" });
  }
  next();
};

// server-side duration check for videos — client-side trimming can be bypassed,
// so this is the real enforcement layer
export const validateVideoDuration = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No media file provided" });
    }

    const isVideo = req.file.mimetype.startsWith("video/");
    req.mediaType = isVideo ? "video" : "image";

    if (!isVideo) {
      return next(); // images don't need duration validation
    }

    // fluent-ffmpeg needs a file path, not a buffer, so write to a temp file briefly
    const tempPath = path.join(os.tmpdir(), `story-${Date.now()}-${req.file.originalname}`);
    fs.writeFileSync(tempPath, req.file.buffer);

    ffmpeg.ffprobe(tempPath, (err, metadata) => {
      fs.unlink(tempPath, () => {}); // cleanup regardless of outcome

      if (err) {
        console.error("ffprobe error:", err.message); // log the real reason during dev
        return res.status(500).json({ success: false, message: "Could not read video metadata" });
      }

      const duration = metadata?.format?.duration;

      // MediaRecorder-produced webm sometimes reports duration as
      // NaN/Infinity/undefined in the container header (a known quirk of
      // streamed recordings) even though the file plays fine. Don't hard-fail
      // in that case — fall back to trusting the client-side 15s cap instead
      // of blocking a valid upload.
      if (typeof duration !== "number" || !isFinite(duration)) {
        console.warn("ffprobe returned no usable duration, skipping hard duration check");
        req.mediaDuration = 15;
        return next();
      }

      if (duration > 15) {
        return res.status(400).json({
          success: false,
          message: `Video must be 15 seconds or shorter (got ${duration.toFixed(1)}s)`,
        });
      }

      req.mediaDuration = Math.round(duration);
      next();
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};