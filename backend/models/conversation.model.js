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

    // Sorted "idA_idB" for two-person chats. Combined with the unique index
    // below, this makes it impossible for the database to hold two
    // conversations between the same pair of users, no matter how many
    // requests race each other.
    participantsKey: {
      type: String,
    },

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

// Keeps participantsKey correct automatically whenever a conversation is
// created or saved, so it can never drift from `participants`.
conversationSchema.pre("validate", function (next) {
  if (Array.isArray(this.participants) && this.participants.length === 2) {
    this.participantsKey = this.participants
      .map((p) => p.toString())
      .sort()
      .join("_");
  }
  next();
});

// Faster participant lookup
conversationSchema.index({ participants: 1 });

// One conversation per pair of users. Partial, so old documents that don't
// have a key yet (before the cleanup script runs) don't violate uniqueness.
conversationSchema.index(
  { participantsKey: 1 },
  {
    unique: true,
    partialFilterExpression: { participantsKey: { $type: "string" } },
  }
);

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;