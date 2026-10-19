import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import Comment from "./Comment";
import ShareOverlay from "./ShareOverlay";
import LikeBurst from "./devs/LikeBurst";
import {
  MessageCircle,
  Send,
  Smile,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  X,
  Heart,
  Bookmark,
  BadgeCheck,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { NavLink } from "react-router-dom";
import { toast } from "react-toastify";
import {
  generateAiComment,
  getAiErrorMessage,
  COMMENT_TONES,
} from "../api/aiApi";

const BASE_URL = import.meta.env.VITE_SERVER_URL ;

const authConfig = () => ({
  withCredentials: true,
  headers: {
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  },
});

/* ====================================================================
   DEVS MODE helpers (only rendered when the theme is "devs")
   ==================================================================== */
const slideVariants = {
  enter: (dir) => ({ x: dir * 60, opacity: 0, scale: 1.03 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir) => ({ x: dir * -60, opacity: 0, scale: 0.98 }),
};

const HUD_CORNERS = [
  "top-3 left-3 border-t-2 border-l-2 rounded-tl-lg",
  "top-3 right-3 border-t-2 border-r-2 rounded-tr-lg",
  "bottom-3 left-3 border-b-2 border-l-2 rounded-bl-lg",
  "bottom-3 right-3 border-b-2 border-r-2 rounded-br-lg",
];

const HudCorners = () => (
  <>
    {HUD_CORNERS.map((c) => (
      <span
        key={c}
        className={`absolute w-5 h-5 pointer-events-none z-10 ${c}`}
        style={{
          borderColor: "rgba(34,240,255,0.7)",
          filter: "drop-shadow(0 0 4px rgba(34,240,255,0.8))",
        }}
      />
    ))}
  </>
);

const roundBtn =
  "h-9 w-9 rounded-full flex items-center justify-center cursor-pointer border border-[var(--border-soft)] bg-[var(--bg-surface)] hover:border-[var(--border-popup)] transition-colors";

const CommentsOverlay = ({
  post,
  reel,
  authorId,
  authorRole,
  onClose,
  onLikesCountChange,
  onSaveChange,
  onCommentAdded,
  initialIsLiked,
  initialIsSaved,
  // MOBILE ONLY. When true, the overlay opens on the post/reel itself
  // (media + action bar), and the comments only appear after the user taps
  // the comment icon (tap it again, or the back arrow, to return to the
  // post). Used for entry points where the user hasn't already seen the
  // media — e.g. opening a shared post/reel straight from a chat message.
  // The home feed leaves this false/unset because the post is already
  // visible there, so the overlay opens straight to the comments.
  // Desktop (lg and up) always shows media + comments side by side.
  mobileMediaFirst = false,
}) => {
  const { user, refreshUser } = useAuth();
  const { theme, isDevs } = useTheme();

  const isReel = Boolean(reel);
  const item = isReel ? reel : post;

  const isOwnItem =
    String(user?._id) === String(authorId);

  // Whether the logged-in user can moderate (delete) ANY comment on this
  // post/reel — true if they own it, or if they're an admin.
  const canModerateComments = isOwnItem || user?.role === "admin";

  const profileURL = isOwnItem
    ? "/user/get-profile"
    : `/user/get-profile/${authorId}`;

  const [likesCount, setLikesCount] = useState(
    item?.likes?.length || 0
  );

  const [isLiked, setIsLiked] = useState(
    initialIsLiked ?? false
  );

  const [isSaved, setIsSaved] = useState(
    initialIsSaved ?? false
  );

  const [isShareOpen, setIsShareOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [fetchedComments, setFetchedComments] = useState([]);
  const [showPicker, setShowPicker] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Mobile only: which pane is showing. Starts on the post when
  // `mobileMediaFirst` is set, otherwise on the comments (original behavior).
  const [mobileView, setMobileView] = useState(
    mobileMediaFirst ? "media" : "comments"
  );

  // true only on mobile-first entry points while the post pane is showing
  const isMediaView = mobileMediaFirst && mobileView === "media";

  // Devs Mode only: carousel direction + like-burst triggers
  const [slideDir, setSlideDir] = useState(1);
  const [bigBurst, setBigBurst] = useState(0);
  const [likeBurst, setLikeBurst] = useState(0);

  // --- AI "Suggest Comment" state ---
  const [showToneMenu, setShowToneMenu] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const aiAbortControllerRef = useRef(null);

  const touchStartX = useRef(null);
  const animatedLikeRef = useRef(null);

  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  const authorName = item?.author?.username;

  // Blue verified tick, shown only for the admin account.
  const isAdminAuthor = authorRole === "admin";

  const mediaList = useMemo(
    () => (isReel ? [] : post?.media || []),
    [isReel, post]
  );

  const isCarousel = mediaList.length > 1;

  // Whether the AI can suggest a comment for whatever is currently on
  // screen. Posts: only when the active slide is an image, not a video —
  // the backend rejects videos anyway, but disabling the button up front
  // avoids a pointless round trip. Reels: always allowed, since the
  // backend falls back to the reel's thumbnail image.
  const canSuggestComment = useMemo(() => {
    if (isReel) return true;

    const currentMedia = mediaList[activeSlide];
    return Boolean(currentMedia) && currentMedia.mediaType !== "video";
  }, [isReel, mediaList, activeSlide]);

  /*
   * Set the follow state from the logged-in user's own
   * `following` array (the live source of truth from
   * AuthContext), NOT from a snapshot embedded on the
   * post/reel's author object.
   *
   * Why: item?.author?.followers is whatever the post/reel
   * looked like at the moment it was originally fetched.
   * It never changes again for the lifetime of that post
   * object, so if the user follows/unfollows this author
   * from anywhere else in the app, this overlay would keep
   * showing stale data until a full page refresh re-fetched
   * the post. user.following, by contrast, gets updated by
   * refreshUser() every time a follow toggle succeeds
   * anywhere in the app, so this effect re-runs and stays
   * correct automatically — no refresh required.
   */
  useEffect(() => {
    const currentlyFollowing = Boolean(
      authorId &&
        user?.following?.some(
          (followedId) =>
            String(followedId?._id || followedId) ===
            String(authorId)
        )
    );

    setIsFollowing(currentlyFollowing);
  }, [authorId, user?.following]);

  const goPrev = useCallback((e) => {
    e.stopPropagation();

    setSlideDir(-1);
    setActiveSlide((index) =>
      Math.max(0, index - 1)
    );
  }, []);

  const goNext = useCallback(
    (e) => {
      e.stopPropagation();

      setSlideDir(1);
      setActiveSlide((index) =>
        Math.min(
          mediaList.length - 1,
          index + 1
        )
      );
    },
    [mediaList.length]
  );

  const handleTouchStart = (e) => {
    touchStartX.current =
      e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;

    const delta =
      e.changedTouches[0].clientX -
      touchStartX.current;

    if (Math.abs(delta) > 40) {
      setSlideDir(delta > 0 ? -1 : 1);
      setActiveSlide((index) =>
        delta > 0
          ? Math.max(0, index - 1)
          : Math.min(
              mediaList.length - 1,
              index + 1
            )
      );
    }

    touchStartX.current = null;
  };

  const fetchComments = async () => {
    try {
      const url = isReel
        ? `${BASE_URL}/reels/${item?._id}/get-comments`
        : `${BASE_URL}/${item?._id}/comment/get-comments`;

      const response = await axios.get(
        url,
        authConfig()
      );

      if (response.status === 200) {
        setFetchedComments(
          response.data.comments
        );
      }
    } catch (error) {
      console.log(error.message);
    }
  };

  useEffect(() => {
    fetchComments();
  }, [item?._id]);

  useEffect(() => {
    const originalOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        originalOverflow;
    };
  }, []);

  // Cancel any in-flight AI suggestion when the overlay unmounts, so a
  // late response can't set state on an unmounted component.
  useEffect(() => {
    return () => {
      aiAbortControllerRef.current?.abort();
    };
  }, []);

  // Comment icon in the action bar. On mobile-first entry points it flips
  // between the post and the comments; everywhere else (and on desktop,
  // where both panes are always visible) it does nothing, as before.
  const handleCommentIconClick = () => {
    if (!mobileMediaFirst) return;

    setShowPicker(false);
    setShowToneMenu(false);
    setMobileView((previous) =>
      previous === "media" ? "comments" : "media"
    );
  };

  const toggleLike = async () => {
    try {
      const url = isReel
        ? `${BASE_URL}/reels/${item?._id}/like`
        : `${BASE_URL}/post/${item?._id}/toggle-likes`;

      const response = await axios.post(
        url,
        {},
        authConfig()
      );

      setIsLiked(response.data.liked);

      // Devs Mode: small neon burst when a like is confirmed
      if (response.data.liked && isDevs) {
        setLikeBurst((n) => n + 1);
      }

      setLikesCount((previousCount) => {
        const newCount =
          response.data.liked
            ? previousCount + 1
            : previousCount - 1;

        onLikesCountChange?.(newCount);

        return newCount;
      });
    } catch (error) {
      console.log(error);
    }
  };

  const doubleClickToLike = async () => {
    if (isDevs) {
      // Devs Mode: neon burst instead of the gradient heart image
      setBigBurst((n) => n + 1);
    } else {
      const heart = animatedLikeRef.current;

      if (!heart) return;

      heart.style.transition = "none";
      heart.style.width = "0px";
      heart.style.opacity = "1";
      heart.style.transform =
        "translate(0%, 0%)";

      void heart.offsetWidth;

      heart.style.transition =
        "all 0.5s ease-out";

      heart.style.width = "300px";

      setTimeout(() => {
        heart.style.opacity = "0";
        heart.style.transform =
          "translateY(-200%)";
      }, 1000);
    }

    if (!isLiked) {
      await toggleLike();
    }
  };

  /*
   * Follow/unfollow uses the exact backend route:
   *
   * POST /user/profile/:id/follow-toggle
   */
  const handleFollowToggle = async () => {
    if (
      !user?._id ||
      !authorId ||
      isFollowLoading ||
      isOwnItem
    ) {
      return;
    }

    const previousFollowing = isFollowing;
    const nextFollowing = !previousFollowing;

    /*
     * Optimistic update:
     * hide the Follow button immediately after clicking.
     */
    setIsFollowing(nextFollowing);
    setIsFollowLoading(true);

    try {
      const followURL = `${BASE_URL}/user/profile/${authorId}/follow-toggle`;

      const response = await axios.post(
        followURL,
        {},
        authConfig()
      );

      /*
       * Always use the server's final value.
       * Your controller returns isFollowing.
       */
      if (
        typeof response.data?.isFollowing ===
        "boolean"
      ) {
        setIsFollowing(
          response.data.isFollowing
        );
      } else {
        setIsFollowing(nextFollowing);
      }

      /*
       * Refresh the authenticated user so user.following
       * is correct — this is what keeps every other
       * CommentsOverlay instance (and any other component
       * reading user.following) in sync without a page
       * refresh, since the useEffect above re-derives
       * isFollowing whenever user.following changes.
       */
      await refreshUser?.();
    } catch (error) {
      /*
       * Restore the previous value if the request fails.
       */
      setIsFollowing(previousFollowing);

      toast.error(
        error.response?.data?.message ||
          "Unable to update follow status"
      );

      console.log(error);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleSave = useCallback(
    async () => {
      const previousValue = isSaved;
      const nextValue = !previousValue;

      setIsSaved(nextValue);
      onSaveChange?.(nextValue);

      try {
        const url = isReel
          ? `${BASE_URL}/reels/${item?._id}/toggle-save`
          : `${BASE_URL}/post/${item?._id}/toggle-save`;

        await axios.post(
          url,
          {},
          authConfig()
        );

        await refreshUser();
      } catch (error) {
        setIsSaved(previousValue);
        onSaveChange?.(previousValue);

        toast.error("Something went wrong");
      }
    },
    [
      item?._id,
      isSaved,
      isReel,
      onSaveChange,
      refreshUser,
    ]
  );

  const handleEmojiClick = (emojiData) => {
    setComment(
      (previousComment) =>
        previousComment + emojiData.emoji
    );
  };

  const handlePostComment = async () => {
    if (!comment.trim()) return;

    try {
      const url = isReel
        ? `${BASE_URL}/reels/${item?._id}/post-comment`
        : `${BASE_URL}/${item?._id}/comment/post-comment`;

      const body = isReel
        ? { text: comment }
        : { comment };

      const response = await axios.post(
        url,
        body,
        authConfig()
      );

      if (response.status === 201) {
        setComment("");
        fetchComments();
        onCommentAdded?.();
      }
    } catch (error) {
      console.log(error);
    }
  };

  // Asks the backend to suggest a comment for the post/reel currently
  // being viewed. Only postId/reelId (+ tone, + which slide for a
  // carousel) ever leave the browser — the backend looks up the
  // Cloudinary URL itself and fetches the image server-side, so there's
  // no CORS issue and the frontend never touches image bytes.
  //
  // This only fills the input — posting is still a separate, manual step
  // via the existing "Post" button below.
  const handleSuggestComment = async (tone = "default") => {
    if (isSuggesting || !canSuggestComment || !item?._id) return;

    setShowToneMenu(false);
    setIsSuggesting(true);

    // Cancel any previous suggestion still in flight.
    aiAbortControllerRef.current?.abort();
    const controller = new AbortController();
    aiAbortControllerRef.current = controller;

    try {
      const suggestion = await generateAiComment({
        postId: isReel ? undefined : item._id,
        reelId: isReel ? item._id : undefined,
        mediaIndex: isReel ? undefined : activeSlide,
        tone,
        signal: controller.signal,
      });

      if (suggestion) {
        setComment(suggestion);
      }
    } catch (error) {
      const message = getAiErrorMessage(
        error,
        "Couldn't suggest a comment right now."
      );
      if (message) toast.error(message);
    } finally {
      setIsSuggesting(false);
    }
  };

  /*
   * Follow button is shown only when:
   * 1. The post/reel is not owned by the current user.
   * 2. The current user is NOT already following the author.
   */
  const shouldShowFollowButton =
    !isOwnItem &&
    !isFollowing;

  // The actual media element (reel video / post video / post image)
  const mediaNode = isReel ? (
    <video
      src={item?.media?.url}
      poster={
        item?.media?.thumbnailUrl
      }
      className="max-w-full max-h-full w-auto h-auto object-contain select-none"
      style={{
        aspectRatio: `${item?.media?.width} / ${item?.media?.height}`,
      }}
      controls
      autoPlay
      muted
      loop
      playsInline
    />
  ) : mediaList[activeSlide]
      ?.mediaType === "video" ? (
    <video
      src={
        mediaList[activeSlide]?.url
      }
      className="max-w-full max-h-full w-auto h-auto object-contain select-none"
      controls
      muted
      loop
      playsInline
    />
  ) : (
    <img
      src={
        mediaList[activeSlide]?.url
      }
      alt="Post"
      draggable="false"
      className="max-w-full max-h-full w-auto h-auto object-contain select-none"
    />
  );

  const overlay = (
    <motion.div
      {...(isDevs
        ? { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.2 } }
        : {})}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[rgba(0,0,0,0.8)] lg:items-center lg:p-6 devs:bg-[rgba(2,3,10,0.82)] devs:backdrop-blur-md"
    >
      <div
        onClick={onClose}
        className="cmntsClose absolute right-[10px] top-[10px] hidden h-[40px] w-[40px] lg:block"
      >
        <X className="h-[98%] w-[98%] cursor-pointer text-white transition-all ease-in-out hover:h-full hover:w-full devs:text-[var(--devs-cyan)] devs:drop-shadow-[0_0_8px_rgba(34,240,255,0.8)]" />
      </div>

      <motion.div
        {...(isDevs
          ? {
              initial: { opacity: 0, y: 40, scale: 0.97 },
              animate: { opacity: 1, y: 0, scale: 1 },
              transition: { type: "spring", stiffness: 300, damping: 30 },
            }
          : {})}
        onClick={(e) =>
          e.stopPropagation()
        }
        className={`${
          isDevs ? "" : "mobile-sheet-anim"
        } relative mx-auto flex w-full flex-col overflow-hidden rounded-t-2xl bg-[var(--bg-surface)] shadow-2xl lg:h-[92vh] lg:w-[90vw] lg:flex-row lg:rounded-2xl ${
          mobileMediaFirst ? "h-[88vh]" : "h-[75vh]"
        } devs:bg-[rgba(8,10,28,0.94)] devs:border devs:border-[var(--border-popup)] devs:shadow-[0_0_60px_rgba(34,240,255,0.15),0_20px_80px_rgba(0,0,0,0.7)] devs:rounded-t-3xl devs:lg:rounded-3xl`}
      >
        {/* Media pane.
            - Desktop (lg+): always visible, left half.
            - Mobile: hidden by default (the home feed already showed the post).
              With `mobileMediaFirst` it's visible until the user taps the
              comment icon, and takes all the free height above the action bar. */}
        <div
          onDoubleClick={doubleClickToLike}
          onTouchStart={
            isCarousel
              ? handleTouchStart
              : undefined
          }
          onTouchEnd={
            isCarousel
              ? handleTouchEnd
              : undefined
          }
          className={`relative w-full select-none items-center justify-center overflow-hidden bg-black lg:flex lg:h-full lg:w-1/2 lg:flex-none ${
            isMediaView ? "flex min-h-0 flex-1" : "hidden"
          }`}
        >
          {isDevs ? (
            <LikeBurst burstKey={bigBurst} variant="big" />
          ) : (
            <div
              ref={animatedLikeRef}
              className="likeAnimation absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[0px] h-[150px] rounded-full flex justify-center items-center transition-all ease-in-out duration-[3s] z-10 select-none"
            >
              <img
                src="/images/gradient-like-icon.png"
                alt=""
                draggable="false"
                className="w-full select-none"
              />
            </div>
          )}

          {isDevs ? (
            <AnimatePresence initial={false} custom={slideDir}>
              <motion.div
                key={isReel ? "reel" : activeSlide}
                custom={slideDir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
                className="absolute inset-0 flex items-center justify-center"
              >
                {mediaNode}
              </motion.div>
            </AnimatePresence>
          ) : (
            mediaNode
          )}

          {/* Devs Mode: scanlines + HUD frame */}
          {isDevs && (
            <>
              <div
                className="absolute inset-0 pointer-events-none z-[5] opacity-[0.08]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
                  mixBlendMode: "overlay",
                }}
              />
              <HudCorners />
            </>
          )}

          {isCarousel &&
            activeSlide > 0 && (
              <div
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10 select-none devs:bg-[rgba(10,12,32,0.7)] devs:border devs:border-[var(--border-popup)] devs:backdrop-blur-md"
              >
                <ChevronLeft
                  size={20}
                  color="white"
                />
              </div>
            )}

          {isCarousel &&
            activeSlide < mediaList.length - 1 && (
              <div
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10 select-none devs:bg-[rgba(10,12,32,0.7)] devs:border devs:border-[var(--border-popup)] devs:backdrop-blur-md"
              >
                <ChevronRight
                  size={20}
                  color="white"
                />
              </div>
            )}

          {isCarousel && (
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-10 select-none devs:font-mono devs:tracking-widest devs:bg-[rgba(10,12,32,0.7)] devs:border devs:border-[var(--border-popup)]">
              {activeSlide + 1}/
              {mediaList.length}
            </div>
          )}

          {isCarousel && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 select-none">
              {mediaList.map((_, index) =>
                isDevs ? (
                  <motion.span
                    key={index}
                    animate={{ width: index === activeSlide ? 18 : 6 }}
                    transition={{ type: "spring", stiffness: 400, damping: 28 }}
                    className="h-1.5 rounded-full"
                    style={{
                      background:
                        index === activeSlide
                          ? "linear-gradient(90deg,#22f0ff,#ff2bd6)"
                          : "rgba(255,255,255,0.4)",
                      boxShadow:
                        index === activeSlide
                          ? "0 0 8px rgba(34,240,255,0.8)"
                          : "none",
                    }}
                  />
                ) : (
                  <div
                    key={index}
                    className={`w-1.5 h-1.5 rounded-full ${
                      index === activeSlide
                        ? "bg-white"
                        : "bg-white/40"
                    }`}
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* Right pane: header + comments + action bar + input.
            On mobile while the post is showing (isMediaView) it shrinks to
            just the header, action bar and likes count, so the media gets
            the rest of the height. */}
        <div
          className={`flex min-h-0 w-full flex-col lg:w-1/2 lg:flex-1 lg:border-l lg:border-[var(--border-soft)] ${
            isMediaView ? "flex-none" : "flex-1"
          }`}
        >
          <div className="flex justify-center pt-2 lg:hidden">
            <div className="h-1 w-10 rounded-full bg-[var(--border-soft)]" />
          </div>

          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* Mobile only: from the comments view, go back to the post */}
              {mobileMediaFirst && !isMediaView && (
                <button
                  type="button"
                  onClick={handleCommentIconClick}
                  aria-label="Back to post"
                  className="shrink-0 cursor-pointer text-[var(--text-primary)] hover:opacity-70 transition lg:hidden"
                >
                  <ChevronLeft size={22} />
                </button>
              )}

              {isDevs ? (
                <span className="relative h-11 w-11 shrink-0">
                  <span
                    className="absolute -inset-[2px] rounded-full"
                    style={{
                      background:
                        "conic-gradient(from var(--devs-angle), #22f0ff, #8b5cf6, #ff2bd6, #22f0ff)",
                      animation: "devs-spin 5s linear infinite",
                    }}
                  />
                  <img
                    src={
                      item?.author?.profilePic
                        ? item.author.profilePic
                        : "/images/default-profile-pic.jpg"
                    }
                    alt="author"
                    className="relative h-full w-full rounded-full object-cover border-2 border-[#04050e] bg-black"
                  />
                </span>
              ) : (
                <img
                  src={
                    item?.author?.profilePic
                      ? item.author.profilePic
                      : "/images/default-profile-pic.jpg"
                  }
                  alt="author"
                  className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover"
                />
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <NavLink to={profileURL}>
                    <h3 className="truncate text-sm sm:text-base font-semibold text-[var(--text-primary)] flex items-center gap-1 devs:font-bold">
                      {authorName}
                      {isAdminAuthor && (
                        <BadgeCheck
                          size={14}
                          className={`shrink-0 ${
                            isDevs
                              ? "text-[var(--devs-cyan)] drop-shadow-[0_0_5px_rgba(34,240,255,0.9)]"
                              : "text-sky-400"
                          }`}
                        />
                      )}
                    </h3>
                  </NavLink>

                  {shouldShowFollowButton && (
                    <button
                      type="button"
                      onClick={handleFollowToggle}
                      disabled={isFollowLoading}
                      className="text-[var(--link-muted)] hover:text-[var(--link-muted-hover)] cursor-pointer text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-60 devs:font-mono devs:uppercase devs:tracking-widest devs:text-[10px] devs:sm:text-[10px] devs:border devs:border-[var(--devs-cyan)] devs:rounded-full devs:px-2.5 devs:py-0.5"
                    >
                      Follow
                    </button>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-[var(--text-muted)] devs:font-mono devs:text-[11px] devs:sm:text-[11px]">
                  {!isReel
                    ? item?.location?.name ||
                      "India"
                    : "India"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition px-2">
                ⋯
              </button>

              <button
                onClick={onClose}
                aria-label="Close comments"
                className="text-[var(--text-primary)] hover:opacity-70 transition cursor-pointer lg:hidden"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Comments list — hidden on mobile while the post is showing */}
          <div
            className={`flex-1 overflow-y-auto px-3 py-2 sm:px-4 hide-scrollbar min-h-0 ${
              isMediaView ? "hidden lg:block" : ""
            }`}
          >
            <Comment
              author={authorName}
              authorDP={
                item?.author?.profilePic
              }
              text={item?.caption}
              createdAt={item?.createdAt}
              verified={isAdminAuthor}
            />

            {fetchedComments.map(
              (currentComment) => (
                <Comment
                  key={currentComment?._id}
                  comment={currentComment}
                  postId={
                    isReel
                      ? undefined
                      : item?._id
                  }
                  reelId={
                    isReel
                      ? item?._id
                      : undefined
                  }
                  currentUserId={user?._id}
                  canModerate={canModerateComments}
                  onDeleted={(id) =>
                    setFetchedComments(
                      (previousComments) =>
                        previousComments.filter(
                          (existingComment) =>
                            existingComment?._id !==
                            id
                        )
                    )
                  }
                />
              )
            )}
          </div>

          <div className="flex items-center justify-between border-t border-[var(--border-soft)] px-4 py-3 sm:px-5">
            {isDevs ? (
              <div className="flex items-center gap-2">
                {/* Like */}
                <span className="relative flex">
                  <motion.button
                    type="button"
                    onClick={toggleLike}
                    whileTap={{ scale: 0.85 }}
                    whileHover={{ y: -2 }}
                    aria-label={isLiked ? "Unlike" : "Like"}
                    className={`${roundBtn} ${
                      isLiked
                        ? "!border-[var(--devs-magenta)] shadow-[0_0_16px_rgba(255,43,214,0.35)]"
                        : ""
                    }`}
                  >
                    <motion.span
                      initial={false}
                      animate={
                        isLiked
                          ? { scale: [1, 1.45, 0.92, 1.1, 1] }
                          : { scale: 1 }
                      }
                      transition={{ duration: 0.45 }}
                      className="flex"
                    >
                      <Heart
                        size={20}
                        color={isLiked ? "var(--devs-magenta)" : "var(--text-primary)"}
                        fill={isLiked ? "var(--devs-magenta)" : "none"}
                        strokeWidth={isLiked ? 0 : 1.8}
                        style={{
                          filter: isLiked
                            ? "drop-shadow(0 0 8px rgba(255,43,214,0.8))"
                            : "none",
                        }}
                      />
                    </motion.span>
                  </motion.button>
                  <LikeBurst burstKey={likeBurst} variant="mini" />
                </span>

                {/* Comment — on mobile-first entry points this flips between
                    the post and the comments; otherwise decorative, as in classic */}
                <motion.button
                  type="button"
                  onClick={handleCommentIconClick}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.88 }}
                  className={roundBtn}
                  aria-label="Comments"
                >
                  <MessageCircle size={19} strokeWidth={1.8} />
                </motion.button>

                {/* Share */}
                <motion.button
                  type="button"
                  onClick={() => setIsShareOpen(true)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.88 }}
                  className={roundBtn}
                  aria-label="Share"
                >
                  <Send size={18} strokeWidth={1.8} />
                </motion.button>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-[var(--text-primary)]">
                <Heart
                  size={24}
                  onClick={toggleLike}
                  className={`cursor-pointer select-none transition-colors ${
                    isLiked
                      ? "fill-red-500 stroke-red-500"
                      : "fill-transparent stroke-[var(--text-primary)] hover:stroke-[var(--text-muted)]"
                  }`}
                />

                <button
                  onClick={handleCommentIconClick}
                  className="hover:opacity-80 transition cursor-pointer"
                >
                  <MessageCircle size={22} />
                </button>

                <button
                  onClick={() =>
                    setIsShareOpen(true)
                  }
                  className="hover:opacity-80 transition cursor-pointer"
                >
                  <Send size={22} />
                </button>
              </div>
            )}

            {isDevs ? (
              <motion.button
                type="button"
                onClick={handleSave}
                whileTap={{ scale: 0.8 }}
                aria-label={isSaved ? "Unsave" : "Save"}
                className="h-9 w-9 rounded-full flex items-center justify-center cursor-pointer"
              >
                <motion.span
                  initial={false}
                  animate={
                    isSaved
                      ? { scale: [1, 1.3, 1], rotate: [0, -10, 0] }
                      : { scale: 1, rotate: 0 }
                  }
                  transition={{ duration: 0.4 }}
                  className="flex"
                >
                  <Bookmark
                    size={21}
                    color={isSaved ? "var(--devs-cyan)" : "var(--text-primary)"}
                    fill={isSaved ? "var(--devs-cyan)" : "none"}
                    strokeWidth={1.8}
                    style={{
                      filter: isSaved
                        ? "drop-shadow(0 0 7px rgba(34,240,255,0.8))"
                        : "none",
                    }}
                  />
                </motion.span>
              </motion.button>
            ) : (
              <Bookmark
                size={22}
                onClick={handleSave}
                className={`cursor-pointer select-none transition-colors ${
                  isSaved
                    ? "fill-[var(--text-primary)] stroke-[var(--text-primary)]"
                    : "fill-transparent stroke-[var(--text-primary)] hover:stroke-[var(--text-muted)]"
                }`}
              />
            )}
          </div>

          <div className="px-4 pb-2 sm:px-5 text-sm font-semibold text-[var(--text-primary)] devs:font-mono devs:text-[13px] devs:sm:text-[13px]">
            {likesCount} likes
          </div>

          {/* Comment input row — hidden on mobile while the post is showing */}
          <div
            className={`items-center gap-3 border-t border-[var(--border-soft)] px-4 py-3 sm:px-5 ${
              isMediaView ? "hidden lg:flex" : "flex"
            }`}
          >
            <button
              onClick={() =>
                setShowPicker(
                  (previousValue) =>
                    !previousValue
                )
              }
              className="shrink-0 cursor-pointer"
            >
              <Smile
                size={20}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)] devs:hover:text-[var(--devs-cyan)]"
              />
            </button>

            {/* AI "Suggest Comment" trigger + tone dropdown */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() =>
                  setShowToneMenu((prev) => !prev)
                }
                disabled={!canSuggestComment || isSuggesting}
                title={
                  canSuggestComment
                    ? "Suggest a comment with AI"
                    : "AI comments need a photo, not a video"
                }
                className="text-[var(--accent-blue)] hover:opacity-80 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40 devs:drop-shadow-[0_0_6px_rgba(34,240,255,0.8)]"
              >
                {isSuggesting ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <Sparkles size={20} />
                )}
              </button>

              {showToneMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowToneMenu(false)}
                  />
                  <div
                    className={`absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-surface)] shadow-lg py-1 ${
                      isDevs ? "devs-glass !rounded-2xl font-mono" : ""
                    }`}
                  >
                    {COMMENT_TONES.map((toneOption) => (
                      <button
                        key={toneOption.id}
                        type="button"
                        onClick={() =>
                          handleSuggestComment(toneOption.id)
                        }
                        className="w-full text-left px-3 py-1.5 text-xs sm:text-sm text-[var(--text-primary)] hover:bg-[var(--bg-row-hover)] transition cursor-pointer"
                      >
                        {toneOption.label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="relative w-full flex items-center gap-3 px-4 py-3 sm:px-5 devs:py-2 devs:rounded-xl devs:bg-[var(--bg-input)] devs:border devs:border-[var(--border-soft)] devs:transition-all devs:focus-within:border-[var(--devs-cyan)] devs:focus-within:shadow-[0_0_18px_rgba(34,240,255,0.2)]">
              <input
                type="text"
                value={comment}
                onChange={(e) =>
                  setComment(e.target.value)
                }
                onKeyDown={(e) => {
                  if (
                    e.key === "Enter" &&
                    !e.shiftKey
                  ) {
                    handlePostComment();
                  }
                }}
                placeholder="Add a comment..."
                className="w-full bg-transparent text-[var(--text-primary)] outline-none devs:font-mono devs:text-[13px]"
              />

              {showPicker && (
                <div className="absolute bottom-14 left-0 z-50">
                  <EmojiPicker
                    theme={theme === "light" ? "light" : "dark"}
                    onEmojiClick={
                      handleEmojiClick
                    }
                  />
                </div>
              )}
            </div>

            <button
              onClick={handlePostComment}
              className={`text-sm sm:text-base font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer devs:font-mono devs:uppercase devs:tracking-widest devs:text-xs devs:sm:text-xs ${
                isDevs && comment.trim()
                  ? "!text-[var(--devs-cyan)] [text-shadow:0_0_10px_rgba(34,240,255,0.7)]"
                  : ""
              }`}
            >
              Post
            </button>
          </div>
        </div>
      </motion.div>

      {isShareOpen &&
        (isReel ? (
          <ShareOverlay
            reel={reel}
            onClose={() =>
              setIsShareOpen(false)
            }
          />
        ) : (
          <ShareOverlay
            post={post}
            onClose={() =>
              setIsShareOpen(false)
            }
          />
        ))}

      <style>{`
        @media (max-width: 1023px) {
          @keyframes commentsSheetSlideUp {
            from {
              transform: translateY(100%);
            }
            to {
              transform: translateY(0);
            }
          }

          .mobile-sheet-anim {
            animation: commentsSheetSlideUp 0.28s ease-out;
          }
        }
      `}</style>
    </motion.div>
  );

  return createPortal(
    overlay,
    document.body
  );
};

export default CommentsOverlay;