import React from 'react'
import HamSettingsCard from './HamSettingsCard'

const HamburgerMenu = () => {
  return (
       <div className="hamburgerMenu absolute bottom-0 z-15 w-full h-[calc(100vh-50px)] bg-[var(--bg-app)]">

          <div className="heading w-[80%] h-[15%] px-6 flex justify-start items-center text-[20px] text-[var(--text-primary)] font-bold">
           Settings
          </div>

        <HamSettingsCard iconName={"Edit Profile"} />
        <HamSettingsCard iconName={"Notifications"} />
        <HamSettingsCard iconName={"Account Privacy"} />
        <HamSettingsCard iconName={"Close Friends"} />
        <HamSettingsCard iconName={"Blocked"} />
        <HamSettingsCard iconName={"Restricted Accounts"} />
        <HamSettingsCard iconName={"Story and Locations"} />
        <HamSettingsCard iconName={"Tags and Mentions"} />
        <HamSettingsCard iconName={"Comments"} />

         </div>
  )
}

export default HamburgerMenu