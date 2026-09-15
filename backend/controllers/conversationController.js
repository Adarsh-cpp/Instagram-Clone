import conversationModel from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import { getIO, onlineUsers } from "../config/socket.js";
import { deleteMedia } from "../services/upload.service.js";

import {
  VALID_THEME_IDS,
  VALID_FONT_IDS,
} from "../constants/chatAppearance.js";

export const createOrGetConversation = async (req, res) => {
  try {
    const loggedInUserId = req.user._id;
    const otherUserId = req.params.userId;

    console.log(loggedInUserId, otherUserId);

    if (loggedInUserId.toString() === otherUserId.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot start a conversation with yourself",
      });
    }

    let conversation = await conversationModel.findOne({
      participants: {
        $all: [loggedInUserId, otherUserId],
      },
    });

    if (!conversation) {
      conversation = await conversationModel.create({
        participants: [loggedInUserId, otherUserId],
      });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.log(error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getAllConversations = async (req, res) => {
  try {
    const userId = req.user._id;

    const allConversations = await conversationModel
      .find({ participants: userId })
      .populate("participants", "username fullname profilePic lastSeen")
      .sort({ updatedAt: -1 });

    const conversationsWithUnread = await Promise.all(
      allConversations.map(async (conv) => {
        const unreadCount = await messageModel.countDocuments({
          conversationId: conv._id,
          receiverId: userId,
          seen: false,
        });

        return {
          ...conv.toObject(),
          unreadCount,
        };
      })
    );

    return res.status(200).json({
      success: true,
      message: "All conversations fetched successfully",
      conversations: conversationsWithUnread,
    });
  } catch (error) {
    console.log(error.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getConversationById = async (req, res) => {
  try {
    const conversationId = req.params.conversationId;

    const conversation = await conversationModel
      .findById(conversationId)
      .populate("participants", "username fullname profilePic lastSeen");

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    return res.status(200).json({
      success: true,
      conversation,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

export const getShareUsersList = async (req, res) => {
  try {
    const userId = req.user._id;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12;
    const skip = (page - 1) * limit;

    const conversations = await conversationModel
      .find({ participants: userId })
      .select("participants lastMessageTime")
      .populate("participants", "username fullname profilePic")
      .sort({ lastMessageTime: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const users = conversations
      .map((conv) => {
        if (!conv.participants || conv.participants.length === 0) return null;
        return conv.participants.find(
          (p) => p._id.toString() !== userId.toString()
        );
      })
      .filter(Boolean);

    // hasMore: did we get a full page? if less than limit, no more pages left
    const hasMore = conversations.length === limit;

    return res.status(200).json({
      success: true,
      users,
      hasMore,
      page,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

// PATCH /conversation/:conversationId/theme
// Persists the chat theme picked in ThemeOverlay. Only a participant of
// the conversation may change it; the client (Chat.jsx) is responsible
// for optimistic UI and for broadcasting the "themeChanged" socket event
// to the other participant once this succeeds.
export const updateChatTheme = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { chatTheme, chatFont } = req.body;

    if (chatTheme === undefined && chatFont === undefined) {
      return res.status(400).json({
        success: false,
        message: "Send chatTheme, chatFont, or both",
      });
    }

    if (chatTheme !== undefined && !VALID_THEME_IDS.includes(chatTheme)) {
      return res.status(400).json({
        success: false,
        message: "Unknown chat theme",
      });
    }

    if (chatFont !== undefined && !VALID_FONT_IDS.includes(chatFont)) {
      return res.status(400).json({
        success: false,
        message: "Unknown chat font",
      });
    }

    const conversation = await conversationModel.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: "Conversation not found",
      });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: "You are not part of this conversation",
      });
    }

    if (chatTheme !== undefined) conversation.chatTheme = chatTheme;
    if (chatFont !== undefined) conversation.chatFont = chatFont;

    await conversation.save();

    return res.status(200).json({
      success: true,
      message: "Chat appearance updated successfully",
      conversation,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};


export const deleteConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    const conversation = await conversationModel.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const isParticipant = conversation.participants.some(
      (p) => p.toString() === userId.toString()
    );
    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "You are not part of this conversation" });
    }

    const otherParticipantId = conversation.participants.find(
      (p) => p.toString() !== userId.toString()
    );

    const messages = await messageModel
      .find({ conversationId })
      .select("image images");

    const mediaUrls = [];
    messages.forEach((msg) => {
      if (msg.image) mediaUrls.push(msg.image);
      if (Array.isArray(msg.images)) mediaUrls.push(...msg.images);
    });

    if (mediaUrls.length > 0) {
      // Best-effort cleanup — a Cloudinary hiccup shouldn't block the
      // deletion the user actually asked for. Log failures instead of
      // throwing.
      const results = await Promise.allSettled(mediaUrls.map((url) => deleteMedia(url)));
      results.forEach((r, i) => {
        if (r.status === "rejected") {
          console.log("Failed to delete media from Cloudinary:", mediaUrls[i], r.reason);
        }
      });
    }

    await messageModel.deleteMany({ conversationId });
    await conversationModel.deleteOne({ _id: conversationId });

    if (otherParticipantId) {
      const io = getIO();
      const otherSocketEntry = onlineUsers.get(otherParticipantId.toString());
      if (otherSocketEntry) {
        const payload = {
          conversationId: conversationId.toString(),
          deletedBy: userId.toString(),
        };

        if (otherSocketEntry instanceof Set) {
          otherSocketEntry.forEach((socketId) => io.to(socketId).emit("conversationDeleted", payload));
        } else {
          io.to(otherSocketEntry).emit("conversationDeleted", payload);
        }
      }
    }

    return res.status(200).json({
      success: true,
      message: "Conversation deleted successfully",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};