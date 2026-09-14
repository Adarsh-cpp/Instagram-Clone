import express from "express";
import { authUser } from "../middlewares/authMiddleware.js"; 
import { uploadReel } from "../middlewares/reelUpload.js";
import {
  createReel,
  getReels,
  getReelById,
  deleteReel,
  toggleLikeReel,
  shareReel,
  toggleSaveReel,
} from "../controllers/reelController.js";
import { addComment, getComments, toggleCommentLike } from "../controllers/reelCommentController.js";

const router = express.Router();

router.get("/get-reels", authUser, getReels);
router.get("/:id", authUser, getReelById);
router.post("/create-reel", authUser, uploadReel.single("video"), createReel);
router.delete("/:id/delete", authUser, deleteReel);
router.post("/:id/like", authUser, toggleLikeReel);
router.post("/:id/share", authUser, shareReel);
router.post("/:id/toggle-save", authUser, toggleSaveReel)


router.post("/:id/post-comment", authUser, addComment);
router.get("/:id/get-comments", authUser, getComments);
router.post("/:reelId/comment/:commentId/toggle-like", authUser, toggleCommentLike)


export default router;