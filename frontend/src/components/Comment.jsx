// Comment.jsx
import React, { useState } from "react";
import axios from "axios";
import { getTimeAgo } from "../utils/timeAgo";
import { useAuth } from "../context/AuthContext";

const BASE_URL = "http://localhost:4000";

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
      <span className="text-[#e0f2ff] font-medium">{mention}</span> {rest}
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
  // fallback props — used only for the post-caption pseudo-comment, which has no real Comment doc
  author,
  authorDP,
  text,
  createdAt,
  verified,
}) => {

  const { user } = useAuth()
  const isOwnComment = user?._id?.toString() === comment?.author?._id?.toString()

  const isRealComment = Boolean(comment?._id);

  const displayAuthor = comment?.author?.username || author;
  const displayDP = comment?.author?.profilePic || authorDP;
  const displayText = comment?.text ?? text;
  const displayTime = comment?.createdAt ?? createdAt;
  const commentTime = getTimeAgo(displayTime);

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

  return (
    <div className={isReply ? "flex flex-col ml-10 sm:ml-12 mt-2" : "flex flex-col"}>
      <div className="flex gap-3 rounded-2xl px-2 py-3 sm:px-3 hover:bg-white/5 transition">
        <img
          src={displayDP}
          alt={displayAuthor}
          className={`${
            isReply ? "h-8 w-8" : "h-10 w-10 sm:h-11 sm:w-11"
          } rounded-full object-cover shrink-0`}
        />

        <div className="min-w-0 flex-1" onDoubleClick={handleDoubleClick}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h4 className="text-sm sm:text-[15px] font-semibold text-white truncate">
             {isOwnComment ? "You" : displayAuthor}
            </h4>

            {verified && (
              <span className="text-[11px] sm:text-xs text-sky-400 font-medium">
                • verified
              </span>
            )}

            <span className="text-[11px] sm:text-xs text-white/45">{commentTime}</span>
          </div>

          <p className="mt-1 text-sm sm:text-[15px] leading-5 text-white/85 break-words">
            {renderTextWithMention(displayText)}
          </p>

          {isRealComment && (
            <div className="mt-2 flex items-center gap-4 text-xs sm:text-sm text-white/50">
              <button
                onClick={isReply ? () => onReplyClick?.(displayAuthor) : openReplyBox}
                className="hover:text-white transition cursor-pointer"
              >
                Reply
              </button>

              {likesCount > 0 && (
                <span>{likesCount} {likesCount === 1 ? "like" : "likes"}</span>
              )}

              {!isReply && replies.length > 0 && (
                <button
                  onClick={() => setShowReplies((prev) => !prev)}
                  className="hover:text-white transition cursor-pointer font-semibold"
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
              className="text-white/70 hover:text-white transition cursor-pointer px-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill={isLiked ? "#ED4956" : "none"} stroke={isLiked ? "#ED4956" : "currentColor"} strokeWidth="2">
                <path d="M12 21s-6.7-4.35-9.33-8.2C1.1 10.6 1.5 7.3 4.2 5.6c2.2-1.4 4.9-.8 6.4 1.1L12 8l1.4-1.3c1.5-1.9 4.2-2.5 6.4-1.1 2.7 1.7 3.1 5 1.53 7.2C18.7 16.65 12 21 12 21z" />
              </svg>
            </button>

            {showHeartPop && (
              <span className="absolute -top-3 text-[#ED4956] text-lg animate-ping pointer-events-none">
                ❤
              </span>
            )}
          </div>
        )}
      </div>

      
      {isRealComment && !isReply && showReplies && (
        <div className="flex flex-col">
          {replies.map((reply) => (
            <Comment
              key={reply._id}
              comment={reply}
              postId={postId}
              reelId={reelId}
              currentUserId={currentUserId}
              isReply
              onReplyClick={(username) => {
                setReplyTarget({ username });
                setShowReplies(true);
              }}
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
              className="flex-1 bg-transparent text-sm text-white outline-none border-b border-white/10 focus:border-white/30 py-1"
            />
            <button
              onClick={handlePostReply}
              disabled={posting || !replyText.trim()}
              className="text-xs font-semibold text-white/60 hover:text-white disabled:opacity-40 transition cursor-pointer"
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