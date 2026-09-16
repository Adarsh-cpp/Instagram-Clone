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
    // Full track duration in seconds — used to validate song.startTime
    // on a story doesn't exceed this.
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
    // "copyright-free" = you uploaded it yourself via /song/create
    // "jamendo" = pulled in live from the Jamendo API.
    source: {
      type: String,
      default: "copyright-free",
    },
    // Jamendo's own track id — lets the importer skip tracks it already
    // pulled in instead of creating duplicates on every run.
    jamendoId: {
      type: Number,
      default: null,
      unique: true,
      sparse: true,
    },
    // Link to the track's specific Creative Commons license.
    licenseUrl: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const Song = mongoose.model("Song", songSchema);

export default Song;
