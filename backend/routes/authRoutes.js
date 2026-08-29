import express from "express";
import {login, signup, logout, sendOTP, verifyOTP, sendResetOTP, resetPassword, addDOB, getFollowings, getFollowers} from "../controllers/authController.js"
import { authUser } from "../middlewares/authMiddleware.js";
import passport from "../config/passport-facebook.js";


const router = express.Router();

router.post('/signup', signup);

router.post("/login", login);

router.post("/logout", logout);

router.post("/send-otp", authUser, sendOTP);

router.post("/verify-otp", authUser, verifyOTP);

router.post("/send-reset-otp", sendResetOTP);

router.post("/reset-password", resetPassword);

router.post("/add-dob", authUser, addDOB);

router.get("/get-followers", authUser, getFollowers)

router.get("/get-followings", authUser, getFollowings)
router.get("/me", authUser, (req, res) => {
  res.json(req.user);
});

// Login with Facebook
router.get("/facebook", passport.authenticate("facebook", { scope: ["email"] }));

// Callback after Facebook login
router.get(
  "/facebook/callback",
  passport.authenticate("facebook", {
    failureRedirect: "http://localhost:5173/",
    successRedirect: "http://localhost:5173/home",
  })
);

export default router;