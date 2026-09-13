import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import { deleteComment, getComments, postComment, replyToComment, toggleCommentLike } from "../controllers/commentController.js";



const router = express.Router({ mergeParams: true });

router.post("/:commentId/toggle-like", authUser, toggleCommentLike);
router.post("/:commentId/reply", authUser, replyToComment);
router.post("/post-comment", authUser, postComment);
router.get("/get-comments", getComments);
router.delete("/:commentId/delete", authUser, deleteComment);



export default router;