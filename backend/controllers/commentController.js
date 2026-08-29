import postModel from "../models/post.model.js";
import commentModel from "../models/comment.model.js";
import { createNotification } from "../services/notification.service.js";


export const postComment = async (req, res) => {
  try {
    const text = req.body.comment;
    const author = req.user?._id;
    const postId = req.params.postId;

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

    const post = await postModel.findById(postId);

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

    post.commentsCount = post.commentsCount + 1;
    await post.save();

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
  const postId = req.params.postId;

  console.log("Post ID=",postId)

  try {
    const post = await postModel.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: "Post not found",
      });
    }

    

    // only top-level comments — replies are nested inside via populate,
    // so they don't also show up as their own top-level entries
    const comments = await commentModel
      .find({ post: postId, parentComment: null })
      .populate("author", "username profilePic")
      .populate({
        path: "replies",
        populate: { path: "author", select: "username profilePic" },
        options: { sort: { createdAt: 1 } }, // replies oldest-first, like Instagram
      })
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

// POST /post/:id/comment/:commentId/toggle-like
export const toggleCommentLike = async (req, res) => {
  
  try {
    const userId = req.user?._id;
    const { commentId } = req.params;

    
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const comment = await commentModel.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const alreadyLiked = comment.likes.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      comment.likes.pull(userId);
    } else {
      comment.likes.push(userId);

       // notify comment author, unless they liked their own comment
      if (comment.author.toString() !== userId.toString()) {
        await createNotification({
          recipientId: comment.author,
          senderId: userId,
          type: "comment_like",
          postId: comment.post,
          commentId: comment._id,
          commentText: comment.text,
        });
      }

    }

    await comment.save();

    return res.status(200).json({
      success: true,
      liked: !alreadyLiked,
      likesCount: comment.likes.length,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// POST /post/:id/comment/:commentId/reply
export const replyToComment = async (req, res) => {
  try {
    const text = req.body.comment;
    const author = req.user?._id;
    const postId = req.params.postId;
    const { commentId } = req.params;

    if (!author) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: "Reply cannot be empty" });
    }

    const parentComment = await commentModel.findById(commentId);
    if (!parentComment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const reply = await commentModel.create({
      text: text.trim(),
      author,
      post: postId,
      parentComment: commentId,
    });

    parentComment.replies.push(reply._id);
    await parentComment.save();

    const populatedReply = await reply.populate("author", "username profilePic");

    if (parentComment.author.toString() !== author.toString()) {
      await createNotification({
        recipientId: parentComment.author,
        senderId: author,
        type: "reply",
        postId,
        commentId: reply._id,
        commentText: text.trim(),
        parentCommentText: parentComment.text,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Reply added successfully",
      reply: populatedReply,
    });
  } catch (error) {
    console.error("Reply Comment Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};