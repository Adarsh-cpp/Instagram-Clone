
import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useNotifications } from "../context/NotificationContext";
import IconSidebar from "../components/IconSidebar";
import MobileFooter from "../components/MobileFooter";
import { toast } from "react-toastify";
import { notificationText } from "../utils/notificationText";

const BASE_URL = "http://localhost:4000";

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



const NotificationsPage = () => {
  const { markAllAsRead } = useNotifications();
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [followBackState, setFollowBackState] = useState({});

  const loadNotifications = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const { data } = await axios.get(
        `${BASE_URL}/api/notifications?page=${pageNum}&limit=20`,
        authHeaders()
      );
      console.log(data.notifications.map(n => ({ type: n.type, reel: n.reel })));
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

  return (
    <div className="NotificationsPage w-[100vw] h-[100vh] flex justify-between items-center bg-[#0c1014]">
      <IconSidebar />

      <div className="notifSection w-full md:w-[88%] 2xl:w-[80%] h-full flex justify-center items-start overflow-x-hidden overflow-y-auto">
        <div className="notifContainer w-full 2xl:w-[70%] h-full">
          <div className="notifHeader w-full h-[70px] flex items-center px-4 sm:px-8 border-b border-[#2b3036]">
            <h2 className="text-white text-[20px] font-bold">Notifications</h2>
          </div>

          <div className="notifList w-full flex flex-col">
            {items.length === 0 && !loading && (
              <div className="w-full h-[200px] flex flex-col justify-center items-center gap-2">
                <h3 className="text-white text-lg font-bold">No notifications yet</h3>
                <p className="text-[#A8A8A8] text-sm">
                  When someone follows you or interacts with your posts, it'll show up here.
                </p>
              </div>
            )}

            {items.map((n) => {
              const isFollow = n.type === "follow";
               
                // prefer a follow-back click the user just made; otherwise trust the server's real status
                const isFollowingBack = followBackState[n.sender._id] ?? n.isFollowingSender ?? false;
              // follow -> sender's avatar; like/comment -> the post image
              const thumbSrc = isFollow
                  ? n.sender.profilePic || "/images/default-profile-pic.jpg"
                  : n.reel
                  ? n.reel.media?.thumbnailUrl || "/images/default-profile-pic.jpg"
                  : n.post?.media?.[0]?.url || "/images/default-profile-pic.jpg";

              return (
                <div
                  key={n._id}
                  className={`notifItem w-full px-4 sm:px-8 py-3 flex items-center justify-between gap-3 hover:bg-[#121212] transition-colors ${
                    !n.isRead ? "bg-[#0d1b2a]" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                   <Link
                      to={
                        isFollow
                          ? `/user/get-profile/${n.sender._id}`
                          : n.reel
                          ? `/reel/${n.reel._id}`
                          : `/post/${n.post?._id}`
                      }
                      className="shrink-0"
                    >
                      <div
                        className={`w-[48px] h-[48px] overflow-hidden border border-[#2b3036] ${
                          isFollow ? "rounded-full" : "rounded-md"
                        }`}
                      >
                        <img src={thumbSrc} alt="" className="w-full h-full object-cover" />
                      </div>
                    </Link>

                    <div className="notifText min-w-0 text-[14px] text-white leading-tight">
                      <span className="truncate">
                        <Link to={`/user/get-profile/${n.sender._id}`} className="font-bold hover:underline">
                          {n.sender.username}
                        </Link>{" "}
                        <span className="text-[#A8A8A8]">{notificationText(n)}</span>
                      </span>
                      <div className="text-[#A8A8A8] text-[12px]">{timeAgo(n.createdAt)}</div>
                    </div>
                  </div>

                  {isFollow && (
                    <button
                      onClick={() => handleFollowBack(n.sender._id)}
                      className={`shrink-0 w-[100px] h-[32px] text-[13px] font-bold rounded-lg cursor-pointer ${
                        isFollowingBack
                          ? "bg-[#363636] hover:bg-[#4a4a4a] text-white"
                          : "bg-[#4a5df9] hover:bg-[#4150f7] text-white"
                      }`}
                    >
                      {isFollowingBack ? "Following" : "Follow back"}
                    </button>
                  )}
                </div>
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
                className="text-[#85a1ff] hover:text-[#a3bcff] text-[14px] cursor-pointer"
              >
                {loading ? "Loading..." : "Load more"}
              </button>
            </div>
          )}

          <MobileFooter />
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;