import cloudinary from "../config/cloudinary.js";
import { DELIVERY_TRANSFORM } from "./uploadReelVideo.js";

// Raw string transformation describing the eager transformation Cloudinary
// should generate in the background (the stored original is left untouched).
const buildTransformString = (trimStart, trimDuration) => {
  const parts = [
    `q_${DELIVERY_TRANSFORM.quality}`,
    `f_${DELIVERY_TRANSFORM.fetch_format}`,
    `w_${DELIVERY_TRANSFORM.width}`,
    `c_${DELIVERY_TRANSFORM.crop}`,
  ];
  if (DELIVERY_TRANSFORM.video_codec) {
    parts.push(`vc_${DELIVERY_TRANSFORM.video_codec}`);
  }
  if (DELIVERY_TRANSFORM.flags) {
    parts.push(`fl_${DELIVERY_TRANSFORM.flags}`);
  }
  if (trimDuration > 0) {
    parts.push(`so_${trimStart}`, `eo_${trimStart + trimDuration}`);
  }
  return parts.join(",");
};

/**
 * Builds a signed parameter set for a direct browser -> Cloudinary video
 * upload. See uploadReelVideo.js for the full rationale.
 */
export const buildReelUploadSignature = ({ trimStart = 0, trimDuration = 0, userId }) => {
  if (!userId) {
    throw new Error("buildReelUploadSignature: userId is required");
  }

  const { api_key, api_secret, cloud_name } = cloudinary.config();
  if (!api_key || !api_secret || !cloud_name) {
    throw new Error(
      "Cloudinary SDK config is incomplete at signing time — check for a stray cloudinary.config() call elsewhere in the codebase."
    );
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = "reels";
  const tags = `reel_upload,user_${userId}`;

  const start = Number(trimStart) || 0;
  const dur = Number(trimDuration) || 0;

  const paramsToSign = {
    folder,
    tags,
    context: `trim_start=${start}|trim_duration=${dur}`,
    eager: buildTransformString(start, dur),
    eager_async: "true",
    timestamp,
  };

  const signature = cloudinary.utils.api_sign_request(paramsToSign, api_secret);

  const payload = {
    ...paramsToSign,
    signature,
    apiKey: api_key,
    cloudName: cloud_name,
  };

  // if (process.env.NODE_ENV !== "production") {
  //   console.log("[reel upload signature]", { ...payload, signature: `${signature.slice(0, 8)}…` });
  // }

  return payload;
};
