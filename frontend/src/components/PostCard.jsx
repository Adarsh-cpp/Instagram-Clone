// PostCard.jsx
import React, { useState } from 'react'
import { Layers, Heart, MessageCircle } from 'lucide-react'
import CommentsOverlay from './CommentsOverlay'
import { useAuth } from '../context/AuthContext'


const PostCard = ({ post, authorId, ...props }) => {


  const { user } = useAuth()


  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [likesCount, setLikesCount] = useState(props.likesCount || 0)
  const [isSaved, setIsSaved] = useState(
    () =>
      user?.savedPosts?.some(
        (id) => id.toString() === post?._id?.toString()
      ) || false
  )


  const likedBool = post?.likes?.some(
    (like) => (like?._id || like)?.toString() === user?._id?.toString()
  ) || false


  const isCarousel = (post?.media?.length || 0) > 1


  return (
      <div className="postCard aspect-[4/5] relative border">
          <img src={props.imgSrc} alt="" className="w-full h-full object-cover " />


          {isCarousel && (
            <div className="absolute top-2 right-2 z-10">
              <Layers size={18} color="white" fill="white" fillOpacity={0.2} strokeWidth={2} />
            </div>
          )}


          <div
            onClick={() => setIsCommentsOpen(true)}
            className="overlay group w-full h-full absolute top-0 left-0 flex justify-center items-center text-[12px] font-bold text-white bg-[rgba(0,0,0,0)] hover:bg-[rgba(0,0,0,0.8)] cursor-pointer  "
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


          {isCommentsOpen && post && (
            <CommentsOverlay
              post={post}
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


export default PostCard