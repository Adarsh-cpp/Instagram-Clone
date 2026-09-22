import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { createPortal } from "react-dom";
import Comment from "./Comment";
import ShareOverlay from "./ShareOverlay";
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

const CommentsOverlay = ({
  post,
  reel,
  authorId,
  authorRole,
  onClose,
  onLikesCountChange,
  onSaveChange,
  initialIsLiked,
  initialIsSaved,
  // When true, the media (image/video) panel is also shown on mobile,
  // stacked above the comments instead of being hidden below the `lg`
  // breakpoint. Used for entry points where the user hasn't already
  // seen the media elsewhere (e.g. opening a shared post/reel straight
  // from a chat message) — the normal home-feed → comment-icon flow
  // leaves this false/unset since the user already saw the post there.
  showMediaOnMobile = false,
}) => {
  const { user, refreshUser } = useAuth();
  const { theme } = useTheme();

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

    setActiveSlide((index) =>
      Math.max(0, index - 1)
    );
  }, []);

  const goNext = useCallback(
    (e) => {
      e.stopPropagation();

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

  const overlay = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-[rgba(0,0,0,0.8)] lg:items-center lg:p-6"
    >
      <div
        onClick={onClose}
        className="cmntsClose absolute right-[10px] top-[10px] hidden h-[40px] w-[40px] lg:block"
      >
        <X className="h-[98%] w-[98%] cursor-pointer text-white transition-all ease-in-out hover:h-full hover:w-full" />
      </div>

      <div
        onClick={(e) =>
          e.stopPropagation()
        }
        className={`mobile-sheet-anim relative mx-auto flex w-full flex-col overflow-hidden rounded-t-2xl bg-[var(--bg-surface)] shadow-2xl lg:h-[92vh] lg:w-[90vw] lg:flex-row lg:rounded-2xl ${
          showMediaOnMobile ? "h-[88vh]" : "h-[75vh]"
        }`}
      >
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
          className={`relative w-full shrink-0 select-none items-center justify-center overflow-hidden bg-black lg:flex lg:h-full lg:w-1/2 ${
            showMediaOnMobile ? "flex h-[38vh]" : "hidden"
          }`}
        >
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

          {isReel ? (
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
          )}

          {isCarousel &&
            activeSlide > 0 && (
              <div
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10 select-none"
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
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10 select-none"
              >
                <ChevronRight
                  size={20}
                  color="white"
                />
              </div>
            )}

          {isCarousel && (
            <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-10 select-none">
              {activeSlide + 1}/
              {mediaList.length}
            </div>
          )}

          {isCarousel && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10 select-none">
              {mediaList.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full ${
                    index === activeSlide
                      ? "bg-white"
                      : "bg-white/40"
                  }`}
                />
              ))}
            </div>
          )}
        </div>

        <div className="flex min-h-0 w-full flex-1 flex-col lg:w-1/2 lg:border-l lg:border-[var(--border-soft)]">
          <div className="flex justify-center pt-2 lg:hidden">
            <div className="h-1 w-10 rounded-full bg-[var(--border-soft)]" />
          </div>

          <div className="flex items-center justify-between border-b border-[var(--border-soft)] px-4 py-3 sm:px-5 sm:py-4">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={
                  item?.author?.profilePic
                    ? item.author.profilePic
                    : "/images/default-profile-pic.jpg"
                }
                alt="author"
                className="h-10 w-10 sm:h-11 sm:w-11 rounded-full object-cover"
              />

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <NavLink to={profileURL}>
                    <h3 className="truncate text-sm sm:text-base font-semibold text-[var(--text-primary)] flex items-center gap-1">
                      {authorName}
                      {isAdminAuthor && (
                        <BadgeCheck size={14} className="text-sky-400 shrink-0" />
                      )}
                    </h3>
                  </NavLink>

                  {shouldShowFollowButton && (
                    <button
                      type="button"
                      onClick={handleFollowToggle}
                      disabled={isFollowLoading}
                      className="text-[var(--link-muted)] hover:text-[var(--link-muted-hover)] cursor-pointer text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Follow
                    </button>
                  )}
                </div>

                <p className="text-xs sm:text-sm text-[var(--text-muted)]">
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

          <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-4 hide-scrollbar min-h-0">
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

              <button className="hover:opacity-80 transition cursor-pointer">
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

            <Bookmark
              size={22}
              onClick={handleSave}
              className={`cursor-pointer select-none transition-colors ${
                isSaved
                  ? "fill-[var(--text-primary)] stroke-[var(--text-primary)]"
                  : "fill-transparent stroke-[var(--text-primary)] hover:stroke-[var(--text-muted)]"
              }`}
            />
          </div>

          <div className="px-4 pb-2 sm:px-5 text-sm font-semibold text-[var(--text-primary)]">
            {likesCount} likes
          </div>

          <div className="flex items-center gap-3 border-t border-[var(--border-soft)] px-4 py-3 sm:px-5">
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
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
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
                className="text-[var(--accent-blue)] hover:opacity-80 transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
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
                  <div className="absolute bottom-full left-0 z-50 mb-2 w-48 rounded-lg border border-[var(--border-soft)] bg-[var(--bg-surface)] shadow-lg py-1">
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

            <div className="relative w-full flex items-center gap-3 px-4 py-3 sm:px-5">
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
                className="w-full bg-transparent text-[var(--text-primary)] outline-none"
              />

              {showPicker && (
                <div className="absolute bottom-14 left-0 z-50">
                  <EmojiPicker
                    theme={theme}
                    onEmojiClick={
                      handleEmojiClick
                    }
                  />
                </div>
              )}
            </div>

            <button
              onClick={handlePostComment}
              className="text-sm sm:text-base font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            >
              Post
            </button>
          </div>
        </div>
      </div>

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
    </div>
  );

  return createPortal(
    overlay,
    document.body
  );
};

export default CommentsOverlay;