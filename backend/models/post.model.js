import mongoose from 'mongoose';

// AI-generated search metadata. The whole subdocument is select:false so
// existing queries (feed, profile, etc.) never ship it to the client.
// Read it explicitly with .select("+ai") when needed.
const aiSchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: ["pending", "processing", "done", "failed", "skipped"],
    },
    attempts: { type: Number, default: 0 },
    lockedAt: { type: Date, default: null },
    nextAttemptAt: { type: Date, default: null },
    processedAt: { type: Date, default: null },
    lastError: { type: String, default: null },

    model: { type: String, default: null },
    embeddingModel: { type: String, default: null },

    description: { type: String, default: "" },
    tags: { type: [String], default: [] },
    attributes: {
      objects: { type: [String], default: [] },
      people: { type: [String], default: [] },
      clothing: { type: [String], default: [] },
      activities: { type: [String], default: [] },
      colors: { type: [String], default: [] },
      setting: { type: [String], default: [] },
      text: { type: [String], default: [] },
    },

    embedding: { type: [Number], default: undefined },
  },
  { _id: false }
);

const postSchema = new mongoose.Schema(
  {
    caption: {
      type: String,
      default: "",
    },

    media: [
      {
        url: {
          type: String,
          required: true,
        },

        mediaType: {
          type: String,
          enum: ["image", "video"],
          required: true,
        },

        publicId: {
          type: String,
          required: true,
        },
      },
    ],

    aspectRatio: {
      type: String,
      enum: ["1:1", "4:5", "16:9"],
    },

    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    commentsCount: 
      {
        type: Number,
        default: 0,
      },

    location: {
      name: { type: String, default: "" },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
    },

    taggedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // AI search metadata (see services/postIndexing.service.js)
    ai: {
      type: aiSchema,
      select: false,
      default: undefined,
    },
  },
  { timestamps: true }
);


// To limit the slides count to 10
postSchema.path("media").validate(function (value) {
  return value.length <= 10;
}, "A post can have maximum 10 media items");

// Lets the indexing sweeper find work without a collection scan.
postSchema.index({ "ai.status": 1, "ai.nextAttemptAt": 1, createdAt: -1 });

const Post = mongoose.model('Post', postSchema);
export default Post;