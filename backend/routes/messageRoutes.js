import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import {
  deleteMessage,
  getMessages,
  getSharedMedia,
  markSeen,
  postMessage,
  reactToMessage,
} from "../controllers/messageController.js";
import { upload } from "../config/multer.js"


const router = express.Router();

// must sit ABOVE "/:conversationId" — Express matches in declaration order,
// and a two-segment path would otherwise never be reached
router.get("/:conversationId/media", authUser, getSharedMedia);

router.get("/:conversationId", authUser, getMessages)
router.post("/:conversationId", authUser, upload.array("images", 4), postMessage)
router.patch("/:conversationId/mark-seen", authUser, markSeen)
router.patch("/:messageId/react", authUser, reactToMessage)
router.delete("/:messageId", authUser, deleteMessage);

export default router;