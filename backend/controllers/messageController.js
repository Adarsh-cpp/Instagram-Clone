import conversationModel from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import storyModel from "../models/story.model.js";
import { getIO, onlineUsers } from "../config/socket.js";
import { uploadSingleMedia, deleteMedia, uploadMultipleMedia} from "../services/upload.service.js";

const SHARED_MEDIA_POPULATE = [
  {
    path: "sharedPost",
    select: "media caption author likes createdAt",
    populate: { path: "author", select: "username profilePic role" },
  },
  {
    path: "sharedReel",
    select: "media caption author likes createdAt aspectRatio",
    populate: { path: "author", select: "username profilePic role" },
  },
  // sharedStory is an embedded snapshot, not a ref — it comes back with the
  // message document automatically, no populate needed.
  {
    // reaction authors — needed so the reactors list can show fullname + dp
    // without an extra round trip
    path: "reactions.userId",
    select: "fullname username profilePic role",
  },
];

const STICKER_TYPES = ["sticker", "animated_sticker", "gif"];

const MEDIA_PAGE_SIZE_DEFAULT = 24;
const MEDIA_PAGE_SIZE_MAX = 60;

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

// Decodes a base64 keyset cursor into { createdAt, _id }. Returns null if
// the cursor is malformed, so callers can 400 instead of silently paging
// from the top again.
const decodeCursor = (cursor) => {
  try {
    const decoded = JSON.parse(Buffer.from(cursor, "base64").toString("utf-8"));
    if (!decoded?.createdAt || !decoded?._id) return null;
    return decoded;
  } catch {
    return null;
  }
};

const encodeCursor = (doc) =>
  Buffer.from(
    JSON.stringify({ createdAt: doc.createdAt, _id: doc._id })
  ).toString("base64");

