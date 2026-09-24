// Comment.jsx
import React, { useState } from "react";
import { BadgeCheck } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";
import { getTimeAgo } from "../utils/timeAgo";
import { useAuth } from "../context/AuthContext";

const BASE_URL = import.meta.env.VITE_SERVER_URL;

const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
});

// renders a leading "@username" mention (if present) in a distinct color,
// rest of the text stays normal — this is how "replying to a reply" shows
// up without the backend needing to know about nested replies at all
const renderTextWithMention = (text = "") => {
  const match = text.match(/^(@\S+)(\s|$)/);
  if (!match) return <>{text}</>;
  const mention = match[1];
  const rest = text.slice(match[0].length);
  return (
    <>
      <span className="text-[var(--link-muted)] font-medium">{mention}</span> {rest}
    </>
  );
};

const Comment = ({
  comment,          // real Comment document: { _id, text, author, likes, replies, createdAt }
  postId,
  reelId,
  currentUserId,
  isReply = false,  // true when this Comment is being rendered inside a replies thread
  onReplyClick,     // only used when isReply — bubbles the reply target up to the top-level Comment
  onDeleted,        // only used for top-level comments — tells CommentsOverlay to drop it from the list
  onReplyDeleted,   // only used for replies — tells the parent Comment to drop it from its replies state
  canModerate = false, // true when the logged-in user owns the post/reel this comment belongs to —
                        // lets them delete ANY comment on it, not just their own
  // fallback props — used only for the post-caption pseudo-comment, which has no real Comment doc
  author,
  authorDP,
  text,
  createdAt,
  verified,
}) => {

  const { user, refreshUser } = useAuth();
  const isOwnComment = user?._id?.toString() === comment?.author?._id?.toString();

  // Either the person who wrote this comment, or the person who owns
  // the post/reel it's on, is allowed to delete it.
  const canDelete = isOwnComment || canModerate;

  const isRealComment = Boolean(comment?._id);

  const displayAuthor = comment?.author?.username || author;
  const displayDP = comment?.author?.profilePic || authorDP || "/images/default-profile-pic.jpg";
  const displayText = comment?.text ?? text;
  const displayTime = comment?.createdAt ?? createdAt;
  const commentTime = getTimeAgo(displayTime);

  // Blue verified tick, shown only for the admin account. Real comments
  // check the comment author's own role; the caption pseudo-comment has
  // no `comment` doc, so it falls back to the `verified` prop passed in
  // by the caller (CommentsOverlay derives that from the post/reel author).
  const isAdminAuthor = isRealComment
    ? comment?.author?.role === "admin"
    : Boolean(verified);

  const [isLiked, setIsLiked] = useState(
    isRealComment
      ? comment.likes?.some((id) => id.toString() === currentUserId?.toString())
      : false
  );
  const [likesCount, setLikesCount] = useState(isRealComment ? comment.likes?.length || 0 : 0);
  const [showHeartPop, setShowHeartPop] = useState(false);

  const [replies, setReplies] = useState(comment?.replies || []);
  const [showReplies, setShowReplies] = useState(false);

  const [replyTarget, setReplyTarget] = useState(null); // { username } | null
  const [replyText, setReplyText] = useState("");
  const [posting, setPosting] = useState(false);

  // delete flow: 3-dot button -> tiny "Delete comment" popup -> confirm dialog
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleLike = async () => {
    if (!isRealComment) return;
    try {
      const url = reelId
        ? `${BASE_URL}/reels/${reelId}/comment/${comment._id}/toggle-like`
        : `${BASE_URL}/${postId}/comment/${comment._id}/toggle-like`;

      const { data } = await axios.post(url, {}, authConfig());

      setIsLiked(data.liked);
      setLikesCount(data.likesCount);
    } catch (error) {
      console.log(error);
    }
  };

  const handleDoubleClick = () => {
    if (!isRealComment || isLiked) return; // double-click only ever likes, never unlikes
    setShowHeartPop(true);
    setTimeout(() => setShowHeartPop(false), 700);
    toggleLike();
  };

  const openReplyBox = () => {
    setReplyTarget({ username: displayAuthor });
    setShowReplies(true);
  };

  const handlePostReply = async () => {
    if (!replyText.trim() || posting) return;
    setPosting(true);
    try {
      const finalText = replyTarget
        ? `@${replyTarget.username} ${replyText.trim()}`
        : replyText.trim();

      let newReply = null;

      if (reelId) {
        // Reel comment reply — reuses the reel comment creation endpoint,
        // just with parentComment set to this comment's id.
        const response = await axios.post(
          `${BASE_URL}/reels/${reelId}/post-comment`,
          { text: finalText, parentComment: comment._id },
          authConfig()
        );
        newReply = response.data.comment;
      } else {
        // Regular post comment reply
        const response = await axios.post(
          `${BASE_URL}/${postId}/comment/${comment._id}/reply`,
          { comment: finalText },
          authConfig()
        );
        newReply = response.data.success ? response.data.reply : null;
      }

      if (newReply) {
        setReplies((prev) => [...prev, newReply]);
        setReplyText("");
        setReplyTarget(null);
      }
    } catch (error) {
      console.log(error);
    } finally {
      setPosting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      const url = reelId
        ? `${BASE_URL}/reels/${reelId}/comment/${comment._id}/delete`
        : `${BASE_URL}/${postId}/comment/${comment._id}/delete`;

      await axios.delete(url, authConfig());

      if (isReply) {
        onReplyDeleted?.(comment._id);
      } else {
        onDeleted?.(comment._id);
      }

      // keeps commentsCount in sync everywhere it's shown (feed, post detail, profile grid, etc.)
      await refreshUser();
    } catch (error) {
      console.log(error);
      toast.error("Couldn't delete comment, try again");
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <div className={isReply ? "flex flex-col ml-10 sm:ml-12 mt-2" : "flex flex-col"}>
      <div className="flex gap-3 rounded-2xl px-2 py-3 sm:px-3 hover:bg-[var(--bg-row-hover)] transition">
        <img
          src={displayDP}
          alt={displayAuthor}
          className={`${
            isReply ? "h-8 w-8" : "h-10 w-10 sm:h-11 sm:w-11"
          } rounded-full object-cover shrink-0`}
        />

        <div className="min-w-0 flex-1" onDoubleClick={handleDoubleClick}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="text-sm sm:text-[15px] font-semibold text-[var(--text-primary)] truncate flex items-center gap-1">
             {isOwnComment ? displayAuthor : displayAuthor}
             {isAdminAuthor && (
               <BadgeCheck size={13} className="text-sky-400 shrink-0" />
             )}
            </h4>

            <span className="text-[11px] sm:text-xs text-[var(--text-muted)]">{commentTime}</span>
          </div>

          <p className="mt-1 text-sm sm:text-[15px] leading-5 text-[var(--text-secondary)] break-words">
            {renderTextWithMention(displayText)}
          </p>

          {isRealComment && (
            <div className="mt-2 flex items-center gap-4 text-xs sm:text-sm text-[var(--text-muted)]">
              <button
                onClick={isReply ? () => onReplyClick?.(displayAuthor) : openReplyBox}
                className="hover:text-[var(--text-primary)] transition cursor-pointer"
              >
                Reply
              </button>

              {likesCount > 0 && (
                <span>{likesCount} {likesCount === 1 ? "like" : "likes"}</span>
              )}

              {!isReply && replies.length > 0 && (
                <button
                  onClick={() => setShowReplies((prev) => !prev)}
                  className="hover:text-[var(--text-primary)] transition cursor-pointer font-semibold"
                >
                  {showReplies ? "Hide replies" : `Replies (${replies.length})`}
                </button>
              )}
            </div>
          )}
        </div>

        {isRealComment && (
          <div className="shrink-0 relative flex flex-col items-center gap-1">
            <button
              onClick={toggleLike}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer px-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? "var(--color-danger)" : "none"} stroke={isLiked ? "var(--color-danger)" : "currentColor"} strokeWidth="2">
                <path d="M12 21s-6.7-4.35-9.33-8.2C1.1 10.6 1.5 7.3 4.2 5.6c2.2-1.4 4.9-.8 6.4 1.1L12 8l1.4-1.3c1.5-1.9 4.2-2.5 6.4-1.1 2.7 1.7 3.1 5 1.53 7.2C18.7 16.65 12 21 12 21z" />
              </svg>
            </button>

            {showHeartPop && (
              <span className="absolute -top-3 text-[var(--color-danger)] text-lg animate-ping pointer-events-none">
                ❤
              </span>
            )}

            {/* 3-dot menu — shown to the comment's own author, AND to
                the post/reel owner (who can moderate any comment) */}
            {canDelete && (
              <div className="relative">
                <button
                  onClick={() => setShowMenu((prev) => !prev)}
                  className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer px-1 text-sm leading-none"
                >
                  ⋯
                </button>

                {showMenu && (
                  <>
                    {/* click-away layer */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowMenu(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-50 w-32 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-surface)] shadow-lg py-1">
                      <button
                        onClick={() => {
                          setShowMenu(false);
                          setShowDeleteConfirm(true);
                        }}
                        className="w-full text-left px-3 py-1.5 text-xs sm:text-sm text-[var(--color-danger)] hover:bg-[var(--bg-row-hover)] transition cursor-pointer"
                      >
                        Delete comment
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* delete confirmation dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-[rgba(0,0,0,0.6)] px-4">
          <div className="w-full max-w-xs rounded-2xl bg-[var(--bg-surface)] shadow-2xl overflow-hidden">
            <div className="px-5 py-5 text-center">
              <h3 className="text-sm sm:text-base font-semibold text-[var(--text-primary)]">
                Delete comment?
              </h3>
              <p className="mt-1 text-xs sm:text-sm text-[var(--text-muted)]">
                This can't be undone. Are you sure?
              </p>
            </div>
            <div className="border-t border-[var(--border-soft)] flex">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={deleting}
                className="flex-1 py-3 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-row-hover)] transition cursor-pointer disabled:opacity-50 border-r border-[var(--border-soft)]"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteComment}
                disabled={deleting}
                className="flex-1 py-3 text-sm font-semibold text-[var(--color-danger)] hover:bg-[var(--bg-row-hover)] transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isRealComment && !isReply && showReplies && (
        <div className="flex flex-col">
          {replies.map((reply) => (
            <Comment
              key={reply._id}
              comment={reply}
              postId={postId}
              reelId={reelId}
              verified={verified}
              currentUserId={currentUserId}
              isReply
              canModerate={canModerate}
              onReplyClick={(username) => {
                setReplyTarget({ username });
                setShowReplies(true);
              }}
              onReplyDeleted={(replyId) =>
                setReplies((prev) => prev.filter((r) => r._id !== replyId))
              }
            />
          ))}

          <div className="ml-10 sm:ml-12 mt-1 flex items-center gap-2 pr-2">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) handlePostReply();
              }}
              placeholder={replyTarget ? `Reply to @${replyTarget.username}...` : "Write a reply..."}
              className="flex-1 bg-transparent text-sm text-[var(--text-primary)] outline-none border-b border-[var(--border-popup)] focus:border-[var(--border-input)] py-1"
            />
            <button
              onClick={handlePostReply}
              disabled={posting || !replyText.trim()}
              className="text-xs font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-40 transition cursor-pointer"
            >
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Comment;
