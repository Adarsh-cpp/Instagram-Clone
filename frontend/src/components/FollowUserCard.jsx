// FollowUserCard.jsx
import React from 'react'

const FollowUserCard = ({ profilePic, username, fullName, isFollowing, onToggleFollow }) => {
  return (
    <div className="profileCard w-full h-[60px] px-4 flex items-center justify-between hover:bg-[#2b2d33]">
      <div className="detailsSide flex items-center gap-3">
        <div className="profilePic w-[45px] h-[45px] flex justify-center items-center rounded-full overflow-hidden shrink-0">
          <img src={profilePic} alt="" className="w-full h-full object-cover" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-white text-[14px] font-semibold">{username}</span>
          <span className="text-[#AEB0B2] text-[13px]">{fullName}</span>
        </div>
      </div>

      <div className="removeSide">
        <button
          onClick={() => onToggleFollow(username)}
          className={`px-4 py-1.5 rounded-lg text-[13px] font-semibold cursor-pointer ${
            isFollowing
              ? "bg-[#363636] text-white hover:bg-[#454545]"
              : "bg-[#0095F6] text-white hover:bg-[#1877F2]"
          }`}
        >
          {isFollowing ? "Following" : "Follow"}
        </button>
      </div>
    </div>
  )
}

export default FollowUserCard