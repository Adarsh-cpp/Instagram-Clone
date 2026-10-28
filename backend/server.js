import dns from "dns";

dns.setServers(["8.8.8.8", "8.8.4.4"]);
console.log("DNS:", dns.getServers());

import "dotenv/config";

console.log("Loaded FRONTEND_URL:", process.env.FRONTEND_URL);
console.log("Working directory:", process.cwd());

// import fs from "fs";
// import path from "path";
// import crypto from "crypto";

// const envPath = path.resolve(process.cwd(), ".env");
// console.log("cwd:", process.cwd());
// console.log(".env exists:", fs.existsSync(envPath),
//   "size:", fs.existsSync(envPath) ? fs.statSync(envPath).size : "n/a");
// console.log("JWT_SECRET fingerprint:",
//   crypto.createHash("sha256").update(String(process.env.JWT_SECRET)).digest("hex").slice(0, 8));


// console.log("GEMINI_API_KEY loaded:", !!process.env.GEMINI_API_KEY);

// console.log("Loaded ENV variables:", process.env);

import http from "http";
import express from "express";
import cors from "cors";
import session from "express-session";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import { initializeSocket } from "./config/socket.js";
import connectDB from "./config/mongodb.js";
import passport from "./config/passport-google.js";
import { startPostIndexingWorker } from "./services/postIndexing.service.js";

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
import aiRoutes from "./routes/aiRoutes.js";

const app = express();
const server = http.createServer(app);

// Needed so secure cookies work correctly behind Render's proxy in production.
// Harmless locally — does nothing when not behind a proxy.
app.set("trust proxy", 1);

// Health check — pinged by cron-job.org every 10 minutes to keep Render's
// free instance awake. Kept ABOVE cors/session/passport on purpose so each
// ping is tiny and does not create a session or touch the database.
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

initializeSocket(server);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
      // In production (different domains for frontend/backend), cookies must be
      // secure + sameSite:"none" to be sent cross-site. Locally, both are on
      // http://localhost, so we keep the old relaxed behavior there.
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
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
app.use("/api/ai", aiRoutes);

const port = process.env.PORT || 4000;

connectDB();

// Start the AI post-indexing worker once MongoDB is connected.
if (mongoose.connection.readyState === 1) {
  startPostIndexingWorker();
} else {
  mongoose.connection.once("open", startPostIndexingWorker);
}

app.get("/", (req, res) => {
  res.send("helllo world !!!");
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Server is running on port ${port}`);
  console.log("JWT_SECRET loaded?", !!process.env.JWT_SECRET);
});
