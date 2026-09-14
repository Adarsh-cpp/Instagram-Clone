// MobileIcons.jsx
import React from 'react'

const MobileIcons = ({ Icon, isActive, label, profileImgSrc }) => {
  const isProfile = profileImgSrc !== undefined

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

export default MobileIcons