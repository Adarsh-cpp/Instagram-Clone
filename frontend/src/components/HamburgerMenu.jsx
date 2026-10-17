import React from 'react'
import HamSettingsCard from './HamSettingsCard'
import { useTheme } from '../context/ThemeContext'

const SETTINGS = [
  "Edit Profile",
  "Notifications",
  "Account Privacy",
  "Close Friends",
  "Blocked",
  "Restricted Accounts",
  "Story and Locations",
  "Tags and Mentions",
  "Comments",
]

const HamburgerMenu = () => {
  const { isDevs } = useTheme()

  return (
       <div className="hamburgerMenu absolute bottom-0 z-15 w-full h-[calc(100vh-50px)] bg-[var(--bg-app)] devs:backdrop-blur-xl">

          <div className="heading w-[80%] h-[15%] px-6 flex justify-start items-center text-[20px] text-[var(--text-primary)] font-bold">
           {isDevs ? (
             <div className="flex flex-col leading-none">
               <span
                 className="devs-text-gradient text-[26px] font-extrabold tracking-tight"
                 style={{ fontFamily: "var(--devs-font-display)" }}
               >
                 Settings
               </span>
               <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-[var(--text-muted)] mt-2">
                 {"// preferences.sys"}
               </span>
             </div>
           ) : (
             "Settings"
           )}
          </div>

        {SETTINGS.map((name, i) => (
          <HamSettingsCard key={name} iconName={name} index={i} />
        ))}

         </div>
  )
}

export default HamburgerMenu