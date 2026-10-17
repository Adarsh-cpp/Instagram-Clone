// ReelCommentsOverlay.jsx
import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import Comment from "./Comment";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const BASE_URL = import.meta.env.VITE_SERVER_URL

const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
});

/**
 * ReelCommentsOverlay
 * Slide-up comments panel for a reel. Fetches real comments for the given
 * reelId (the reel's _id) and reuses the existing <Comment /> card for
 * every row — top-level comments and their replies both render through
 * that component, exactly like the feed post card does.
 */
const ReelCommentsOverlay = ({ reelId, authorId, authorRole, isOpen = true, onClose, onCommentCountChange }) => {
  const { user } = useAuth();
  const { isDevs } = useTheme();

  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const inputRef = useRef(null);

  const isAdmin = authorRole === "admin"

  // Whether the viewer owns this reel — lets them delete ANY comment on
  // it, not just their own. Admins can moderate any reel's comments too.
  const isOwnReel = Boolean(authorId) && String(user?._id) === String(authorId);
  const canModerateComments = isOwnReel || user?.role === "admin";

  useEffect(() => {
    if (!isOpen || !reelId) return;

    const fetchComments = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${BASE_URL}/reels/${reelId}/get-comments`, authConfig());
        setComments(response.data.comments || []);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchComments();
  }, [isOpen, reelId]);

  const handlePostComment = async () => {
    if (!commentText.trim() || posting) return;
    setPosting(true);
    try {
      const response = await axios.post(
        `${BASE_URL}/reels/${reelId}/post-comment`,
        { text: commentText.trim() },
        authConfig()
      );
      if (response.data.success) {
        setComments((prev) => [...prev, response.data.comment]);
        setCommentText("");

        // This overlay only ever posts TOP-LEVEL comments (no
        // parentComment is sent above), and the backend only increments
        // reel.commentsCount for top-level comments — so every successful
        // post here always corresponds to a +1 on the reel's count.
        onCommentCountChange?.({ delta: 1 });

        inputRef.current?.focus();
      }
    } catch (error) {
      console.log(error);
    } finally {
      setPosting(false);
    }
  };

  // A comment being deleted here could be a top-level comment OR a reply
  // (both render through <Comment />, and its onDeleted below doesn't
  // distinguish). The reel's commentsCount only counts top-level comments
  // on the backend, so we only decrement when the deleted row was
  // top-level — i.e. it has no parentComment.
  const handleCommentDeleted = (id) => {
    setComments((prev) => {
      const deleted = prev.find((c) => c._id === id);
      if (deleted && !deleted.parentComment) {
        onCommentCountChange?.({ delta: -1 });
      }
      return prev.filter((c) => c._id !== id);
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center hide-scrollbar devs:bg-[rgba(2,3,10,0.75)] devs:backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        {...(isDevs
          ? {
              initial: { opacity: 0, y: 40, scale: 0.97 },
              animate: { opacity: 1, y: 0, scale: 1 },
              transition: { type: "spring", stiffness: 300, damping: 30 },
            }
          : {})}
        className={`flex h-[80vh] w-full flex-col overflow-hidden rounded-t-3xl sm:h-[640px] sm:w-[420px] sm:rounded-2xl hide-scrollbar ${
          isDevs
            ? "devs-glass devs-neon-border sm:!rounded-3xl"
            : "bg-white/10 backdrop-blur-lg"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="relative flex shrink-0 items-center justify-center border-b border-white/10 px-4 py-4 devs:border-[var(--border-soft)]">
          <button
            onClick={onClose}
            aria-label="Close comments"
            className="absolute left-4 cursor-pointer text-white/80 transition hover:text-white devs:hover:text-[var(--devs-cyan)]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
          <h2 className="text-[15px] font-semibold text-white devs:font-mono devs:uppercase devs:tracking-[0.25em] devs:text-[12px]">
            Comments
          </h2>
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {loading && (
            <p className="mt-6 text-center text-sm text-white/40 devs:font-mono">
              {isDevs && <span className="mr-2 text-[var(--devs-cyan)]">&gt;</span>}
              Loading comments...
            </p>
          )}

          {!loading && comments.length === 0 && (
            <p className="mt-6 text-center text-sm text-white/40 devs:font-mono devs:text-[12px]">
              No comments yet. Be the first to comment.
            </p>
          )}

          {!loading &&
            comments.map((comment) => (
              <Comment
                key={comment._id}
                comment={comment}
                reelId={reelId}
                currentUserId={user?._id}
                verified={isAdmin}
                canModerate={canModerateComments}
                onDeleted={handleCommentDeleted}
              />
            ))}
        </div>

        {/* add comment */}
        <div className="flex shrink-0 items-center gap-3 border-t border-white/10 px-4 py-3 devs:border-[var(--border-soft)]">
          <img
            src={user?.profilePic}
            alt={user?.username}
            className="h-8 w-8 shrink-0 rounded-full object-cover devs:ring-2 devs:ring-[var(--devs-violet)]"
          />

          <input
            ref={inputRef}
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) handlePostComment();
            }}
            placeholder="Add a comment..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/40 outline-none devs:font-mono devs:text-[13px] devs:caret-[var(--devs-cyan)]"
          />

          <button
            onClick={handlePostComment}
            disabled={posting || !commentText.trim()}
            aria-label="Post comment"
            className="shrink-0 cursor-pointer text-white/60 transition hover:text-white disabled:opacity-30"
          >
            {commentText.trim() ? (
              <span className="text-sm font-semibold text-sky-400 devs:text-[var(--devs-cyan)] devs:font-mono devs:uppercase devs:tracking-widest devs:text-[11px] devs:[text-shadow:0_0_10px_rgba(34,240,255,0.7)]">
                Post
              </span>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="9" />
                <path d="M8.5 14.5s1.2 1.5 3.5 1.5 3.5-1.5 3.5-1.5" strokeLinecap="round" />
                <path d="M9 10h.01M15 10h.01" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ReelCommentsOverlay;