// The single source of truth for "what kind of message is this". Used at
// creation time to stamp `messageType` on the document — which is what lets
// the client still say "Post no longer available" long after the underlying
// post/reel ref has been populated away to null.
const resolveMessageType = ({
  sharedPost,
  sharedReel,
  sharedStorySnapshot,
  repliedStorySnapshot,
  stickerPayload,
  imageUrls,
}) => {
  if (repliedStorySnapshot) return "story_reply";
  if (sharedPost) return "post_share";
  if (sharedReel) return "reel_share";
  if (sharedStorySnapshot) return "story_share";
  if (stickerPayload) return "sticker";
  if (imageUrls?.length > 0) return "image";
  return "text";
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
      const decoded = decodeCursor(cursor);
      if (!decoded) {
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
      .populate("senderId", "fullname username profilePic role")
      .populate("receiverId", "fullname username profilePic role")
      .populate(SHARED_MEDIA_POPULATE);

    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    let nextCursor = null;
    if (hasMore && page.length > 0) {
      const oldest = page[page.length - 1];
      nextCursor = encodeCursor(oldest);
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


// GET /message/:conversationId/media?limit=24&cursor=<base64>
//
// Powers the "Shared media" tab. Deliberately kept as light as possible,
// because a long-running conversation can hold thousands of images:
//
//  - matches ONLY image-bearing messages (sharedMedia_idx covers this)
//  - keyset pagination, never skip/offset — page 400 costs the same as page 1
//  - .select() to three fields + .lean(), so no Mongoose documents, no
//    populate, no reactions/sticker/story subdocs coming back
//  - returns a FLAT list of image URLs, so the client can render a grid
//    without flattening N messages itself
//
// The cursor is the oldest MESSAGE on the current page, not the oldest
// image — one message can carry up to 4 images and they always travel
// together, so a page boundary never splits a message.
export const getSharedMedia = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    const limit = Math.min(
      parseInt(req.query.limit, 10) || MEDIA_PAGE_SIZE_DEFAULT,
      MEDIA_PAGE_SIZE_MAX
    );
    const cursor = req.query.cursor;

    if (!conversationId) {
      return res.status(400).json({
        success: false,
        message: "Conversation ID is required",
      });
    }

    const conversation = await conversationModel
      .findById(conversationId)
      .select("participants");

    if (!conversation) {
      return res.status(404).json({ success: false, message: "Conversation not found" });
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

    // `images` is the current field; `image` is the legacy single-image one.
    // Both are checked so older conversations still show their media.
    const matchStage = {
      conversationId,
      $or: [
        { images: { $exists: true, $ne: [] } },
        { image: { $exists: true, $nin: ["", null] } },
      ],
    };

    if (cursor) {
      const decoded = decodeCursor(cursor);
      if (!decoded) {
        return res.status(400).json({ success: false, message: "Invalid cursor" });
      }

      const cursorDate = new Date(decoded.createdAt);
      // $or is already taken by the media filter above, so the keyset
      // condition goes in $and to avoid clobbering it
      matchStage.$and = [
        {
          $or: [
            { createdAt: { $lt: cursorDate } },
            { createdAt: cursorDate, _id: { $lt: decoded._id } },
          ],
        },
      ];
    }

    const docs = await messageModel
      .find(matchStage)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1) // one extra to detect a further page
      .select("image images createdAt")
      .lean();

    const hasMore = docs.length > limit;
    const page = hasMore ? docs.slice(0, limit) : docs;

    let nextCursor = null;
    if (hasMore && page.length > 0) {
      nextCursor = encodeCursor(page[page.length - 1]);
    }

    // flatten messages -> individual images, newest first
    const media = [];
    page.forEach((doc) => {
      const urls = doc.images?.length ? doc.images : doc.image ? [doc.image] : [];

      urls.forEach((url, index) => {
        if (!url) return;
        media.push({
          id: `${doc._id}-${index}`, // stable React key, unique across pages
          url,
          messageId: doc._id,
          createdAt: doc.createdAt,
        });
      });
    });

    return res.status(200).json({
      success: true,
      message: "Shared media fetched successfully",
      media,
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


    let sharedStorySnapshot;
    if (sharedStoryId) {
      const storyDoc = await storyModel
        .findById(sharedStoryId)
        .populate("author", "username profilePic role");

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
            role: storyDoc.author.role,
          },
        };
      }
    }

    // Stamped once, never mutated. This is what survives the shared post/reel
    // being deleted later — see the field's comment in message.model.js.
    const messageType = resolveMessageType({
      sharedPost,
      sharedReel,
      sharedStorySnapshot,
      repliedStorySnapshot: null, // replies-to-story are created elsewhere
      stickerPayload,
      imageUrls,
    });

    const newMessage = await messageModel.create({
      conversationId,
      senderId,
      receiverId,
      messageType,
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

// PATCH /message/:messageId/react  { emoji: "❤️" }
// One reaction per user per message, Instagram-style:
// - no existing reaction from this user  -> add it
// - existing reaction, SAME emoji        -> remove it (toggle off)
// - existing reaction, DIFFERENT emoji   -> swap it
export const reactToMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== "string") {
      return res.status(400).json({ success: false, message: "Emoji is required" });
    }

    const message = await messageModel.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }

    // only the two participants of this message's conversation may react
    const isParticipant =
      message.senderId.toString() === userId.toString() ||
      message.receiverId.toString() === userId.toString();

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: "You can't react to this message" });
    }

    const existingIndex = message.reactions.findIndex(
      (r) => r.userId.toString() === userId.toString()
    );

    if (existingIndex !== -1 && message.reactions[existingIndex].emoji === emoji) {
      message.reactions.splice(existingIndex, 1);
    } else if (existingIndex !== -1) {
      message.reactions[existingIndex].emoji = emoji;
    } else {
      message.reactions.push({ userId, emoji });
    }

    await message.save();
    await message.populate("reactions.userId", "fullname username profilePic");

    const otherParticipantId =
      message.senderId.toString() === userId.toString()
        ? message.receiverId
        : message.senderId;

    const otherSocketEntry = onlineUsers.get(otherParticipantId.toString());
    if (otherSocketEntry) {
      const io = getIO();
      const payload = {
        messageId: message._id.toString(),
        conversationId: message.conversationId.toString(),
        reactions: message.reactions,
      };

      if (otherSocketEntry instanceof Set) {
        otherSocketEntry.forEach((socketId) => io.to(socketId).emit("messageReacted", payload));
      } else {
        io.to(otherSocketEntry).emit("messageReacted", payload);
      }
    }

    return res.status(200).json({
      success: true,
      message: "Reaction updated",
      messageId: message._id,
      reactions: message.reactions,
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};