import React from 'react'

const DEFAULT_AVATAR = "/images/default-profile-pic.jpg";

const HighlightCircle = ({ title, coverImage, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="highlightItem h-full w-[100px] flex flex-col justify-center sm:justify-start items-center cursor-pointer shrink-0 "
    >
      <div className="highLightCircle w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] shrink-0 rounded-full object-fit object-center overflow-hidden bg-[#25292e] border-[2px] border-[#363636]">
        <img
          src={coverImage || DEFAULT_AVATAR}
          alt=""
          draggable="false"
          className="w-full h-full object-cover select-none"
        />
      </div>
      <div className="text-white text-[12px] mt-1 max-w-[80px] truncate text-center">
        {title}
      </div>
    </div>
  )
}

export default HighlightCircle