import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import {
  EditProfileIcon,
  SettingsNotificationsIcon,
  AccountPrivacyIcon,
  CloseFriendsIcon,
  BlockedIcon,
  RestrictedAccountsIcon,
  StoryLocationsIcon,
  TagsMentionsIcon,
  CommentsIcon,
} from './Icons'

// Devs Mode shows an animated icon for each row (classic mode only shows the label)
const ICON_BY_NAME = {
  "Edit Profile": EditProfileIcon,
  "Notifications": SettingsNotificationsIcon,
  "Account Privacy": AccountPrivacyIcon,
  "Close Friends": CloseFriendsIcon,
  "Blocked": BlockedIcon,
  "Restricted Accounts": RestrictedAccountsIcon,
  "Story and Locations": StoryLocationsIcon,
  "Tags and Mentions": TagsMentionsIcon,
  "Comments": CommentsIcon,
}

const HamSettingsCard = ({...props}) => {
  const { isDevs } = useTheme()
  const [hovered, setHovered] = useState(false)

  /* ---------------- Classic (light / dark) ---------------- */
  if (!isDevs) {
    return (
     <div className="iconcard w-full h-[60px] p-6 flex justify-start items-center text-white text-[12px] lg:text-[16px]  hover:bg-[#121212] rounded-lg cursor-pointer "><img src={props.imgSrc} alt="" className="w-[40px] h-[40px] " /><span className="m-4 inline md:hidden">{props.iconName}</span></div>
    )
  }

  /* ---------------- Devs Mode ---------------- */
  const SettingsIcon = ICON_BY_NAME[props.iconName]
  const index = props.index ?? 0

  return (
    <motion.div
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 260, damping: 24 }}
      whileHover={{ x: 6 }}
      whileTap={{ scale: 0.97 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      onClick={props.onClick}
      className="iconcard relative w-full h-[60px] px-6 flex justify-start items-center gap-4 text-[var(--text-primary)] text-[12px] lg:text-[16px] rounded-xl cursor-pointer border border-transparent hover:border-[var(--border-popup)] hover:bg-[var(--bg-row-hover)]"
    >
      {props.index !== undefined && (
        <span className="font-mono text-[10px] text-[var(--devs-cyan)] opacity-70 w-5 shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>
      )}

      <div className="w-[40px] h-[40px] shrink-0 flex items-center justify-center">
        {props.imgSrc ? (
          <img src={props.imgSrc} alt="" className="w-[40px] h-[40px]" />
        ) : (
          SettingsIcon && <SettingsIcon hovered={hovered} />
        )}
      </div>

      <span className="inline md:hidden flex-1 font-mono text-[13px] uppercase tracking-[0.12em]">
        {props.iconName}
      </span>

      <motion.span
        animate={{ x: hovered ? 4 : 0, opacity: hovered ? 1 : 0.4 }}
        className="text-[var(--devs-cyan)] md:hidden"
      >
        <ChevronRight size={18} />
      </motion.span>
    </motion.div>
  )
}

export default HamSettingsCard