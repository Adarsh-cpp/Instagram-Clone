import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import { addStoryToHighlight, createHighlight, deleteHighlight, getHighlightById, getUserHighlights, removeStoryFromHighlight } from "../controllers/highlightController.js";


const router = express.Router();

router.post("/create", authUser, createHighlight);
router.post("/:highlightId/add-story", authUser, addStoryToHighlight);
router.get("/user/:userId", authUser, getUserHighlights);
router.get("/:highlightId", authUser, getHighlightById);
router.delete("/:highlightId", authUser, deleteHighlight);
router.delete("/:highlightId/story/:storyId", authUser, removeStoryFromHighlight);

export default router;