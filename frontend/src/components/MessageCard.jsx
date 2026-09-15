// MessageCard.jsx
import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useAuth } from '../context/AuthContext'
import { Link } from 'react-router-dom'
import { useSocket } from '../context/SocketContext'
import { getTimeAgo } from '../utils/timeAgo'

// Desktop shows both panes at once, so opening a chat there is just a
// "change selection", not a real navigation — it should replace the
// current history entry rather than push a new one. Otherwise clicking
// through several chats fills the history stack and back has to step
// through each one before reaching /home. Mobile is a real full-screen
// navigation, so it still pushes (see MessageCard usage below).
const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined"
      ? window.matchMedia("(min-width: 768px)").matches
      : true
  );

  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const handleChange = (e) => setIsDesktop(e.matches);

    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, []);

  return isDesktop;
};

const LONG_PRESS_MS = 500;
const MENU_WIDTH = 180;
const MENU_MARGIN = 8;

// Small popover menu positioned at an (x, y) point — used for both
// right-click (desktop) and long-press (mobile). Renders via a portal so
// it isn't clipped by the scrollable conversation list, and closes itself
// on outside click/tap or Escape.
const ChatContextMenu = ({ position, options, onClose }) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        onClose();
      }
    };
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);
    document.addEventListener("keydown", handleKey);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [onClose]);

  // Keep the menu on-screen if the click/tap happened near the viewport edge
  const clampedX = Math.min(position.x, window.innerWidth - MENU_WIDTH - MENU_MARGIN);
  const clampedY = Math.min(position.y, window.innerHeight - options.length * 44 - MENU_MARGIN);

  return createPortal(
    <div
      ref={menuRef}
      className="fixed z-50 bg-[var(--bg-elevated)] border border-[var(--border-soft)] rounded-xl shadow-lg overflow-hidden py-1"
      style={{ top: Math.max(clampedY, MENU_MARGIN), left: Math.max(clampedX, MENU_MARGIN), width: MENU_WIDTH }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            opt.onClick();
          }}
          className={`w-full text-left px-4 py-2.5 text-[14px] hover:bg-[var(--bg-row-hover)] ${
            opt.destructive ? "text-red-500" : "text-[var(--text-primary)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>,
    document.body
  );
};

// "Are you sure?" confirmation for a destructive, unrecoverable action —
// deletes the whole conversation (all messages + their media) for both
// participants.
const ConfirmDeleteChatModal = ({ friendName, isDeleting, onCancel, onConfirm }) => {
  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center px-4"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-[340px] bg-[var(--bg-elevated)] rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-6 text-center">
          <h3 className="text-[17px] font-semibold text-[var(--text-primary)] mb-2">
            Delete chat{friendName ? ` with ${friendName}` : ""}?
          </h3>
          <p className="text-[14px] text-[var(--text-muted)]">
            This will permanently delete the entire chat history, including
            all photos and videos. This can't be undone.
          </p>
        </div>

        <div className="flex flex-col border-t border-[var(--border-soft)]">
          <button
            type="button"
            disabled={isDeleting}
            onClick={onConfirm}
            className="w-full py-3 text-[15px] font-semibold text-red-500 border-b border-[var(--border-soft)] disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
          <button
            type="button"
            disabled={isDeleting}
            onClick={onCancel}
            className="w-full py-3 text-[15px] text-[var(--text-primary)] disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

const MessageCard = ({ conversation, onDeleteConversation }) => {
  const { user } = useAuth()
  const { onlineUsers } = useSocket()
  const isDesktop = useIsDesktop()

  const [menuPosition, setMenuPosition] = useState(null) // {x, y} or null
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Guards against the synthetic "click" a touch device fires right after
  // touchend — without this, finishing a long press would also trigger the
  // Link's navigation.
  const isLongPress = useRef(false)
  const longPressTimer = useRef(null)

  const friend = conversation?.participants.find(
    (participant) => participant?._id !== user?._id
  );

  const isOnline = onlineUsers?.includes(friend?._id);

  const limit = 6;

  const isLastMessageMine =
    conversation?.lastMessageSenderId &&
    String(conversation?.lastMessageSenderId) === String(user?._id);

  const rawLastMessage =
    conversation?.lastMessageType === "story_reply"
      ? isLastMessageMine
        ? "Replied to their story"
        : "Replied to your story"
      : conversation?.lastMessage || "";

  const words = rawLastMessage.split(" ");

  const shortText =
    words.length > limit ? words.slice(0, limit).join(" ") + "..." : rawLastMessage;

  const unreadCount = conversation?.unreadCount || 0;

  const timeAgo = getTimeAgo(conversation?.lastMessageTime);

  const openMenuAt = (x, y) => {
    setMenuPosition({ x, y });
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    openMenuAt(e.clientX, e.clientY);
  };

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const { clientX, clientY } = touch;

    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      openMenuAt(clientX, clientY);
    }, LONG_PRESS_MS);
  };

  // finger moved — this was a scroll, not a long press, cancel it
  const handleTouchMove = () => {
    clearLongPressTimer();
  };

  const handleTouchEnd = () => {
    clearLongPressTimer();
  };

  const handleLinkClick = (e) => {
    if (isLongPress.current) {
      e.preventDefault();
      isLongPress.current = false;
    }
  };

  const handleDeleteChatClick = () => {
    setMenuPosition(null);
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    await onDeleteConversation?.(conversation._id);
    setIsDeleting(false);
    setShowConfirm(false);
  };

  return (
    <>
      <Link
        to={`/user/messages/${conversation?._id}`}
        replace={isDesktop}
        onClick={handleLinkClick}
        onContextMenu={handleContextMenu}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="messageCard w-full h-[80px] sm:h-[85px] flex justify-center items-center rounded-xl hover:bg-[var(--bg-row-hover)] cursor-pointer px-2 select-none">

          <div className="profilePicSection w-[20%] h-full flex justify-center items-center">
            <div className="profilePic relative w-[55px] h-[55px] sm:w-[70px] sm:h-[70px]">
              <div className="w-full h-full rounded-full overflow-hidden">
                <img
                  src={friend?.profilePic ? friend.profilePic : "/images/default-profile-pic.jpg" }
                  alt=""
                  className="w-full h-full object-cover"
                />
              </div>

              {isOnline && (
                <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-[var(--bg-app)]" />
              )}
            </div>
          </div>

          <div className="messageDetails w-[80%] h-full">
            <div className="fullname w-full h-[50%] flex justify-start items-end text-[var(--text-primary)] text-[18px] md:text-[15px] lg:text-[18px]">
              <span className="ml-2">{friend?.fullname}</span>
            </div>

            <div className="lastMsg w-full h-[50%] flex justify-start items-start text-[14px] md:text-[12px] lg:text-[14px] mt-1">
              {unreadCount > 1 ? (
                <span className="ml-2 text-[var(--text-primary)] font-semibold">
                  {unreadCount > 9 ? "9+ new messages" : `${unreadCount} new messages`}
                </span>
              ) : (
                <>
                  <span className={`ml-2 ${unreadCount === 1 ? "text-[var(--text-primary)] font-semibold" : "text-[var(--text-muted)]"}`}>
                    {shortText}
                  </span>
                  <span className="ml-2 text-[var(--text-muted)]">· {timeAgo}</span>
                </>
              )}
            </div>
          </div>

        </div>
      </Link>

      {menuPosition && (
        <ChatContextMenu
          position={menuPosition}
          onClose={() => setMenuPosition(null)}
          options={[
            {
              label: "Delete chat",
              destructive: true,
              onClick: handleDeleteChatClick,
            },
          ]}
        />
      )}

      {showConfirm && (
        <ConfirmDeleteChatModal
          friendName={friend?.fullname || friend?.username}
          isDeleting={isDeleting}
          onCancel={() => setShowConfirm(false)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </>
  )
}

export default MessageCard