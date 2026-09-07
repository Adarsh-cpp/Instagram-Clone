// CommentsOverlay.jsx
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Comment from "./Comment";
import ShareOverlay from "./ShareOverlay";
import { MessageCircle, Send, Smile, ChevronLeft, ChevronRight, X } from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";

const BASE_URL = "http://localhost:4000";
const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
});

const CommentsOverlay = ({
  post,
  reel,
  authorId,
  onClose,
  onLikesCountChange,
  onSaveChange,
  initialIsLiked,
  initialIsSaved,
}) => {

  const { user, refreshUser } = useAuth();

  // works for either a post or a reel — only one of the two props is ever passed in
  const isReel = Boolean(reel);
  const item = isReel ? reel : post;

  const isOwnItem = user._id === authorId;
  const profileURL = isOwnItem ? "/user/get-profile" : `/user/get-profile/${authorId}`;

  const [likesCount, setLikesCount] = useState(item.likes?.length || 0);

  const [isLiked, setIsLiked] = useState(initialIsLiked ?? false);
  const [isSaved, setIsSaved] = useState(initialIsSaved ?? false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // comments state
  const [comment, setComment] = useState("");
  const [fetchedComments, setFetchedComments] = useState([]);

  // emoji picker
  const [showPicker, setShowPicker] = useState(false);

  // carousel state (posts only — reels are always a single video)
  const [activeSlide, setActiveSlide] = useState(0);
  const touchStartX = useRef(null);

  // refs
  const animatedLikeRef = useRef();

  const authorName = item.author.username === user?.username ? "You" : item.author.username;

  const mediaList = useMemo(() => (isReel ? [] : post?.media || []), [isReel, post]);
  const isCarousel = mediaList.length > 1;

  const goPrev = useCallback((e) => {
    e.stopPropagation();
    setActiveSlide((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(
    (e) => {
      e.stopPropagation();
      setActiveSlide((i) => Math.min(mediaList.length - 1, i + 1));
    },
    [mediaList.length]
  );

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      setActiveSlide((i) =>
        delta > 0 ? Math.max(0, i - 1) : Math.min(mediaList.length - 1, i + 1)
      );
    }
    touchStartX.current = null;
  };

  const fetchComments = async () => {
    try {
      const url = isReel
        ? `${BASE_URL}/reels/${item._id}/get-comments`
        : `${BASE_URL}/${item._id}/comment/get-comments`;

      // reel comment routes are behind authUser middleware — without this header
      // the request 401s silently and fetchedComments just stays empty
      const response = await axios.get(url, authConfig());
      if (response.status === 200) {
        setFetchedComments(response.data.comments);
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [item._id]);

  const toggleLike = async () => {
    try {
      const url = isReel
        ? `${BASE_URL}/reels/${item._id}/like`
        : `${BASE_URL}/post/${item._id}/toggle-likes`;

      const response = await axios.post(url, {}, authConfig());

      setIsLiked(response.data.liked);
      setLikesCount((prev) => {
        const newCount = response.data.liked ? prev + 1 : prev - 1;
        onLikesCountChange?.(newCount);
        return newCount;
      });
    } catch (error) {
      console.log(error);
    }
  };

  const doubleClickToLike = async () => {
    const heart = animatedLikeRef.current;

    heart.style.transition = "none";
    heart.style.width = "0px";
    heart.style.opacity = "1";
    heart.style.transform = "translate(0%, 0%)";
    void heart.offsetWidth;
    heart.style.transition = "all 0.5s ease-out";
    heart.style.width = "300px";

    setTimeout(() => {
      heart.style.opacity = "0";
      heart.style.transform = "translateY(-200%)";
    }, 1000);

    if (!isLiked) {
      await toggleLike();
    }
  };

  const handleSave = useCallback(async () => {
    const prevValue = isSaved;
    const next = !prevValue;
    setIsSaved(next);
    onSaveChange?.(next);

    try {

      const url = isReel
        ? `${BASE_URL}/reels/${item._id}/toggle-save`
        : `${BASE_URL}/post/${item._id}/toggle-save`;

      await axios.post(url, {}, authConfig());
      await refreshUser();
    } catch (error) {
      setIsSaved(prevValue);
      onSaveChange?.(prevValue);
      toast.error("Something went wrong");
    }
  }, [item?._id, isSaved, isReel]);

  const handleEmojiClick = (emojiData) => {
    setComment((prev) => prev + emojiData.emoji);
  };

  const handlePostComment = async () => {
    if (!comment.trim()) return;
    try {
      const url = isReel
        ? `${BASE_URL}/reels/${item._id}/post-comment`
        : `${BASE_URL}/${item._id}/comment/post-comment`;

      const body = isReel ? { text: comment } : { comment };

      const response = await axios.post(url, body, authConfig());

      if (response.status === 201) {
        setComment("");
        fetchComments();
      }
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 p-2 sm:p-4 md:p-6 overflow-y-auto flex justify-center items-center bg-[rgba(0,0,0,0.8)]">

      <div onClick={onClose} className="cmntsClose w-[40px] h-[40px] absolute right-[10px] top-[10px]">
        <X className="w-[98%] h-[98%] text-white hover:w-full hover:h-full ease-in-out transition-all cursor-pointer"/>
      </div>

      <div className="mx-auto flex h-[92vh] w-full max-w-7xl overflow-hidden rounded-2xl bg-[#212328] shadow-2xl flex-col lg:flex-row">

        {/* Left — media */}
        <div
          onDoubleClick={doubleClickToLike}
          onTouchStart={isCarousel ? handleTouchStart : undefined}
          onTouchEnd={isCarousel ? handleTouchEnd : undefined}
          className="relative w-full flex justify-center items-center lg:w-1/2 bg-black overflow-hidden"
        >
          <div
            ref={animatedLikeRef}
            className="likeAnimation absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[0px] h-[150px] rounded-full flex justify-center items-center transition-all ease-in-out duration-[3s] z-10"
          >
            <img src="/images/gradient-like-icon.png" alt="" className="w-full" />
          </div>

          {isReel ? (
            // Reel — single video, rendered in its original aspect ratio, letterboxed on black
            <video
              src={item.media.url}
              poster={item.media.thumbnailUrl}
              className="max-w-full max-h-full w-auto h-auto object-contain"
              style={{ aspectRatio: `${item.media.width} / ${item.media.height}` }}
              controls
              autoPlay
              muted
              loop
              playsInline
            />
          ) : mediaList[activeSlide]?.mediaType === "video" ? (
            <video
              src={mediaList[activeSlide]?.url}
              className="w-full object-cover aspect-auto"
              controls
              muted
              loop
              playsInline
            />
          ) : (
            <img
              src={mediaList[activeSlide]?.url}
              alt="Post"
              className="w-full object-cover aspect-auto"
            />
          )}

          {isCarousel && activeSlide > 0 && (
            <div
              onClick={goPrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10"
            >
              <ChevronLeft size={20} color="white" />
            </div>
          )}
          {isCarousel && activeSlide < mediaList.length - 1 && (
            <div
              onClick={goNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10"
            >
              <ChevronRight size={20} color="white" />
            </div>
          )}

          {isCarousel && (
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-10">
              {activeSlide + 1}/{mediaList.length}
            </div>
          )}

          {isCarousel && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {mediaList.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i === activeSlide ? "bg-white" : "bg-white/40"}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right — comments */}
        <div className="flex w-full lg:w-1/2 flex-col border-t border-white/10 lg:border-t-0 lg:border-l border-l-0 min-h-0">

          {/* Author header */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={item.author.profilePic ? item.author.profilePic :"/images/default-profile-pic.jpg"}
                alt="author"
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                 <NavLink to={profileURL}>
                  <h3 className="truncate text-sm sm:text-base font-semibold text-white">
                    {authorName}
                  </h3>
                  </NavLink> 
                  {item.author.username !== user?.username && (
                    <span className="text-[#85a1ff] hover:text-[#a3bcff] cursor-pointer text-xs sm:text-sm">
                      Follow
                    </span>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-white/50">Odisha, India</p>
              </div>
            </div>
            <button className="text-white/70 hover:text-white transition px-2">⋯</button>
          </div>

          {/* Comments list */}
          <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-4 hide-scrollbar">
            <Comment
              author={authorName}
              authorDP={item.author.profilePic}
              text={item.caption}
              createdAt={item.createdAt}
            />
           {fetchedComments.map((c) => (
              <Comment
                key={c._id}
                comment={c}
                postId={isReel ? undefined : item._id}
                reelId={isReel ? item._id : undefined}
                currentUserId={user?._id}
              />
            ))}
          </div>

          {/* Action icons */}
          <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-4 text-white">
              <img
                src={isLiked ? "/images/redlike-icon.png" : "/images/postlike-icon.png"}
                alt=""
                onClick={toggleLike}
                className="w-[35px] h-[30px] cursor-pointer"
              />
              <button className="hover:opacity-80 transition cursor-pointer">
                <MessageCircle size={22} />
              </button>
              <button
                onClick={() => setIsShareOpen(true)}
                className="hover:opacity-80 transition cursor-pointer"
              >
                <Send size={22} />
              </button>
            </div>
            <img
              src={isSaved ? "/images/filledsave-icon.png" : "/images/postsave-icon.png"}
              alt=""
              onClick={handleSave}
              className="w-[30px] h-[30px] cursor-pointer"
            />
          </div>

          {/* Likes count */}
          <div className="px-4 pb-2 sm:px-5 text-sm font-semibold text-white">
            {likesCount} likes
          </div>

          {/* Comment input */}
          <div className="flex items-center gap-3 border-t border-white/10 px-4 py-3 sm:px-5">
            <button
              onClick={() => setShowPicker((prev) => !prev)}
              className="shrink-0 cursor-pointer"
            >
              <Smile size={20} className="text-white/60 hover:text-white" />
            </button>

            <div className="relative w-full flex items-center gap-3 px-4 py-3 sm:px-5">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) handlePostComment();
                }}
                placeholder="Add a comment..."
                className="w-full bg-transparent text-white outline-none"
              />
              {showPicker && (
                <div className="absolute bottom-14 left-0 z-50">
                  <EmojiPicker theme="dark" onEmojiClick={handleEmojiClick} />
                </div>
              )}
            </div>

            <button
              onClick={handlePostComment}
              className="text-sm sm:text-base font-semibold text-white/60 hover:text-white transition cursor-pointer"
            >
              Post
            </button>
          </div>

        </div>
      </div>

      {isShareOpen && (
        isReel ? (
          <ShareOverlay reel={reel} onClose={() => setIsShareOpen(false)} />
        ) : (
          <ShareOverlay post={post} onClose={() => setIsShareOpen(false)} />
        )
      )}
    </div>
  );
};

export default CommentsOverlay;