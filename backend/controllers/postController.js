import cloudinary from "../config/cloudinary.js";
import postModel from "../models/post.model.js";
import userModel from "../models/user.model.js";
import commentModel from "../models/comment.model.js";
import { createNotification, removeNotification } from "../services/notification.service.js";
import { uploadMultipleMedia } from "../services/upload.service.js";

const MAX_IMAGES = 5;

export const createPost = async (req, res) => {
  try {
    const { caption, ratio } = req.body;
    const userId = req.user._id;
    const files = req.files; 

    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide at least one image",
      });
    }

    if (files.length > MAX_IMAGES) {
      return res.status(400).json({
        success: false,
        message: `A post can have at most ${MAX_IMAGES} images`,
      });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const folder = `instagram-clone/users/${req.user._id}/images`;
    const media = await uploadMultipleMedia(files, folder, { resource_type: "image" });

    const post = await postModel.create({
      caption: caption || "",
      aspectRatio: ratio || "1:1",
      media,
      author: req.user._id,
    });

    user.postsCount = user.postsCount + 1;
    await user.save();

    return res.status(201).json({
      success: true,
      message: "Post created successfully",
      post,
    });
  } catch (error) {
    console.error("Create Post Error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to create post",
      error: error.message,
    });
  }
};

export const getFeedPosts = async (req, res) => {
 
  try {
    const userId = req.user._id;

    const user = await userModel.findById(userId);

    const savedPosts = user.savedPosts.map(
      id => id.toString()
    );

     

    const posts = await postModel.aggregate([
      {
        $sample: { size: 10 }
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "author"
        }
      },
      {
        $unwind: "$author"
      }
    ]);

     

    const updatedPosts = posts.map(post => ({
      ...post,
      isSaved: savedPosts.includes(post._id.toString())
    }));

    

    res.status(200).json({
      success: true,
      posts: updatedPosts
    });

  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const toggleLikes = async (req, res) => {
  try {
    const post = await postModel.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const alreadyLiked = post.likes.includes(req.user._id);

    if (alreadyLiked) {
      post.likes.pull(req.user._id); // <- this was missing — actually remove the like
      await removeNotification({ recipientId: post.author, senderId: req.user._id, type: "like", postId: post._id });
    } else {
      post.likes.push(req.user._id);
      await createNotification({ recipientId: post.author, senderId: req.user._id, type: "like", postId: post._id });
    }

    await post.save();

    res.json({
      success: true,
      likesCount: post.likes.length,
      liked: !alreadyLiked,
    });
  } catch (error) {
    console.error("Toggle Like Error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const postComment = async (req, res) => {
  try {
    const text = req.body.comment;
    const author = req.user?._id;
    const postId = req.params.id;

    // console.log(text,author,post)

    // Basic validations
    if (!author) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({
        success: false,
        message: "Comment cannot be empty",
      });
    }

  
    const post = await postModel.findById(postId)

      if (!post) {
      return res.status(400).json({
        success: false,
        message: "Post not found",
      });
    }

    const comment = await commentModel.create({
      text: text.trim(),
      author,
      post,
    });
    post.commentsCount = post.commentsCount + 1
    await post.save()

    await createNotification({
      recipientId: post.author,
      senderId: author,
      type: "comment",
      postId: post._id,
      commentId: comment._id,
      commentText: text,
    });

    return res.status(201).json({
      success: true,
      message: "Comment added successfully",
      comment,
    });
  } catch (error) {
    console.error("Post Comment Error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};


export const getComments = async (req, res) => {
  const postId = req.params.id;
  console.log(postId)

  try {
    const post = await postModel.findById(postId);
    
    console.log(post)

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    const comments = await commentModel
      .find({ post: postId })
      .populate("author", "username profilePic")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      comments,
    });
  } catch (error) {
    console.error(error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

export const getAllPosts = async (req, res) => {
  try {
    const posts = await postModel.find().populate("author").populate("likes")

    if(posts.length == 0) return res.status(404).json({success:false, message:"No Posts Found"})

    return res.status(200).json({success:true, message:"All Posts fetched succesfully", posts})

  } catch (error) {
   return res.status(500).json({success:false, message:"Internal server error"})
  }
}

export const toggleSavePosts = async (req, res) => {

  try {
      const postId = req.params.id;
      const userId = req.user._id;

      const post = await postModel.findById(postId)
      const user = await userModel.findById(userId)
      
      const alreadySaved = user.savedPosts.some( id => id.toString() === postId );
      // console.log(alreadySaved)
      // console.log(post)

    if(!post) return res.status(404).json({success: false, message:"No posts found"})

    if(alreadySaved) {
          user.savedPosts.pull(postId);
        } else {
          user.savedPosts.push(postId);
    }

    await user.save()
    return res.status(200).json({ success:true, alreadySaved:alreadySaved, message:"Saved posts toggled successfully" })
        

  } catch (error) {
   return res.status(500).json({success:false, message:"Internal server error"})
  }
}

export const getSavedPosts = async (req, res) => {
    try {
        const userId = req.user._id;

        const user = await userModel
            .findById(userId)
            .populate({
                path: "savedPosts",
                populate: {
                    path: "author",
                    select: "username profileImage"
                }
            });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        return res.status(200).json({
            success: true,
            savedPosts: user.savedPosts
        });

    } catch (error) {
        console.log(error.message);

        return res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

