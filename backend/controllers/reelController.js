import cloudinary from "../config/cloudinary.js";
import userModel from "../models/user.model.js"; 
import Reel from "../models/reel.model.js"; 
import ReelComment from "../models/reelComment.model.js"; 
import notificationModel from "../models/notification.model.js"; 
import messageModel from "../models/message.model.js"; 
import { createNotification, removeNotification } from "../services/notification.service.js";
import { deleteCloudinaryAssetWithRetry } from "../utils/cloudinaryRetry.js"; // adjust path to match wherever this actually lives
import { buildReelUploadSignature } from "../utils/cloudinarySignature.js";
import {
  MAX_DURATION,
  matchAspectRatio,
  buildReelThumbnailUrl,
  getEagerVideoUrl,
  waitForEagerVideoUrl,
  deleteReelVideo,
} from "../utils/uploadReelVideo.js";

// ---------------------------------------------------------------------------
// Processing helpers
// ---------------------------------------------------------------------------

// If the optimized clip still doesn't exist after this long, give up.
const PROCESSING_TIMEOUT_MS = 15 * 60 * 1000;

const AUTHOR_FIELDS = "username profilePic isVerified role";

// One-shot check: if Cloudinary has finished the eager transcode, flip the
// reel to "ready" with its final url. Safe to call repeatedly / concurrently
// (the update is conditional on status still being "processing").
const finalizeReelIfReady = async (reel) => {
  if (!reel || reel.status !== "processing") return reel;

  const url = await getEagerVideoUrl(reel.media.publicId);

  if (url) {
    const updated = await Reel.findOneAndUpdate(
      { _id: reel._id, status: "processing" },
      { $set: { "media.url": url, status: "ready" } },
      { new: true }
    );
    return updated || (await Reel.findById(reel._id)) || reel;
  }

  if (Date.now() - new Date(reel.createdAt).getTime() > PROCESSING_TIMEOUT_MS) {
    const failed = await Reel.findOneAndUpdate(
      { _id: reel._id, status: "processing" },
      { $set: { status: "failed" } },
      { new: true }
    );
    return failed || reel;
  }

  return reel;
};

// Fire-and-forget background watcher started right after the reel is created.
// If the server restarts mid-wait, finalizeReelIfReady (called from the
// feed / getReelById) picks the reel up later, so nothing gets stuck.
const watchReelProcessing = (reelId, publicId) => {
  waitForEagerVideoUrl(publicId)
    .then((url) => {
      if (!url) return null;
      return Reel.updateOne(
        { _id: reelId, status: "processing" },
        { $set: { "media.url": url, status: "ready" } }
      );
    })
    .catch((err) => console.error("[reel processing watcher]", reelId.toString(), err.message));
};

// ---------------------------------------------------------------------------
// Upload flow
// ---------------------------------------------------------------------------

// Step 1: the browser calls this first to get a signed payload, then
// uploads the actual video straight to Cloudinary with it. The video
// itself never touches this server.
export const getReelUploadSignature = async (req, res) => {
  try {
    const { trimStart, trimDuration } = req.body;

    const payload = buildReelUploadSignature({
      trimStart,
      trimDuration,
      userId: req.user._id.toString(),
    });

    return res.status(200).json(payload);
  } catch (err) {
    return res.status(500).json({ message: "Could not create upload signature" });
  }
};

