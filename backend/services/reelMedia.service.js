import cloudinary from "../config/cloudinary.js";

export const MAX_DURATION = 30; // seconds

const ASPECT_RATIOS = [
  { label: "9:16", value: 9 / 16 },
  { label: "16:9", value: 16 / 9 },
];
const TOLERANCE = 0.04;

export const matchAspectRatio = (width, height) => {
  const ratio = width / height;
  const match = ASPECT_RATIOS.find((r) => Math.abs(ratio - r.value) <= TOLERANCE);
  return match?.label || null;
};

export const buildReelUrls = (publicId, width) => {
  const optimizedUrl = cloudinary.url(publicId, {
    resource_type: "video",
    quality: "auto:good",
    fetch_format: "auto",
    width: Math.min(width, 1080),
    crop: "limit",
    flags: "faststart",
  });

  const thumbnailUrl = cloudinary.url(publicId, {
    resource_type: "video",
    format: "jpg",
    start_offset: "1",
    width: 400,
    crop: "fill",
    quality: "auto",
  });

  return { optimizedUrl, thumbnailUrl };
};

export const deleteReelVideo = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "video",
    timeout: 120000, // 120s — free tier can be slow; give it more room before giving up
  });
};
