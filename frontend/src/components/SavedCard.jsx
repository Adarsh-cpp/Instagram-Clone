// SavedCard.jsx
import React from 'react'
import { Heart, MessageCircle } from 'lucide-react'


const SavedCard = ({...props}) => {
  return (
      <div className="savedCard aspect-square relative overflow-hidden ">
          <img src={props.imgSrc} alt="" className="w-full h-full object-cover" />
            <div className="overlay group w-full h-full absolute top-0 left-0 flex justify-center items-center text-[12px] font-bold text-white bg-[rgba(0,0,0,0)] hover:bg-[rgba(0,0,0,0.6)] cursor-pointer  ">
          <div className="details w-[120px] h-[40px] flex justify-center items-center opacity-0 group-hover:opacity-100 transition-all ease-in-out ">
             <div className="likeCount w-[50%] h-full flex justify-center items-center gap-1">
               <Heart size={16} fill="white" /> {props.likesCount}
             </div>
             <div className="cmntCount w-[50%] h-full flex justify-center items-center gap-1">
               <MessageCircle size={16} fill="white" /> {props.commentsCount}
             </div> 
          </div>
          </div>
          </div>
  )
}


export default SavedCard