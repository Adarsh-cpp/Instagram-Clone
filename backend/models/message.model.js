import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Conversation",
      required: true,
    },

    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    receiverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    text: {
      type: String,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    images: {
      type: [String],
      default: [],
    },

    sharedPost: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      default: null,
    },

    sharedReel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reel",
      default: null,
    },

    // Snapshot, NOT a live ref. Stories get TTL-deleted from Mongo 24h after
    // creation (see story.model.js), so a ref would go stale/null the moment
    // the original expires. We capture what's needed to render the card at
    // share-time; "is this expired" is judged purely from `createdAt` below,
    // independent of whether the source document still exists.
    sharedStory: {
      type: new mongoose.Schema(
        {
          storyId: { type: mongoose.Schema.Types.ObjectId, ref: "Story" },
          mediaType: { type: String, enum: ["image", "video"] },
          mediaUrl: String,
          bgColor: String,
          createdAt: Date, // original story's createdAt — used for the 24h expiry check
          author: {
            _id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            username: String,
            profilePic: String,
          },
        },
        { _id: false }
      ),
      default: null,
    },

    seen: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Faster message fetching
messageSchema.index({ conversationId: 1, createdAt: 1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;