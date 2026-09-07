import express from "express";
import multer from "multer";
import { authUser } from "../middlewares/authMiddleware.js";
import { listSongs, getSong, createSong, deleteSong } from "../controllers/songController.js";

const router = express.Router();

// memory storage — same pattern as your story upload middleware
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB, adjust as needed
});

// GET /song/list — must come before "/:songId" or Express will try to
// match "list" as a songId param
router.get("/list", authUser, listSongs);

router.get("/:songId", authUser, getSong);

// two named fields: "audio" (required) and "thumbnail" (optional)
router.post(
  "/create",
  authUser,
  upload.fields([
    { name: "audio", maxCount: 1 },
    { name: "thumbnail", maxCount: 1 },
  ]),
  createSong
);

router.delete("/:songId", authUser, deleteSong);

export default router;