// Step 2: the browser calls this AFTER the video has landed on Cloudinary.
// We validate everything we can from the original right away, create the
// Reel with status "processing", and respond immediately. The optimized
// clip is swapped in by the background watcher when Cloudinary finishes.
export const createReel = async (req, res) => {
  try {
    const { publicId, caption, location, taggedUsers } = req.body;

    if (!publicId) {
      return res.status(400).json({ message: "publicId is required" });
    }

    // Replay protection: a retry / double call for the same upload returns
    // the reel that already exists instead of creating a second one.
    const existing = await Reel.findOne({
      "media.publicId": publicId,
      author: req.user._id,
    }).populate("author", AUTHOR_FIELDS);
    if (existing) {
      return res.status(201).json({ reel: existing });
    }

    let resource;
    try {
      resource = await cloudinary.api.resource(publicId, {
        resource_type: "video",
        context: true,
      });
    } catch {
      return res.status(400).json({ message: "Could not verify the uploaded video" });
    }

    const expectedUserTag = `user_${req.user._id.toString()}`;
    const tags = resource.tags || [];
    if (!tags.includes("reel_upload") || !tags.includes(expectedUserTag)) {
      return res.status(403).json({ message: "This video was not uploaded by you" });
    }

    const ctx = resource.context?.custom || resource.context || {};
    const trimStart = Number(ctx.trim_start) || 0;
    const trimDuration = Number(ctx.trim_duration) || 0;

    const { width, height } = resource;
    // The stored asset is the untouched original, so its own duration is the
    // SOURCE length. What we publish is the trimmed window from context.
    const effectiveDuration = trimDuration > 0 ? trimDuration : resource.duration;

    const aspectRatio = matchAspectRatio(width, height);

    if (effectiveDuration > MAX_DURATION + 0.5) {
      await deleteReelVideo(publicId);
      return res.status(400).json({
        message: `Reel exceeds max length of ${MAX_DURATION}s (got ${effectiveDuration.toFixed(1)}s)`,
      });
    }
    if (!aspectRatio) {
      await deleteReelVideo(publicId);
      return res.status(400).json({ message: "Reel must be 9:16 (portrait) or 16:9 (landscape)" });
    }

    const thumbnailUrl = buildReelThumbnailUrl(publicId, trimStart, trimDuration);

    // location arrives as a JSON string or object ({ name, lat, lng }) —
    // Reel.location is just a plain string, so we only keep the name
    let locationName = "";
    if (location) {
      try {
        const loc = typeof location === "string" ? JSON.parse(location) : location;
        if (loc?.name) locationName = loc.name;
      } catch {
        locationName = location;
      }
    }

    // taggedUsers arrives as a JSON-stringified array of user ids (or already an array)
    let taggedUserIds = [];
    if (taggedUsers) {
      try {
        const ids = typeof taggedUsers === "string" ? JSON.parse(taggedUsers) : taggedUsers;
        if (Array.isArray(ids) && ids.length > 0) {
          const found = await userModel.find({ _id: { $in: ids } }).select("_id");
          taggedUserIds = found
            .map((u) => u._id.toString())
            .filter((id) => id !== req.user._id.toString());
        }
      } catch {
        // malformed tag payload — skip it, don't fail the whole upload
      }
    }

    let reel;
    try {
      reel = await Reel.create({
        caption: caption || "",
        location: locationName,
        media: {
          // Placeholder: the original upload. Replaced by the optimized clip
          // once the background transcode finishes (see watchReelProcessing).
          url: resource.secure_url,
          publicId,
          thumbnailUrl,
          duration: effectiveDuration,
          width,
          height,
        },
        aspectRatio,
        status: "processing",
        author: req.user._id,
        taggedUsers: taggedUserIds,
      });
    } catch (err) {
      // Unique index on media.publicId: a concurrent duplicate call won the race.
      // That call is the one that increments reelsCount, so we don't.
      if (err?.code === 11000) {
        const dup = await Reel.findOne({
          "media.publicId": publicId,
          author: req.user._id,
        }).populate("author", AUTHOR_FIELDS);
        if (dup) return res.status(201).json({ reel: dup });
      }
      throw err;
    }

    // Only reached when THIS call actually created the reel, so the counter
    // goes up exactly once per reel. Logged instead of thrown: the reel
    // already exists, so a counter hiccup shouldn't turn into a failed upload
    // (a retry would hit the replay check above and never increment anyway).
    try {
      await userModel.findByIdAndUpdate(req.user._id, { $inc: { reelsCount: 1 } });
    } catch (err) {
      console.error("[createReel] reelsCount increment failed", reel._id.toString(), err.message);
    }

    watchReelProcessing(reel._id, publicId);

    await Promise.all(
      taggedUserIds.map((tid) =>
        createNotification({
          recipientId: tid,
          senderId: req.user._id,
          type: "tag",
          reelId: reel._id,
        }).catch(() => {})
      )
    );

    const populated = await reel.populate("author", AUTHOR_FIELDS);
    return res.status(201).json({ reel: populated });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Failed to upload reel" });
  }
};

