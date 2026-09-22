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
  Plus,
  Copy,
  Check,
  Reply as ReplyIcon,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getTimeAgo } from "../utils/timeAgo";
import { formatFullTimestamp } from "../utils/dateTime";
import CommentsOverlay from "./CommentsOverlay";
import EmojiPickerPanel from "./EmojiPickerPanel";
import ReactorsListOverlay from "./ReactorsListOverlay";
import { createPortal } from "react-dom";

const TILT_ANGLES = [-8, 5, -4, 7];
const CAPTION_TRIM_LENGTH = 60;
const STORY_TTL_MS = 24 * 60 * 60 * 1000;
const LONG_PRESS_MS = 500;
const MENU_WIDTH = 260;
const MENU_HEIGHT_ESTIMATE = 210; // quick-reactions row + timestamp row (+ unsend row)

// swipe-to-reply (mobile) tuning — only enabled on the friend's (received)
// messages, matching the right-click "Reply" option on desktop
const SWIPE_REPLY_THRESHOLD_PX = 60;
const SWIPE_REPLY_MAX_PX = 80;
const SWIPE_MOVE_CANCEL_PX = 8; // below this, a touch still counts as a long-press candidate

// Instagram-style quick reaction row. The "+" next to these opens the
// full EmojiPickerPanel for anything else.
const QUICK_REACTIONS = ["❤️", "😆", "😮", "😢", "👍"];

// messageType values that mean "this was a post share" / "a reel share".
// The canonical values written by the backend are post_share / reel_share;
// the others are accepted so any older/alternate naming still resolves.
const POST_SHARE_TYPES = ["post_share", "post", "sharedPost"];
const REEL_SHARE_TYPES = ["reel_share", "reel", "sharedReel"];

