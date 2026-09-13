
import React from 'react'

const ProfileSettingsCard = ({...props}) => {
  return (
     <div className="iconcard w-full h-[60px] p-6 flex justify-start items-center text-[var(--text-primary)] text-[12px] lg:text-[16px]  hover:bg-[var(--bg-row-hover)] rounded-lg cursor-pointer "><div className="w-[40px] h-[40px] flex items-center justify-center">{props.icon}</div><span className='m-4 hidden md:inline'>{props.iconName}</span></div>
  )
}

export default ProfileSettingsCard