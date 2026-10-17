import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { BadgeCheck, Bell } from "lucide-react";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import IconSidebar from "../components/IconSidebar";
import MobileFooter from "../components/MobileFooter";
import CommentsOverlay from "../components/CommentsOverlay";
import { DevsHeroIcon } from "../components/devs/DevsAuthKit";
import { toast } from "react-toastify";
import { notificationText } from "../utils/notificationText";

const BASE_URL = import.meta.env.VITE_SERVER_URL

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
});

function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  const units = [["y", 31536000], ["mo", 2592000], ["d", 86400], ["h", 3600], ["m", 60]];
  for (const [label, secs] of units) {
    const count = Math.floor(seconds / secs);
    if (count >= 1) return `${count}${label}`;
  }
  return "now";
}

const CONTEXT_MENU_WIDTH = 180;
const CONTEXT_MENU_HEIGHT = 44;

const NotificationsPage = () => {
  const { markAllAsRead } = useNotifications();
  const { user } = useAuth();
  const { isDevs } = useTheme();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [followBackState, setFollowBackState] = useState({});

  // which post/reel's CommentsOverlay is currently open, if any —
  // { type: "post" | "reel", data: <post or reel object>, authorId }
  const [activeOverlay, setActiveOverlay] = useState(null);

  // right-click context menu: { x, y, notificationId }
  const [contextMenu, setContextMenu] = useState(null);
  // id of the notification pending delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const menuRef = useRef(null);

  const loadNotifications = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${BASE_URL}/api/notifications?page=${pageNum}&limit=20`,
        authHeaders()
      );
      setItems((prev) => (pageNum === 1 ? data.notifications : [...prev, ...data.notifications]));
      setHasMore(data.hasMore);
    } catch (err) {
      toast.error("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(1);
    markAllAsRead();
  }, [loadNotifications, markAllAsRead]);

  // close the context menu on outside click or scroll
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setContextMenu(null);
      }
    };
    const handleScroll = () => setContextMenu(null);

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [contextMenu]);

  const handleFollowBack = async (senderId) => {
    try {
      const { data } = await axios.post(
        `${BASE_URL}/user/profile/${senderId}/follow-toggle`,
        {},
        authHeaders()
      );
      if (data.success) {
        setFollowBackState((prev) => ({ ...prev, [senderId]: data.isFollowing }));
      }
    } catch (err) {
      console.error("Follow back failed", err);
    }
  };

  // opens the CommentsOverlay for whichever post/reel this notification points to
  const openOverlayFor = (n) => {
    if (n.reel) {
      setActiveOverlay({ type: "reel", data: n.reel, authorId: n.reel.author?._id });
    } else if (n.post) {
      setActiveOverlay({ type: "post", data: n.post, authorId: n.post.author?._id });
    }
  };

  const isItemLiked = (item) =>
    item?.likes?.some((like) => (like?._id || like)?.toString() === user?._id?.toString()) || false;

  const isItemSaved = (type, item) => {
    if (!item?._id) return false;
    return type === "post"
      ? user?.savedPosts?.some((id) => id.toString() === item._id.toString()) || false
      : user?.savedReels?.some((id) => id.toString() === item._id.toString()) || false;
  };

  const handleContextMenu = (e, notificationId) => {
    e.preventDefault();
    const x = Math.min(e.clientX, window.innerWidth - CONTEXT_MENU_WIDTH - 8);
    const y = Math.min(e.clientY, window.innerHeight - CONTEXT_MENU_HEIGHT - 8);
    setContextMenu({ x, y, notificationId });
  };

  const handleDeleteNotification = async (id) => {
    setDeletingId(id);
    try {
      await axios.delete(`${BASE_URL}/api/notifications/${id}`, authHeaders());
      setItems((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      toast.error("Failed to delete notification");
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <div className="NotificationsPage w-[100vw] h-[100vh] flex justify-between items-center bg-[var(--bg-app)]">
      <IconSidebar />

      <div className="notifSection w-full md:w-[88%] 2xl:w-[80%] h-full flex justify-center items-start overflow-x-hidden overflow-y-auto">
        <div className="notifContainer w-full 2xl:w-[70%] h-full">
          <div className="notifHeader w-full h-[70px] flex items-center px-4 sm:px-8 border-b border-[var(--border-soft)] devs:backdrop-blur-xl">
            {isDevs ? (
              <div className="flex items-center gap-3">
                <div className="flex flex-col leading-none">
                  <h2
                    className="devs-text-gradient text-[26px] font-extrabold tracking-tight"
                    style={{ fontFamily: "var(--devs-font-display)" }}
                  >
                    Notifications
                  </h2>
                  <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--text-muted)] mt-1.5">
                    {"// activity.log"}
                  </span>
                </div>
                {unreadCount > 0 && (
                  <span className="devs-pulse-glow min-w-[22px] h-[22px] px-1.5 rounded-full bg-[var(--devs-magenta)] text-[#04050e] font-mono text-[11px] font-bold flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </div>
            ) : (
              <h2 className="text-[var(--text-primary)] text-[20px] font-bold">Notifications</h2>
            )}
          </div>

          <div className="notifList w-full flex flex-col devs:gap-1 devs:p-2">
            {items.length === 0 && !loading && (
              isDevs ? (
                <div className="w-full h-[320px] flex flex-col justify-center items-center gap-2 text-center">
                  <DevsHeroIcon icon={Bell} />
                  <h3
                    className="devs-text-gradient text-[22px] font-extrabold"
                    style={{ fontFamily: "var(--devs-font-display)" }}
                  >
                    No notifications yet
                  </h3>
                  <p className="text-[var(--text-muted)] text-[12px] font-mono max-w-[340px]">
                    When someone follows you or interacts with your posts, it'll show up here.
                  </p>
                </div>
              ) : (
                <div className="w-full h-[200px] flex flex-col justify-center items-center gap-2">
                  <h3 className="text-[var(--text-primary)] text-lg font-bold">No notifications yet</h3>
                  <p className="text-[var(--text-muted)] text-sm">
                    When someone follows you or interacts with your posts, it'll show up here.
                  </p>
                </div>
              )
            )}

            {items.map((n, index) => {
              const isFollow = n.type === "follow";
              const isFollowingBack = followBackState[n.sender._id] ?? n.isFollowingSender ?? false;
              const thumbSrc = isFollow
                ? n.sender.profilePic || "/images/default-profile-pic.jpg"
                : n.reel
                ? n.reel.media?.thumbnailUrl || "/images/default-profile-pic.jpg"
                : n.post?.media?.[0]?.url || "/images/default-profile-pic.jpg";

              return (
                <motion.div
                  key={n._id}
                  {...(isDevs
                    ? {
                        initial: { opacity: 0, x: -20 },
                        animate: { opacity: 1, x: 0 },
                        transition: { delay: Math.min(index, 10) * 0.04, duration: 0.3 },
                        whileHover: { x: 4 },
                      }
                    : {})}
                  onContextMenu={(e) => handleContextMenu(e, n._id)}
                  className={`notifItem relative w-full px-4 sm:px-8 py-3 flex items-center justify-between gap-3 hover:bg-[var(--bg-row-hover)] transition-colors devs:rounded-2xl devs:px-4 devs:sm:px-5 ${
                    !n.isRead ? "bg-[var(--bg-unread)]" : ""
                  }`}
                >
                  {/* Devs Mode: neon bar for unread notifications */}
                  {isDevs && !n.isRead && (
                    <span
                      className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
                      style={{
                        background: "linear-gradient(180deg,#22f0ff,#ff2bd6)",
                        boxShadow: "0 0 10px rgba(34,240,255,0.9)",
                      }}
                    />
                  )}

                  <div className="flex items-center gap-3 min-w-0">
                    {isFollow ? (
                      <Link to={`/user/get-profile/${n.sender._id}`} className="shrink-0">
                        <div
                          className={`w-[48px] h-[48px] overflow-hidden border border-[var(--border-soft)] rounded-full ${
                            isDevs ? "ring-2 ring-[var(--devs-violet)] ring-offset-2 ring-offset-[#04050e] border-transparent" : ""
                          }`}
                        >
                          <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
                        </div>
                      </Link>
                    ) : (
                      <div
                        onClick={() => openOverlayFor(n)}
                        className="shrink-0 cursor-pointer"
                      >
                        <div className="w-[48px] h-[48px] overflow-hidden border border-[var(--border-soft)] rounded-md devs:rounded-xl devs:transition-all devs:hover:border-[var(--devs-cyan)] devs:hover:shadow-[0_0_16px_rgba(34,240,255,0.4)]">
                          <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}

                    <div className="notifText min-w-0 text-[14px] text-[var(--text-primary)] leading-tight">
                      <span className="truncate inline-flex items-center gap-1">
                        <Link to={`/user/get-profile/${n.sender._id}`} className="font-bold hover:underline devs:hover:text-[var(--devs-cyan)]">
                          {n.sender.username}
                        </Link>
                        {n.sender.role === "admin" && (
                          <BadgeCheck
                            size={14}
                            className="text-sky-400 devs:text-[var(--devs-cyan)] devs:drop-shadow-[0_0_5px_rgba(34,240,255,0.9)] shrink-0"
                          />
                        )}{" "}
                        <span className="text-[var(--text-muted)]">{notificationText(n)}</span>
                      </span>
                      <div className="text-[var(--text-muted)] text-[12px] devs:font-mono devs:text-[11px]">{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>

                  {isFollow && (
                    <button
                      onClick={() => handleFollowBack(n.sender._id)}
                      className={`shrink-0 w-[100px] h-[32px] text-[13px] font-bold rounded-lg cursor-pointer devs:rounded-full devs:font-mono devs:uppercase devs:tracking-wider devs:text-[10px] devs:active:scale-95 devs:transition-transform ${
                        isFollowingBack
                          ? "bg-[var(--bg-secondary-btn)] hover:bg-[var(--bg-secondary-btn-hover)] text-[var(--text-primary)] devs:border devs:border-[var(--border-popup)]"
                          : "bg-[var(--accent-indigo)] hover:bg-[var(--accent-indigo-hover)] text-white devs:bg-[linear-gradient(120deg,#22f0ff,#8b5cf6)] devs:hover:bg-[linear-gradient(120deg,#22f0ff,#8b5cf6)] devs:text-[#04050e] devs:shadow-[0_0_14px_rgba(34,240,255,0.4)]"
                      }`}
                    >
                      {isFollowingBack ? "Following" : "Follow back"}
                    </button>
                  )}
                </motion.div>
              );
            })}
          </div>

          {hasMore && (
            <div className="w-full flex justify-center py-4">
              <button
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  loadNotifications(next);
                }}
                disabled={loading}
                className="text-[var(--link-muted)] hover:text-[var(--link-muted-hover)] text-[14px] cursor-pointer devs:font-mono devs:uppercase devs:tracking-widest devs:text-[11px] devs:hover:[text-shadow:0_0_10px_rgba(34,240,255,0.8)]"
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}

          <MobileFooter />
        </div>
      </div>

      {activeOverlay && (
        <CommentsOverlay
          post={activeOverlay.type === "post" ? activeOverlay.data : undefined}
          reel={activeOverlay.type === "reel" ? activeOverlay.data : undefined}
          authorId={activeOverlay.authorId}
          onClose={() => setActiveOverlay(null)}
          initialIsLiked={isItemLiked(activeOverlay.data)}
          initialIsSaved={isItemSaved(activeOverlay.type, activeOverlay.data)}
        />
      )}

      {/* Right-click context menu */}
      {contextMenu && (
        <motion.div
          {...(isDevs
            ? {
                initial: { opacity: 0, scale: 0.95 },
                animate: { opacity: 1, scale: 1 },
                transition: { duration: 0.12 },
              }
            : {})}
          ref={menuRef}
          style={{ top: contextMenu.y, left: contextMenu.x, width: CONTEXT_MENU_WIDTH }}
          className="fixed z-50 bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-lg shadow-lg py-1 devs:devs-glass devs:!rounded-2xl devs:font-mono"
        >
          <button
            onClick={() => {
              setConfirmDeleteId(contextMenu.notificationId);
              setContextMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-[14px] font-medium text-red-500 hover:bg-[var(--bg-row-hover)] cursor-pointer devs:text-[var(--color-danger)] devs:text-[13px] devs:hover:bg-[var(--bg-danger-hover)]"
          >
            Delete notification
          </button>
        </motion.div>
      )}

      {/* Delete confirmation popup */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-50 bg-black/50 flex justify-center items-center px-4 devs:backdrop-blur-sm">
          <motion.div
            {...(isDevs
              ? {
                  initial: { scale: 0.9, y: 16, opacity: 0 },
                  animate: { scale: 1, y: 0, opacity: 1 },
                  transition: { type: "spring", stiffness: 380, damping: 28 },
                }
              : {})}
            className={`w-full max-w-[320px] bg-[var(--bg-app)] border border-[var(--border-soft)] rounded-xl p-5 flex flex-col gap-4 ${
              isDevs ? "devs-glass devs-neon-border !rounded-3xl" : ""
            }`}
          >
            <div>
              <h3 className="text-[var(--text-primary)] text-[16px] font-bold">Delete notification?</h3>
              <p className="text-[var(--text-muted)] text-[13px] mt-1 devs:font-mono devs:text-[12px]">
                This action can't be undone.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmDeleteId(null)}
                disabled={deletingId === confirmDeleteId}
                className="px-4 py-2 text-[13px] font-bold rounded-lg bg-[var(--bg-secondary-btn)] hover:bg-[var(--bg-secondary-btn-hover)] text-[var(--text-primary)] cursor-pointer disabled:opacity-60 devs:font-mono devs:rounded-full devs:text-[11px] devs:border devs:border-[var(--border-popup)]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteNotification(confirmDeleteId)}
                disabled={deletingId === confirmDeleteId}
                className="px-4 py-2 text-[13px] font-bold rounded-lg bg-red-500 hover:bg-red-600 text-white cursor-pointer disabled:opacity-60 devs:bg-[var(--color-danger)] devs:hover:bg-[var(--color-danger-hover)] devs:font-mono devs:rounded-full devs:text-[11px]"
              >
                {deletingId === confirmDeleteId ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;