// labels for the small quoted-reply preview when the original message had
// no text of its own (mirrors the same mapping used to build the
// "Replying to ..." bar above the input in Chat.jsx)
const REPLY_TYPE_LABELS = {
  image: "Photo",
  sticker: "Sticker",
  post_share: "Post",
  reel_share: "Reel",
  story_share: "Story",
  story_reply: "Story reply",
};

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
  onReact,
  onReply,
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

  // right-click (desktop) / long-press (mobile) info menu — opens for
  // ANY message. Content inside (reaction row, timestamp, Unsend) is
  // decided at render time by `isSenderMessage`.
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);

  // reactors sheet — who reacted with what, tapped from the small badge
  const [isReactorsListOpen, setIsReactorsListOpen] = useState(false);

  // brief "Copied!" confirmation state after using the Copy option
  const [isCopied, setIsCopied] = useState(false);

  // swipe-right-to-reply (mobile, received messages only) — dragX drives
  // the live transform while the finger is down; reset to 0 on release
  const [dragX, setDragX] = useState(0);
  const isSwipingRef = useRef(false);
  const touchStartRef = useRef({ x: 0, y: 0 });

  const longPressTimerRef = useRef(null);
  const menuRef = useRef(null);

  const senderId =
    typeof message?.senderId === "object"
      ? message?.senderId?._id
      : message?.senderId;

  const isSenderMessage = senderId === user?._id;

  // Reply is only offered on the friend's (received) messages — matches
  // "on right clicking on receiver's msg" / "sliding right on a msg" for
  // the receiver's message, as requested.
  const canReply = !isSenderMessage;

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

  // When a shared post/reel is deleted, the backend populate returns null —
  // there's nothing left in `sharedPost`/`sharedReel` to tell us the message
  // *used to* be a share. `messageType` (stamped at send time in
  // postMessage and never mutated) is what lets us still know "this was a
  // post share" after the post is gone.
  const messageType = message?.messageType || message?.type;

  // only one of these is ever set on a given message
  const shareKind = sharedPost
    ? "post"
    : sharedReel
    ? "reel"
    : sharedStory
    ? "story"
    : POST_SHARE_TYPES.includes(messageType)
    ? "post"
    : REEL_SHARE_TYPES.includes(messageType)
    ? "reel"
    : null;

  // true when the message was a post/reel share but the underlying content
  // has since been deleted (populate came back empty)
  const isSharedPostDeleted = shareKind === "post" && !sharedPost;
  const isSharedReelDeleted = shareKind === "reel" && !sharedReel;
  const isSharedContentDeleted = isSharedPostDeleted || isSharedReelDeleted;

  const sharedItem = sharedPost || sharedReel || sharedStory;

  // ---- reply-to-message snapshot (the "replyTo" field on this message —
  // this message IS a reply to an earlier one) ----
  const replySnapshot = message?.replyTo;

  const replyQuoteText = useMemo(() => {
    if (!replySnapshot) return "";
    if (replySnapshot.text) return trimCaption(replySnapshot.text);
    return REPLY_TYPE_LABELS[replySnapshot.messageType] || "Message";
  }, [replySnapshot]);

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
      ? sharedPost?.media?.[0]?.url
      : shareKind === "reel"
      ? sharedReel?.media?.thumbnailUrl || sharedReel?.media?.url
      : shareKind === "story"
      ? sharedStory?.mediaUrl
      : null;

  const sharedThumbIsVideo =
    shareKind === "post"
      ? sharedPost?.media?.[0]?.mediaType === "video"
      : shareKind === "reel"
      ? !sharedReel?.media?.thumbnailUrl
      : shareKind === "story"
      ? sharedStory?.mediaType === "video"
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

  // ---- info menu: right-click on desktop, long-press on mobile ----
  // Opens for both sender and receiver messages. What's inside it
  // (reaction row + timestamp always; Reply for received messages; Unsend
  // only for own messages) is decided at render time by `isSenderMessage`
  // / `canReply`.

  const openMenuAt = (x, y) => {
    const left = Math.max(8, Math.min(x - MENU_WIDTH, window.innerWidth - MENU_WIDTH - 8));
    const top = Math.max(
      8,
      Math.min(y, window.innerHeight - MENU_HEIGHT_ESTIMATE - 8)
    );
    setMenuPosition({ x: left, y: top });
    setIsMenuOpen(true);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY);
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];

    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
    isSwipingRef.current = false;

    longPressTimerRef.current = setTimeout(() => {
      openMenuAt(touch.clientX, touch.clientY);
    }, LONG_PRESS_MS);
  };

  // Tracks a right-drag on received messages to reveal the reply icon and,
  // past the threshold, fire the reply on release. Any other direction of
  // movement just cancels the long-press timer, same as before.
  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > SWIPE_MOVE_CANCEL_PX || Math.abs(deltaY) > SWIPE_MOVE_CANCEL_PX) {
      clearTimeout(longPressTimerRef.current);
    }

    if (!canReply) return;

    // ignore mostly-vertical drags (scrolling the message list)
    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    if (deltaX > SWIPE_MOVE_CANCEL_PX) {
      isSwipingRef.current = true;
      // rubber-band past the max so it doesn't feel like it hit a wall
      const clamped =
        deltaX <= SWIPE_REPLY_MAX_PX
          ? deltaX
          : SWIPE_REPLY_MAX_PX + (deltaX - SWIPE_REPLY_MAX_PX) * 0.25;
      setDragX(clamped);
    }
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimerRef.current);

    if (isSwipingRef.current && dragX >= SWIPE_REPLY_THRESHOLD_PX) {
      onReply?.(message);
    }

    isSwipingRef.current = false;
    setDragX(0);
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

  // the nested emoji picker shouldn't stay open once the menu itself closes
  useEffect(() => {
    if (!isMenuOpen) setIsEmojiPickerOpen(false);
  }, [isMenuOpen]);

  // reset the "Copied!" confirmation whenever the menu is reopened/closed,
  // so it doesn't linger stale the next time the menu is opened
  useEffect(() => {
    if (!isMenuOpen) setIsCopied(false);
  }, [isMenuOpen]);

  const handleUnsend = () => {
    setIsMenuOpen(false);
    onDelete?.(message._id);
  };

  const handleReact = (emoji) => {
    setIsMenuOpen(false);
    onReact?.(message._id, emoji);
  };

  const handleReplyClick = () => {
    setIsMenuOpen(false);
    onReply?.(message);
  };

  // Copies the message's text to the clipboard. Only rendered for
  // messages that actually have text (see canCopyText below) — media-only
  // messages (images, stickers, shares) have nothing textual to copy.
  const handleCopyText = async () => {
    if (!message?.text) return;

    try {
      await navigator.clipboard.writeText(message.text);
      setIsCopied(true);
      // brief confirmation, then close the menu
      setTimeout(() => {
        setIsCopied(false);
        setIsMenuOpen(false);
      }, 700);
    } catch (error) {
      // clipboard API can fail (permissions, insecure context, etc.) —
      // fall back to a manual copy via a temporary textarea
      try {
        const textarea = document.createElement("textarea");
        textarea.value = message.text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
          setIsMenuOpen(false);
        }, 700);
      } catch (fallbackError) {
        console.log(fallbackError);
      }
    }
  };

  const hasMedia =
    imageList.length > 0 ||
    !!sharedItem ||
    !!repliedStory ||
    !!sticker ||
    isSharedContentDeleted;

  const messageFullTimestamp = formatFullTimestamp(message?.createdAt);

  // only text messages have something to copy
  const canCopyText = Boolean(message?.text);

  // ---- reactions ----
  const reactions = message?.reactions || [];

  const myReactionEmoji = useMemo(() => {
    const mine = reactions.find((r) => {
      const rid = typeof r.userId === "object" ? r.userId?._id : r.userId;
      return rid === user?._id;
    });
    return mine?.emoji;
  }, [reactions, user?._id]);

  // grouped by emoji so two people reacting the same way show as one
  // badge with a count, Instagram-style
  const groupedReactions = useMemo(() => {
    const map = new Map();
    reactions.forEach((r) => {
      map.set(r.emoji, (map.get(r.emoji) || 0) + 1);
    });
    return Array.from(map.entries()).map(([emoji, count]) => ({ emoji, count }));
  }, [reactions]);

  return (
    <div
      className={`w-full flex flex-col ${
        isSenderMessage ? "items-end" : "items-start"
      } px-3 sm:px-4`}
    >
      {/* swipe-to-reply wrapper — only received messages get the reply icon
          revealed behind them and the live drag transform */}
      <div className="relative w-full max-w-full flex" style={{ justifyContent: isSenderMessage ? "flex-end" : "flex-start" }}>

        {canReply && (
          <div
            aria-hidden="true"
            style={{ opacity: Math.min(dragX / SWIPE_REPLY_THRESHOLD_PX, 1) }}
            className="absolute left-1 top-1/2 -translate-y-1/2 text-[var(--accent-blue)] pointer-events-none"
          >
            <ReplyIcon size={20} />
          </div>
        )}

        <div
          onContextMenu={handleContextMenu}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchMove={canReply ? handleTouchMove : cancelLongPress}
          style={{
            ...(hasMedia
              ? undefined
              : { backgroundColor: bubbleBg, color: bubbleText }),
            transform: dragX ? `translateX(${dragX}px)` : undefined,
            transition: dragX ? "none" : "transform 150ms ease-out",
          }}
          // media messages keep a transparent bubble (the image/card IS the
          // bubble); text-only messages get the themed background + text color
          className={`messageBox relative max-w-[85%] sm:max-w-[75%] md:max-w-[70%] w-fit min-h-[40px] rounded-3xl my-1 select-none break-words ${
            hasMedia ? "px-0 py-2 bg-transparent" : "px-4 py-2"
          } ${groupedReactions.length > 0 ? "mb-3" : ""}`}
        >
        {/* quoted preview of the message this one replies to — sits above
            the actual content of the bubble, Instagram-style */}
        {replySnapshot && (
          <div
            style={
              hasMedia
                ? { backgroundColor: "rgba(0,0,0,0.35)", color: "#FFFFFF" }
                : { backgroundColor: "rgba(0,0,0,0.18)", color: bubbleText }
            }
            className="replyQuote flex items-center gap-2 mb-1.5 max-w-full rounded-xl px-2.5 py-1.5 border-l-2 border-[var(--accent-blue)]"
          >
            {replySnapshot.image && (
              <img
                src={replySnapshot.image}
                alt=""
                className="w-[32px] h-[32px] rounded-md object-cover shrink-0"
              />
            )}
            <span className="text-[12px] leading-snug truncate opacity-90">
              {replyQuoteText}
            </span>
          </div>
        )}

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

        {(sharedItem || isSharedContentDeleted) && (
          <div
            onClick={() => {
              if (shareKind !== "story" && sharedItem) setIsCommentsOpen(true);
            }}
            className={`sharedPostCard rounded-xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-soft)] max-w-full ${
              shareKind === "post"
                ? `w-[170px] sm:w-[220px] ${sharedItem ? "cursor-pointer" : ""}`
                : "w-[135px] sm:w-[160px]"
            } ${shareKind === "reel" && sharedItem ? "cursor-pointer" : ""}`}
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
              isSharedReelDeleted ? (
                // Reel was deleted after being shared
                <div className="relative w-full h-[210px] sm:h-[280px] flex flex-col items-center justify-center gap-2 bg-[var(--bg-app)] text-center px-3">
                  <Clapperboard size={26} className="text-[var(--text-muted)]" />

                  <span className="text-[var(--text-muted)] text-[12px]">
                    Reel no longer available
                  </span>
                </div>
              ) : (
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
              )
            ) : isSharedPostDeleted ? (
              // Post was deleted after being shared
              <div className="w-full h-[165px] sm:h-[220px] flex flex-col items-center justify-center gap-2 bg-[var(--bg-app)] text-center px-3">
                <Clapperboard size={26} className="text-[var(--text-muted)]" />

                <span className="text-[var(--text-muted)] text-[12px]">
                  Post no longer available
                </span>
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

        {/* Reaction badge — overlaps the bottom corner of the bubble,
            Instagram-style. Tapping it opens the full reactors list. */}
        {groupedReactions.length > 0 && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsReactorsListOpen(true);
            }}
            aria-label="View reactions"
            className={`absolute -bottom-3 ${
              isSenderMessage ? "right-1" : "left-1"
            } flex items-center gap-0.5 bg-[var(--bg-elevated)] border border-[var(--border-soft)] rounded-full px-1.5 py-0.5 shadow-sm cursor-pointer z-20`}
          >
            {groupedReactions.map((g) => (
              <span key={g.emoji} className="text-[13px] leading-none">
                {g.emoji}
              </span>
            ))}
            {reactions.length > 1 && (
              <span className="text-[10px] text-[var(--text-muted)] leading-none ml-0.5">
                {reactions.length}
              </span>
            )}
          </button>
        )}
        </div>
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
            className="z-[110] bg-[var(--bg-panel)] border border-[var(--border-popup)] rounded-2xl shadow-lg overflow-visible min-w-[230px]"
          >
            {/* quick reactions + "more" picker */}
            <div className="flex items-center justify-between px-2.5 py-2 border-b border-[var(--border-popup)]">
              {QUICK_REACTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleReact(emoji)}
                  aria-label={`React with ${emoji}`}
                  className={`text-[21px] w-[32px] h-[32px] flex items-center justify-center rounded-full hover:scale-125 transition-transform cursor-pointer ${
                    myReactionEmoji === emoji ? "bg-[var(--bg-menu-hover)]" : ""
                  }`}
                >
                  {emoji}
                </button>
              ))}

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                  aria-label="More reactions"
                  className="w-[32px] h-[32px] flex items-center justify-center rounded-full hover:bg-[var(--bg-menu-hover)] cursor-pointer text-[var(--text-primary)]"
                >
                  <Plus size={18} />
                </button>

                {isEmojiPickerOpen && (
                  <div
                    className={`absolute z-[130] top-[38px] ${
                      isSenderMessage ? "right-0" : "left-0"
                    }`}
                  >
                    <EmojiPickerPanel
                      onSelect={(emoji) => handleReact(emoji)}
                      onClose={() => setIsEmojiPickerOpen(false)}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* non-editable, non-clickable — just the delivered timestamp */}
            <div className="w-full text-left px-4 py-2.5 text-[var(--text-muted)] text-[12px] select-none cursor-default border-b border-[var(--border-popup)]">
              Delivered {messageFullTimestamp}
            </div>

            {/* Copy — only for messages that have text on them */}
            {canCopyText && (
              <button
                onClick={handleCopyText}
                className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-[var(--text-primary)] text-[14px] hover:bg-[var(--bg-popup-hover)] cursor-pointer border-b border-[var(--border-popup)]"
              >
                {isCopied ? (
                  <>
                    <Check size={15} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={15} />
                    Copy
                  </>
                )}
              </button>
            )}

            {/* Reply — only for the friend's (received) messages */}
            {canReply && (
              <button
                onClick={handleReplyClick}
                className="w-full flex items-center gap-2 text-left px-4 py-2.5 text-[var(--text-primary)] text-[14px] hover:bg-[var(--bg-popup-hover)] cursor-pointer border-b border-[var(--border-popup)]"
              >
                <ReplyIcon size={15} />
                Reply
              </button>
            )}

            {isSenderMessage && (
              <button
                onClick={handleUnsend}
                className="w-full text-left px-4 py-2.5 text-[var(--color-danger)] text-[14px] hover:bg-[var(--bg-popup-hover)] cursor-pointer"
              >
                Unsend
              </button>
            )}
          </div>,
          document.body
        )}

      {isReactorsListOpen && reactions.length > 0 && (
        <ReactorsListOverlay
          reactions={reactions}
          onClose={() => setIsReactorsListOpen(false)}
        />
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
