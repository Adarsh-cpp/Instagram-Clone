// TagCard.jsx
import React, { useState } from 'react'
import { Heart, MessageCircle, Play } from 'lucide-react'
import CommentsOverlay from './CommentsOverlay'
import { useAuth } from '../context/AuthContext'

const TagCard = ({ item }) => {

  const { user } = useAuth()

  const isVideo = item.type === "Reel"
  const imgSrc = isVideo ? item.media?.thumbnailUrl : item.media?.[0]?.url
  const authorId = item.author?._id

  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [likesCount, setLikesCount] = useState(item.likes?.length || 0)
  const [isSaved, setIsSaved] = useState(
    () =>
      user?.savedPosts?.some((id) => id.toString() === item?._id?.toString()) ||
      user?.savedReels?.some((id) => id.toString() === item?._id?.toString()) ||
      false
  )

  const likedBool = item?.likes?.some(
    (like) => (like?._id || like)?.toString() === user?._id?.toString()
  ) || false

  return (
      <div className="tagCard aspect-[4/5] relative overflow-hidden">
          <img src={imgSrc} alt="" className="w-full h-full object-cover" />

          {isVideo && (
            <div className="absolute top-2 right-2 text-white drop-shadow z-10">
              <Play size={18} fill="white" />
            </div>
          )}

          <div
            onClick={() => setIsCommentsOpen(true)}
            className="overlay group w-full h-full absolute top-0 left-0 flex justify-center items-center text-[12px] font-bold text-white bg-[rgba(0,0,0,0)] hover:bg-[rgba(0,0,0,0.6)] cursor-pointer  "
          >
          <div className="details w-[120px] h-[40px] flex justify-center items-center opacity-0 group-hover:opacity-100 transition-all ease-in-out ">
             <div className="likeCount w-[50%] h-full flex justify-center items-center gap-1">
               <Heart size={16} fill="white" /> {likesCount}
             </div>
             <div className="cmntCount w-[50%] h-full flex justify-center items-center gap-1">
               <MessageCircle size={16} fill="white" /> {item.commentsCount}
             </div>
          </div>
          </div>

          {isCommentsOpen && item && (
            isVideo ? (
              <CommentsOverlay
                reel={item}
                authorId={authorId}
                onClose={() => setIsCommentsOpen(false)}
                onLikesCountChange={setLikesCount}
                onSaveChange={setIsSaved}
                initialIsLiked={likedBool}
                initialIsSaved={isSaved}
              />
            ) : (
              <CommentsOverlay
                post={item}
                authorId={authorId}
                onClose={() => setIsCommentsOpen(false)}
                onLikesCountChange={setLikesCount}
                onSaveChange={setIsSaved}
                initialIsLiked={likedBool}
                initialIsSaved={isSaved}
              />
            )
          )}
          </div>
  )
}

export default TagCard