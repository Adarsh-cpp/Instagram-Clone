import notificationModel from "../models/notification.model.js";
import userModel from "../models/user.model.js";

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const [rawNotifications, totalCount, currentUser] = await Promise.all([
      notificationModel
        .find({ recipient: userId })
        .sort({ activityAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      notificationModel.countDocuments({ recipient: userId }),
      userModel.findById(userId).select("following").lean(),
    ]);

    // Remember whether each notification originally pointed at a post/reel
    // BEFORE populate overwrites that ObjectId with the populated doc (or null).
    const withRawRefs = rawNotifications.map((n) => ({
      ...n,
      _hadPost: !!n.post,
      _hadReel: !!n.reel,
    }));

    // Model.populate() works on plain lean objects too, not just documents.
    const populated = await notificationModel.populate(withRawRefs, [
      { path: "sender", select: "username fullName profilePic" },
      {
        path: "post",
        select: "media author likes commentsCount caption createdAt",
        populate: { path: "author", select: "username profilePic isVerified" },
      },
      {
        path: "reel",
        select: "media author likes commentsCount caption createdAt",
        populate: { path: "author", select: "username profilePic isVerified" },
      },
    ]);

    // A notification is "stale" if it referenced a post/reel that no longer
    // exists (populate resolved it to null). Drop it from the response and
    // queue it for deletion from the DB.
    const staleIds = [];
    const validNotifications = [];

    for (const n of populated) {
      const postDeleted = n._hadPost && !n.post;
      const reelDeleted = n._hadReel && !n.reel;

      if (postDeleted || reelDeleted) {
        staleIds.push(n._id);
        continue;
      }

      delete n._hadPost;
      delete n._hadReel;
      validNotifications.push(n);
    }

    if (staleIds.length > 0) {
      // Fire-and-forget cleanup — don't block the response on this.
      notificationModel.deleteMany({ _id: { $in: staleIds } }).catch((err) => {
        console.error("Failed to clean up stale notifications:", err.message);
      });
    }

    const followingIds = new Set((currentUser?.following || []).map((id) => id.toString()));

    const enriched = validNotifications.map((n) => ({
      ...n,
      isFollowingSender: n.sender ? followingIds.has(n.sender._id.toString()) : false,
    }));

    res.status(200).json({ notifications: enriched, hasMore: page * limit < totalCount });
  } catch (error) {
    console.error("getNotifications:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await notificationModel.countDocuments({ recipient: req.user._id, isRead: false });
    res.status(200).json({ count });
  } catch (error) {
    console.error("getUnreadCount:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await notificationModel.updateMany({ recipient: req.user._id, isRead: false }, { $set: { isRead: true } });
    res.status(200).json({ message: "All notifications marked as read" });
  } catch (error) {
    console.error("markAllAsRead:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const markOneAsRead = async (req, res) => {
  try {
    const notification = await notificationModel.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { isRead: true } },
      { new: true }
    );
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.status(200).json(notification);
  } catch (error) {
    console.error("markOneAsRead:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const deleteNotification = async (req, res) => {
  try {
    const notification = await notificationModel.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    if (!notification) return res.status(404).json({ error: "Notification not found" });
    res.status(200).json({ message: "Deleted" });
  } catch (error) {
    console.error("deleteNotification:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
};