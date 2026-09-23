import Reel from "../models/reel.model.js";
import reelCommentModel from "../models/reelComment.model.js";
import ReelComment from "../models/reelComment.model.js";
import notificationModel from "../models/notification.model.js";
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

// Deletes a reel comment (or a reply). Allowed for: the comment's own
// author, the reel's owner (moderating comments on their own reel), or
// an admin (moderating any comment on any reel) — same three-way rule
// used for post comments.
export const deleteComment = async (req, res) => {
  try {
    const userId = req.user?._id;
    const { id: reelId, commentId } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const comment = await ReelComment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ success: false, message: "Comment not found" });
    }

    // SECURITY: never trust the reel id from the URL for the permission
    // check — the comment's own `reel` field is the source of truth.
    if (reelId && reelId !== comment.reel.toString()) {
      return res.status(400).json({
        success: false,
        message: "Comment does not belong to this reel",
      });
    }

    const reel = await Reel.findById(comment.reel);
    if (!reel) {
      return res.status(404).json({ success: false, message: "Reel not found" });
    }

    const isCommentAuthor = comment.author.toString() === userId.toString();
    const isReelAuthor = reel.author.toString() === userId.toString();
    const isAdmin = req.user.role === "admin";

    if (!isCommentAuthor && !isReelAuthor && !isAdmin) {
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
      await ReelComment.findByIdAndUpdate(comment.parentComment, {
        $pull: { replies: comment._id },
      });
      idsToRemove = [comment._id];
    } else {
      // top-level comment — cascade-delete its replies too, found via BOTH
      // replies[] and parentComment so nothing is orphaned
      const linkedReplyIds = await ReelComment.distinct("_id", {
        parentComment: comment._id,
      });
      const replyIds = [
        ...new Set([
          ...(comment.replies || []).map(String),
          ...linkedReplyIds.map(String),
        ]),
      ];

      if (replyIds.length) {
        await ReelComment.deleteMany({ _id: { $in: replyIds } });
      }
      idsToRemove = [comment._id, ...replyIds];

      // replies never incremented commentsCount (see addComment),
      // so only decrement when a top-level comment is removed
      await Reel.updateOne(
        { _id: reel._id, commentsCount: { $gt: 0 } },
        { $inc: { commentsCount: -1 } }
      );
    }

    // comment / reply / comment_like notifications pointing at what we deleted
    await notificationModel.deleteMany({ reelComment: { $in: idsToRemove } });

    await ReelComment.findByIdAndDelete(commentId);

    return res.status(200).json({
      success: true,
      message: "Comment deleted successfully",
      deletedId: commentId,
      isReply,
    });
  } catch (error) {
    console.error("Delete Reel Comment Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};