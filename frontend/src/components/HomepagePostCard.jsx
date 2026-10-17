import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import CommentsOverlay from "./CommentsOverlay";
import ShareOverlay from "./ShareOverlay";
import LikeBurst from "./devs/LikeBurst";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { NavLink } from "react-router-dom";
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Heart,
  MessageCircle,
  Send,
  Bookmark,
  BadgeCheck,
  MapPin,
} from "lucide-react";
import { getTimeAgo } from "../utils/timeAgo";

const BASE_URL = import.meta.env.VITE_SERVER_URL

const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
});

/* ====================================================================
   DEVS MODE helpers (only used when the theme is "devs")
   ==================================================================== */

// Slot-machine style number: rolls up/down whenever the value changes
const AnimatedCount = ({ value }) => (
  <span className="relative inline-flex h-[18px] min-w-[10px] overflow-hidden items-center">
    <AnimatePresence mode="wait" initial={false}>
      <motion.span
        key={value}
        initial={{ y: 14, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -14, opacity: 0 }}
        transition={{ duration: 0.16 }}
        className="font-mono text-[13px] font-bold leading-none"
      >
        {value}
      </motion.span>
    </AnimatePresence>
  </span>
);

// Colours #hashtags and @mentions in captions
const renderCaption = (text = "") =>
  text.split(/([#@][\w.]+)/g).map((part, i) =>
    /^[#@][\w.]+$/.test(part) ? (
      <span key={i} className="text-[var(--devs-cyan)]">
        {part}
      </span>
    ) : (
      part
    )
  );

// Glowing HUD brackets in the four corners of the media
const HUD_CORNERS = [
  "top-2 left-2 border-t-2 border-l-2 rounded-tl-lg",
  "top-2 right-2 border-t-2 border-r-2 rounded-tr-lg",
  "bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg",
  "bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg",
];

const HudCorners = () => (
  <>
    {HUD_CORNERS.map((c) => (
      <span
        key={c}
        className={`absolute w-4 h-4 pointer-events-none z-10 ${c}`}
        style={{
          borderColor: "rgba(34,240,255,0.7)",
          filter: "drop-shadow(0 0 4px rgba(34,240,255,0.8))",
        }}
      />
    ))}
  </>
);

// Media frame that leans toward the cursor (desktop only)
const TiltFrame = ({ children, className, disabled, ...rest }) => {
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [3, -3]), {
    stiffness: 140,
    damping: 20,
  });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-4, 4]), {
    stiffness: 140,
    damping: 20,
  });

  const onMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const reset = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={disabled ? undefined : onMove}
      onPointerLeave={disabled ? undefined : reset}
      style={disabled ? undefined : { rotateX, rotateY, transformPerspective: 1100 }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
};

