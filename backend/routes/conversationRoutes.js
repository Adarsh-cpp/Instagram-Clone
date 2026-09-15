import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import {
  createOrGetConversation,
  deleteConversation,
  getAllConversations,
  getConversationById,
  getShareUsersList,
  updateChatTheme,
} from "../controllers/conversationController.js";


const router = express.Router();

router.post("/:userId", authUser, createOrGetConversation);
router.get("/get-all-conversations", authUser, getAllConversations)
router.get("/share-list", authUser, getShareUsersList);
router.get("/:conversationId", authUser, getConversationById);
router.patch("/:conversationId/theme", authUser, updateChatTheme);
router.delete("/:conversationId", authUser, deleteConversation);

export default router;