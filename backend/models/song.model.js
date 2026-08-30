import mongoose from "mongoose";

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    artist: {
      type: String,
      trim: true,
      default: "Unknown",
    },

    audioUrl: {
      type: String,
      required: true,
    },

    audioPublicId: {
      type: String,
      required: true,
    },

    // full track duration in seconds — used to validate `song.startTime`
    // on a story doesn't exceed this
    duration: {
      type: Number,
      required: true,
    },

    thumbnail: {
      type: String,
      default: "",
    },

    genre: {
      type: String,
      default: "General",
    },

    // since these are copyright-free tracks you're seeding yourself
    source: {
      type: String,
      default: "copyright-free",
    },
  },
  { timestamps: true }
);

const Song = mongoose.model("Song", songSchema);
export default Song;