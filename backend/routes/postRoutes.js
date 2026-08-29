import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import { createPost, getAllPosts, getComments, getFeedPosts, getSavedPosts, postComment, toggleLikes, toggleSavePosts } from "../controllers/postController.js";
import { upload } from "../config/multer.js"


const router = express.Router();


router.put("/create-post", authUser, upload.array("images", 5), createPost);
router.get("/get-posts", authUser, getFeedPosts)
router.get("/get-all-posts", getAllPosts)
router.post("/:id/toggle-likes", authUser, toggleLikes)
router.post("/:id/post-comment", authUser, postComment)
router.get("/:id/get-comments", getComments)
router.post("/:id/toggle-save", authUser, toggleSavePosts )
router.get("/get-saved-posts", authUser, getSavedPosts)


export default router;