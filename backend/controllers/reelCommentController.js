import Reel from "../models/reel.model.js";
import reelCommentModel from "../models/reelComment.model.js";
import ReelComment from "../models/reelComment.model.js";
import { createNotification, removeNotification } from "../services/notification.service.js";

export const addComment = async (req, res) => {
  try {
    const { text, parentComment } = req.body;
    if (!text?.trim()) {
      return res.status(400).json({ message: "Comment text is required" });
    }

    const reel = await Reel.findById(req.params.id);
    if (!reel) return res.status(404).json({ message: "Reel not found" });

    let parent = null;
    if (parentComment) {
      parent = await ReelComment.findById(parentComment);
      if (!parent) return res.status(404).json({ message: "Parent comment not found" });
    }

    const comment = await ReelComment.create({
      reel: reel._id,
      author: req.user._id,
      text: text.trim(),
      parentComment: parentComment || null,
    });

    if (parent) {
      parent.replies.push(comment._id);
      await parent.save();
    }
    else{
      reel.commentsCount += 1;
    }
    
    await reel.save();

      await createNotification({
          recipientId: reel.author,
          senderId: req.user._id,
          type: "comment",
          reelId: reel._id,
          commentId: comment._id,
          commentText: text,
        });

    const populated = await comment.populate("author", "username profilePic");
    return res.status(201).json({ success:true, comment: populated });
  } catch (err) {
    return res.status(500).json({ message: "Failed to add comment" });
  }
};

export const getComments = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const comments = await ReelComment.find({ reel: req.params.id, parentComment: null })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "username profilePic role")
      .populate({
        path: "replies",
        populate: { path: "author", select: "username profilePic role" },
      });

    return res.status(200).json({success:true, comments, page, hasMore: comments.length === limit });
  } catch (err) {
    return res.status(500).json({ message: "Failed to fetch comments" });
  }
};

export const toggleCommentLike = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { commentId } = req.params;

    

    
    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const reelComment = await reelCommentModel.findById(commentId);

    console.log(reelComment)

    if (!reelComment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    const alreadyLiked = reelComment.likes.some(
      (id) => id.toString() === userId.toString()
    );

    if (alreadyLiked) {
      reelComment.likes.pull(userId);
    } else {
      reelComment.likes.push(userId);

       // notify comment author, unless they liked their own comment
    if (reelComment.author.toString() !== userId.toString()) {
            await createNotification({
                recipientId: reelComment.author,
                senderId: userId,
                type: "comment_like",
                reelId: reelComment.reel,
                reelCommentId: reelComment._id,
                commentText: reelComment.text,
            });
            }

    }

    await reelComment.save();

    return res.status(200).json({
      success: true,
      liked: !alreadyLiked,
      likesCount: reelComment.likes.length,
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
}
