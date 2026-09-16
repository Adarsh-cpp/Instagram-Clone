// MessageBox.jsx
import React, { useState, useMemo, useRef, useEffect } from "react";
// lottie-react exports Lottie as a DEFAULT export — the named import was
// resolving to undefined, which throws the moment an animated sticker renders.
import {Lottie} from "lottie-react";
import {
  X,
  Download,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTimeAgo } from "../utils/timeAgo";
import CommentsOverlay from "./CommentsOverlay";
import { createPortal } from "react-dom";

const TILT_ANGLES = [-8, 5, -4, 7];
const CAPTION_TRIM_LENGTH = 60;
const STORY_TTL_MS = 24 * 60 * 60 * 1000;
const LONG_PRESS_MS = 500;

const trimCaption = (text) => {
  if (!text) return "";

  return text.length > CAPTION_TRIM_LENGTH
    ? `${text.slice(0, CAPTION_TRIM_LENGTH).trim()}...`
    : text;
};

const MessageBox = ({
  message,
  showSeen,
  onDelete,
  senderBubbleColor,
  receiverBubbleColor,
  senderTextColor,
  receiverTextColor,
}) => {
  const { user } = useAuth();

  const [isImageOpen, setIsImageOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  // right-click (desktop) / long-press (mobile) unsend menu — own messages only
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const longPressTimerRef = useRef(null);
  const menuRef = useRef(null);

  const senderId =
    typeof message?.senderId === "object"
      ? message?.senderId?._id
      : message?.senderId;

  const isSenderMessage = senderId === user?._id;

  // Resolved theme colors for THIS bubble. These are applied as inline
  // styles — they're runtime hex values from the theme catalog, so they
  // can never be Tailwind class names (which is what the old
  // `${isSenderMessage ? {senderBubbleColor} : {...}}` interpolation was
  // trying to be: it stringified an object into "[object Object]" and
  // silently produced no styling at all).
  const bubbleBg =
    (isSenderMessage ? senderBubbleColor : receiverBubbleColor) ||
    (isSenderMessage ? "#3797F0" : "#262626");

  const bubbleText =
    (isSenderMessage ? senderTextColor : receiverTextColor) || "#FFFFFF";

  const imageList = message?.images?.length
    ? message.images
    : message?.image
    ? [message.image]
    : [];

  const sticker = message?.sticker;

  const sharedPost = message?.sharedPost;
  const sharedReel = message?.sharedReel;
  const sharedStory = message?.sharedStory;

  // only one of these is ever set on a given message
  const shareKind = sharedPost
    ? "post"
    : sharedReel
    ? "reel"
    : sharedStory
    ? "story"
    : null;

  const sharedItem = sharedPost || sharedReel || sharedStory;

  // ---- reply-to-story snapshot (separate from sharedStory/forwarding) ----
  const repliedStory = message?.repliedStory;

  const isRepliedStoryExpired =
    !!repliedStory &&
    (!repliedStory.createdAt ||
      Date.now() - new Date(repliedStory.createdAt).getTime() > STORY_TTL_MS);

  const isStoryExpired =
    shareKind === "story" &&
    (!sharedStory?.createdAt ||
      Date.now() - new Date(sharedStory.createdAt).getTime() > STORY_TTL_MS);

  // thumbnail to show in the compact chat card
  const sharedThumbUrl =
    shareKind === "post"
      ? sharedPost.media?.[0]?.url
      : shareKind === "reel"
      ? sharedReel.media?.thumbnailUrl || sharedReel.media?.url
      : shareKind === "story"
      ? sharedStory.mediaUrl
      : null;

  const sharedThumbIsVideo =
    shareKind === "post"
      ? sharedPost.media?.[0]?.mediaType === "video"
      : shareKind === "reel"
      ? !sharedReel.media?.thumbnailUrl
      : shareKind === "story"
      ? sharedStory.mediaType === "video"
      : false;

  const sharedPostAsItem = useMemo(() => {
    if (!sharedPost) return null;

    return {
      _id: sharedPost._id,
      media: sharedPost.media || [],
      author: {
        _id: sharedPost.author?._id,
        username: sharedPost.author?.username,
        profilePic: sharedPost.author?.profilePic,
      },
      caption: sharedPost.caption,
      createdAt: sharedPost.createdAt,
      likes: sharedPost.likes || [],
    };
  }, [sharedPost]);

  const sharedReelAsItem = useMemo(() => {
    if (!sharedReel) return null;

    return {
      _id: sharedReel._id,
      media: {
        url: sharedReel.media?.url,
        thumbnailUrl: sharedReel.media?.thumbnailUrl,
        width: sharedReel.media?.width,
        height: sharedReel.media?.height,
      },
      author: {
        _id: sharedReel.author?._id,
        username: sharedReel.author?.username,
        profilePic: sharedReel.author?.profilePic,
      },
      caption: sharedReel.caption,
      createdAt: sharedReel.createdAt,
      likes: sharedReel.likes || [],
    };
  }, [sharedReel]);

  const initialIsLiked = useMemo(() => {
    if (!sharedItem?.likes || !user?._id) return false;

    return sharedItem.likes.some((id) => id.toString() === user._id.toString());
  }, [sharedItem, user?._id]);

  const [likesCount, setLikesCount] = useState(sharedItem?.likes?.length || 0);

  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isSaved, setIsSaved] = useState(false);

  const openOverlay = (index) => {
    setActiveIndex(index);
    setIsImageOpen(true);
  };

  const closeOverlay = () => setIsImageOpen(false);

  const showPrev = (e) => {
    e.stopPropagation();

    setActiveIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  const showNext = (e) => {
    e.stopPropagation();

    setActiveIndex((prev) => (prev + 1) % imageList.length);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();

    const currentUrl = imageList[activeIndex];

    if (isDownloading || !currentUrl) return;

    setIsDownloading(true);

    try {
      const response = await fetch(currentUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");

      link.href = blobUrl;
      link.download = `image-${message?._id || Date.now()}-${activeIndex}.jpg`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(currentUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  // ---- unsend menu: right-click on desktop, long-press on mobile ----

  const MENU_WIDTH = 140;

  const openMenuAt = (x, y) => {
    const left = Math.max(8, Math.min(x - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    const top = Math.min(y, window.innerHeight - 60);
    setMenuPosition({ x: left, y: top });
    setIsMenuOpen(true);
  };

  const handleContextMenu = (e) => {
    if (!isSenderMessage) return;

    e.preventDefault();
    openMenuAt(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    if (!isSenderMessage) return;

    const touch = e.touches[0];

    longPressTimerRef.current = setTimeout(() => {
      openMenuAt(touch.clientX, touch.clientY);
    }, LONG_PRESS_MS);
  };

  const cancelLongPress = () => {
    clearTimeout(longPressTimerRef.current);
  };

  useEffect(() => {
    return () => clearTimeout(longPressTimerRef.current);
  }, []);

  // close the menu on any click/tap outside it
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [isMenuOpen]);

  const handleUnsend = () => {
    setIsMenuOpen(false);
    onDelete?.(message._id);
  };

  const hasMedia =
    imageList.length > 0 || !!sharedItem || !!repliedStory || !!sticker;

  return (
    <div
      className={`w-full flex flex-col ${
        isSenderMessage ? "items-end" : "items-start"
      } px-3 sm:px-4`}
    >
      <div
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchEnd={cancelLongPress}
        onTouchMove={cancelLongPress}
        // media messages keep a transparent bubble (the image/card IS the
        // bubble); text-only messages get the themed background + text color
        style={
          hasMedia
            ? undefined
            : { backgroundColor: bubbleBg, color: bubbleText }
        }
        className={`messageBox max-w-[85%] sm:max-w-[75%] md:max-w-[70%] w-fit min-h-[40px] rounded-3xl my-1 select-none break-words ${
          hasMedia ? "px-0 py-2 bg-transparent" : "px-4 py-2"
        }`}
      >
        {sticker && sticker.type === "sticker" && (
          <div className="stickerMessage w-[96px] h-[96px] sm:w-[130px] sm:h-[130px] flex items-center justify-center text-[62px] sm:text-[84px] leading-none">
            {sticker.emoji}
          </div>
        )}

        {sticker && sticker.type === "animated_sticker" && sticker.url && (
          <div className="stickerMessage w-[120px] h-[120px] sm:w-[150px] sm:h-[150px]">
            {/* lottie-react forwards unknown props to lottie-web's config,
                so `path` loads a remote .json animation */}
            <Lottie
              src={sticker.url}
              autoplay
              loop
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        )}

        {sticker && sticker.type === "gif" && sticker.url && (
          <img
            src={sticker.url}
            alt={sticker.name || "GIF"}
            className="max-w-[160px] max-h-[160px] sm:max-w-[220px] sm:max-h-[220px] rounded-2xl object-contain"
          />
        )}

        {imageList.length === 1 && (
          <img
            src={imageList[0]}
            alt="attachment"
            onClick={() => openOverlay(0)}
            className="max-w-[200px] max-h-[200px] sm:max-w-[280px] sm:max-h-[280px] rounded-2xl object-cover cursor-pointer"
          />
        )}

        {imageList.length > 1 && (
          <div className="flex items-center bg-transparent">
            {imageList.map((img, idx) => (
              <div
                key={idx}
                style={{
                  transform: `rotate(${
                    TILT_ANGLES[idx % TILT_ANGLES.length]
                  }deg)`,
                  marginLeft: idx === 0 ? 0 : "-16px",
                  zIndex: idx,
                }}
                className="relative w-[70px] h-[118px] sm:w-[120px] sm:h-[200px] mx-1 sm:mx-2 shrink-0 rounded-lg overflow-hidden border-2 border-white/20 shadow-md cursor-pointer hover:z-20 hover:scale-110 transition-transform"
                onClick={() => openOverlay(idx)}
              >
                <img
                  src={img}
                  alt="attachment"
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {sharedItem && (
          <div
            onClick={() => {
              if (shareKind !== "story") setIsCommentsOpen(true);
            }}
            className={`sharedPostCard rounded-xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-soft)] max-w-full ${
              shareKind === "post"
                ? "w-[170px] sm:w-[220px] cursor-pointer"
                : "w-[135px] sm:w-[160px]"
            } ${shareKind === "reel" ? "cursor-pointer" : ""}`}
          >
            {shareKind === "story" ? (
              // Story: portrait card, transparent header, no caption, expiry-aware
              <div className="relative w-full h-[210px] sm:h-[280px]">
                {isStoryExpired ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[var(--bg-app)] text-center px-3">
                    <Clapperboard size={26} className="text-[var(--text-muted)]" />

                    <span className="text-[var(--text-muted)] text-[12px]">
                      Story no longer available
                    </span>
                  </div>
                ) : sharedThumbIsVideo ? (
                  <video
                    src={sharedThumbUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={sharedThumbUrl}
                    alt="shared story"
                    className="w-full h-full object-cover"
                    style={{
                      backgroundColor: sharedStory.bgColor || undefined,
                    }}
                  />
                )}

                <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-2.5 py-2 bg-gradient-to-b from-black/60 to-transparent">
                  <Link
                    to={`/user/get-profile/${sharedStory.author?._id}`}
                    className="flex items-center gap-2 min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={
                        sharedStory.author?.profilePic
                          ? sharedStory.author.profilePic
                          : "/images/default-profile-pic.jpg"
                      }
                      alt=""
                      className="w-[22px] h-[22px] rounded-full object-cover shrink-0"
                    />

                    <span className="text-white text-[12px] font-medium truncate">
                      {sharedStory.author?.username}'s story
                    </span>
                  </Link>
                </div>
              </div>
            ) : shareKind === "reel" ? (
              // Reel: portrait card, transparent header overlay, no caption
              <div className="relative w-full h-[210px] sm:h-[280px]">
                {sharedThumbIsVideo ? (
                  <video
                    src={sharedThumbUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={sharedThumbUrl}
                    alt="shared content"
                    className="w-full h-full object-cover"
                  />
                )}

                <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-2.5 py-2 bg-gradient-to-b from-black/60 to-transparent">
                  <Link
                    to={`/user/get-profile/${sharedItem.author?._id}`}
                    className="flex items-center gap-2 min-w-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={sharedItem.author?.profilePic}
                      alt=""
                      className="w-[22px] h-[22px] rounded-full object-cover shrink-0"
                    />

                    <span className="text-white text-[12px] font-medium truncate">
                      {sharedItem.author?.username}
                    </span>
                  </Link>
                </div>

                <div className="videoIcon absolute bottom-2 left-2">
                  <Clapperboard size={24} className="text-white ml-auto shrink-0" />
                </div>
              </div>
            ) : (
              // Post: square card, solid header, caption shown
              <>
                <Link
                  to={`/user/get-profile/${sharedItem.author?._id}`}
                  className="flex items-center gap-2 px-2.5 py-2 min-w-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={sharedItem.author?.profilePic}
                    alt=""
                    className="w-[22px] h-[22px] rounded-full object-cover shrink-0"
                  />

                  <span className="text-[var(--text-primary)] text-[12px] font-medium truncate">
                    {sharedItem.author?.username}
                  </span>
                </Link>

                {sharedThumbIsVideo ? (
                  <video
                    src={sharedThumbUrl}
                    className="w-full h-[165px] sm:h-[220px] object-cover"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={sharedThumbUrl}
                    alt="shared content"
                    className="w-full h-[165px] sm:h-[220px] object-cover"
                  />
                )}

                {sharedItem.caption && (
                  <div className="px-2.5 py-2 text-[var(--text-secondary)] text-[12px] leading-snug">
                    {trimCaption(sharedItem.caption)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {repliedStory && (
          <div className="repliedStoryCard w-[110px] sm:w-[130px] max-w-full rounded-xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-soft)]">
            <div className="px-2.5 pt-2 pb-1.5">
              <span className="text-[var(--text-muted)] text-[11px] leading-tight">
                {isSenderMessage
                  ? "Replied to their story"
                  : "Replied to your story"}
              </span>
            </div>

            <div className="relative w-full h-[150px] sm:h-[190px]">
              {isRepliedStoryExpired ? (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-[var(--bg-app)] text-center px-2">
                  <Clapperboard size={20} className="text-[var(--text-muted)]" />

                  <span className="text-[var(--text-muted)] text-[10px]">
                    Story no longer available
                  </span>
                </div>
              ) : repliedStory.mediaType === "video" ? (
                <video
                  src={repliedStory.mediaUrl}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                />
              ) : (
                <img
                  src={repliedStory.mediaUrl}
                  alt="story"
                  className="w-full h-full object-cover"
                  style={{
                    backgroundColor: repliedStory.bgColor || undefined,
                  }}
                />
              )}
            </div>

            {message?.text && (
              <div className="px-2.5 py-2 text-[var(--text-primary)] text-[13px] leading-snug">
                {message.text}
              </div>
            )}
          </div>
        )}

        {message?.text && !repliedStory && (
          // On a media message the outer bubble is transparent, so the caption
          // carries its own themed pill — otherwise light themes would render
          // white text straight onto a light background.
          <span
            style={
              hasMedia
                ? { backgroundColor: bubbleBg, color: bubbleText }
                : undefined
            }
            className={
              hasMedia
                ? "block w-fit max-w-full mt-1.5 px-3 py-2 rounded-2xl"
                : ""
            }
          >
            {message.text}
          </span>
        )}
      </div>

      {showSeen && (
        <div className="text-[var(--text-muted)] text-[11px] mr-1 mb-1">
          Seen {getTimeAgo(message?.updatedAt)}
        </div>
      )}

      {isMenuOpen &&
        createPortal(
          <div
            ref={menuRef}
            style={{
              position: "fixed",
              top: menuPosition.y,
              left: menuPosition.x,
            }}
            className="z-[110] bg-[var(--bg-panel)] border border-[var(--border-popup)] rounded-xl shadow-lg overflow-hidden min-w-[140px]"
          >
            <button
              onClick={handleUnsend}
              className="w-full text-left px-4 py-2.5 text-[var(--color-danger)] text-[14px] hover:bg-[var(--bg-popup-hover)] cursor-pointer"
            >
              Unsend
            </button>
          </div>,
          document.body
        )}

      {isImageOpen &&
        imageList.length > 0 &&
        createPortal(
          <div
            onClick={closeOverlay}
            className="fixed inset-0 z-[100] flex justify-center items-center bg-black/90 p-4 sm:p-8"
          >
            <button
              onClick={closeOverlay}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white hover:opacity-70 transition cursor-pointer z-[101]"
            >
              <X size={32} />
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              className="absolute top-4 right-16 sm:top-6 sm:right-20 text-white hover:opacity-70 transition cursor-pointer z-[101] disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isDownloading ? (
                <div className="w-[28px] h-[28px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <Download size={28} />
              )}
            </button>

            {imageList.length > 1 && (
              <>
                <button
                  onClick={showPrev}
                  className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white hover:opacity-70 transition cursor-pointer z-[101]"
                >
                  <ChevronLeft size={36} />
                </button>

                <button
                  onClick={showNext}
                  className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white hover:opacity-70 transition cursor-pointer z-[101]"
                >
                  <ChevronRight size={36} />
                </button>

                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full z-[101]">
                  {activeIndex + 1} / {imageList.length}
                </div>
              </>
            )}

            <img
              src={imageList[activeIndex]}
              alt="attachment full view"
              onClick={(e) => e.stopPropagation()}
              className="max-w-full max-h-full w-auto h-auto object-contain rounded-md"
            />
          </div>,
          document.body
        )}

      {isCommentsOpen && sharedPostAsItem && (
        <CommentsOverlay
          post={sharedPostAsItem}
          authorId={sharedPost.author?._id}
          onClose={() => setIsCommentsOpen(false)}
          onLikesCountChange={(count) => setLikesCount(count)}
          onSaveChange={(saved) => setIsSaved(saved)}
          initialIsLiked={isLiked}
          initialIsSaved={isSaved}
        />
      )}

      {isCommentsOpen && sharedReelAsItem && (
        <CommentsOverlay
          reel={sharedReelAsItem}
          authorId={sharedReel.author?._id}
          onClose={() => setIsCommentsOpen(false)}
          onLikesCountChange={(count) => setLikesCount(count)}
          onSaveChange={(saved) => setIsSaved(saved)}
          initialIsLiked={isLiked}
          initialIsSaved={isSaved}
        />
      )}
    </div>
  );
};

export default MessageBox;
