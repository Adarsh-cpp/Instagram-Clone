import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    type: {
      type: String,
      enum: ["follow", "like", "comment", "comment_like", "reply", "tag"],
      required: true,
    },

    // For image-post notifications
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
    },

    // For reel notifications
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
    },

    // For image-post comments
    comment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },

    // For reel comments
    reelComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReelComment",
    },

    commentText: {
      type: String,
    },

    // Only set for "reply" notifications
    parentCommentText: {
      type: String,
    },

    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    activityAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

notificationSchema.index({
  recipient: 1,
  activityAt: -1,
});

notificationSchema.index(
  {
    recipient: 1,
    sender: 1,
    type: 1,
    post: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      type: {
        $in: ["like", "follow", "tag"],
      },
    },
  }
);

export default mongoose.model("Notification", notificationSchema);