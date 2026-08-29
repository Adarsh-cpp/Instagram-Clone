import React from 'react'

const TagCard = ({...props}) => {
  return (
     <div className="tagCard aspect-[4/5] relative">
          <img src={props.imgSrc} alt="" />
            <div className="overlay group w-full h-full absolute top-0 left-0 flex justify-center items-center text-[12px] font-bold text-white bg-[rgba(0,0,0,0)] hover:bg-[rgba(0,0,0,0.6)] cursor-pointer  ">
          <div className="details w-[120px] h-[40px] flex justify-center items-center opacity-0 group-hover:opacity-100 transition-all ease-in-out ">
             <div className="likeCount w-[50%] h-full flex justify-center items-center "><img src="/images/like-icon.png" alt="" /> 90
             </div>
             <div className="cmntCount w-[50%] h-full flex justify-center items-center "><img src="/images/comment-icon.png" alt="" /> 15</div> 
          </div>
          </div>
          </div>
  )
}

export default TagCard
