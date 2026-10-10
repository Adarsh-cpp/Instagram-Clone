const CHUNK_SIZE = 20 * 1024 * 1024; // 20MB — Cloudinary's max per-chunk size

/**
 * Uploads a video file straight from the browser to Cloudinary — it never
 * passes through our own server. Large files are sent in chunks using
 * Cloudinary's resumable-upload protocol.
 */
export const uploadVideoDirectToCloudinary = async (file, signaturePayload, onProgress) => {
  const { apiKey, cloudName, signature, timestamp, folder, tags, context, eager, eager_async } =
    signaturePayload || {};

  // If any of these are missing, sending the request anyway just produces
  // Cloudinary's confusing "Upload preset must be specified when using
  // unsigned upload" error — Cloudinary can't tell "signature omitted" apart
  // from "never intended to be signed" from its side. Catch it here instead,
  // with a message that actually points at the real problem.
  const missing = [
    !apiKey && "apiKey",
    !cloudName && "cloudName",
    !signature && "signature",
    !timestamp && "timestamp",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(
      `Upload signature payload from the server is missing: ${missing.join(", ")}. Check the /reels/sign-upload response.`
    );
  }

  const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`;
  const uniqueUploadId = `reel-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const totalSize = file.size;
  const totalChunks = Math.max(1, Math.ceil(totalSize / CHUNK_SIZE));

  let lastResponse = null;

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, totalSize);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append("file", chunk, file.name || "reel.mp4");
    formData.append("api_key", apiKey);
    formData.append("timestamp", timestamp);
    formData.append("signature", signature);
    formData.append("folder", folder);
    formData.append("tags", tags);
    if (context) formData.append("context", context);
    if (eager) formData.append("eager", eager);
    if (eager_async) formData.append("eager_async", eager_async);

    // eslint-disable-next-line no-await-in-loop
    lastResponse = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", uploadUrl);
      xhr.setRequestHeader("X-Unique-Upload-Id", uniqueUploadId);
      xhr.setRequestHeader("Content-Range", `bytes ${start}-${end - 1}/${totalSize}`);

      xhr.upload.onprogress = (e) => {
        if (!onProgress || !e.lengthComputable) return;
        const uploadedSoFar = start + e.loaded;
        onProgress(Math.min(99, Math.round((uploadedSoFar / totalSize) * 100)));
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            reject(new Error("Malformed response from Cloudinary"));
          }
        } else {
          try {
            const parsed = JSON.parse(xhr.responseText);
            reject(new Error(parsed?.error?.message || `Upload failed (${xhr.status})`));
          } catch {
            reject(new Error(`Upload failed (${xhr.status})`));
          }
        }
      };

      xhr.onerror = () => reject(new Error("Network error during upload"));
      xhr.send(formData);
    });
  }

  onProgress?.(100);
  return lastResponse;
};