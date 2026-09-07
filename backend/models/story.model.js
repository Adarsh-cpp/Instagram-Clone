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

    // TTL field — story auto-deletes 24h after creation UNLESS isHighlighted
    // is true, in which case this field is $unset (see highlight controller)
    // so Mongo's TTL monitor skips it entirely.
    expiresAt: {
      type: Date,
      default: () => Date.now() + 24 * 60 * 60 * 1000,
    },
  },
  { timestamps: true }
);

// TTL index — Mongo automatically deletes documents once expiresAt is in the
// past. Documents where expiresAt has been unset are NOT touched by this.
storySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// helpful for querying "all active stories by users I follow" quickly
storySchema.index({ author: 1, createdAt: -1 });

const Story = mongoose.model("Story", storySchema);
export default Story;