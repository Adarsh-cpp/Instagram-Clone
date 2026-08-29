import React from 'react'

const HighlightCircle = () => {
  return (
       <div className="highLightCircle w-[70px] h-[70px] sm:w-[100px] sm:h-[100px] shrink-0 rounded-full object-fit object-center overflow-hidden bg-yellow-500">
                    <img src="/images/profile-pic.JPG" alt="" draggable="false" className='w-full h-full select-none' />
        </div>
  )
}

export default HighlightCircle
