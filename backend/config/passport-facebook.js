import passport from "passport";
import { Strategy as FacebookStrategy } from "passport-facebook";
import dotenv from "dotenv";
import userModel from "../models/user.model.js";

dotenv.config();

// Configure Facebook strategy
passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_APP_ID,
      clientSecret: process.env.FACEBOOK_APP_SECRET,
      callbackURL: "http://localhost:4000/auth/facebook/callback",
      profileFields: ["id", "emails", "name", "displayName"], // Removed birthday
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || null;

        // Find existing user (by facebookId OR email)
        let user = await userModel.findOne({
          $or: [{ facebookId: profile.id }, { email }],
        });

        if (!user) {
          // Create new user if not exists
          user = new userModel({
            facebookId: profile.id,
            fullname: profile.displayName,
            email,
            username: email ? email.split("@")[0] : `fb_${profile.id}`,
            isAccountverified: true, // Facebook verified user
          });

          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error("Facebook auth error:", err);
        return done(err, null);
      }
    }
  )
);

// Serialize user into session
passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await userModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
