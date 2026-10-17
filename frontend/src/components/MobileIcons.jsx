// MobileIcons.jsx
import React from 'react'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'

const pillSpring = { type: 'spring', stiffness: 420, damping: 32 }

const MobileIcons = ({ Icon, isActive, label, profileImgSrc }) => {
  const { isDevs } = useTheme()
  const isProfile = profileImgSrc !== undefined

  /* ---------------- Classic (light / dark) ---------------- */
  if (!isDevs) {
    return (
      <div id={label} className="w-full h-full flex justify-center items-center">
        {isProfile ? (
          <div
            className={`w-[28px] h-[28px] sm:w-[34px] sm:h-[34px] rounded-full overflow-hidden ${
              isActive ? "ring-2 ring-[var(--text-primary)]" : ""
            }`}
          >
            <img
              src={profileImgSrc || "/images/default-profile-pic.jpg"}
              alt={label}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          Icon && <Icon active={isActive} />
        )}
      </div>
    )
  }

  /* ---------------- Devs Mode ---------------- */
  return (
    <div id={label} className="relative w-full h-full flex justify-center items-center">
      {/* Glowing pill that glides between tabs */}
      {isActive && (
        <motion.span
          layoutId="devs-mobile-tab-pill"
          transition={pillSpring}
          className="absolute inset-x-2 inset-y-1.5 rounded-xl"
          style={{
            background:
              'linear-gradient(135deg, rgba(34,240,255,0.16), rgba(139,92,246,0.22))',
            boxShadow:
              '0 0 18px rgba(34,240,255,0.25), inset 0 0 0 1px rgba(34,240,255,0.25)',
          }}
        />
      )}

      {/* Neon bar on the top edge of the dock */}
      {isActive && (
        <motion.span
          layoutId="devs-mobile-tab-bar"
          transition={pillSpring}
          className="absolute top-0 h-[2px] w-8 rounded-full"
          style={{
            background: 'linear-gradient(90deg,#22f0ff,#8b5cf6,#ff2bd6)',
            boxShadow: '0 0 10px rgba(34,240,255,0.9)',
          }}
        />
      )}

      <span className="relative z-10 flex items-center justify-center">
        {isProfile ? (
          <motion.span
            whileTap={{ scale: 0.88 }}
            className="rounded-full p-[2px] flex"
            style={{
              background: isActive
                ? 'conic-gradient(from 0deg,#22f0ff,#8b5cf6,#ff2bd6,#22f0ff)'
                : 'var(--border-soft)',
              boxShadow: isActive ? '0 0 12px rgba(34,240,255,0.55)' : 'none',
            }}
          >
            <img
              src={profileImgSrc || "/images/default-profile-pic.jpg"}
              alt={label}
              className="w-[26px] h-[26px] rounded-full object-cover bg-black"
            />
          </motion.span>
        ) : (
          Icon && <Icon active={isActive} />
        )}
      </span>
    </div>
  )
}

export default MobileIcons