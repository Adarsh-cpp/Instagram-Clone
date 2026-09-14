import notificationModel from "../models/notification.model.js";
import userModel from "../models/user.model.js"

export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;

    const [notifications, totalCount, currentUser] = await Promise.all([
      notificationModel.find({ recipient: userId })
        .sort({ activityAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate("sender", "username fullName profilePic")
        // include everything CommentsOverlay needs to render the post: author info,
        // likes (for the like button state), caption/createdAt for the pseudo-comment
        // header, and commentsCount for the comment count.
        .populate({
          path: "post",
          select: "media author likes commentsCount caption createdAt",
          populate: { path: "author", select: "username profilePic isVerified" },
        })
        .populate({
          path: "reel",
          select: "media author likes commentsCount caption createdAt",
          populate: { path: "author", select: "username profilePic isVerified" },
        })
        .lean(),
      notificationModel.countDocuments({ recipient: userId }),
      userModel.findById(userId).select("following").lean(),
    ]);

    const followingIds = new Set((currentUser?.following || []).map((id) => id.toString()));

    const enriched = notifications.map((n) => ({
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