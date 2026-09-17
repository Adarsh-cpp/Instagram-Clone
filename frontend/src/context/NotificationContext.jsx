import { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useSocket } from "./SocketContext";
import { useAuth } from "./AuthContext";
import { getNotificationToastText } from "../utils/notificationText";

const NotificationContext = createContext(null);
export const useNotifications = () => useContext(NotificationContext);

const BASE_URL = import.meta.env.VITE_SERVER_URL

const authHeaders = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem("authToken")}`,
  },
});

export const NotificationProvider = ({ children }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user?._id) return;
    try {
      const { data } = await axios.get(
        `${BASE_URL}/api/notifications/unread-count`,
        authHeaders()
      );
      setUnreadCount(data.count);
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  }, [user?._id]);

  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
      toast.info(getNotificationToastText(notification));
    };

    socket.on("newNotification", handleNewNotification);
    socket.on("unreadNotificationCount", setUnreadCount);

    return () => {
      socket.off("newNotification", handleNewNotification);
      socket.off("unreadNotificationCount", setUnreadCount);
    };
  }, [socket]);

  const markAllAsRead = useCallback(async () => {
    setUnreadCount(0);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await axios.patch(
        `${BASE_URL}/api/notifications/mark-all-read`,
        {},
        authHeaders()
      );
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, setNotifications, unreadCount, markAllAsRead }}>
      {children}
    </NotificationContext.Provider>
  );
};