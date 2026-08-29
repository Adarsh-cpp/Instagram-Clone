import mongoose from "mongoose";

const reelCommentSchema = new mongoose.Schema(
  {
    reel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      required: true,
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 500 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReelComment",
      default: null,
    },
    replies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReelComment",
    }],
  },
  { timestamps: true }
);

export default mongoose.model("ReelComment", reelCommentSchema);