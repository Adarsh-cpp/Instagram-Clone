import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import CommentsOverlay from "./CommentsOverlay";
import ShareOverlay from "./ShareOverlay";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
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
} from "lucide-react";
import { getTimeAgo } from "../utils/timeAgo";

const BASE_URL = import.meta.env.VITE_SERVER_URL

const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
});

const HomepagePostCard = ({ ...props }) => {
  const { user } = useAuth();

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
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

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

  const toggleLike = useCallback(async () => {
    try {
      const response = await axios.post(
        `${BASE_URL}/post/${props.postId}/toggle-likes`,
        {},
        authConfig()
      );
      setIsLiked(response.data.liked);
      setLikesCount((prev) => (response.data.liked ? prev + 1 : prev - 1));
    } catch (error) {
      console.log(error);
    }
  }, [props?.postId]);

  const doubleClickToLike = useCallback(async () => {
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
  }, [isLiked, toggleLike]);

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
        className={`postImg relative w-full select-none ${
          props.aspectRatio === "1:1"
            ? "aspect-square"
            : props.aspectRatio === "16:9"
            ? "aspect-video"
            : "aspect-[4/5]"
        }`}
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
              <span className="text-sm font-semibold">{props.commentsCount}</span>
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
            View all {props.commentsCount} comments
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