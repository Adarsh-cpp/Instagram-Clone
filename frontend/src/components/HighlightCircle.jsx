import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

const DEFAULT_AVATAR = "/images/default-profile-pic.jpg";

const HighlightCircle = ({ title, coverImage, onClick, index = 0 }) => {
  const { isDevs, lite } = useTheme()

  /* ---------------- Classic (light / dark) ---------------- */
  if (!isDevs) {
    return (
      <div
        onClick={onClick}
        className="highlightItem h-full w-[100px] flex flex-col justify-center sm:justify-start items-center cursor-pointer shrink-0 "
      >
        <div className="highLightCircle w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] shrink-0 rounded-full object-fit object-center overflow-hidden bg-[var(--bg-elevated)] border-[2px] border-[var(--border-container)]">
          <img
            src={coverImage || DEFAULT_AVATAR}
            alt=""
            draggable="false"
            className="w-full h-full object-cover select-none"
          />
        </div>
        <div className="text-[var(--text-primary)] text-[12px] mt-1 max-w-[80px] truncate text-center">
          {title}
        </div>
      </div>
    )
  }

  /* ---------------- Devs Mode ----------------
     The gradient ring only spins while hovered (animation-play-state), so a
     long row of highlights stays cheap to draw. */
  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: Math.min(index, 8) * 0.05,
        type: 'spring',
        stiffness: 260,
        damping: 22,
      }}
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className="highlightItem group h-full w-[100px] flex flex-col justify-center sm:justify-start items-center cursor-pointer shrink-0"
    >
      <div
        className={`highLightCircle w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] shrink-0 rounded-full p-[2px] transition-shadow duration-300 group-hover:shadow-[0_0_22px_rgba(34,240,255,0.5)] ${
          lite
            ? ''
            : '[animation:devs-spin_6s_linear_infinite] [animation-play-state:paused] group-hover:[animation-play-state:running]'
        }`}
        style={{
          background:
            'conic-gradient(from var(--devs-angle), #22f0ff, #8b5cf6, #ff2bd6, #22f0ff)',
        }}
      >
        <div className="w-full h-full rounded-full overflow-hidden bg-[#04050e] border-2 border-[#04050e]">
          <img
            src={coverImage || DEFAULT_AVATAR}
            alt=""
            draggable="false"
            className="w-full h-full object-cover select-none transition-transform duration-500 group-hover:scale-110"
          />
        </div>
      </div>
      <div className="font-mono text-[11px] tracking-wide text-[var(--text-primary)] mt-1.5 max-w-[80px] truncate text-center">
        {title}
      </div>
    </motion.div>
  )
}

export default HighlightCircle