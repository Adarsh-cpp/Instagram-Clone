import React from 'react'

const HamSettingsCard = ({...props}) => {
  return (
   <div className="iconcard w-full h-[60px] p-6 flex justify-start items-center text-white text-[12px] lg:text-[16px]  hover:bg-[#121212] rounded-lg cursor-pointer "><img src={props.imgSrc} alt="" className="w-[40px] h-[40px] " /><span className="m-4 inline md:hidden">{props.iconName}</span></div>
  )
}

export default HamSettingsCard
