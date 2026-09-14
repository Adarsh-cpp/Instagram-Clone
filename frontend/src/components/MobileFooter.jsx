// MobileFooter.jsx
import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import MobileIcons from './MobileIcons'
import {
  HomeIcon,
  ExploreIcon,
  ReelsIcon,
  CreateIcon,
  MessagesIcon,
} from './Icons'

const MobileFooter = () => {
  const { user } = useAuth()

  return (
    <div className="mobileFooter w-full h-[50px] fixed bottom-0 flex justify-center items-center md:hidden bg-[var(--bg-app)] border-t border-[var(--border-soft)] z-30">
      <NavLink to="/home" className="w-1/6 h-full">
        {({ isActive }) => <MobileIcons Icon={HomeIcon} isActive={isActive} label="Home" />}
      </NavLink>

      <NavLink to="/explore" className="w-1/6 h-full">
        {({ isActive }) => <MobileIcons Icon={ExploreIcon} isActive={isActive} label="Explore" />}
      </NavLink>

      <NavLink to="/reels" className="w-1/6 h-full">
        {({ isActive }) => <MobileIcons Icon={ReelsIcon} isActive={isActive} label="Reels" />}
      </NavLink>

      <NavLink to="/create/post" className="w-1/6 h-full">
        {({ isActive }) => <MobileIcons Icon={CreateIcon} isActive={isActive} label="Create" />}
      </NavLink>

      <NavLink to="/user/messages" className="w-1/6 h-full">
        {({ isActive }) => <MobileIcons Icon={MessagesIcon} isActive={isActive} label="Messages" />}
      </NavLink>

      <NavLink to="/user/get-profile" className="w-1/6 h-full">
        {({ isActive }) => (
          <MobileIcons
            isActive={isActive}
            label="Profile"
            profileImgSrc={user?.profilePic}
          />
        )}
      </NavLink>
    </div>
  )
}

export default MobileFooter