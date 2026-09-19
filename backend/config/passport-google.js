import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import cloudinary from "./cloudinary.js"; // shared, already-configured instance — do NOT call cloudinary.config() again here
import userModel from "../models/user.model.js";

/**
 * Takes a Google profile photo URL, uploads it to Cloudinary,
 * and returns { url, publicId }. Falls back to the original
 * Google URL if the upload fails for any reason.
 */
const uploadGooglePhotoToCloudinary = async (googlePhotoUrl, googleId) => {
  if (!googlePhotoUrl) return { url: "", publicId: "" };

  // Google returns a 96px thumbnail by default (=s96-c). Ask for 400px.
  const highResUrl = googlePhotoUrl.replace(/=s\d+-c$/, "=s400-c");

  try {
    const result = await cloudinary.uploader.upload(highResUrl, {
      folder: "profile_pics",
      public_id: `google_${googleId}`,
      overwrite: true,
      transformation: [
        { width: 400, height: 400, crop: "fill", gravity: "face" },
        { quality: "auto", fetch_format: "auto" },
      ],
    });

    return { url: result.secure_url, publicId: result.public_id };
  } catch (err) {
    console.error("Cloudinary upload failed for Google profile pic:", err.message);
    // Don't break login — fall back to Google's own CDN URL.
    return { url: googlePhotoUrl, publicId: "" };
  }
};

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;
        const googlePhoto = profile.photos?.[0]?.value || "";

        // 1. Existing Google user — log in as-is, never touch profilePic
        let user = await userModel.findOne({ googleId: profile.id });
        if (user) return done(null, user);

        // 2. Existing email user linking their Google account —
        //    link the account only, leave profilePic alone
        if (email) {
          user = await userModel.findOne({ email });
          if (user) {
            user.googleId = profile.id;
            await user.save();
            return done(null, user);
          }
        }

        // 3. Brand new user — this is the only place we pull the Google pic
        const { url, publicId } = await uploadGooglePhotoToCloudinary(
          googlePhoto,
          profile.id
        );

        user = await userModel.create({
          googleId: profile.id,
          email,
          fullname: profile.displayName,
          profilePic: url,
          profilePicPublicId: publicId,
          isAccountVerified: true,
        });

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

export default passport;
