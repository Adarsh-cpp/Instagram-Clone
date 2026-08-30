import storyModel from "../models/story.model.js";
import Highlight from "../models/highlight.model.js";
import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";

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
    const userId = req.user._id; // assumes your authUser middleware attaches req.user
    const { filterUsed, bgColor, songId, songStartTime } = req.body;

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Media file is required" });
    }

    const resourceType = req.mediaType === "video" ? "video" : "image";
    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, resourceType);

    const story = await storyModel.create({
      author: userId,
      mediaType: req.mediaType,
      mediaUrl: uploadResult.secure_url,
      mediaPublicId: uploadResult.public_id,
      duration: req.mediaType === "video" ? req.mediaDuration : 5,
      filterUsed: filterUsed || "none",
      bgColor: bgColor || "#000000",
      song: songId ? { songId, startTime: songStartTime || 0 } : undefined,
    });

    res.status(201).json({ success: true, story });
  } catch (error) {
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
      .populate("song.songId", "title artist audioUrl")
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
      .populate("song.songId", "title artist audioUrl")
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

    // clean up Cloudinary asset too
    await cloudinary.uploader.destroy(story.mediaPublicId, {
      resource_type: story.mediaType === "video" ? "video" : "image",
    });

    // if it belonged to a highlight, pull it out of that highlight's stories array
    if (story.highlight) {
      await Highlight.findByIdAndUpdate(story.highlight, {
        $pull: { stories: story._id },
      });
    }

    await storyModel.findByIdAndDelete(storyId);

    res.status(200).json({ success: true, message: "Story deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};