import conversationModel from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";

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