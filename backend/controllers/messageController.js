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

const STICKER_TYPES = ["sticker", "animated_sticker", "gif"];

// Validates and narrows a client-supplied sticker payload down to just the
// fields we trust/store. Returns undefined if the payload doesn't look like
// a real sticker (missing type, or missing both url and emoji).
const sanitizeStickerPayload = (sticker) => {
  if (!sticker || typeof sticker !== "object") return undefined;

  const { type, url, emoji, name } = sticker;

  if (!STICKER_TYPES.includes(type)) return undefined;
  if (!url && !emoji) return undefined;

  return {
    type,
    url: typeof url === "string" ? url : undefined,
    emoji: typeof emoji === "string" ? emoji : undefined,
    name: typeof name === "string" ? name : undefined,
  };
};

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
  } else if (msg.sticker) {
    lastMessageType = "sticker";
    if (msg.sticker.type === "gif") {
      lastMessageText = "🎬 GIF";
    } else if (msg.sticker.type === "animated_sticker") {
      lastMessageText = "✨ Sticker";
    } else {
      lastMessageText = msg.sticker.emoji ? `${msg.sticker.emoji} Sticker` : "Sticker";
    }
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

// GET /message/:conversationId?limit=30&cursor=<base64>
// Cursor-based, newest-messages-first pagination. Without a cursor, returns
// the most recent `limit` messages. With a cursor (the oldest message
// currently loaded on the client), returns the next `limit` messages older
// than that. Response is always in chronological (ascending) order so the
// client can append/prepend directly without re-sorting.
export const getMessages = async (req, res) => {

  try {

    const userId = req.user._id
    const conversationId = req.params.conversationId;
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 50);
    const cursor = req.query.cursor;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "Conversation ID is required",
      });
    }

    const matchStage = { conversationId };

    if (cursor) {
      let decoded;
      try {
        decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
      } catch {
        return res.status(400).json({ success: false, message: "Invalid cursor" });
      }

      const cursorDate = new Date(decoded.createdAt);
      // keyset pagination: strictly older than the cursor message,
      // with an _id tiebreaker for messages sharing the same createdAt millisecond
      matchStage.$or = [
        { createdAt: { $lt: cursorDate } },
        { createdAt: cursorDate, _id: { $lt: decoded._id } },
      ];
    }

    // fetch newest-first so LIMIT gets the relevant page, then reverse below
    const docs = await messageModel
      .find(matchStage)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1) // one extra to know if there's an older page left
      .populate("senderId", "fullname username profilePic")
      .populate("receiverId", "fullname username profilePic")
      .populate(SHARED_MEDIA_POPULATE);

    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    let nextCursor = null;
    if (hasMore && page.length > 0) {
      const oldest = page[page.length - 1];
      nextCursor = Buffer.from(
        JSON.stringify({ createdAt: oldest.createdAt, _id: oldest._id })
      ).toString("base64");
    }

    const messages = page.reverse(); // chronological ascending for rendering

    return res.status(200).json({
      success: true,
      message: "Messages fetched successfully",
      messages,
      nextCursor,
      hasMore,
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
    const { message, sharedPost, sharedReel, sharedStoryId, sticker } = req.body;
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

    const stickerPayload = sanitizeStickerPayload(sticker);

    if (
      (!message || !message.trim()) &&
      files.length === 0 &&
      !sharedPost &&
      !sharedReel &&
      !sharedStoryId &&
      !stickerPayload
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
          !sharedReel &&
          !stickerPayload
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
      sticker: stickerPayload || undefined,
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

      if (newLastMessage) {
        const preview = buildLastMessagePreview(newLastMessage);
        conversation.lastMessage = preview.lastMessage;
        conversation.lastMessageType = preview.lastMessageType;
        conversation.lastMessageSenderId = preview.lastMessageSenderId;
        conversation.lastMessageTime = preview.lastMessageTime;
      } else {
        // no messages left at all — reset the preview instead of
        // calling buildLastMessagePreview(null)
        conversation.lastMessage = "";
        conversation.lastMessageType = "text";
        conversation.lastMessageSenderId = null;
        conversation.lastMessageTime = conversation.createdAt;
      }

      await conversation.save();
    }

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
