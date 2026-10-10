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

// Single source of truth for what the "final playable" reel looks like.
// Used both to build the eager transformation string requested at upload
// time (cloudinarySignature.js) and to describe it here.
//
// SPEED NOTE: `fetch_format: "auto"` on video lets Cloudinary pick WebM/VP9
// or similar for some clients, and VP9 encoding is several times slower than
// H.264. Pinning to mp4 + h264 plays everywhere and transcodes much faster.
//
// NOTE: no `flags` here on purpose. "faststart" is not a Cloudinary flag,
// so `fl_faststart` makes Cloudinary reject the eager transformation.
export const DELIVERY_TRANSFORM = {
  quality: "auto:good",
  fetch_format: "mp4",
  video_codec: "h264",
  width: 1080,
  crop: "limit",
};

// Thumbnails are a cheap single-frame extraction, not a full video
// transcode, so they're fine to generate on demand (no eager step needed).
export const buildReelThumbnailUrl = (publicId, trimStart = 0, trimDuration = 0) => {
  const hasTrim = trimDuration > 0;
  // A third of the way into the trim window, not a fixed "1s in".
  const thumbnailOffset = hasTrim ? trimStart + Math.min(1, trimDuration / 3) : 1;

  return cloudinary.url(publicId, {
    resource_type: "video",
    format: "jpg",
    start_offset: thumbnailOffset,
    width: 400,
    crop: "fill",
    quality: "auto",
  });
};

/**
 * Checks ONCE whether the eager transformation requested at upload time has
 * finished, and returns its secure_url (or null if not ready yet).
 *
 * IMPORTANT: re-fetched resources expose eager results under `derived`,
 * not `eager`.
 *
 * IMPORTANT: `derived` also contains ANY other transformation Cloudinary has
 * generated for this asset — including the jpg thumbnail the first time a
 * client requests the poster. So we must pick the derived *video* entry
 * explicitly, otherwise we could end up saving the thumbnail as the reel URL.
 */
export const getEagerVideoUrl = async (publicId) => {
  const resource = await cloudinary.api.resource(publicId, {
    resource_type: "video",
  });

  const wantedFormat = DELIVERY_TRANSFORM.fetch_format;
  const candidates = resource.derived || [];
  const ready = candidates.find((d) => {
    if (!d.secure_url || (d.bytes ?? 0) <= 0) return false;
    const isVideo = d.format
      ? d.format === wantedFormat
      : d.secure_url.toLowerCase().endsWith(`.${wantedFormat}`);
    return isVideo;
  });

  return ready ? ready.secure_url : null;
};

/**
 * Polls getEagerVideoUrl with a gentle back-off. Used by the BACKGROUND
 * watcher only — the create-reel request no longer waits on this.
 *
 * Back-off keeps us well under Cloudinary's Admin API rate limit (it is
 * hourly and shared across the whole account).
 */
export const waitForEagerVideoUrl = async (
  publicId,
  { maxAttempts = 25, firstDelayMs = 2000, maxDelayMs = 8000 } = {}
) => {
  let delay = firstDelayMs;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // eslint-disable-next-line no-await-in-loop
    await new Promise((r) => setTimeout(r, delay));
    // eslint-disable-next-line no-await-in-loop
    const url = await getEagerVideoUrl(publicId);
    if (url) return url;
    delay = Math.min(Math.round(delay * 1.4), maxDelayMs);
  }
  return null;
};

export const deleteReelVideo = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, {
    resource_type: "video",
    timeout: 120000,
  });
};
