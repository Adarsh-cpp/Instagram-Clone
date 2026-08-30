import mongoose from "mongoose";

const highlightSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
      maxLength: [20, "Highlight title must be at most 20 characters"],
    },

    // thumbnail shown on the profile page's highlight circle —
    // defaults to the first story's media if not explicitly set
    coverImage: {
      type: String,
      default: "",
    },

    stories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Story",
      },
    ],
  },
  { timestamps: true }
);

highlightSchema.index({ owner: 1 });

const Highlight = mongoose.model("Highlight", highlightSchema);
export default Highlight;