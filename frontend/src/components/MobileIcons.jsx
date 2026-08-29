import React from 'react'

const MobileIcons = ({...props}) => {
  return (
    <div id={props.icon} className="w-1/6 h-full flex justify-center items-center ">
        <img src={props.imgSrc} alt={props.icon} className=' w-[30px] h-[30px] sm:w-[48px] sm:h-[48px] ' />
        </div>
  )
}

export default MobileIcons
