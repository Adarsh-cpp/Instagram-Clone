import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessage: {
      type: String,
      default: "",
    },

    // who sent the last message, so the UI can render
    // "your"/"their" labels correctly per viewer
    lastMessageSenderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    // lets the client know when lastMessage isn't literal text
    // (e.g. a story reply, which should render as a fixed label, not
    // the raw reply text)
    lastMessageType: {
      type: String,
      enum: ["text", "image", "post_share", "reel_share", "story_share", "story_reply"],
      default: "text",
    },

    lastMessageTime: {
      type: Date,
      default: Date.now,
    },

    seenBy: {
      type: Map,
      of: Date,
      default: {}
  }
  },
  {
    timestamps: true,
  }
);

// Faster participant lookup
conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;