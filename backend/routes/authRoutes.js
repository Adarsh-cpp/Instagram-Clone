import express from "express";
import {
  login,
  signup,
  logout,
  sendOTP,
  verifyOTP,
  sendResetOTP,
  resetPassword,
  addDOB,
  getFollowings,
  getFollowers,
  googleCallback,
  addUsername,
} from "../controllers/authController.js"
import { authUser } from "../middlewares/authMiddleware.js";
import passportGoogle from "../config/passport-google.js";


const router = express.Router();

router.post('/signup', signup);

router.post("/login", login);

router.post("/logout", logout);

router.post("/send-otp", authUser, sendOTP);

router.post("/verify-otp", authUser, verifyOTP);

router.post("/send-reset-otp", sendResetOTP);

router.post("/reset-password", resetPassword);

router.post("/add-dob", authUser, addDOB);

router.patch("/add-username", authUser, addUsername);

router.get("/get-followers", authUser, getFollowers)

router.get("/get-followings", authUser, getFollowings)
router.get("/me", authUser, (req, res) => {
  res.json(req.user);
});



// Login with Google
router.get(
  "/google",
  passportGoogle.authenticate("google", { scope: ["profile", "email"], session: false })
);

// Callback after Google login
router.get(
  "/google/callback",
  passportGoogle.authenticate("google", { session: false, failureRedirect: "http://localhost:5173/" }),
  googleCallback
);

export default router;