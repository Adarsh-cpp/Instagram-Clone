import Reel from "../models/reel.model.js";
import userModel from "../models/user.model.js"
import ReelComment from "../models/reelComment.model.js";
import { createNotification, removeNotification } from "../services/notification.service.js";
import { uploadReelVideo, deleteReelVideo } from "../services/reelMedia.service.js";

export const createReel = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "A video file is required" });
    }

     const media = await uploadReelVideo(req.file.buffer, "reels", {
      trimStart: req.body.trimStart,
      trimDuration: req.body.trimDuration,
    });

    const reel = await Reel.create({
      caption: req.body.caption || "",
      location: req.body.location || "",
      media: {
        url: media.url,
        publicId: media.publicId,
        thumbnailUrl: media.thumbnailUrl,
        duration: media.duration,
        width: media.width,
        height: media.height,
      },
      aspectRatio: media.aspectRatio,
      author: req.user._id,
    });

    const populated = await reel.populate("author", "username avatar isVerified");
    return res.status(201).json({ reel: populated });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to upload reel" });
  }
};

export const getReels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const reels = await Reel.find({ isArchived: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username profilePic isVerified")
      .lean();

    const userId = req.user?._id?.toString();
    const feed = reels.map(({ likes, saves, ...r }) => ({
      ...r,
      isLiked: userId ? likes.some((id) => id.toString() === userId) : false,
      isSaved: userId ? saves.some((id) => id.toString() === userId) : false,
    }));

    return res.status(200).json({ reels: feed, page, hasMore: reels.length === limit });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch reels" });
  }
};

export const getReelById = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id).populate(
      "author",
      "username avatar isVerified"
    );
    if (!reel) return res.status(404).json({ message: "Reel not found" });
    return res.status(200).json({ reel });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch reel" });
  }
};

export const deleteReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    if (reel.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not authorized to delete this reel" });
    }

    await deleteReelVideo(reel.media.publicId);
    await ReelComment.deleteMany({ reel: reel._id });
    await reel.deleteOne();

    return res.status(200).json({ message: "Reel deleted" });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete reel" });
  }
};

export const toggleLikeReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const userId = req.user._id.toString();
    const alreadyLiked = reel.likes.some((id) => id.toString() === userId);

    reel.likes = alreadyLiked
      ? reel.likes.filter((id) => id.toString() !== userId)
      : [...reel.likes, req.user._id];

    reel.likesCount = reel.likes.length;
    await reel.save();

    if (reel.author.toString() !== userId) {
      if (alreadyLiked) {
        await removeNotification({ recipientId: reel.author, senderId: req.user._id, type: "like", reelId: reel._id });
      } else {
        await createNotification({ recipientId: reel.author, senderId: req.user._id, type: "like", reelId: reel._id });
      }
    }

    return res.status(200).json({ success:true, liked: !alreadyLiked, likesCount: reel.likesCount });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update like" });
  }
};



export const shareReel = async (req, res) => {
  try {
    const reel = await Reel.findByIdAndUpdate(
      req.params.id,
      { $inc: { sharesCount: 1 } },
      { new: true }
    );
    if (!reel) return res.status(404).json({ message: "Reel not found" });
    return res.status(200).json({ sharesCount: reel.sharesCount });
  } catch (err) {
    return res.status(500).json({ message: "Failed to register share" });
  }
};

export const toggleSaveReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const userId = req.user._id.toString();
    const alreadySaved = reel.saves.some((id) => id.toString() === userId);

    reel.saves = alreadySaved
      ? reel.saves.filter((id) => id.toString() !== userId)
      : [...reel.saves, req.user._id];

    reel.savesCount = reel.saves.length;
    await reel.save();

    await userModel.findByIdAndUpdate(req.user._id, {
      [alreadySaved ? "$pull" : "$addToSet"]: { savedReels: reel._id },
    });

    return res.status(200).json({
      success: true,
      saved: !alreadySaved,
      savesCount: reel.savesCount,
    });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update save" });
  }
};