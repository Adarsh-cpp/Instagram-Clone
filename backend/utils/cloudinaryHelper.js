import cloudinary from "../config/cloudinary.js";

// 🔹 Upload single (BUFFER - for profile pic)
export const uploadSingleMedia = (fileBuffer, folder, options = {}) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        ...options,
      },
      (error, result) => {
        if (error) return reject(error);

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          mediaType: result.resource_type === "video" ? "video" : "image",
        });
      }
    );

    stream.end(fileBuffer);
  });
};

// 🔹 Upload multiple (BUFFER - for carousel posts)
// Reuses uploadSingleMedia so there's one code path for talking to Cloudinary.
// Uploads in small batches instead of all-at-once — one slow/flaky connection
// won't drag the whole request past Cloudinary's timeout.
export const uploadMultipleMedia = async (files, folder, options = {}) => {
  const CONCURRENCY = 2;
  const results = [];

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((file) => uploadSingleMedia(file.buffer, folder, options))
    );
    results.push(...batchResults);
  }

  return results;
};

// 🔹 Delete by publicId. resourceType defaults to "image" so every existing
// caller keeps working exactly as before; pass "video" for videos.
// Returns Cloudinary's response ({ result: "ok" | "not found" }).
export const deleteMedia = async (publicId, resourceType = "image") => {
  if (!publicId) return;
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

// 🔹 Turn a Cloudinary secure_url back into its publicId.
// Needed where only the URL was stored (e.g. Message.image / Message.images).
// Handles: https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.jpg
//          -> "folder/name"
// Returns null for anything that isn't a Cloudinary URL (GIPHY gifs, Lottie
// JSON, etc.) so callers can safely run every URL through it.
export const getPublicIdFromUrl = (url) => {
  if (typeof url !== "string" || !url.includes("res.cloudinary.com")) return null;
  const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z0-9]+(?:\?.*)?$/i);
  return match ? match[1] : null;
};

// 🔹 Best-effort bulk delete from an array of URLs. Never throws — a
// Cloudinary hiccup must not block the DB deletion the user asked for.
export const deleteMediaByUrls = async (urls = []) => {
  const publicIds = [
    ...new Set(urls.map(getPublicIdFromUrl).filter(Boolean)),
  ];
  if (publicIds.length === 0) return;

  const results = await Promise.allSettled(publicIds.map((id) => deleteMedia(id)));

  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error("Cloudinary delete failed:", publicIds[i], r.reason);
    } else if (r.value && !["ok", "not found"].includes(r.value.result)) {
      console.error("Cloudinary unexpected result:", publicIds[i], r.value);
    }
  });
};
