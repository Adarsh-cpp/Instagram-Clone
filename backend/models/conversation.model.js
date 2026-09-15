import mongoose from "mongoose";
import {
  VALID_THEME_IDS,
  VALID_FONT_IDS,
} from "../constants/chatAppearance.js";

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
      enum: ["text", "image", "post_share", "reel_share", "story_share", "story_reply", "sticker"],
      default: "text",
    },

    lastMessageTime: {
      type: Date,
      default: Date.now,
    },

    // only the catalog id is stored — colors/stacks live client-side in
    // data/chatTheme.js, so restyling a theme never touches the DB
    chatTheme: {
      type: String,
      enum: VALID_THEME_IDS,
      default: "default",
    },

    chatFont: {
      type: String,
      enum: VALID_FONT_IDS,
      default: "default",
    },

    seenBy: {
      type: Map,
      of: Date,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

// Faster participant lookup
conversationSchema.index({ participants: 1 });

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;
