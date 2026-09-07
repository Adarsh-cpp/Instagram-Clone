import conversationModel from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import storyModel from "../models/story.model.js";
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
  // sharedStory is an embedded snapshot, not a ref — it comes back with the
  // message document automatically, no populate needed.
];

// Builds the conversation-preview fields (lastMessage/lastMessageType/etc.)
// from a single message document. Shared by postMessage (new message) and
// deleteMessage (recomputing the preview after an unsend) so the "what
// should the chat list show" logic only lives in one place.
const buildLastMessagePreview = (msg) => {
  if (!msg) {
    // conversation has no messages left at all
    return {
      lastMessage: "",
      lastMessageType: "text",
      lastMessageSenderId: undefined,
      lastMessageTime: new Date(),
    };
  }

  let lastMessageType = "text";
  let lastMessageText = msg.text || "";

  if (msg.repliedStory) {
    lastMessageType = "story_reply";
    lastMessageText = msg.text || "";
  } else if (msg.sharedPost) {
    lastMessageType = "post_share";
    lastMessageText = msg.text?.trim() ? msg.text.trim() : "📤 Shared a post";
  } else if (msg.sharedReel) {
    lastMessageType = "reel_share";
    lastMessageText = msg.text?.trim() ? msg.text.trim() : "🎬 Shared a reel";
  } else if (msg.sharedStory) {
    lastMessageType = "story_share";
    lastMessageText = msg.text?.trim() ? msg.text.trim() : "📖 Shared a story";
  } else if (msg.images?.length > 1) {
    lastMessageType = "image";
    lastMessageText = `📷 ${msg.images.length} Photos`;
  } else if (msg.images?.length === 1) {
    lastMessageType = "image";
    lastMessageText = "📷 Photo";
  } else {
    lastMessageType = "text";
    lastMessageText = msg.text || "";
  }

  return {
    lastMessage: lastMessageText,
    lastMessageType,
    lastMessageSenderId: msg.senderId?._id || msg.senderId,
    lastMessageTime: msg.createdAt || new Date(),
  };
};

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
    const { message, sharedPost, sharedReel, sharedStoryId } = req.body;
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

    if (
      (!message || !message.trim()) &&
      files.length === 0 &&
      !sharedPost &&
      !sharedReel &&
      !sharedStoryId
    ) {
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

    // Story is ephemeral (TTL-deleted after 24h) — snapshot its media/author
    // now, server-side, straight from the real Story doc. Never trust a
    // client-supplied media URL/author for this.
    let sharedStorySnapshot;
    if (sharedStoryId) {
      const storyDoc = await storyModel
        .findById(sharedStoryId)
        .populate("author", "username profilePic");

      if (!storyDoc) {
        // Only a hard failure if there's nothing else riding along in this message
        if (
          (!message || !message.trim()) &&
          files.length === 0 &&
          !sharedPost &&
          !sharedReel
        ) {
          return res.status(404).json({ success: false, message: "Story is no longer available" });
        }
      } else {
        sharedStorySnapshot = {
          storyId: storyDoc._id,
          mediaType: storyDoc.mediaType,
          mediaUrl: storyDoc.mediaUrl,
          bgColor: storyDoc.bgColor,
          createdAt: storyDoc.createdAt,
          author: {
            _id: storyDoc.author._id,
            username: storyDoc.author.username,
            profilePic: storyDoc.author.profilePic,
          },
        };
      }
    }

    const newMessage = await messageModel.create({
      conversationId,
      senderId,
      receiverId,
      text: message?.trim() || "",
      images: imageUrls,
      sharedPost: sharedPost || undefined,
      sharedReel: sharedReel || undefined,
      sharedStory: sharedStorySnapshot || undefined,
    });

    const preview = buildLastMessagePreview(newMessage);
    conversation.lastMessage = preview.lastMessage;
    conversation.lastMessageType = preview.lastMessageType;
    conversation.lastMessageSenderId = preview.lastMessageSenderId;
    conversation.lastMessageTime = preview.lastMessageTime;
    await conversation.save();

    // populate shared post/reel before emitting/returning, so both sender's
    // optimistic UI update and the receiver's socket event have full data
    // without needing a separate refetch. sharedStory is already embedded.
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

// Unsend a message — sender only. Deletes it outright (no "this message
// was deleted" placeholder), then recomputes the conversation's preview
// fields from whatever message is now the most recent one, so the chat
// list falls back correctly instead of showing stale/wrong info.
export const deleteMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    const message = await messageModel.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "You can only unsend your own messages" });
    }

    const { conversationId, receiverId } = message;

    await messageModel.deleteOne({ _id: messageId });

    const conversation = await conversationModel.findById(conversationId);
    if (conversation) {
      const newLastMessage = await messageModel
        .findOne({ conversationId })
        .sort({ createdAt: -1 });

      const preview = buildLastMessagePreview(newLastMessage);
      conversation.lastMessage = preview.lastMessage;
      conversation.lastMessageType = preview.lastMessageType;
      conversation.lastMessageSenderId = preview.lastMessageSenderId;
      conversation.lastMessageTime = preview.lastMessageTime;
      await conversation.save();
    }

    // let the other participant's open chat drop the message live too.
    // Handles onlineUsers storing either a single socketId (as in
    // postMessage above) or a Set of socketIds (as in replyToStory) —
    // worth reconciling those to one shape in socket.js.
    const receiverSocketEntry = onlineUsers.get(receiverId.toString());
    if (receiverSocketEntry) {
      const io = getIO();
      const payload = { messageId, conversationId: conversationId.toString() };

      if (receiverSocketEntry instanceof Set) {
        receiverSocketEntry.forEach((socketId) => io.to(socketId).emit("messageDeleted", payload));
      } else {
        io.to(receiverSocketEntry).emit("messageDeleted", payload);
      }
    }

    return res.status(200).json({ success: true, message: "Message unsent" });
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