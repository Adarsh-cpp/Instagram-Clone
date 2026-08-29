import conversationModel from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import { getIO, onlineUsers } from "../config/socket.js";
import { uploadSingleMedia, deleteMedia, uploadMultipleMedia} from "../services/upload.service.js";

const SHARED_MEDIA_POPULATE = [
  {
    path: "sharedPost",
    select: "media caption author likes createdAt",
    populate: { path: "author", select: "username profilePic" },
  },
  {
    path: "sharedReel",
    select: "media caption author likes createdAt aspectRatio",
    populate: { path: "author", select: "username profilePic" },
  },
];

export const getMessages = async (req, res) => {

  try {

    const userId = req.user._id
    const conversationId = req.params.conversationId;

    console.log(userId, conversationId)


    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "Conversation ID is required",
      });
    }

    const messages = await messageModel
      .find({ conversationId })
      .sort({ createdAt: 1 })
      .populate("senderId", "fullname username profilePic")
      .populate("receiverId", "fullname username profilePic")
      .populate(SHARED_MEDIA_POPULATE);

    return res.status(200).json({
      success: true,
      message: "Messages fetched successfully",
      messages,
    });

  } catch (error) {

    console.log(error);

    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });

  }
};


export const postMessage = async (req, res) => {
  try {
    const senderId = req.user._id;
    const conversationId = req.params.conversationId;
    const { message, sharedPost, sharedReel } = req.body;
    const files = req.files || []; // now an array (upload.array), not req.file

    const conversation = await conversationModel.findById(conversationId);

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
    }

    const receiverId = conversation.participants.find(
      (id) => id.toString() !== senderId.toString()
    );

    if (!receiverId || !conversationId) {
      return res.status(400).json({ success: false, message: "Conversation not found" });
    }

    if ((!message || !message.trim()) && files.length === 0 && !sharedPost && !sharedReel) {
      return res.status(400).json({ success: false, message: "Message cannot be empty" });
    }

    let imageUrls = [];
    if (files.length > 0) {
      // upload all images concurrently rather than one-by-one —
      // total time ≈ the slowest single upload, not the sum of all of them
      const uploads = await Promise.all(
        files.map((file) =>
          uploadSingleMedia(
            file.buffer,
            `instagram-clone/conversations/${conversationId}`,
            { crop: "limit", width: 1200, height: 1200 }
          )
        )
      );
      imageUrls = uploads.map((u) => u.url);
    }

    const newMessage = await messageModel.create({
      conversationId,
      senderId,
      receiverId,
      text: message?.trim() || "",
      images: imageUrls,
      sharedPost: sharedPost || undefined,
      sharedReel: sharedReel || undefined,
    });

    let lastMessageText;
    if (sharedPost) {
      lastMessageText = message?.trim() ? message.trim() : "📤 Shared a post";
    } else if (sharedReel) {
      lastMessageText = message?.trim() ? message.trim() : "🎬 Shared a reel";
    } else if (imageUrls.length > 1) {
      lastMessageText = `📷 ${imageUrls.length} Photos`;
    } else if (imageUrls.length === 1) {
      lastMessageText = "📷 Photo";
    } else {
      lastMessageText = message;
    }

    conversation.lastMessage = lastMessageText;
    conversation.lastMessageTime = Date.now();
    conversation.updatedAt = Date.now();
    await conversation.save();

    // populate shared post/reel before emitting/returning, so both sender's
    // optimistic UI update and the receiver's socket event have full data
    // without needing a separate refetch
    await newMessage.populate(SHARED_MEDIA_POPULATE);

    const receiverSocketId = onlineUsers.get(receiverId.toString());
    if (receiverSocketId) {
      getIO().to(receiverSocketId).emit("newMessage", newMessage);
    }

    return res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: newMessage,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

export const markSeen = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    await messageModel.updateMany(
      {
        conversationId,
        receiverId: userId,
        seen: false,
      },
      { $set: { seen: true } }
    );

    // tell the sender their messages were seen in real time
    const conversation = await conversationModel.findById(conversationId);
    const senderId = conversation.participants.find(
      (id) => id.toString() !== userId.toString()
    );

    const senderSocketId = onlineUsers.get(senderId.toString());
    if (senderSocketId) {
      getIO().to(senderSocketId).emit("messagesSeen", {
        conversationId,
        seenAt: new Date(),
      });
    }

    return res.json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};