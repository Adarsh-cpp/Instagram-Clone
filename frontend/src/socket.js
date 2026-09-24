import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_SERVER_URL;

// Single shared socket instance for the whole app. Connection is deferred
// (autoConnect: false) — SocketContext calls .connect() once we know who
// the logged-in user is, and emits "join" so the server can map this
// socket id to the user. Every component that needs sockets (Chat,
// MessagesPage, SocketContext, etc.) must import THIS instance — never
// create a second io(...) call, or the server will end up sending events
// to a socket id nobody is listening on.
const socket = io(BASE_URL, {
  withCredentials: true,
  autoConnect: false,
});

export default socket;