import multer from "multer";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static"; // free, bundles the ffmpeg binary — no manual install needed
import fs from "fs";
import os from "os";
import path from "path";

ffmpeg.setFfmpegPath(ffmpegPath);

// memory storage — we forward the buffer straight to Cloudinary, never touch disk for the final file
const storage = multer.memoryStorage();

export const uploadStoryMedia = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB cap, adjust as needed
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "video/mp4", "video/webm", "video/quicktime"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Unsupported file type"), false);
    }
    cb(null, true);
  },
}).single("media");

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
        return res.status(500).json({ success: false, message: "Could not read video metadata" });
      }

      const duration = metadata.format.duration; // seconds

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