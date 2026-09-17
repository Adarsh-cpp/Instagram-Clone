// src/socket.js

import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_SERVER_URL

const socket = io(BASE_URL);

export default socket;