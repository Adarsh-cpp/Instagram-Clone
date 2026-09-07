// ReelCard.jsx
import React, { useState, useEffect } from 'react'
import { Heart, MessageCircle } from 'lucide-react'
import CommentsOverlay from './CommentsOverlay'
import { useAuth } from '../context/AuthContext'


const ReelCard = ({ reel, authorId, ...props }) => {


  const { user } = useAuth()


  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [likesCount, setLikesCount] = useState(props.likesCount || 0)
  const [isSaved, setIsSaved] = useState(false)


  useEffect(() => {
    setIsSaved(
      user?.savedReels?.some(
        (id) => id.toString() === reel?._id?.toString()
      ) || false
    )
  }, [user?.savedReels, reel?._id])


  const likedBool = reel?.likes?.some(
    (like) => (like?._id || like)?.toString() === user?._id?.toString()
  ) || false


  return (
     <div className="reelCard aspect-[9/16] relative  ">
          <img src={props.imgSrc} alt="" className="w-full h-full object-cover " />


          <div
            onClick={() => setIsCommentsOpen(true)}
            className="overlay group w-full h-full absolute top-0 left-0 flex justify-center items-center text-[12px] font-bold text-white bg-[rgba(0,0,0,0)] hover:bg-[rgba(0,0,0,0.6)] cursor-pointer  "
          >
          <div className="details w-[120px] h-[40px] flex justify-center items-center opacity-0 group-hover:opacity-100 transition-all ease-in-out ">
             <div className="likeCount w-[50%] h-full flex justify-center items-center gap-1">
               <Heart size={16} fill="white" /> {likesCount}
             </div>
             <div className="cmntCount w-[50%] h-full flex justify-center items-center gap-1">
               <MessageCircle size={16} fill="white" /> {props.commentsCount}
             </div> 
          </div>
          </div>


          {isCommentsOpen && reel && (
            <CommentsOverlay
              reel={reel}
              authorId={authorId}
              onClose={() => setIsCommentsOpen(false)}
              onLikesCountChange={setLikesCount}
              onSaveChange={setIsSaved}
              initialIsLiked={likedBool}
              initialIsSaved={isSaved}
            />
          )}
          </div>
  )
}


export default ReelCard