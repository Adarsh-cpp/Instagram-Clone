import Notification from "../models/notification.model.js";
import { getIO, onlineUsers } from "../config/socket.js";

export const createNotification = async ({
  recipientId,
  senderId,
  type,
  postId = null,
  reelId = null,
  commentId = null,
  reelCommentId = null,
  commentText = null,
}) => {
  if (recipientId.toString() === senderId.toString()) return null;

  let notification;

  if (type === "like" || type === "follow" || type === "tag") {
    notification = await Notification.findOneAndUpdate(
      { recipient: recipientId, sender: senderId, type, post: postId, reel: reelId },
      { $set: { isRead: false, activityAt: new Date() } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } else {
    notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId,
      reel: reelId,
      comment: commentId,
      reelComment: reelCommentId,
      commentText,
      activityAt: new Date(),
    });
  }

  const populated = await notification.populate([
    { path: "sender", select: "username fullName profilePic" },
    { path: "post", select: "media" },
    { path: "reel", select: "media" },
  ]);

  // onlineUsers stores a Set of socket ids per user (multiple tabs/devices),
  // so we loop over it — io.to() needs a string room name, not a Set.
  const receiverSockets = onlineUsers.get(recipientId.toString());
  if (receiverSockets && receiverSockets.size > 0) {
    const io = getIO();
    const unreadCount = await Notification.countDocuments({ recipient: recipientId, isRead: false });

    receiverSockets.forEach((sid) => {
      io.to(sid).emit("newNotification", populated);
      io.to(sid).emit("unreadNotificationCount", unreadCount);
    });
  }

  return populated;
};

export const removeNotification = async ({ recipientId, senderId, type, postId = null, reelId = null }) => {
  await Notification.findOneAndDelete({ recipient: recipientId, sender: senderId, type, post: postId, reel: reelId });

  const receiverSockets = onlineUsers.get(recipientId.toString());
  if (receiverSockets && receiverSockets.size > 0) {
    const io = getIO();
    const unreadCount = await Notification.countDocuments({ recipient: recipientId, isRead: false });

    receiverSockets.forEach((sid) => {
      io.to(sid).emit("unreadNotificationCount", unreadCount);
    });
  }
};