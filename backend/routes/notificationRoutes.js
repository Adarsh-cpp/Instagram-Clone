import express from "express";
import {
  getNotifications,
  getUnreadCount,
  markAllAsRead,
  markOneAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";
import { authUser } from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/", authUser, getNotifications);
router.get("/unread-count", authUser, getUnreadCount);
router.patch("/mark-all-read", authUser, markAllAsRead);
router.patch("/:id/read", authUser, markOneAsRead);
router.delete("/:id", authUser, deleteNotification);

export default router;

// in your main server file: app.use("/api/notifications", notificationRoutes);