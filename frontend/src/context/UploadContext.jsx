import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const UploadContext = createContext(null);

let idCounter = 0;
const nextId = () => `upload_${Date.now()}_${idCounter++}`;

export const UploadProvider = ({ children }) => {
  const [uploads, setUploads] = useState([]); // [{id, type, status, progress, meta, resultData, error, consumed}]
  const retryDataRef = useRef({}); // id -> { url, method, buildFormData, headers }

  const updateUpload = useCallback((id, patch) => {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }, []);

  const runUpload = useCallback(
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

  // meta: { type: "image"|"video", caption, aspectRatio, thumbnailUrl (local preview, for the pill) }
  // config: { url, method, buildFormData, headers }
  const startUpload = useCallback(
    (meta, config) => {
      const id = nextId();

      setUploads((prev) => [
        ...prev,
        { id, type: meta.type, status: "uploading", progress: 0, meta, resultData: null, error: null, consumed: true },
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
      updateUpload(id, { status: "uploading", progress: 0, error: null });
      runUpload(id, config);
    },
    [runUpload, updateUpload]
  );

  const dismissUpload = useCallback((id) => {
    setUploads((prev) => prev.filter((u) => u.id !== id));
    delete retryDataRef.current[id];
  }, []);

  // Called by feed pages once they've prepended a completed upload's result,
  // so it doesn't get prepended again on remount / re-render.
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