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

export const deleteMedia = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId);
};

// 🔹 Turns a Cloudinary URL back into its public_id, e.g.
// https://res.cloudinary.com/x/image/upload/v123/instagram-clone/conversations/abc/pic.jpg
//   -> instagram-clone/conversations/abc/pic
const getPublicIdFromUrl = (url) => {
  try {
    if (typeof url !== "string" || !url.includes("/upload/")) return null;

    const afterUpload = url.split("/upload/")[1].split("?")[0];
    const parts = afterUpload.split("/");

    // skip any transformation segments and the v123456 version segment
    const versionIndex = parts.findIndex((p) => /^v\d+$/.test(p));
    const idParts = versionIndex !== -1 ? parts.slice(versionIndex + 1) : parts;

    const publicId = decodeURIComponent(idParts.join("/")).replace(/\.[^/.]+$/, "");
    return publicId || null;
  } catch {
    return null;
  }
};

// 🔹 Best-effort bulk delete by URL (used when unsending a message or
// deleting a conversation). Never throws, so a Cloudinary hiccup can't block
// the delete the user asked for.
export const deleteMediaByUrls = async (urls = []) => {
  const publicIds = [...new Set(urls.map(getPublicIdFromUrl).filter(Boolean))];

  await Promise.all(
    publicIds.map(async (publicId) => {
      try {
        await deleteMedia(publicId);
      } catch (err) {
        console.log("Failed to delete media:", publicId, err?.message || err);
      }
    })
  );
};