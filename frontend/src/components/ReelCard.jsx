// ReelCard.jsx
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Heart, MessageCircle, Play } from 'lucide-react'
import CommentsOverlay from './CommentsOverlay'
import DevsTileOverlay from './devs/DevsTileOverlay'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'


const ReelCard = ({ reel, authorId, ...props }) => {


  const { user } = useAuth()
  const { isDevs } = useTheme()


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

  const commentsOverlay = isCommentsOpen && reel && (
    <CommentsOverlay
      reel={reel}
      authorId={authorId}
      authorRole={props.authorRole}
      onClose={() => setIsCommentsOpen(false)}
      onLikesCountChange={setLikesCount}
      onSaveChange={setIsSaved}
      initialIsLiked={likedBool}
      initialIsSaved={isSaved}
    />
  )

  /* ---------------- Devs Mode ---------------- */
  if (isDevs) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: '0px 0px -40px 0px' }}
        whileHover={{ y: -4 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="reelCard group aspect-[9/16] relative rounded-2xl overflow-hidden bg-black border border-[var(--border-soft)] hover:border-[var(--devs-cyan)] hover:shadow-[0_0_28px_rgba(34,240,255,0.25)] transition-[border-color,box-shadow] duration-300"
      >
        <img
          src={props.imgSrc}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />

        <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full devs-glass flex items-center justify-center">
          <Play size={13} color="white" fill="white" />
        </div>

        <DevsTileOverlay
          likesCount={likesCount}
          commentsCount={props.commentsCount}
          onClick={() => setIsCommentsOpen(true)}
        />

        {commentsOverlay}
      </motion.div>
    )
  }

  /* ---------------- Classic (light / dark) ---------------- */
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


          {commentsOverlay}
          </div>
  )
}


export default ReelCard