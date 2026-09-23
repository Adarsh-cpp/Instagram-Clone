// FollowUserCard.jsx
import React, { useEffect, useState } from 'react'
import axios from "axios"
import { Link } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const BASE_URL = import.meta.env.VITE_SERVER_URL

const FollowUserCard = ({ userId, profilePic, username, fullName, isFollowing, role, onToggleFollow, onCardClick }) => {

  const { user, refreshUser } = useAuth()

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
  

  return (
    <Link
      to={`/user/get-profile/${userId}`}
      onClick={handleCardClick}
      className="profileCard w-full h-[60px] px-4 flex items-center justify-between hover:bg-[var(--bg-row-hover)]"
    >
      <div className="detailsSide flex items-center gap-3">
        <div className="profilePic w-[45px] h-[45px] flex justify-center items-center rounded-full overflow-hidden shrink-0">
          <img src={profilePic ? profilePic : "images/default-profile-pic.jpg"} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="flex items-center gap-1 text-[var(--text-primary)] text-[14px] font-semibold">
            {username}
            {role === "admin" && <BadgeCheck size={14} className="text-sky-400 shrink-0" />}
          </span>
          <span className="text-[var(--text-muted)] text-[13px]">{fullName}</span>
        </div>
      </div>

      {!isSelf && (
        <div className="removeSide">
          <button
            onClick={handleFollowToggle}
            className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer ${
              isFollowed
                ? "bg-[var(--bg-secondary-btn)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary-btn-hover)]"
                : "bg-[var(--brand-blue)] text-[var(--text-on-brand)] hover:bg-[var(--brand-blue-hover)]"
            }`}
          >
            {isFollowed ? "Following" : "Follow"}
          </button>
        </div>
      )}
    </Link>
  )
}

export default FollowUserCard