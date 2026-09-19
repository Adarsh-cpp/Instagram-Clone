import storyModel from "../models/story.model.js";
import highlightModel from "../models/highlight.model.js";
import conversationModel from "../models/conversation.model.js";
import messageModel from "../models/message.model.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import { getIO, onlineUsers } from "../config/socket.js";

// Story duration bounds — mirrors the client-side MIN/MAX_CLIP_SECONDS.
const MAX_STORY_DURATION = 15;
const DEFAULT_IMAGE_DURATION = 6;

// helper — uploads a buffer to Cloudinary via upload_stream (needed since we use multer memoryStorage)
const uploadBufferToCloudinary = (buffer, resourceType) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: "stories", resource_type: resourceType },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });
};

// POST /story/create
export const createStory = async (req, res) => {
  try {
    const userId = req.user?._id;
    if (!userId) {
      // If auth middleware didn't run / didn't attach req.user, fail loud
      // and clear instead of throwing "Cannot read properties of undefined".
      return res.status(401).json({ success: false, message: "Not authenticated" });
    }

    const { filterUsed, bgColor, songId, songStartTime, duration } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Media file is required" });
    }

    // req.mediaType is set server-side by validateVideoDuration based on the
    // real uploaded file's mimetype — trust that over anything the client claims.
    const mediaType = req.mediaType === "video" ? "video" : "image";

    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, mediaType);


    let finalDuration;
    if (songId) {
      const requested = Number(duration);
      finalDuration =
        Number.isFinite(requested) && requested > 0
          ? Math.min(Math.round(requested), MAX_STORY_DURATION)
          : MAX_STORY_DURATION;
    } else if (mediaType === "video") {
      finalDuration = req.mediaDuration || DEFAULT_IMAGE_DURATION;
    } else {
      finalDuration = DEFAULT_IMAGE_DURATION;
    }

    const story = await storyModel.create({
      author: userId,
      mediaType,
      mediaUrl: uploadResult.secure_url,
      mediaPublicId: uploadResult.public_id,
      duration: finalDuration,
      filterUsed: filterUsed || "none",
      bgColor: bgColor || "#000000",
      song: songId ? { songId, startTime: songStartTime || 0 } : undefined,
    });

    res.status(201).json({ success: true, story });
  } catch (error) {
    console.error("createStory error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /story/feed — active (non-expired) stories from users you follow, grouped by author
export const getStoryFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const currentUser = await req.user.populate("following");
    const followingIds = req.user.following || [];

    const authorIds = [...followingIds, userId]; // include your own stories too

    const stories = await storyModel
      .find({ author: { $in: authorIds }, expiresAt: { $gt: new Date() } })
      .populate("author", "username profilePic")
      .populate("song.songId", "title artist audioUrl thumbnail duration")
      .sort({ createdAt: 1 });

    // group by author so the frontend can render one circle per user
    const grouped = {};
    stories.forEach((story) => {
      const authorId = story.author._id.toString();
      if (!grouped[authorId]) {
        grouped[authorId] = { author: story.author, stories: [] };
      }
      grouped[authorId].stories.push(story);
    });

    res.status(200).json({ success: true, feed: Object.values(grouped) });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /story/user/:userId — a specific user's active stories
export const getUserStories = async (req, res) => {
  try {
    const { userId } = req.params;

    const stories = await storyModel
      .find({ author: userId, expiresAt: { $gt: new Date() } })
      .populate("author", "username profilePic")
      .populate("song.songId", "title artist audioUrl thumbnail duration")
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, stories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /story/:storyId/view — mark as viewed by the current user
export const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;

    const story = await storyModel.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    const alreadyViewed = story.viewers.some(
      (v) => v.user.toString() === userId.toString()
    );

    if (!alreadyViewed) {
      story.viewers.push({ user: userId });
      await story.save();
    }

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /story/:storyId/viewers — owner-only list of who viewed it
export const getStoryViewers = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;

    const story = await storyModel
      .findById(storyId)
      .populate("viewers.user", "username profilePic");

    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.status(200).json({ success: true, viewers: story.viewers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /story/:storyId — owner-only
export const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;

    const story = await storyModel.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    // Cloudinary cleanup — fire-and-forget with retry, so a Cloudinary
    // hiccup can no longer turn into a 500 that leaves the story undeleted.
    deleteCloudinaryAssetWithRetry(
      story.mediaPublicId,
      story.mediaType === "video" ? "video" : "image",
      1,
      5,
      cloudinary
    );

    // if it belonged to a highlight, pull it out of that highlight
    if (story.highlight) {
      const highlight = await highlightModel.findByIdAndUpdate(
        story.highlight,
        { $pull: { stories: story._id } },
        { new: true }
      );

      if (highlight) {
        if (highlight.stories.length === 0) {
          // last story gone -> don't leave an empty highlight behind
          await highlightModel.findByIdAndDelete(highlight._id);
        } else if (highlight.coverImage === story.mediaUrl) {
          // the cover file was just deleted -> fall back to the new first story
          const nextCoverStory = await storyModel
            .findById(highlight.stories[0])
            .select("mediaUrl");
          highlight.coverImage = nextCoverStory?.mediaUrl || "";
          await highlight.save();
        }
      }
    }

    await storyModel.findByIdAndDelete(storyId);

    res.status(200).json({ success: true, message: "Story deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /story/:storyId/like — toggle like/unlike
export const toggleLikeStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;

    const story = await storyModel.findById(storyId);
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }

    const idx = story.likes.findIndex((l) => l.user.toString() === userId.toString());
    let liked;
    if (idx === -1) {
      story.likes.push({ user: userId });
      liked = true;
    } else {
      story.likes.splice(idx, 1);
      liked = false;
    }
    await story.save();

    res.status(200).json({ success: true, liked, likesCount: story.likes.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /story/:storyId/likes — owner-only list of who liked it
export const getStoryLikes = async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user._id;

    const story = await storyModel
      .findById(storyId)
      .populate("likes.user", "username profilePic");

    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }
    if (story.author.toString() !== userId.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" });
    }

    res.status(200).json({ success: true, likes: story.likes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


export const replyToStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const { message } = req.body;
    const senderId = req.user._id;

    const text = (message || "").trim();
    if (!text) {
      return res.status(400).json({ success: false, message: "Reply message is required" });
    }

    const story = await storyModel.findById(storyId).populate("author", "username profilePic");
    if (!story) {
      return res.status(404).json({ success: false, message: "Story not found" });
    }


    if (story.expiresAt && story.expiresAt.getTime() < Date.now()) {
      return res.status(410).json({ success: false, message: "This story has expired" });
    }

    const authorId = story.author._id;
    if (authorId.toString() === senderId.toString()) {
      return res.status(400).json({ success: false, message: "You can't reply to your own story" });
    }

    // find or create the 1:1 conversation between viewer and story author
    let conversation = await conversationModel.findOne({
      participants: { $all: [senderId, authorId], $size: 2 },
    });

    if (!conversation) {
      conversation = await conversationModel.create({
        participants: [senderId, authorId],
      });
    }


    const repliedStorySnapshot = {
      storyId: story._id,
      mediaType: story.mediaType,
      mediaUrl: story.mediaUrl,
      bgColor: story.bgColor,
      createdAt: story.createdAt,
      author: {
        _id: story.author._id,
        username: story.author.username,
        profilePic: story.author.profilePic,
      },
    };

    const newMessage = await messageModel.create({
      conversationId: conversation._id,
      senderId,
      receiverId: authorId,
      text,
      repliedStory: repliedStorySnapshot,
    });


    conversation.lastMessage = text;
    conversation.lastMessageType = "story_reply";
    conversation.lastMessageSenderId = senderId;
    conversation.lastMessageTime = new Date();
    await conversation.save();

    const populatedMessage = await newMessage.populate("senderId", "username profilePic");

  
    const receiverSockets = onlineUsers.get(authorId.toString());
    if (receiverSockets && receiverSockets.size > 0) {
      const io = getIO();
      const payload = {
        ...populatedMessage.toObject(),
        conversationId: conversation._id,
      };
      receiverSockets.forEach((socketId) => {
        io.to(socketId).emit("newMessage", payload);
      });
    }

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    console.error("replyToStory error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};