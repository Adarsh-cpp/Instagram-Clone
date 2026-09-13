import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import { createPost, deletePost, getAllPosts, getComments, getFeedPosts, getSavedPosts, getSuggestedTagUsers, postComment, reverseGeocodeLocation, searchLocations, searchUsersToTag, toggleLikes, toggleSavePosts } from "../controllers/postController.js";
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
router.delete("/:id/delete", authUser, deletePost);
router.get("/search-location", authUser, searchLocations);
router.get("/reverse-geocode", authUser, reverseGeocodeLocation);
router.get("/search-users", authUser, searchUsersToTag);
router.get("/suggested-tag-users", authUser, getSuggestedTagUsers);


export default router;