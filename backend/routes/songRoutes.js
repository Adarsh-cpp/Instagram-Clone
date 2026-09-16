import express from "express";
import multer from "multer";
import { authUser } from "../middlewares/authMiddleware.js";
import {
  listSongs,
  getSong,
  createSong,
  importJamendoTracks,
  deleteSong,
} from "../controllers/songController.js";

const router = express.Router();

// memory storage — same pattern as your story upload middleware
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB, adjust as needed
});

// GET /song/list — must come before "/:songId" or Express will try to
// match "list" as a songId param
router.get("/list", authUser, listSongs);

// POST /song/import-jamendo — one-off (or periodically re-run) pull of
// tracks from Jamendo into the shared song catalog. Query params:
// ?limit=30&tags=chill,pop — see songController.js for details.
router.post("/import-jamendo", authUser, importJamendoTracks);

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
