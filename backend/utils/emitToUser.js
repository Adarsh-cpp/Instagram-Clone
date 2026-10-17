// utils/emitToUser.js
import { getIO, onlineUsers } from "../config/socket.js";

// Delivers an event to every connected socket of a user, whether
// onlineUsers stores a single id, an array, or a Set.
export const emitToUser = (userId, event, payload) => {
  if (!userId) return;

  const entry = onlineUsers.get(userId.toString());
  if (!entry) return;

  const ids =
    entry instanceof Set ? [...entry] : Array.isArray(entry) ? entry : [entry];

  const io = getIO();
  ids.forEach((id) => io.to(id).emit(event, payload));
};
