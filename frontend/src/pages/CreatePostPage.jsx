import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import SelectImagePage from "./SelectImagePage";
import CropImagePage from "./CropImagePage";
import FilterImagePage from "./FilterImagePage";
import TrimVideoPage from "./TrimVideoPage";
import CaptionSharePage from "./CaptionSharePage";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useUpload } from "../context/UploadContext";
import { useTheme } from "../context/ThemeContext";

const BASE_URL = import.meta.env.VITE_SERVER_URL

/*
  Flow
   - Image post : select -> crop -> filter -> share
   - Video/reel : select -> trim -> share
  `stage` is a name instead of a number so the two flows can differ in length.
*/
const IMAGE_STAGES = ["select", "crop", "filter", "share"];
const VIDEO_STAGES = ["select", "trim", "share"];
const STAGE_LABELS = {
  select: "Select",
  crop: "Crop",
  trim: "Trim",
  filter: "Filter",
  share: "Share",
};

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

  const [stage, setStage] = useState("select");
  // SelectImagePage calls setMediaType() and next() back-to-back, so the
  // mediaType *state* isn't updated yet inside next(). This ref remembers
  // what was just picked so next() can route to Crop or Trim correctly.
  const pickedTypeRef = useRef(null);

  const [mediaType, setMediaType] = useState(null);
  const [originalMedia, setOriginalMedia] = useState(null);
  const { user } = useAuth();
  const { startUpload } = useUpload();

  // cropped Files straight out of CropImagePage
  const [editedImages, setEditedImages] = useState([]);
  // final Files out of FilterImagePage (these are what get uploaded)
  const [filteredImages, setFilteredImages] = useState([]);
  // per-slide { filter, adjust } kept here so Back -> Next doesn't lose them
  const [filterEdits, setFilterEdits] = useState(null);
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
      filteredImages.forEach((file, i) => {
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

  const stages = mediaType === "video" ? VIDEO_STAGES : IMAGE_STAGES;
  const stageIndex = stages.indexOf(stage);

  return (
    <>
      {/* Devs Mode: floating step tracker */}
      {isDevs && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 hidden md:flex items-center gap-1 devs-glass rounded-full px-2 py-1.5 font-mono text-[10px] uppercase tracking-widest">
          {stages.map((key, i) => {
            const n = i + 1;
            const active = stageIndex === i;
            const done = stageIndex > i;

            return (
              <React.Fragment key={key}>
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
                  <span>{STAGE_LABELS[key]}</span>
                </span>
                {n < stages.length && <span className="w-4 h-px bg-[var(--border-popup)]" />}
              </React.Fragment>
            );
          })}
        </div>
      )}

      {stage === "select" && (
        <StepWrap>
          <SelectImagePage
            setOriginalMedia={setOriginalMedia}
            setMediaType={(t) => {
              pickedTypeRef.current = t;
              setMediaType(t);
            }}
            next={() => {
              // fresh media -> drop anything left over from a previous pick
              setEditedImages([]);
              setFilteredImages([]);
              setFilterEdits(null);
              setStage(pickedTypeRef.current === "video" ? "trim" : "crop");
            }}
          />
        </StepWrap>
      )}

      {stage === "crop" && mediaType === "image" && (
        <StepWrap>
          <CropImagePage
            images={originalMedia}
            setEditedImages={setEditedImages}
            setAspectRatio={setAspectRatio}
            next={() => {
              // the cropped images may have changed, so old filter edits no longer apply
              setFilterEdits(null);
              setStage("filter");
            }}
            back={() => setStage("select")}
          />
        </StepWrap>
      )}

      {stage === "filter" && mediaType === "image" && (
        <StepWrap>
          <FilterImagePage
            images={editedImages}
            initialEdits={filterEdits}
            onEditsChange={setFilterEdits}
            setFilteredImages={setFilteredImages}
            next={() => setStage("share")}
            back={() => setStage("crop")}
          />
        </StepWrap>
      )}

      {stage === "trim" && mediaType === "video" && (
        <StepWrap>
          <TrimVideoPage
            video={originalMedia}
            setTrimData={setTrimData}
            setAspectRatio={setAspectRatio}
            next={() => setStage("share")}
            back={() => setStage("select")}
          />
        </StepWrap>
      )}

      {stage === "share" && (
        <StepWrap>
          <CaptionSharePage
            mediaType={mediaType}
            images={filteredImages}
            video={mediaType === "video" ? originalMedia : null}
            trimData={trimData}
            aspectRatio={aspectRatio}
            back={() => setStage(mediaType === "video" ? "trim" : "filter")}
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
