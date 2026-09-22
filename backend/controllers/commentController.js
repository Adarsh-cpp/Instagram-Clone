import postModel from "../models/post.model.js";
import commentModel from "../models/comment.model.js";
import notificationModel from "../models/notification.model.js";
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
      .populate("author", "username profilePic role")
      .populate({
        path: "replies",
        populate: { path: "author", select: "username profilePic role" },
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


export const deleteComment = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { postId, commentId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const comment = await commentModel.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    // SECURITY: never trust :postId from the URL for the permission check.
    // Otherwise a user could pass their own post id with someone else's
    // commentId and pass the isPostAuthor check. The comment's own `post`
    // field is the source of truth.
    if (postId && postId !== comment.post.toString()) {
      return res.status(400).json({
        success: false,
        message: "Comment does not belong to this post",
      });
    }

    const post = await postModel.findById(comment.post);
    if (!post) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }

    const isCommentAuthor = comment.author.toString() === userId.toString();
    const isPostAuthor = post.author.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isCommentAuthor && !isPostAuthor && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own comments",
      });
    }

    const isReply = Boolean(comment.parentComment);

    // every comment id that is going away (used for notification cleanup)
    let idsToRemove;

    if (isReply) {
      // detach this reply from its parent's replies array
      await commentModel.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id },
      });
      idsToRemove = [comment._id];
    } else {
      // top-level comment — cascade-delete its replies too. Look them up via
      // BOTH replies[] and parentComment so nothing is orphaned if the array
      // ever drifted out of sync.
      const linkedReplyIds = await commentModel.distinct("_id", {
        parentComment: comment._id,
      });
      const replyIds = [
        ...new Set([
          ...(comment.replies || []).map(String),
          ...linkedReplyIds.map(String),
        ]),
      ];

      if (replyIds.length) {
        await commentModel.deleteMany({ _id: { $in: replyIds } });
      }
      idsToRemove = [comment._id, ...replyIds];

      // replies never incremented commentsCount (see replyToComment),
      // so only decrement when a top-level comment is removed
      await postModel.updateOne(
        { _id: post._id, commentsCount: { $gt: 0 } },
        { $inc: { commentsCount: -1 } }
      );
    }

    // comment / reply / comment_like notifications pointing at what we deleted
    await notificationModel.deleteMany({ comment: { $in: idsToRemove } });

    await commentModel.findByIdAndDelete(commentId);

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      deletedId: commentId,
      isReply,
    });
  } catch (error) {
    console.error("Delete Comment Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};