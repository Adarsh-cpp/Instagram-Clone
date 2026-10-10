// config/cloudinary.js
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

const { cloud_name, api_key, api_secret } = cloudinary.config();

if (!cloud_name || !api_key || !api_secret) {
  const missing = [
    !cloud_name && "CLOUD_NAME",
    !api_key && "CLOUD_API_KEY",
    !api_secret && "CLOUD_API_SECRET",
  ].filter(Boolean);

  // Signed uploads silently produce a garbage-but-well-formed signature
  // when api_secret is missing, instead of throwing — so this must be a
  // hard failure at boot, not a warning easy to miss in the logs.
  throw new Error(
    `Cloudinary config is missing: ${missing.join(", ")}. Check your .env variable names match exactly.`
  );
}

export default cloudinary;