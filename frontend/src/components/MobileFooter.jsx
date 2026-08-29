import React from 'react'
import MobileIcons from './MobileIcons'

const MobileFooter = () => {
  return (
  <div className="mobileFooter w-full h-[50px] fixed bottom-0 flex justify-center items-center md:hidden bg-black  ">
        <MobileIcons icon="Home " imgSrc="/images/home-icon.png " />
        <MobileIcons icon="Explore" imgSrc="/images/explore-icon.png " />
        <MobileIcons icon="Reels" imgSrc="/images/reels-icon.png " />
        <MobileIcons icon="Create " imgSrc="/images/create-icon.png " />
        <MobileIcons icon="Messages " imgSrc="/images/messages-icon.png " />
        <MobileIcons icon="Profile " imgSrc="/images/home-icon.png " />
      </div>
  )
}

export default MobileFooter
