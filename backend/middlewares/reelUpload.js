import multer from "multer";
import path from "path";

const storage = multer.memoryStorage();

const allowedExtensions = [".mp4", ".mov", ".webm", ".mkv"];

const videoFileFilter = (req, file, cb) => {
  const mimetype = (file.mimetype || "").toLowerCase();
  const ext = path.extname(file.originalname || "").toLowerCase();

  // console.log("Incoming video upload:", {
  //   originalname: file.originalname,
  //   mimetype: file.mimetype,
  //   ext,
  // });

  const isVideoMime = mimetype.startsWith("video/");
  const hasAllowedExt = allowedExtensions.includes(ext);

  // Accept if EITHER the mimetype says it's a video OR the extension is
  // one we allow — covers cases where the browser sends a mimetype with
  // codec params (video/webm;codecs=vp9,opus), a generic/missing mimetype
  // (application/octet-stream), or inconsistent OS/browser behavior.
  if (isVideoMime || hasAllowedExt) {
    cb(null, true);
  } else {
    cb(
      new Error(
        `Only mp4, mov, webm, or mkv files are allowed (got mimetype: "${file.mimetype}", filename: "${file.originalname}")`
      ),
      false
    );
  }
};

export const uploadReel = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: {
    fileSize: 80 * 1024 * 1024,
  },
});