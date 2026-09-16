import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
console.log("DNS:", dns.getServers());

import "dotenv/config";

import http from "http";
import express from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";

import { initializeSocket } from "./config/socket.js";
import connectDB from "./config/mongodb.js";
import passport from "./config/passport-google.js";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import conversationRoutes from "./routes/conversationRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import reelRoutes from "./routes/reelRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import highlightRoutes from "./routes/highlightRoutes.js";
import songRoutes from "./routes/songRoutes.js";

const app = express();
const server = http.createServer(app);

initializeSocket(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use("/auth", authRoutes);
app.use("/user/profile", profileRoutes);
app.use("/post", postRoutes);
app.use("/conversation", conversationRoutes);
app.use("/message", messageRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/:postId/comment", commentRoutes);
app.use("/reels", reelRoutes);
app.use("/story", storyRoutes);
app.use("/highlight", highlightRoutes);
app.use("/song", songRoutes);

const port = process.env.PORT || 4000;

connectDB();

app.get("/", (req, res) => {
  res.send("helllo world !!!");
});

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImFkYXJzaHBhdHRhbmF5YWsyMDA0QGdtYWlsLmNvbSIsImlkIjoiNmEyZjllOGNiMDRhMjRmOTFmMzMxNzc0IiwiaWF0IjoxNzg5NTYzNTIyLCJleHAiOjE3ODk2NDk5MjJ9.s3STQ5Ebr1vCd3TinzEU9Ms5bFmELRvOQVuul9-7ojE