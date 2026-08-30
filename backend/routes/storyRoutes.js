import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import { uploadStoryMedia, validateVideoDuration } from "../middlewares/storyUpload.js";
import {
  createStory,
  getStoryFeed,
  getUserStories,
  viewStory,
  getStoryViewers,
  deleteStory,
} from "../controllers/storyController.js";

const router = express.Router();

router.post("/create", authUser, uploadStoryMedia, validateVideoDuration, createStory);
router.get("/feed", authUser, getStoryFeed);
router.get("/user/:userId", authUser, getUserStories);
router.post("/:storyId/view", authUser, viewStory);
router.get("/:storyId/viewers", authUser, getStoryViewers);
router.delete("/:storyId", authUser, deleteStory);

export default router;