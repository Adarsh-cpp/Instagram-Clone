// FollowUserCard.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { BadgeCheck } from 'lucide-react'

const FollowUserCard = ({ userId, profilePic, username, fullName, isFollowing, role, onToggleFollow, onCardClick }) => {

  const handleFollowClick = (e) => {
    // Prevent the click from bubbling up to the Link and navigating away
    e.preventDefault()
    e.stopPropagation()
    onToggleFollow(username)
  }

  const handleCardClick = () => {
    if (onCardClick) onCardClick()
  }

  return (
    <Link
      to={`/user/get-profile/${userId}`}
      onClick={handleCardClick}
      className="profileCard w-full h-[60px] px-4 flex items-center justify-between hover:bg-[var(--bg-row-hover)]"
    >
      <div className="detailsSide flex items-center gap-3">
        <div className="profilePic w-[45px] h-[45px] flex justify-center items-center rounded-full overflow-hidden shrink-0">
          <img src={profilePic} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="flex items-center gap-1 text-[var(--text-primary)] text-[14px] font-semibold">
            {username}
            {role === "admin" && <BadgeCheck size={14} className="text-sky-400 shrink-0" />}
          </span>
          <span className="text-[var(--text-muted)] text-[13px]">{fullName}</span>
        </div>
      </div>

      <div className="removeSide">
        <button
          onClick={handleFollowClick}
          className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer ${
            isFollowing
              ? "bg-[var(--bg-secondary-btn)] text-[var(--text-primary)] hover:bg-[var(--bg-secondary-btn-hover)]"
              : "bg-[var(--brand-blue)] text-[var(--text-on-brand)] hover:bg-[var(--brand-blue-hover)]"
          }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </div>
    </Link>
  )
}

export default FollowUserCard
