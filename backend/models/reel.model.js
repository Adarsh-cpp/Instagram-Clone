import mongoose from "mongoose";

const reelSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      trim: true,
      maxlength: 2200,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    media: {
      // While status === "processing" this holds the untrimmed ORIGINAL's url
      // as a placeholder. It is replaced with the optimized clip when ready.
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      thumbnailUrl: { type: String },
      duration: { type: Number, required: true }, // seconds
      width: { type: Number, required: true },
      height: { type: Number, required: true },
    },
    aspectRatio: {
      type: String,
      enum: ["9:16", "16:9"],
      required: true,
    },
    // "ready" is the default so every reel that existed before this field
    // was added keeps working without a migration.
    status: {
      type: String,
      enum: ["processing", "ready", "failed"],
      default: "ready",
      index: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    sharesCount: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
    saves: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", default: [] }],
    savesCount: { type: Number, default: 0 },
    taggedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

reelSchema.index({ createdAt: -1 });
reelSchema.index({ author: 1, createdAt: -1 });
// One Reel per Cloudinary upload — makes a replayed create-reel call safe.
// (If this fails to build, you already have duplicate publicIds; delete the
// extra docs first.)
reelSchema.index({ "media.publicId": 1 }, { unique: true });

export default mongoose.model("Reel", reelSchema);
