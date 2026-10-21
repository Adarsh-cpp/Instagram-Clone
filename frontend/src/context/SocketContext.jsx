import { createContext, useContext, useEffect, useState } from "react";
import socket from "../socket";
import { useAuth } from "./AuthContext";

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastSeenMap, setLastSeenMap] = useState({});

  useEffect(() => {
    if (!user?._id) {
      socket.disconnect();
      setOnlineUsers([]);
      return;
    }

    const userId = String(user._id);

    const handleConnect = () => socket.emit("join", userId);
    const handleOnlineUsers = (list) => setOnlineUsers(list);
    const handleLastSeen = ({ userId: id, lastSeen }) =>
      setLastSeenMap((prev) => ({ ...prev, [id]: lastSeen }));

    // register listeners BEFORE connecting so nothing is missed
    socket.on("connect", handleConnect);
    socket.on("getOnlineUsers", handleOnlineUsers);
    socket.on("userLastSeen", handleLastSeen);

    if (socket.connected) {
      // already connected (e.g. user changed without a disconnect) — join now
      socket.emit("join", userId);
    } else {
      // "connect" fires once connected and emits join
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("getOnlineUsers", handleOnlineUsers);
      socket.off("userLastSeen", handleLastSeen);
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, lastSeenMap }}>
      {children}
    </SocketContext.Provider>
  );
};
