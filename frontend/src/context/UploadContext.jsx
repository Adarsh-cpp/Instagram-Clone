import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { fetchReelUploadSignature } from "../utils/fetchReelUploadSignature";
import { uploadVideoDirectToCloudinary } from "../utils/uploadVideoDirectToCloudinary";

const UploadContext = createContext(null);

let idCounter = 0;
const nextId = () => `upload_${Date.now()}_${idCounter++}`;

// The backend already waits ~30s internally for Cloudinary's background
// transcode before responding 202. This is just a safety net for the rare
// case that still isn't enough — a short client-side retry rather than
// failing the whole post outright.
const CREATE_REEL_RETRY_DELAY_MS = 3000;
const CREATE_REEL_MAX_RETRIES = 3;

const postCreateReel = async (payload, token, baseUrl, { attempt = 0, onRetryAttempt } = {}) => {
  const res = await fetch(`${baseUrl}/reels/create-reel`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  // NOTE: res.ok is true for ANY 2xx status, including 202 — so 202 must
  // be handled *before* the res.ok check, or an exhausted retry chain
  // falls through and gets treated as a successful create.
  if (res.status === 202) {
    if (attempt < CREATE_REEL_MAX_RETRIES) {
      onRetryAttempt?.(attempt + 1, CREATE_REEL_MAX_RETRIES);
      await new Promise((r) => setTimeout(r, CREATE_REEL_RETRY_DELAY_MS));
      return postCreateReel(payload, token, baseUrl, { attempt: attempt + 1, onRetryAttempt });
    }
    throw new Error(
      "Your reel is taking longer than usual to process. Please try posting again in a moment."
    );
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Failed to create reel");
  }

  return res.json();
};

export const UploadProvider = ({ children }) => {
  const [uploads, setUploads] = useState([]); // [{id, type, status, progress, meta, resultData, error, consumed}]
  const retryDataRef = useRef({}); // id -> config object passed to startUpload

  const updateUpload = useCallback((id, patch) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  // Existing flow: one multipart request straight to our own server
  // (images, and anything else that still uploads that way).
  const runMultipartUpload = useCallback(
    (id, { url, method, buildFormData, headers }) => {
      const formData = buildFormData();

      axios[method](url, formData, {
        withCredentials: true,
        headers: { ...headers, "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          if (!evt.total) return;
          const progress = Math.round((evt.loaded / evt.total) * 100);
          updateUpload(id, { progress });
        },
      })
        .then((response) => {
          if (response.status === 201) {
            updateUpload(id, {
              status: "success",
              progress: 100,
              resultData: response.data,
              consumed: false,
            });
            toast.success(
              `${response.data?.reel ? "Reel posted!" : "Post shared!"}`
            );
          } else {
            throw new Error("Unexpected response");
          }
        })
        .catch((error) => {
          const message =
            error.response?.data?.message || error.message || "Upload failed";
          updateUpload(id, { status: "error", error: message });
          toast.error(message, { autoClose: false });
        });
    },
    [updateUpload]
  );

  // Video flow: the file goes straight from the browser to Cloudinary,
  // then a small JSON payload tells our server the video landed. The
  // server waits for Cloudinary's background transcode to finish before
  // confirming, so by the time this resolves the reel is genuinely playable.
  const runDirectVideoUpload = useCallback(
    async (id, { file, trimData, aspectRatio, caption, location, taggedUsers, token, baseUrl }) => {
      let processingCrawl = null;
      try {
        updateUpload(id, { status: "uploading", progress: 0, error: null, statusMessage: null });

        const signaturePayload = await fetchReelUploadSignature({
          trimStart: trimData.trimStart,
          trimDuration: trimData.trimDuration,
          token,
          baseUrl,
        });

        const cloudinaryResult = await uploadVideoDirectToCloudinary(
          file,
          signaturePayload,
          (pct) => {
            // Reserve the top of the bar for Cloudinary's background
            // transcode + the create-reel call below.
            updateUpload(id, { progress: Math.round(pct * 0.7) });
          }
        );

        if (!cloudinaryResult?.public_id) {
          throw new Error(cloudinaryResult?.error?.message || "Video upload failed");
        }

        updateUpload(id, { progress: 80, statusMessage: "Processing your reel…" });

        // The server-side wait (and any 202 retries) can take a while with
        // nothing outwardly changing — nudge the bar up slowly so it never
        // looks frozen, capped well below 100 so the real completion jump
        // is still visible.
        processingCrawl = setInterval(() => {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === id && u.status === "uploading" && u.progress < 95
                ? { ...u, progress: u.progress + 1 }
                : u
            )
          );
        }, 1200);

        const data = await postCreateReel(
          {
            publicId: cloudinaryResult.public_id,
            caption,
            ratio: aspectRatio,
            location: location ? JSON.stringify(location) : undefined,
            taggedUsers:
              taggedUsers && taggedUsers.length > 0
                ? JSON.stringify(taggedUsers.map((u) => u._id))
                : undefined,
          },
          token,
          baseUrl,
          {
            onRetryAttempt: (attempt, max) => {
              updateUpload(id, {
                statusMessage: `Still processing — retrying (${attempt}/${max})…`,
              });
            },
          }
        );

        clearInterval(processingCrawl);
        updateUpload(id, {
          status: "success",
          progress: 100,
          resultData: data,
          consumed: false,
          statusMessage: null,
        });
        toast.success("Reel posted!");
      } catch (error) {
        clearInterval(processingCrawl);
        const message = error.message || "Upload failed";
        updateUpload(id, { status: "error", error: message, statusMessage: null });
        toast.error(message, { autoClose: false });
      }
    },
    [updateUpload]
  );

  const runUpload = useCallback(
    (id, config) => {
      if (config.type === "directVideo") {
        runDirectVideoUpload(id, config);
      } else {
        runMultipartUpload(id, config);
      }
    },
    [runDirectVideoUpload, runMultipartUpload]
  );

  const startUpload = useCallback(
    (meta, config) => {
      const id = nextId();

      setUploads((prev) => [
        ...prev,
        { id, type: meta.type, status: "uploading", progress: 0, meta, resultData: null, error: null, consumed: true, statusMessage: null },
      ]);

      retryDataRef.current[id] = config;
      runUpload(id, config);

      return id;
    },
    [runUpload]
  );

  const retryUpload = useCallback(
    (id) => {
      const config = retryDataRef.current[id];
      if (!config) return;
      updateUpload(id, { status: "uploading", progress: 0, error: null, statusMessage: null });
      runUpload(id, config);
    },
    [runUpload, updateUpload]
  );

  const dismissUpload = useCallback((id) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
    delete retryDataRef.current[id];
  }, []);

  const markConsumed = useCallback((id) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, consumed: true } : u)));
  }, []);

  return (
    <UploadContext.Provider
      value={{ uploads, startUpload, retryUpload, dismissUpload, markConsumed }}
    >
      {children}
    </UploadContext.Provider>
  );
};

export const useUpload = () => {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error("useUpload must be used within UploadProvider");
  return ctx;
};