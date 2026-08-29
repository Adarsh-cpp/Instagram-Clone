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

  if (type === "like" || type === "follow") {
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
    { path: "post", select: "images" },
    { path: "reel", select: "media" },
  ]);

  const receiverSocketId = onlineUsers.get(recipientId.toString());
  if (receiverSocketId) {
    const io = getIO();
    io.to(receiverSocketId).emit("newNotification", populated);
    const unreadCount = await Notification.countDocuments({ recipient: recipientId, isRead: false });
    io.to(receiverSocketId).emit("unreadNotificationCount", unreadCount);
  }

  return populated;
};

export const removeNotification = async ({ recipientId, senderId, type, postId = null, reelId = null }) => {
  await Notification.findOneAndDelete({ recipient: recipientId, sender: senderId, type, post: postId, reel: reelId });

  const receiverSocketId = onlineUsers.get(recipientId.toString());
  if (receiverSocketId) {
    const io = getIO();
    const unreadCount = await Notification.countDocuments({ recipient: recipientId, isRead: false });
    io.to(receiverSocketId).emit("unreadNotificationCount", unreadCount);
  }
};