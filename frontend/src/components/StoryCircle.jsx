// StoryCircle.jsx
import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const RING_GRADIENT =
  "bg-[linear-gradient(45deg,#ffc600,#ffc800,#ff6b0d,#c62930,#eb0089,#e100a8,#d30065)]";
const FALLBACK_AVATAR = "/images/profile-pic.JPG";

const StoryCircle = ({
  imgSrc,
  username,
  isOwn = false,
  hasStory = false,
  isSeen = false,
  onClick,
  onPlusClick,
  index = 0, // only used in Devs Mode, for the staggered entrance
}) => {
  const { isDevs, lite } = useTheme();

  // No story at all -> no ring color of any kind (not gradient, not gray).
  // Has a story and it's been seen -> gray. Has a story, unseen -> gradient.
  const ringClass = !hasStory ? "" : isSeen ? "bg-[var(--toggle-track-off)]" : RING_GRADIENT;

  /* ---------------- Classic (light / dark) ---------------- */
  if (!isDevs) {
    return (
      <div
        onClick={onClick}
        className="story w-full h-[120px] flex flex-col justify-center items-center cursor-pointer"
      >
        <div
          className={`storyRing relative w-[90px] h-[90px] md:w-[100px] md:h-[100px] rounded-full flex justify-center items-center bg-center bg-cover ${ringClass}`}
        >
          <div className="blackCircle w-[85px] h-[85px] md:w-[93px] md:h-[93px] flex justify-center items-center rounded-full bg-[var(--bg-app)]">
            <img
              src={imgSrc || "/images/default-profile-pic.jpg"}
              onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
              alt=""
              className="w-[80px] h-[80px] md:w-[88px] md:h-[88px] rounded-full object-cover"
            />
          </div>

          {isOwn && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onPlusClick?.();
              }}
              className="absolute bottom-0 right-0 z-30 w-[22px] h-[22px] md:w-[26px] md:h-[26px] rounded-full bg-[var(--accent-indigo)] border-2 border-[var(--bg-app)] flex justify-center items-center"
            >
              <Plus size={14} className="text-[var(--text-on-brand)]" strokeWidth={3} />
            </div>
          )}
        </div>
        {/* mobile: label kept within the 1/4-width slot; md+: unchanged 80px */}
        <div className="username text-[12px] truncate max-w-[70px] md:max-w-[80px] text-center text-[var(--text-primary)]">
          {username}
        </div>
      </div>
    );
  }

  /* ---------------- Devs Mode ---------------- */
  const unseen = hasStory && !isSeen;

  const ringStyle = unseen
    ? {
        background:
          "conic-gradient(from var(--devs-angle), #22f0ff, #8b5cf6, #ff2bd6, #b6ff3b, #22f0ff)",
        animation: lite ? "none" : "devs-spin 4s linear infinite",
        boxShadow: "0 0 22px rgba(139,92,246,0.55)",
      }
    : hasStory
    ? { background: "var(--border-container)" }
    : { border: "1px dashed rgba(139,92,246,0.35)" };

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: Math.min(index, 8) * 0.05,
        type: "spring",
        stiffness: 260,
        damping: 22,
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="story w-full h-[120px] flex flex-col justify-center items-center cursor-pointer"
    >
      <div
        className="storyRing relative w-[90px] h-[90px] md:w-[100px] md:h-[100px] rounded-full flex justify-center items-center"
        style={ringStyle}
      >
        <div className="blackCircle w-[85px] h-[85px] md:w-[93px] md:h-[93px] flex justify-center items-center rounded-full bg-[#04050e]">
          <img
            src={imgSrc || "/images/default-profile-pic.jpg"}
            onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
            alt=""
            className="w-[80px] h-[80px] md:w-[88px] md:h-[88px] rounded-full object-cover"
          />
        </div>

        {isOwn && (
          <motion.div
            whileHover={{ rotate: 90, scale: 1.15 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            onClick={(e) => {
              e.stopPropagation();
              onPlusClick?.();
            }}
            className="absolute bottom-0 right-0 z-30 w-[22px] h-[22px] md:w-[26px] md:h-[26px] rounded-full bg-[linear-gradient(135deg,#22f0ff,#8b5cf6)] border-2 border-[#04050e] shadow-[0_0_12px_rgba(34,240,255,0.7)] flex justify-center items-center"
          >
            <Plus size={14} className="text-[#04050e]" strokeWidth={3} />
          </motion.div>
        )}
      </div>

      <div className="username mt-0.5 font-mono text-[11px] tracking-wide truncate max-w-[70px] md:max-w-[80px] text-center text-[var(--text-primary)]">
        {username}
      </div>
    </motion.div>
  );
};

export default StoryCircle;