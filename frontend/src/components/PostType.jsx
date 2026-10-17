import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "../context/ThemeContext";

const PostType = ({ type, icon: Icon, activeTab, setActiveTab }) => {
  const { isDevs } = useTheme();
  const isActive = activeTab === type;

  /* ---------------- Classic (light / dark) ---------------- */
  if (!isDevs) {
    return (
      <div className="post w-[25%] h-full flex justify-center items-end">
        <button
          onClick={() => setActiveTab(type)}
          aria-label={type}
          className={`insideDiv w-[45px] h-[45px] flex justify-center items-center cursor-pointer border-b-[2px] transition-colors ${
            isActive ? "border-[var(--text-primary)]" : "border-transparent"
          }`}
        >
          <Icon
            size={26}
            strokeWidth={isActive ? 2.25 : 1.75}
            className={`transition-colors ${
              isActive ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
            }`}
          />
        </button>
      </div>
    );
  }

  /* ---------------- Devs Mode ---------------- */
  return (
    <div className="post w-[25%] h-full flex justify-center items-end">
      <motion.button
        whileTap={{ scale: 0.88 }}
        whileHover={{ y: -2 }}
        onClick={() => setActiveTab(type)}
        aria-label={type}
        className="insideDiv relative w-[45px] h-[45px] flex justify-center items-center cursor-pointer"
      >
        <Icon
          size={26}
          strokeWidth={isActive ? 2.25 : 1.75}
          className="transition-colors"
          style={{
            color: isActive ? "var(--devs-cyan)" : "var(--text-muted)",
            filter: isActive ? "drop-shadow(0 0 8px rgba(34,240,255,0.8))" : "none",
          }}
        />

        {/* Underline that glides between tabs */}
        {isActive && (
          <motion.span
            layoutId="devs-profile-tab"
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            className="absolute bottom-0 left-1 right-1 h-[2px] rounded-full"
            style={{
              background: "linear-gradient(90deg,#22f0ff,#8b5cf6,#ff2bd6)",
              boxShadow: "0 0 10px rgba(34,240,255,0.9)",
            }}
          />
        )}
      </motion.button>
    </div>
  );
};

export default PostType;