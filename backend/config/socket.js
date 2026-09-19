import { Server } from "socket.io";
import userModel from "../models/user.model.js";

// userId -> Set of socketIds (handles multiple tabs/devices)
export const onlineUsers = new Map();

let io;

export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log("User Connected:", socket.id);

    socket.on("join", (userId) => {
      if (!userId) return;

      socket.userId = userId; // stash for disconnect lookup

      if (!onlineUsers.has(userId)) {
        onlineUsers.set(userId, new Set());
      }
      onlineUsers.get(userId).add(socket.id);

      io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
    });

    socket.on("disconnect", async () => {
      const userId = socket.userId;
      if (!userId || !onlineUsers.has(userId)) return;

      const sockets = onlineUsers.get(userId);
      sockets.delete(socket.id);

      // only mark fully offline if no other tab/device is still connected
      if (sockets.size === 0) {
        onlineUsers.delete(userId);

        const lastSeen = new Date();
        try {
          await userModel.findByIdAndUpdate(userId, { lastSeen });
        } catch (err) {
          console.error("Failed to update lastSeen:", err);
        }

        io.emit("userLastSeen", { userId, lastSeen });
      }

      io.emit("getOnlineUsers", Array.from(onlineUsers.keys()));
      console.log("User Disconnected:", socket.id);
    });

    socket.on("typing", ({ senderId, receiverId, conversationId }) => {
      const receiverSockets = onlineUsers.get(receiverId);
      if (receiverSockets) {
        receiverSockets.forEach((sid) =>
          io.to(sid).emit("typing", { senderId, conversationId })
        );
      }
    });

    socket.on("stopTyping", ({ senderId, receiverId, conversationId }) => {
      const receiverSockets = onlineUsers.get(receiverId);
      if (receiverSockets) {
        receiverSockets.forEach((sid) =>
          io.to(sid).emit("stopTyping", { senderId, conversationId })
        );
      }
    });
  });
};

export const getIO = () => io;