// ---------------------------------------------------------------------------
// Feed / interactions
// ---------------------------------------------------------------------------

export const getReels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const userId = req.user?._id?.toString();

    // Safety net: if the server restarted while this user's reel was still
    // processing, the in-memory watcher is gone — finish those off here.
    if (userId) {
      Reel.find({ author: req.user._id, status: "processing" })
        .limit(5)
        .then((list) => Promise.all(list.map(finalizeReelIfReady)))
        .catch(() => {});
    }

    // Reels that are still processing (or failed) never appear in the feed.
    // Legacy reels without a status field are treated as ready.
    const reels = await Reel.find({
      isArchived: false,
      status: { $nin: ["processing", "failed"] },
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", AUTHOR_FIELDS)
      .lean();

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
    let reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const isAuthor = reel.author.toString() === req.user._id.toString();

    // Only the author can see a reel that isn't ready yet.
    if (reel.status !== "ready" && !isAuthor) {
      return res.status(404).json({ message: "Reel not found" });
    }

    // The author's client can poll this endpoint to find out when the
    // reel flips from "processing" to "ready".
    if (reel.status === "processing") {
      reel = await finalizeReelIfReady(reel);
    }

    await reel.populate("author", "username profilePic isVerified");
    return res.status(200).json({ reel });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch reel" });
  }
};

export const deleteReel = async (req, res) => {
  try {
    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    const isOwner = reel.author.toString() === req.user._id.toString();
    const isAdmin = req.user.role === "admin";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: "Not authorized to delete this reel" });
    }

    // fire-and-forget with retry — doesn't block the response, but keeps
    // trying in the background until Cloudinary actually confirms deletion.
    // (thumbnailUrl is derived from the same publicId, so it's covered.)
    deleteCloudinaryAssetWithRetry(reel.media.publicId, "video", 1, 5, cloudinary);

    // comments AND replies both store `reel`, so one query covers both.
    // Collect the ids first so their notifications can be removed too.
    const commentIds = await ReelComment.distinct("_id", { reel: reel._id });

    await notificationModel.deleteMany({
      $or: [{ reel: reel._id }, { reelComment: { $in: commentIds } }],
    });

    await ReelComment.deleteMany({ reel: reel._id });

    await userModel.updateMany(
      {},
      {
        $pull: {
          savedReels: reel._id,
          savedItems: { itemType: "Reel", itemId: reel._id },
        },
      }
    );

    // messageType stays "reel_share", so the client can still render
    // "Reel no longer available" (same treatment deletePost gives sharedPost)
    await messageModel.updateMany(
      { sharedReel: reel._id },
      { $set: { sharedReel: null } }
    );

    await reel.deleteOne();

    // Decrement only after the reel is really gone, and never below 0.
    // Uses reel.author (not req.user) so an admin delete adjusts the right user.
    await userModel.updateOne(
      { _id: reel.author, reelsCount: { $gt: 0 } },
      { $inc: { reelsCount: -1 } }
    );

    return res.status(200).json({ message: "Reel deleted" });
  } catch (err) {
    console.error("Delete Reel Error:", err);
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

    return res.status(200).json({ success: true, liked: !alreadyLiked, likesCount: reel.likesCount });
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

    const user = await userModel.findById(req.user._id);
    if (alreadySaved) {
      user.savedItems = user.savedItems.filter(
        (item) => !(item.itemType === "Reel" && item.itemId.toString() === reel._id.toString())
      );
      user.savedReels.pull(reel._id);
    } else {
      user.savedItems.push({ itemType: "Reel", itemId: reel._id, savedAt: new Date() });
      user.savedReels.addToSet(reel._id);
    }
    await user.save();

    return res.status(200).json({ success: true, saved: !alreadySaved, savesCount: reel.savesCount });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update save" });
  }
};