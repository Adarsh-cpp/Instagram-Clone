import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    mediaType: {
      type: String,
      enum: ["image", "video"],
      required: true,
    },

    // final flattened export (doodles/text/filters/resizing already baked in client-side)
    mediaUrl: {
      type: String,
      required: true,
    },

    mediaPublicId: {
      type: String,
      required: true,
    },

    // video-only — enforced both client-side and server-side, max 15s
    duration: {
      type: Number,
      default: 5, // fallback display duration for images (in seconds)
      max: [15, "Story duration cannot exceed 15 seconds"],
    },

    // purely metadata/analytics — the visual filter effect itself is already
    // baked into mediaUrl by the client canvas export, so this isn't reapplied
    filterUsed: {
      type: String,
      enum: [
        "none",
        "vintage",
        "retro",
        "modern",
        "noir",
        "warm",
        "cool",
        "dramatic",
        "fade",
      ],
      default: "none",
    },

    // background color chosen in the editor (relevant mainly when the media
    // doesn't fill the full canvas, e.g. a portrait image on a square canvas)
    bgColor: {
      type: String,
      default: "#000000",
    },

    // song is NOT baked into the media — it's played alongside it at view-time,
    // since a static image can't contain an audio track
    song: {
      songId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Song",
        default: null,
      },
      startTime: {
        type: Number, // second in the song to start playback from
        default: 0,
      },
    },

    viewers: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        viewedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

     likes: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        likedAt: { type: Date, default: Date.now },
      },
    ],

    // set to a Highlight's _id once saved into one; a story can belong to
    // AT MOST one highlight (enforced in controller logic, not schema)
    highlight: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Highlight",
      default: null,
    },

    isHighlighted: {
      type: Boolean,
      default: false,
    },

    // Always the story's real, original 24h expiry from creation — this
    // field is NEVER rewritten by the highlight controllers.
    // Whether a story shows up as an "active" story is governed purely by
    // comparing this to Date.now() (see getStoryFeed / getUserStories).
    // Whether a story is actually DELETED once this passes is a separate
    // concern, handled by jobs/storySweeper.js (see the index note below):
    // it removes the Cloudinary file AND the document for every expired
    // story that is not part of a highlight.
    expiresAt: {
      type: Date,
      default: () => Date.now() + 24 * 60 * 60 * 1000,
    },
  },
  { timestamps: true }
);

// Plain index on expiresAt — NOT a TTL index any more.
//
// Mongo's TTL monitor deletes documents silently, without running any
// application code, so the Cloudinary file of every naturally-expired story
// was left orphaned. Deletion is now done by jobs/storySweeper.js, which
// destroys the Cloudinary asset first and the document second (and skips
// stories where isHighlighted is true, so highlighted stories stay protected).
//
// This index keeps the sweeper's query (expiresAt <= now, isHighlighted:false)
// and the feed's "active stories" queries fast.
//
// One-time migration: the old TTL version of this index has the same name
// (expiresAt_1) but different options. connectDB.js runs Story.syncIndexes()
// on startup, which drops the old TTL index and creates this one. If
// db.stories.getIndexes() still shows expireAfterSeconds afterwards, drop it
// manually once: db.stories.dropIndex("expiresAt_1")
storySchema.index({ expiresAt: 1 });

// helpful for querying "all active stories by users I follow" quickly
storySchema.index({ author: 1, createdAt: -1 });

const Story = mongoose.model("Story", storySchema);
export default Story;
