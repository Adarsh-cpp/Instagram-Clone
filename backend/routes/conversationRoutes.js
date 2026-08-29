import express from "express";
import { authUser } from "../middlewares/authMiddleware.js";
import { createOrGetConversation, getAllConversations, getConversationById, getShareUsersList } from "../controllers/conversationController.js";


const router = express.Router();

router.post("/:userId", authUser, createOrGetConversation);
router.get("/get-all-conversations", authUser, getAllConversations)
router.get("/share-list", authUser, getShareUsersList);
router.get("/:conversationId", authUser, getConversationById);

export default router;