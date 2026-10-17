import React from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, BadgeCheck } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const ReactorsListOverlay = ({ reactions, onClose }) => {
  const { isDevs } = useTheme();

  return createPortal(
    <div
      onClick={onClose}
      className="fixed inset-0 z-[120] flex justify-center items-center bg-black/60 p-4 devs:bg-[rgba(2,3,10,0.75)] devs:backdrop-blur-md"
    >
      <motion.div
        {...(isDevs
          ? {
              initial: { opacity: 0, scale: 0.92, y: 16 },
              animate: { opacity: 1, scale: 1, y: 0 },
              transition: { type: "spring", stiffness: 340, damping: 28 },
            }
          : {})}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-[340px] max-h-[70vh] overflow-y-auto no-scrollbar bg-[var(--bg-panel)] border border-[var(--border-popup)] rounded-2xl shadow-lg ${
          isDevs ? "devs-glass devs-neon-border !rounded-3xl" : ""
        }`}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-popup)]">
          <span className="text-[15px] font-semibold text-[var(--text-primary)] devs:font-mono devs:uppercase devs:tracking-[0.25em] devs:text-[12px]">
            Reactions
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer text-[var(--text-primary)] devs:hover:text-[var(--devs-cyan)] devs:transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="py-1">
          {reactions.map((r, idx) => {
            const reactor = r.userId;
            const reactorId =
              typeof reactor === "object" ? reactor?._id : reactor;

            return (
              <motion.div
                key={reactorId || idx}
                {...(isDevs
                  ? {
                      initial: { opacity: 0, x: -12 },
                      animate: { opacity: 1, x: 0 },
                      transition: { delay: Math.min(idx, 8) * 0.04 },
                    }
                  : {})}
                className="flex items-center gap-3 px-4 py-2.5 devs:hover:bg-[var(--bg-row-hover)] devs:transition-colors"
              >
                <div className="w-[38px] h-[38px] rounded-full overflow-hidden shrink-0 devs:ring-2 devs:ring-[var(--devs-violet)]">
                  <img
                    src={
                      typeof reactor === "object" && reactor?.profilePic
                        ? reactor.profilePic
                        : "/images/default-profile-pic.jpg"
                    }
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>

                <span className="flex-1 min-w-0 truncate text-[14px] text-[var(--text-primary)] flex items-center gap-1 devs:font-semibold">
                  {typeof reactor === "object" ? reactor?.fullname : "Someone"}
                  {typeof reactor === "object" && reactor?.role === "admin" && (
                    <BadgeCheck
                      size={14}
                      className="text-sky-400 devs:text-[var(--devs-cyan)] devs:drop-shadow-[0_0_5px_rgba(34,240,255,0.9)] shrink-0"
                    />
                  )}
                </span>

                <span className="text-[20px] shrink-0 devs:drop-shadow-[0_0_8px_rgba(255,255,255,0.35)]">
                  {r.emoji}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default ReactorsListOverlay;