const slideVariants = {
  enter: (dir) => ({ x: dir * 70, opacity: 0, scale: 1.04 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (dir) => ({ x: dir * -70, opacity: 0, scale: 0.98 }),
};

const pillClass =
  "h-[38px] px-3 rounded-full flex items-center gap-2 cursor-pointer border border-[var(--border-soft)] bg-[var(--bg-surface)] hover:border-[var(--border-popup)] transition-colors";

const HomepagePostCard = ({ ...props }) => {
  const { user } = useAuth();
  const { isDevs, lite } = useTheme();

  // The author id can arrive as a flat `authorId`, or inside a populated
  // `author` object (e.g. right after creating a post, before any refetch).
  const resolvedAuthorId =
    props?.authorId ||
    (typeof props?.author === "object" ? props.author?._id : null);

  // Compare ids as strings — user._id and the author id may be different
  // types (ObjectId vs string) depending on where they came from, so a
  // strict === can silently fail even when they refer to the same user.
  const isOwnPost =
    !!user?._id &&
    !!resolvedAuthorId &&
    user._id.toString() === resolvedAuthorId.toString();

  // Resolve the display name. `props.author` may be a string, a populated
  // object, or missing entirely on a freshly created post. In that last case
  // (and only for the logged-in user's own post) fall back to their own
  // username from context so it shows immediately without a refresh.
  const authorName =
    (typeof props?.author === "string"
      ? props.author
      : props?.author?.username) ||
    (isOwnPost ? user?.username || user?.name : "") ||
    "";

  // Same idea for the avatar.
  const authorProfileImg =
    props.profileImgSrc ||
    (typeof props?.author === "object" ? props.author?.profilePic : null) ||
    (isOwnPost ? user?.profilePic : null) ||
    null;

  const profileURL = isOwnPost ? "/user/get-profile" : `/user/get-profile/${resolvedAuthorId}`;

  // Blue verified tick, shown only for the admin account. This component
  // only ever receives a flat `authorId`/`author` (username string) via
  // props, never the full author document, so the parent that renders
  // this card needs to also pass `authorRole` (e.g. authorRole={post.author.role})
  // for this to resolve to true. For your own post we can read it from context.
  const isAdminAuthor =
    props.authorRole === "admin" ||
    (typeof props?.author === "object" && props.author?.role === "admin") ||
    (isOwnPost && user?.role === "admin");

  // Whether the currently logged-in user (viewing the feed) is an admin —
  // separate from isAdminAuthor above, which is about the post's author.
  // Admins can delete any post, not just their own.
  const isCurrentUserAdmin = user?.role === "admin";

  const canDeletePost = isOwnPost || isCurrentUserAdmin;

  const animatedLikeRef = useRef();
  const touchStartX = useRef(null);
  const menuRef = useRef(null);

  const [isLiked, setIsLiked] = useState(props.isLiked || false);
  const [likesCount, setLikesCount] = useState(props.likesCount || 0);
  const [isSaved, setIsSaved] = useState(props.isSaved || false);
  const [commentsCount, setCommentsCount] = useState(props.commentsCount || 0);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  // Devs Mode only: carousel slide direction + like-burst triggers
  const [slideDir, setSlideDir] = useState(1);
  const [bigBurst, setBigBurst] = useState(0);
  const [likeBurst, setLikeBurst] = useState(0);

  // Follow state — kept as real state (synced from context) instead of
  // derived inline, so a toggle can update it immediately without a refresh.
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);

  // 3-dot menu / delete flow
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);

  useEffect(() => {
    setIsLiked(props.isLiked);
  }, [props.isLiked]);

  // Keeps the on-screen comment count correct even though it's owned by a
  // prop: synced whenever the parent re-fetches/re-renders with a fresh
  // value, but also bumped locally the instant a comment is posted (see
  // onCommentAdded passed to CommentsOverlay below) so the footer updates
  // immediately instead of waiting for a page refresh.
  useEffect(() => {
    setCommentsCount(props.commentsCount || 0);
  }, [props.commentsCount]);

  // Keep local follow state in sync whenever the logged-in user's
  // following list (or the post's author) changes.
  useEffect(() => {
    const following = user?.following?.some(
      (id) => id?.toString() === resolvedAuthorId?.toString()
    );
    setIsFollowing(!!following);
  }, [user?.following, resolvedAuthorId]);

  const followDisplay = !isOwnPost && !isFollowing;

  // close the 3-dot menu when clicking anywhere outside it
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // Prefer the real media array from the backend (media: [{url, mediaType}]).
  // Falls back to the old single-image props so any caller that hasn't been
  // updated to pass `media` yet still renders correctly.
  const mediaList = useMemo(() => {
    if (props.media && props.media.length > 0) return props.media;
    return props.postImgSrc ? [{ url: props.postImgSrc, mediaType: "image" }] : [];
  }, [props.media, props.postImgSrc]);

  const isCarousel = mediaList.length > 1;

  const goPrev = useCallback((e) => {
    e.stopPropagation();
    setSlideDir(-1);
    setActiveSlide((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(
    (e) => {
      e.stopPropagation();
      setSlideDir(1);
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
      setSlideDir(delta > 0 ? -1 : 1);
      setActiveSlide((i) =>
        delta > 0 ? Math.max(0, i - 1) : Math.min(mediaList.length - 1, i + 1)
      );
    }
    touchStartX.current = null;
  };

  const toggleLike = useCallback(async () => {
    try {
      const response = await axios.post(
        `${BASE_URL}/post/${props.postId}/toggle-likes`,
        {},
        authConfig()
      );
      setIsLiked(response.data.liked);
      setLikesCount((prev) => (response.data.liked ? prev + 1 : prev - 1));
      return response.data.liked;
    } catch (error) {
      console.log(error);
      return null;
    }
  }, [props?.postId]);

  const doubleClickToLike = useCallback(async () => {
    if (isDevs) {
      // Devs Mode: neon burst instead of the plain white heart
      setBigBurst((n) => n + 1);
    } else {
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
    }

    if (!isLiked) {
      await toggleLike();
    }
  }, [isLiked, toggleLike, isDevs]);

  // Devs Mode like button: same API call, plus a small burst when it becomes liked
  const handleDevsLike = async () => {
    const liked = await toggleLike();
    if (liked) setLikeBurst((n) => n + 1);
  };

  const handleSave = useCallback(async () => {
    const prevValue = isSaved;
    const next = !prevValue;
    setIsSaved(next);

    try {
      await axios.post(`${BASE_URL}/post/${props.postId}/toggle-save`, {}, authConfig());
    } catch (error) {
      setIsSaved(prevValue);
      toast.error("Something went wrong");
    }
  }, [props?.postId, isSaved]);

  // Follow / unfollow the post's author. Optimistically flips the local
  // state so the UI (and visibility of the Follow link) updates instantly,
  // then reconciles with the server response; reverts on failure.
  const handleFollowToggle = useCallback(
    async (e) => {
      e?.stopPropagation();
      if (isOwnPost || !resolvedAuthorId || isFollowLoading) return;

      const prevValue = isFollowing;
      setIsFollowing(!prevValue);
      setIsFollowLoading(true);

      try {
        const { data } = await axios.post(
          `${BASE_URL}/user/profile/${resolvedAuthorId}/follow-toggle`,
          {},
          authConfig()
        );
        setIsFollowing(data.isFollowing);
      } catch (error) {
        setIsFollowing(prevValue);
        toast.error("Something went wrong");
      } finally {
        setIsFollowLoading(false);
      }
    },
    [resolvedAuthorId, isOwnPost, isFollowing, isFollowLoading]
  );

  const handleDeletePost = async () => {
    setIsDeleting(true);
    try {
      await axios.delete(`${BASE_URL}/post/${props.postId}/delete`, authConfig());
      setIsDeleteConfirmOpen(false);
      setIsDeleted(true);
      toast.success("Post deleted");
      props.onDeleted?.(props.postId);
    } catch (error) {
      toast.error("Something went wrong while deleting the post");
    } finally {
      setIsDeleting(false);
    }
  };

  const post = useMemo(
    () => ({
      _id: props.postId,
      media: mediaList,
      author: {
        username: authorName,
        profilePic: authorProfileImg,
      },
      caption: props.caption,
      createdAt: props.createdAt,
      likes: Array(likesCount).fill(null),
      location: props.location,
    }),
    [props.postId, mediaList, authorName, authorProfileImg, props.caption, props.createdAt, likesCount, props.location]
  );

  // once deleted, this card just disappears — the parent list should also
  // drop it via onDeleted, but this guards against a stale render in between
  if (isDeleted) return null;

  const aspectClass =
    props.aspectRatio === "1:1"
      ? "aspect-square"
      : props.aspectRatio === "16:9"
      ? "aspect-video"
      : "aspect-[4/5]";

  /* ====================================================================
     DEVS MODE
     ==================================================================== */
  if (isDevs) {
    const item = mediaList[activeSlide];

    return (
      <motion.div
        initial={{ opacity: 0, y: 28, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.2, 0.8, 0.2, 1] }}
        className="postCard devs-glass rounded-3xl p-3 sm:p-4 w-full mt-4 transition-shadow duration-300 hover:shadow-[0_0_40px_rgba(34,240,255,0.12)]"
      >
        {/* Header */}
        <div className="header w-full flex items-center gap-3 pb-3">
          <div className="relative w-[46px] h-[46px] shrink-0">
            <span
              className="absolute -inset-[2px] rounded-full"
              style={{
                background:
                  "conic-gradient(from var(--devs-angle), #22f0ff, #8b5cf6, #ff2bd6, #22f0ff)",
                animation: lite ? "none" : "devs-spin 5s linear infinite",
              }}
            />
            <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-[#04050e] bg-black">
              <img
                src={authorProfileImg ? authorProfileImg : "/images/default-profile-pic.jpg"}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="profileInfo flex-1 min-w-0 text-[var(--text-primary)]">
            <div className="info flex items-center gap-2 min-w-0">
              <NavLink to={profileURL} className="min-w-0 max-w-[55%]">
                <div className="name cursor-pointer flex items-center gap-1 min-w-0 font-bold">
                  <span className="truncate">{authorName}</span>
                  {isAdminAuthor && (
                    <BadgeCheck
                      size={15}
                      className="text-[var(--devs-cyan)] shrink-0"
                      style={{ filter: "drop-shadow(0 0 5px rgba(34,240,255,0.9))" }}
                    />
                  )}
                </div>
              </NavLink>
              <span className="day shrink-0 whitespace-nowrap font-mono text-[11px] text-[var(--text-muted)]">
                {getTimeAgo(props.createdAt)}
              </span>
              {followDisplay && (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.9 }}
                  whileHover={{ scale: 1.06 }}
                  onClick={handleFollowToggle}
                  className="follow shrink-0 whitespace-nowrap font-mono text-[10px] uppercase tracking-widest px-2.5 py-0.5 rounded-full text-[var(--devs-cyan)] border border-[var(--devs-cyan)] hover:bg-[rgba(34,240,255,0.12)] cursor-pointer"
                >
                  Follow
                </motion.button>
              )}
            </div>
            <div className="location mt-0.5 flex items-center gap-1 font-mono text-[11px] text-[var(--text-muted)]">
              <MapPin size={11} />
              <span className="truncate">{props.location?.name || "India"}</span>
            </div>
          </div>

          {/* 3-dot menu */}
          {canDeletePost && (
            <div ref={menuRef} className="relative ml-auto">
              <motion.button
                whileTap={{ scale: 0.85 }}
                whileHover={{ rotate: 90 }}
                onClick={() => setIsMenuOpen((prev) => !prev)}
                className="text-[var(--text-muted)] hover:text-[var(--devs-cyan)] transition-colors cursor-pointer p-1"
                aria-label="Post options"
              >
                <MoreHorizontal size={22} />
              </motion.button>

              <AnimatePresence>
                {isMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-[110%] w-[170px] devs-glass rounded-2xl overflow-hidden z-20"
                  >
                    <button
                      onClick={() => {
                        setIsMenuOpen(false);
                        setIsDeleteConfirmOpen(true);
                      }}
                      className="w-full text-left px-4 py-3 text-sm font-mono font-semibold text-[var(--color-danger)] hover:bg-[var(--bg-danger-hover)] cursor-pointer transition"
                    >
                      Delete
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Post media (HUD frame + carousel) */}
        <TiltFrame
          disabled={lite}
          onDoubleClick={doubleClickToLike}
          onTouchStart={isCarousel ? handleTouchStart : undefined}
          onTouchEnd={isCarousel ? handleTouchEnd : undefined}
          className={`postImg group relative w-full select-none rounded-2xl overflow-hidden bg-black ${aspectClass}`}
        >
          <AnimatePresence initial={false} custom={slideDir}>
            <motion.div
              key={activeSlide}
              custom={slideDir}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
              className="absolute inset-0"
            >
              {item?.mediaType === "video" ? (
                <video
                  src={item.url}
                  className="w-full h-full object-cover"
                  controls
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img src={item?.url} alt="" className="w-full h-full object-cover" />
              )}
            </motion.div>
          </AnimatePresence>

          {/* Scanlines + soft bottom shade */}
          <div
            className="absolute inset-0 pointer-events-none z-[5] opacity-[0.1]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
              mixBlendMode: "overlay",
            }}
          />
          <div className="absolute inset-x-0 bottom-0 h-1/4 pointer-events-none z-[5] bg-gradient-to-t from-black/35 to-transparent" />

          <HudCorners />
          <LikeBurst burstKey={bigBurst} variant="big" />

          {isCarousel && activeSlide > 0 && (
            <button
              type="button"
              onClick={goPrev}
              onDoubleClick={(e) => e.stopPropagation()}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full devs-glass flex items-center justify-center cursor-pointer z-10 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              aria-label="Previous"
            >
              <ChevronLeft size={18} color="white" />
            </button>
          )}
          {isCarousel && activeSlide < mediaList.length - 1 && (
            <button
              type="button"
              onClick={goNext}
              onDoubleClick={(e) => e.stopPropagation()}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full devs-glass flex items-center justify-center cursor-pointer z-10 opacity-80 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
              aria-label="Next"
            >
              <ChevronRight size={18} color="white" />
            </button>
          )}

          {isCarousel && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 devs-glass rounded-full px-3 py-0.5 font-mono text-[10px] tracking-widest text-[var(--text-primary)] z-10">
              {String(activeSlide + 1).padStart(2, "0")} / {String(mediaList.length).padStart(2, "0")}
            </div>
          )}

          {isCarousel && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
              {mediaList.map((_, i) => (
                <motion.span
                  key={i}
                  animate={{ width: i === activeSlide ? 18 : 6 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="h-1.5 rounded-full"
                  style={{
                    background:
                      i === activeSlide
                        ? "linear-gradient(90deg,#22f0ff,#ff2bd6)"
                        : "rgba(255,255,255,0.4)",
                    boxShadow: i === activeSlide ? "0 0 8px rgba(34,240,255,0.8)" : "none",
                  }}
                />
              ))}
            </div>
          )}
        </TiltFrame>

        {/* Footer */}
        <div className="footer w-full mt-3 text-[var(--text-primary)]">
          <div className="iconSection w-full flex items-center gap-2">
            {/* Like */}
            <motion.button
              type="button"
              onClick={handleDevsLike}
              whileTap={{ scale: 0.88 }}
              whileHover={{ y: -2 }}
              aria-label={isLiked ? "Unlike" : "Like"}
              className={`${pillClass} ${
                isLiked
                  ? "!border-[var(--devs-magenta)] shadow-[0_0_18px_rgba(255,43,214,0.35)]"
                  : ""
              }`}
            >
              <span className="relative flex">
                <motion.span
                  initial={false}
                  animate={
                    isLiked
                      ? { scale: [1, 1.5, 0.92, 1.12, 1], rotate: [0, -12, 8, 0, 0] }
                      : { scale: 1, rotate: 0 }
                  }
                  transition={{ duration: 0.5 }}
                  className="flex"
                >
                  <Heart
                    size={21}
                    color={isLiked ? "var(--devs-magenta)" : "var(--text-primary)"}
                    fill={isLiked ? "var(--devs-magenta)" : "none"}
                    strokeWidth={isLiked ? 0 : 1.8}
                    style={{
                      filter: isLiked ? "drop-shadow(0 0 8px rgba(255,43,214,0.8))" : "none",
                    }}
                  />
                </motion.span>
                <LikeBurst burstKey={likeBurst} variant="mini" />
              </span>
              <AnimatedCount value={likesCount} />
            </motion.button>

            {/* Comments */}
            <motion.button
              type="button"
              onClick={() => setIsCommentsOpen(true)}
              whileHover="hover"
              whileTap={{ scale: 0.9 }}
              variants={{ hover: { y: -2 } }}
              aria-label="Comments"
              className={pillClass}
            >
              <motion.span
                variants={{ hover: { rotate: [0, -12, 12, 0] } }}
                transition={{ duration: 0.4 }}
                className="flex"
              >
                <MessageCircle
                  size={20}
                  className="-scale-x-100"
                  color="var(--text-primary)"
                  strokeWidth={1.8}
                />
              </motion.span>
              <AnimatedCount value={commentsCount} />
            </motion.button>

            {/* Share */}
            <motion.button
              type="button"
              onClick={() => setIsShareOpen(true)}
              whileHover="hover"
              whileTap={{ scale: 0.9 }}
              variants={{ hover: { y: -2 } }}
              aria-label="Share"
              className={pillClass}
            >
              <motion.span
                variants={{ hover: { x: 3, y: -3 } }}
                transition={{ type: "spring", stiffness: 400, damping: 15 }}
                className="flex"
              >
                <Send size={19} color="var(--text-primary)" strokeWidth={1.8} />
              </motion.span>
            </motion.button>

            {/* Save */}
            <motion.button
              type="button"
              onClick={handleSave}
              whileTap={{ scale: 0.8 }}
              aria-label={isSaved ? "Unsave" : "Save"}
              className="ml-auto h-[38px] w-[38px] rounded-full flex items-center justify-center cursor-pointer"
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
                  size={22}
                  color={isSaved ? "var(--devs-cyan)" : "var(--text-primary)"}
                  fill={isSaved ? "var(--devs-cyan)" : "none"}
                  strokeWidth={1.8}
                  style={{
                    filter: isSaved ? "drop-shadow(0 0 7px rgba(34,240,255,0.8))" : "none",
                  }}
                />
              </motion.span>
            </motion.button>
          </div>

          <div className="captionSection mt-3 px-1 text-[14px] leading-relaxed">
            <span className="devs-text-gradient font-bold">{authorName}</span>
            &nbsp;
            {!showFullCaption ? (
              <>
                <span>{renderCaption(props.caption?.slice(0, 50))}</span>
                {props.caption?.length > 50 && (
                  <span
                    onClick={() => setShowFullCaption(true)}
                    className="font-mono text-[12px] text-[var(--devs-cyan)] pl-2 cursor-pointer hover:[text-shadow:0_0_10px_rgba(34,240,255,0.8)]"
                  >
                    more
                  </span>
                )}
              </>
            ) : (
              <>
                <div className="mt-1 break-words">{renderCaption(props.caption)}</div>
                <span
                  onClick={() => setShowFullCaption(false)}
                  className="font-mono text-[12px] text-[var(--devs-cyan)] cursor-pointer hover:[text-shadow:0_0_10px_rgba(34,240,255,0.8)]"
                >
                  less
                </span>
              </>
            )}
          </div>

          <div className="cmntSection mt-2 px-1 flex flex-col gap-2 font-mono text-[12px]">
            <button
              type="button"
              onClick={() => setIsCommentsOpen(true)}
              className="cmntsCount text-left w-fit text-[var(--text-muted)] hover:text-[var(--devs-cyan)] transition-colors cursor-pointer"
            >
              <span className="text-[var(--devs-lime)]">&gt;</span> View all {commentsCount} comments
            </button>
            <div
              onClick={() => setIsCommentsOpen(true)}
              className="allCmnts h-[36px] rounded-xl bg-[var(--bg-input)] border border-[var(--border-soft)] px-3 flex items-center text-[var(--text-muted)] cursor-text hover:border-[var(--border-popup)] transition-colors"
            >
              Add a comment...
            </div>
          </div>
        </div>

        {isCommentsOpen && (
          <CommentsOverlay
            post={post}
            authorId={resolvedAuthorId}
            authorRole={props.authorRole}
            onClose={() => setIsCommentsOpen(false)}
            onLikesCountChange={(count) => setLikesCount(count)}
            onSaveChange={(saved) => setIsSaved(saved)}
            onCommentAdded={() => setCommentsCount((prev) => prev + 1)}
            initialIsLiked={isLiked}
            initialIsSaved={isSaved}
          />
        )}

        {isShareOpen && (
          <ShareOverlay post={post} onClose={() => setIsShareOpen(false)} />
        )}

        {/* Delete confirmation.
            Rendered in a portal so it covers the whole screen: the feed rows are
            positioned with `transform`, which would otherwise trap a `fixed` modal. */}
        {createPortal(
          <AnimatePresence>
            {isDeleteConfirmOpen && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[10000] flex justify-center items-center bg-black/70 backdrop-blur-sm p-4"
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20, opacity: 0 }}
                  animate={{ scale: 1, y: 0, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className="devs-glass devs-neon-border w-full max-w-[340px] rounded-3xl overflow-hidden text-center"
                >
                  <div className="px-6 py-6 border-b border-[var(--border-soft)]">
                    <h3 className="text-[var(--text-primary)] font-bold text-base mb-2" style={{ fontFamily: "var(--devs-font-display)" }}>
                      Delete post?
                    </h3>
                    <p className="text-[var(--text-muted)] text-[12px] font-mono leading-relaxed">
                      This action cannot be undone. This post will be permanently removed.
                    </p>
                  </div>
                  <button
                    onClick={handleDeletePost}
                    disabled={isDeleting}
                    className="w-full py-3 text-[var(--color-danger)] font-mono font-semibold text-sm border-b border-[var(--border-soft)] hover:bg-[var(--bg-danger-hover)] transition cursor-pointer disabled:opacity-50"
                  >
                    {isDeleting ? "Deleting..." : "Delete"}
                  </button>
                  <button
                    onClick={() => setIsDeleteConfirmOpen(false)}
                    disabled={isDeleting}
                    className="w-full py-3 text-[var(--text-primary)] font-mono font-medium text-sm hover:bg-[var(--bg-row-hover)] transition cursor-pointer disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
      </motion.div>
    );
  }

  /* ====================================================================
     CLASSIC (light / dark) - unchanged
     ==================================================================== */
  return (
    <div className="postCard w-full mt-4 ">
      {/* Header */}
      <div className="header w-full h-[50px] flex items-center px-2 bg-[var(--bg-app)]">
        <div className="profilePic w-[45px] h-[45px] rounded-full overflow-hidden cursor-pointer shrink-0">
          <img src={authorProfileImg ? authorProfileImg : "/images/default-profile-pic.jpg"} alt="" />
        </div>
        <div className="profileInfo min-w-[70%] h-full px-2 text-[var(--text-primary)]">
          {/* Name + badge + date + follow.
              Uses flex-shrink instead of fixed % widths so the badge and
              date never get squeezed together on narrow (mobile) screens:
              the name truncates first; badge, date and Follow stay intact. */}
          <div className="info w-full h-[50%] flex justify-start items-center gap-2 min-w-0">
            <NavLink to={profileURL} className="h-full min-w-0 max-w-[55%]">
              <div className="name h-full cursor-pointer flex items-center gap-1 min-w-0">
                <span className="truncate">{authorName}</span>
                {isAdminAuthor && (
                  <BadgeCheck size={14} className="text-sky-400 shrink-0" />
                )}
              </div>
            </NavLink>
            <div className="day h-full flex items-center shrink-0 whitespace-nowrap text-[var(--text-muted)]">
              {getTimeAgo(props.createdAt)}
            </div>
            {followDisplay && (
              <div
                onClick={handleFollowToggle}
                className="follow h-full flex items-center shrink-0 whitespace-nowrap text-[var(--link-muted)] hover:text-[var(--link-muted-hover)] cursor-pointer"
              >
                Follow
              </div>
            )}
          </div>
          <div className="location w-full h-[50%] text-[var(--text-muted)]">
            {props.location?.name || "India"}
          </div>
        </div>

        {/* 3-dot menu — visible on the logged-in user's own post, or for admins on any post */}
        {canDeletePost && (
          <div ref={menuRef} className="relative ml-auto pr-1">
            <button
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer p-1"
              aria-label="Post options"
            >
              <MoreHorizontal size={22} />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-[110%] w-[160px] bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl shadow-2xl overflow-hidden z-20">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsDeleteConfirmOpen(true);
                  }}
                  className="w-full text-left px-4 py-3 text-sm font-semibold text-[var(--color-danger)] hover:bg-[var(--bg-row-hover)] cursor-pointer transition"
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Post media (carousel) */}
      <div
        className={`postImg relative w-full select-none ${aspectClass}`}
        onDoubleClick={doubleClickToLike}
        onTouchStart={isCarousel ? handleTouchStart : undefined}
        onTouchEnd={isCarousel ? handleTouchEnd : undefined}
      >
        <Heart
          ref={animatedLikeRef}
          fill="var(--text-on-brand)"
          color="var(--text-on-brand)"
          strokeWidth={0}
          className="likeAnimation absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[0px] h-[150px] opacity-0 pointer-events-none transition-all ease-in-out duration-[3s] drop-shadow-[0_0_12px_rgba(0,0,0,0.35)]"
        />

        {mediaList[activeSlide]?.mediaType === "video" ? (
          <video
            src={mediaList[activeSlide].url}
            className="w-full h-full object-cover"
            controls
            muted
            loop
            playsInline
          />
        ) : (
          <img src={mediaList[activeSlide]?.url} alt="" className="w-full h-full object-cover rounded-md" />
        )}

        {isCarousel && activeSlide > 0 && (
          <div
            onClick={goPrev}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10"
          >
            <ChevronLeft size={18} color="white" />
          </div>
        )}
        {isCarousel && activeSlide < mediaList.length - 1 && (
          <div
            onClick={goNext}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10"
          >
            <ChevronRight size={18} color="white" />
          </div>
        )}

        {isCarousel && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full z-10">
            {activeSlide + 1}/{mediaList.length}
          </div>
        )}

        {isCarousel && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {mediaList.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === activeSlide ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="footer w-full min-h-[140px] mt-2 text-[var(--text-primary)]">
        <div className="iconSection w-full h-[35px] flex">
          <div className="left flex items-center gap-5 px-2">
            <div className="like flex items-center gap-1">
              <Heart
                size={26}
                onClick={toggleLike}
                className="cursor-pointer transition-colors"
                color={isLiked ? "var(--color-danger)" : "var(--text-primary)"}
                fill={isLiked ? "var(--color-danger)" : "none"}
                strokeWidth={isLiked ? 0 : 2}
              />
              <span className="text-sm font-semibold">{likesCount}</span>
            </div>

            <div onClick={() => setIsCommentsOpen(true)} className="cmnt flex items-center gap-1">
              <MessageCircle
                size={25}
                className="cursor-pointer -scale-x-100"
                color="var(--text-primary)"
                strokeWidth={2}
              />
              <span className="text-sm font-semibold">{commentsCount}</span>
            </div>

            <div onClick={() => setIsShareOpen(true)} className="share flex items-center">
              <Send
                size={24}
                className="cursor-pointer"
                color="var(--text-primary)"
                strokeWidth={2}
              />
            </div>
          </div>

          <div className="right flex-1 flex justify-end items-center pr-2">
            <Bookmark
              size={24}
              onClick={handleSave}
              className="cursor-pointer transition-colors"
              color="var(--text-primary)"
              fill={isSaved ? "var(--text-primary)" : "none"}
              strokeWidth={2}
            />
          </div>
        </div>

        <div className="captionSection w-full px-2">
          <span className="font-semibold">{authorName}&nbsp;</span>
          {!showFullCaption ? (
            <>
              <span>{props.caption?.slice(0, 50)}</span>
              {props.caption?.length > 50 && (
                <span
                  onClick={() => setShowFullCaption(true)}
                  className="text-[var(--text-muted)] pl-2 cursor-pointer"
                >
                  more
                </span>
              )}
            </>
          ) : (
            <>
              <div className="mt-1 break-words">{props.caption}</div>
              <span onClick={() => setShowFullCaption(false)} className="text-[var(--text-muted)] cursor-pointer">
                less
              </span>
            </>
          )}
        </div>

        <div className="cmntSection w-full h-[34%]">
          <div
            onClick={() => setIsCommentsOpen(true)}
            className="cmntsCount w-full h-[50%] px-2 text-[var(--text-muted)] cursor-pointer"
          >
            View all {commentsCount} comments
          </div>
          <div className="allCmnts w-full h-[50%] px-2 text-[var(--text-muted)]">Add a comment...</div>
        </div>
      </div>

      {isCommentsOpen && (
        <CommentsOverlay
          post={post}
          authorId={resolvedAuthorId}
          authorRole={props.authorRole}
          onClose={() => setIsCommentsOpen(false)}
          onLikesCountChange={(count) => setLikesCount(count)}
          onSaveChange={(saved) => setIsSaved(saved)}
          onCommentAdded={() => setCommentsCount((prev) => prev + 1)}
          initialIsLiked={isLiked}
          initialIsSaved={isSaved}
        />
      )}

      {isShareOpen && (
        <ShareOverlay post={post} onClose={() => setIsShareOpen(false)} />
      )}

      {/* Delete confirmation */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/70 p-4">
          <div className="w-full max-w-[340px] rounded-2xl bg-[var(--bg-surface)] overflow-hidden text-center shadow-2xl">
            <div className="px-6 py-6 border-b border-[var(--border-soft)]">
              <h3 className="text-[var(--text-primary)] font-semibold text-base mb-2">Delete post?</h3>
              <p className="text-[var(--text-muted)] text-sm">
                This action cannot be undone. This post will be permanently removed.
              </p>
            </div>
            <button
              onClick={handleDeletePost}
              disabled={isDeleting}
              className="w-full py-3 text-[var(--color-danger)] font-semibold text-sm border-b border-[var(--border-soft)] hover:bg-[var(--bg-row-hover)] transition cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isDeleting}
              className="w-full py-3 text-[var(--text-primary)] font-medium text-sm hover:bg-[var(--bg-row-hover)] transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomepagePostCard;