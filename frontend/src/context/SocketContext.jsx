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
      return;
    }

    socket.connect();
    socket.emit("join", user._id);

    const handleConnect = () => socket.emit("join", user._id);
    const handleLastSeen = ({ userId, lastSeen }) =>
      setLastSeenMap((prev) => ({ ...prev, [userId]: lastSeen }));

    socket.on("connect", handleConnect);
    socket.on("getOnlineUsers", setOnlineUsers);
    socket.on("userLastSeen", handleLastSeen);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("getOnlineUsers");
      socket.off("userLastSeen", handleLastSeen);
    };
  }, [user?._id]);

  return (
    <SocketContext.Provider value={{ socket, onlineUsers, lastSeenMap }}>
      {children}
    </SocketContext.Provider>
  );
};