import React from "react";
import { useUpload } from "../context/UploadContext";
import { X, RotateCcw } from "lucide-react";

const UploadIndicator = () => {
  const { uploads, retryUpload, dismissUpload } = useUpload();

  const active = uploads.filter((u) => u.status !== "success" || !u.consumed);
  // once a success has been consumed (prepended to feed), drop it from the pill

  const visible = uploads.filter((u) => u.status === "uploading" || u.status === "error");

  if (visible.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-72">
      {visible.map((u) => (
        <div
          key={u.id}
          className="bg-[var(--bg-panel)] border border-[var(--border-popup)] rounded-lg px-3 py-2 shadow-lg text-[var(--text-primary)] text-sm"
        >
          <div className="flex items-center justify-between">
            <span>
              {u.status === "uploading"
                ? `Uploading your ${u.type === "video" ? "reel" : "post"}...`
                : `Failed to upload ${u.type === "video" ? "reel" : "post"}`}
            </span>

            <div className="flex items-center gap-2">
              {u.status === "error" && (
                <button onClick={() => retryUpload(u.id)} title="Retry">
                  <RotateCcw size={14} />
                </button>
              )}
              <button onClick={() => dismissUpload(u.id)} title="Dismiss">
                <X size={14} />
              </button>
            </div>
          </div>

          {u.status === "uploading" && (
            <div className="mt-2 w-full h-1 bg-[var(--border-popup)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--accent-indigo)] transition-all"
                style={{ width: `${u.progress}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default UploadIndicator;