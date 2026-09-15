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

    // Sticker / animated sticker / GIF sent as a standalone message.
    // - "sticker": static emoji sticker — no external asset, just `emoji`
    // - "animated_sticker": Lottie JSON animation — `url` points at the JSON
    // - "gif": GIF from GIPHY — `url` points at the GIF image
    // Only one of `url` / `emoji` will be set depending on `type`.
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

    // Snapshot, same reasoning as sharedStory above (story may TTL-expire
    // out from under this message). Set only when this message was created
    // via "reply to story" — distinct from sharedStory, which is for
    // forwarding a story to someone else. A message will only ever have
    // ONE of sharedStory / repliedStory set, never both.
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
