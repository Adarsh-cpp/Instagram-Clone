import mongoose from 'mongoose';


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
    
  },
  { timestamps: true }
);


// To limit the slides count to 10
postSchema.path("media").validate(function (value) {
  return value.length <= 10;
}, "A post can have maximum 10 media items");

const Post = mongoose.model('Post', postSchema);
export default Post;

