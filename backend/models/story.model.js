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
    // field is NEVER rewritten by the highlight controllers anymore.
    // Whether a story shows up as an "active" story is governed purely by
    // comparing this to Date.now() (see getStoryFeed / getUserStories).
    // Whether Mongo is actually ALLOWED to delete the document once this
    // passes is a completely separate concern, handled by the partial TTL
    // index below — that's the fix for the two bugs this used to cause:
    //   1) bumping this to "now + 24h" when a story left a highlight made
    //      old stories look brand new in the active feed again.
    //   2) $unset-ing this the moment a story joined a highlight made it
    //      disappear from the active feed immediately instead of at its
    //      real 24h mark.
    expiresAt: {
      type: Date,
      default: () => Date.now() + 24 * 60 * 60 * 1000,
    },
  },
  { timestamps: true }
);

// TTL index — Mongo deletes a document once expiresAt is in the past, BUT
// only for documents matching the partialFilterExpression, i.e. only ones
// that are NOT currently part of a highlight. A highlighted story is fully
// protected from this deletion no matter how old expiresAt gets; the moment
// it's unlinked from its highlight (isHighlighted -> false), it becomes
// eligible again and Mongo's TTL monitor cleans it up on its next sweep
// using whatever expiresAt it already has — no manual timestamp juggling
// needed anywhere in the controllers.
//
// IMPORTANT (one-time, on deploy): if this index already existed in your
// database without partialFilterExpression, Mongo/Mongoose will NOT alter
// it in place. Either drop it manually once —
//   db.stories.dropIndex("expiresAt_1")
// — and let the app recreate it (e.g. via mongoose.syncIndexes()), or run
// syncIndexes() yourself; otherwise the old, unscoped TTL behavior stays live.
storySchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, partialFilterExpression: { isHighlighted: false } }
);

// helpful for querying "all active stories by users I follow" quickly
storySchema.index({ author: 1, createdAt: -1 });

const Story = mongoose.model("Story", storySchema);
export default Story;
