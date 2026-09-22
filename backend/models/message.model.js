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


    messageType: {
      type: String,
      enum: [
        "text",
        "image",
        "sticker",
        "post_share",
        "reel_share",
        "story_share",
        "story_reply",
      ],
      default: "text",
    },


    sticker: {
      type: new mongoose.Schema(
        {
          type: {
            type: String,
            enum: ["sticker", "animated_sticker", "gif"],
            required: true,
          },
          url: String,
          emoji: String,
          name: String,
        },
        { _id: false }
      ),
      default: null,
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

    repliedStory: {
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

    // Reply-to-message. A small SNAPSHOT of the message being replied to
    // (same idea as repliedStory above), written by the server at send time.
    // Because it's a snapshot, the quoted preview keeps rendering even if the
    // original message is later unsent, and no populate is needed anywhere.
    replyTo: {
      type: new mongoose.Schema(
        {
          messageId: { type: mongoose.Schema.Types.ObjectId, ref: "Message" },
          // who wrote the ORIGINAL message
          senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
          text: { type: String, default: "" },
          // first image of the original (if it had any), used as a thumbnail
          image: { type: String, default: "" },
          // original's messageType, used for "Photo" / "Sticker" / "Reel"... labels
          messageType: { type: String, default: "text" },
        },
        { _id: false }
      ),
      default: null,
    },

    reactions: {
      type: [
        new mongoose.Schema(
          {
            userId: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
              required: true,
            },
            emoji: {
              type: String,
              required: true,
            },
          },
          { _id: false }
        ),
      ],
      default: [],
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

messageSchema.index({ conversationId: 1, createdAt: 1 });


messageSchema.index(
  { conversationId: 1, createdAt: -1, _id: -1 },
  {
    name: "sharedMedia_idx",
    partialFilterExpression: { messageType: "image" },
  }
);

const Message = mongoose.model("Message", messageSchema);

export default Message;
