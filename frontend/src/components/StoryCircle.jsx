import React from 'react'

const StoryCircle = ({...props}) => {
  return (
   <div className="story w-full h-[120px] flex flex-col justify-center items-center ">
    
     <div className="story w-[70px] h-[70px] md:w-[100px] md:h-[100px] rounded-full flex justify-center items-center object-cover bg-[linear-gradient(45deg,#ffc600,#ffc800,#ff6b0d,#c62930,#eb0089,#e100a8,#d30065)] bg-cover bg-center  ">
      <div className="blackCircle w-[70px] h-[70px] md:w-[93px] md:h-[93px] flex justify-center items-center rounded-full bg-black ">
            <img src={props.imgSrc} alt="" className=" w-[65px] h-[65px] md:w-[88px] md:h-[88px] rounded-full " />
          </div>
        </div>
    <div className="username text-[12px] ">adarsh_364_</div>
   </div>
  )
}

export default StoryCircle