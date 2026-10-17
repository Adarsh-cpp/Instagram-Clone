// ProfileIconCard.jsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  HomeIcon,
  SearchIcon,
  ExploreIcon,
  ReelsIcon,
  MessagesIcon,
  NotificationsIcon,
  CreateIcon,
} from "./Icons";
import { useTheme } from "../context/ThemeContext";


const iconMap = {
  Home: HomeIcon,
  Search: SearchIcon,
  Explore: ExploreIcon,
  Reels: ReelsIcon,
  Messages: MessagesIcon,
  Notifications: NotificationsIcon,
  Create: CreateIcon,
};

const barSpring = { type: "spring", stiffness: 420, damping: 34 };


const ProfileIconCard = ({ imgSrc, iconName, isActive, badgeCount = 0 }) => {
  const IconComponent = iconMap[iconName];
  const { isDevs } = useTheme();
  const [hovered, setHovered] = useState(false);

  /* ---------------- Classic (light / dark) ---------------- */
  if (!isDevs) {
    return (
      <div
        className={`iconcard w-full h-[60px] p-6 flex justify-start items-center text-[var(--text-primary)] text-[18px] rounded-lg cursor-pointer transition-colors ${
          isActive ? "bg-[var(--bg-row-hover)] font-bold" : "hover:bg-[var(--bg-row-hover)] font-normal"
        }`}
      >
        <div className="relative shrink-0 rounded-full overflow-hidden w-[40px] h-[40px] flex items-center justify-center">
          {iconName === "Profile" ? (
            <img src={imgSrc?imgSrc:"/images/default-profile-pic.jpg"} alt="" className="w-[40px] h-[40px]" />
          ) : (
            IconComponent && <IconComponent active={isActive} />
          )}
          {badgeCount > 0 && (
            <span className="absolute top-[3px] right-[3px] min-w-[16px] h-[16px] px-[3px] rounded-full bg-[var(--color-danger)] text-[var(--text-on-brand)] text-[10px] font-bold flex items-center justify-center leading-none">
              {badgeCount > 99 ? "99+" : badgeCount}
            </span>
          )}
        </div>


        <span className="m-4 hidden 2xl:inline">{iconName}</span>
      </div>
    );
  }

  /* ---------------- Devs Mode ---------------- */
  return (
    <motion.div
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      whileHover={{ x: 5 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: "spring", stiffness: 380, damping: 26 }}
      className={`iconcard relative w-full h-[60px] p-6 flex justify-start items-center text-[var(--text-primary)] text-[18px] rounded-xl cursor-pointer ${
        isActive
          ? "bg-[var(--bg-row-hover)] font-semibold"
          : "hover:bg-[var(--bg-row-hover)] font-normal"
      }`}
    >
      {/* Neon bar that slides to whichever item is active */}
      {isActive && (
        <motion.span
          layoutId="devs-sidebar-active"
          transition={barSpring}
          className="absolute left-0 top-3 bottom-3 w-[3px] rounded-full"
          style={{
            background: "linear-gradient(180deg,#22f0ff,#8b5cf6,#ff2bd6)",
            boxShadow: "0 0 12px rgba(34,240,255,0.9)",
          }}
        />
      )}

      <div className="relative shrink-0 w-[40px] h-[40px] flex items-center justify-center">
        {iconName === "Profile" ? (
          <span
            className="rounded-full p-[2px] flex transition-all duration-300"
            style={{
              background:
                isActive || hovered
                  ? "conic-gradient(from 0deg,#22f0ff,#8b5cf6,#ff2bd6,#22f0ff)"
                  : "var(--border-soft)",
              boxShadow:
                isActive || hovered ? "0 0 14px rgba(34,240,255,0.5)" : "none",
            }}
          >
            <img
              src={imgSrc ? imgSrc : "/images/default-profile-pic.jpg"}
              alt=""
              className="w-[34px] h-[34px] rounded-full object-cover bg-black"
            />
          </span>
        ) : (
          IconComponent && <IconComponent active={isActive} hovered={hovered} />
        )}

        {badgeCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="devs-pulse-glow absolute -top-0.5 -right-1 min-w-[16px] h-[16px] px-[3px] rounded-full bg-[var(--devs-magenta)] text-[#04050e] text-[10px] font-bold font-mono flex items-center justify-center leading-none"
          >
            {badgeCount > 99 ? "99+" : badgeCount}
          </motion.span>
        )}
      </div>

      <span className="m-4 hidden 2xl:inline font-mono text-[12px] uppercase tracking-[0.16em]">
        {iconName}
      </span>
    </motion.div>
  );
};


export default ProfileIconCard;