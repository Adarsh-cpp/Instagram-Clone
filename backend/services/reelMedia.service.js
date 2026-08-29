import cloudinary from "../config/cloudinary.js";

const MAX_DURATION = 30; // seconds
const ASPECT_RATIOS = [
  { label: "9:16", value: 9 / 16 },
  { label: "16:9", value: 16 / 9 },
];
const TOLERANCE = 0.04;

const matchAspectRatio = (width, height) => {
  const ratio = width / height;
  const match = ASPECT_RATIOS.find((r) => Math.abs(ratio - r.value) <= TOLERANCE);
  return match?.label || null;
};

export const uploadReelVideo = (fileBuffer, folder = "reels", trim = {}) => {
  return new Promise((resolve, reject) => {
    const start = Number(trim.trimStart) || 0;
    const dur = Number(trim.trimDuration) || 0;

    const uploadOptions = {
      folder,
      resource_type: "video",
      chunk_size: 6_000_000,
    };

    // only apply a trim transformation if the client actually sent a valid window
    if (dur > 0) {
      uploadOptions.transformation = [
        { start_offset: start, end_offset: start + dur },
      ];
    }

    const stream = cloudinary.uploader.upload_stream(
      uploadOptions,
      async (error, result) => {
        if (error) return reject(error);

        const { duration, width, height, public_id } = result;
        const aspectRatio = matchAspectRatio(width, height);

        if (duration > MAX_DURATION + 0.5) {
          await cloudinary.uploader.destroy(public_id, { resource_type: "video" });
          return reject(
            new Error(`Reel exceeds max length of ${MAX_DURATION}s (got ${duration.toFixed(1)}s)`)
          );
        }
        if (!aspectRatio) {
          await cloudinary.uploader.destroy(public_id, { resource_type: "video" });
          return reject(new Error("Reel must be 9:16 (portrait) or 16:9 (landscape)"));
        }

        const optimizedUrl = cloudinary.url(public_id, {
          resource_type: "video",
          quality: "auto:good",
          fetch_format: "auto",
          width: Math.min(width, 1080),
          crop: "limit",
        });

        const thumbnailUrl = cloudinary.url(public_id, {
          resource_type: "video",
          format: "jpg",
          start_offset: "1",
          width: 400,
          crop: "fill",
          quality: "auto",
        });

        resolve({
          url: optimizedUrl,
          publicId: public_id,
          thumbnailUrl,
          duration,
          width,
          height,
          aspectRatio,
        });
      }
    );

    stream.end(fileBuffer);
  });
};

export const deleteReelVideo = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
};