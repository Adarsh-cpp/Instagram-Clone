import React, { useState } from "react";
import { motion } from "framer-motion";
import SelectImagePage from "./SelectImagePage";
import CropImagePage from "./CropImagePage";
import TrimVideoPage from "./TrimVideoPage";
import CaptionSharePage from "./CaptionSharePage";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUpload } from "../context/UploadContext";
import { useTheme } from "../context/ThemeContext";

const BASE_URL = import.meta.env.VITE_SERVER_URL

/*
  Wrapper for each step.
  - Light/Dark: `display: contents`, so it has no box and the layout is
    exactly what it was without a wrapper.
  - Devs Mode: the step slides in. Because the same wrapper is always used
    (only its style changes), switching themes mid-flow does NOT remount the
    step, so a half-finished crop is never lost.
*/
const StepWrap = ({ children }) => {
  const { isDevs } = useTheme();

  return (
    <motion.div
      initial={isDevs ? { opacity: 0, x: 40, scale: 0.98 } : false}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className={isDevs ? "w-full h-full" : undefined}
      style={isDevs ? undefined : { display: "contents" }}
    >
      {children}
    </motion.div>
  );
};

function CreatePostPage() {
  const { isDevs } = useTheme();

  const [step, setStep] = useState(1);

  const [mediaType, setMediaType] = useState(null);
  const [originalMedia, setOriginalMedia] = useState(null);
  const { user } = useAuth();
  const { startUpload } = useUpload();

  const [editedImages, setEditedImages] = useState([]);
  const [aspectRatio, setAspectRatio] = useState("1:1");

  // Trimming happens server-side (Cloudinary transformation, applied via
  // the signed upload), so this is just the two numbers describing the
  // window — there's no separate "trimmed" File to track.
  const [trimData, setTrimData] = useState({ trimStart: 0, trimDuration: 0 });

  const navigate = useNavigate();

  const handlePost = (caption, location, taggedUsers) => {
    const token = localStorage.getItem("authToken");

    if (mediaType === "video") {
      // UploadContext sends the video straight to Cloudinary and only
      // tells our server the resulting publicId — no multipart body, no
      // server-side size limit, and it shows up in the same upload
      // pill/toast UI as image posts.
      startUpload(
        { type: mediaType, caption },
        {
          type: "directVideo",
          file: originalMedia,
          trimData,
          aspectRatio,
          caption,
          location,
          taggedUsers,
          token,
          baseUrl: BASE_URL,
        }
      );
      setTimeout(() => navigate("/home"), 400);
      return;
    }

    const buildFormData = () => {
      const formData = new FormData();
      editedImages.forEach((file, i) => {
        formData.append("images", file, file.name || `slide-${i}.jpg`);
      });
      formData.append("caption", caption);
      formData.append("ratio", aspectRatio);

      if (location) {
        formData.append("location", JSON.stringify(location));
      }
      if (taggedUsers && taggedUsers.length > 0) {
        formData.append("taggedUsers", JSON.stringify(taggedUsers.map((u) => u._id)));
      }

      return formData;
    };

    startUpload(
      { type: mediaType, caption },
      {
        url: `${BASE_URL}/post/create-post`,
        method: "put",
        buildFormData,
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    setTimeout(() => navigate("/home"), 400);
  };

  const stepLabels = ["Select", mediaType === "video" ? "Trim" : "Crop", "Share"];

  return (
    <>
      {/* Devs Mode: floating step tracker */}
      {isDevs && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 hidden md:flex items-center gap-1 devs-glass rounded-full px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest">
          {stepLabels.map((label, i) => {
            const n = i + 1;
            const active = step === n;
            const done = step > n;

            return (
              <React.Fragment key={label}>
                <span
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all duration-300 ${
                    active
                      ? "bg-[linear-gradient(120deg,#22f0ff,#8b5cf6)] text-[#04050e] font-bold shadow-[0_0_14px_rgba(34,240,255,0.5)]"
                      : done
                      ? "text-[var(--devs-cyan)]"
                      : "text-[var(--text-muted)]"
                  }`}
                >
                  <span>{String(n).padStart(2, "0")}</span>
                  <span>{label}</span>
                </span>
                {n < 3 && <span className="w-4 h-px bg-[var(--border-popup)]" />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {step === 1 && (
        <StepWrap>
          <SelectImagePage
            setOriginalMedia={setOriginalMedia}
            setMediaType={setMediaType}
            next={() => setStep(2)}
          />
        </StepWrap>
      )}

      {step === 2 && mediaType === "image" && (
        <StepWrap>
          <CropImagePage
            images={originalMedia}
            setEditedImages={setEditedImages}
            setAspectRatio={setAspectRatio}
            next={() => setStep(3)}
            back={() => setStep(1)}
          />
        </StepWrap>
      )}

      {step === 2 && mediaType === "video" && (
        <StepWrap>
          <TrimVideoPage
            video={originalMedia}
            setTrimData={setTrimData}
            setAspectRatio={setAspectRatio}
            next={() => setStep(3)}
            back={() => setStep(1)}
          />
        </StepWrap>
      )}

      {step === 3 && (
        <StepWrap>
          <CaptionSharePage
            mediaType={mediaType}
            images={editedImages}
            video={mediaType === "video" ? originalMedia : null}
            trimData={trimData}
            aspectRatio={aspectRatio}
            back={() => setStep(2)}
            handlePost={handlePost}
            user={user}
            isLoading={false}
          />
        </StepWrap>
      )}
    </>
  );
}

export default CreatePostPage;