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