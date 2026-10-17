// FollowUserCard.jsx
import React, { useEffect, useState } from 'react'
import axios from "axios"
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BadgeCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const BASE_URL = import.meta.env.VITE_SERVER_URL

const FollowUserCard = ({ userId, profilePic, username, fullName, isFollowing, role, onToggleFollow, onCardClick }) => {

  const { user, refreshUser } = useAuth()
  const { isDevs } = useTheme()

  // you can't follow yourself — no follow button on your own card
  const isSelf = !!user?._id && String(user._id) === String(userId)

  const [isFollowed, setIsFollowed] = useState(Boolean(isFollowing))

  useEffect(() => {
    setIsFollowed(Boolean(isFollowing))
  }, [isFollowing])

  const handleFollowToggle = async (e) => {
    // Prevent the click from bubbling up to the Link and navigating away
    e.preventDefault()
    e.stopPropagation()

    try {
      const token = localStorage.getItem("authToken");

      const response = await axios.post(
        `${BASE_URL}/user/profile/${userId}/follow-toggle`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.data.success) {
        setIsFollowed(response.data.isFollowing);
        await refreshUser();
        if (onToggleFollow) onToggleFollow(username)
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleCardClick = () => {
    if (onCardClick) onCardClick()
  }

  useEffect(() => {
  console.log(role)
  }, [])
  

  const card = (
    <Link
      to={`/user/get-profile/${userId}`}
      onClick={handleCardClick}
      className="profileCard w-full h-[60px] px-4 flex items-center justify-between hover:bg-[var(--bg-row-hover)] devs:rounded-xl devs:transition-all devs:hover:shadow-[inset_2px_0_0_var(--devs-cyan)]"
    >
      <div className="detailsSide flex items-center gap-3">
        <div
          className={`profilePic w-[45px] h-[45px] flex justify-center items-center rounded-full overflow-hidden shrink-0 ${
            isDevs ? "ring-2 ring-[var(--devs-violet)] ring-offset-2 ring-offset-[#04050e]" : ""
          }`}
        >
          <img src={profilePic ? profilePic : "images/default-profile-pic.jpg"} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="flex items-center gap-1 text-[var(--text-primary)] text-[14px] font-semibold devs:font-bold">
            {username}
            {role === "admin" && (
              <BadgeCheck
                size={14}
                className="text-sky-400 devs:text-[var(--devs-cyan)] devs:drop-shadow-[0_0_5px_rgba(34,240,255,0.9)] shrink-0"
              />
            )}
          </span>
          <span className="text-[var(--text-muted)] text-[13px] devs:font-mono devs:text-[11px]">{fullName}</span>
        </div>
      </div>

      {!isSelf && (
        <div className="removeSide">
          <button
            onClick={handleFollowToggle}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer devs:rounded-full devs:font-mono devs:uppercase devs:tracking-wider devs:text-[11px] devs:active:scale-95 devs:transition-transform ${
              isFollowed
                ? "bg-[var(--bg-secondary-btn)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary-btn-hover)] devs:border devs:border-[var(--border-popup)]"
                : "bg-[var(--brand-blue)] text-[var(--text-on-brand)] hover:bg-[var(--brand-blue-hover)] devs:bg-[linear-gradient(120deg,#22f0ff,#8b5cf6)] devs:hover:bg-[linear-gradient(120deg,#22f0ff,#8b5cf6)] devs:shadow-[0_0_14px_rgba(34,240,255,0.4)]"
            }`}
          >
            {isFollowed ? "Following" : "Follow"}
          </button>
        </div>
      )}
    </Link>
  )

  if (!isDevs) return card

  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
    >
      {card}
    </motion.div>
  )
}

export default FollowUserCard