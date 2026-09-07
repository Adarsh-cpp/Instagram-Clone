import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import { deleteMessage, getMessages, markSeen, postMessage } from "../controllers/messageController.js";
import { upload } from "../config/multer.js"


const router = express.Router();

router.get("/:conversationId", authUser, getMessages)
router.post("/:conversationId", authUser, upload.array("images", 4), postMessage)
router.patch("/:conversationId/mark-seen", authUser, markSeen)
router.delete("/:messageId", authUser, deleteMessage);

export default router;