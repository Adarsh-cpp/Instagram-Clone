// PostCard.jsx
import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Layers, Heart, MessageCircle } from 'lucide-react'
import CommentsOverlay from './CommentsOverlay'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

const HUD_CORNERS = [
  'top-2 left-2 border-t-2 border-l-2 rounded-tl-lg',
  'top-2 right-2 border-t-2 border-r-2 rounded-tr-lg',
  'bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg',
  'bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg',
]

const PostCard = ({ post, authorId, ...props }) => {


  const { user } = useAuth()
  const { isDevs } = useTheme()


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

  const commentsOverlay = isCommentsOpen && post && (
    <CommentsOverlay
      post={post}
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
        className="postCard group aspect-[4/5] relative rounded-2xl overflow-hidden bg-black border border-[var(--border-soft)] hover:border-[var(--devs-cyan)] hover:shadow-[0_0_28px_rgba(34,240,255,0.25)] transition-[border-color,box-shadow] duration-300"
      >
        <img
          src={props.imgSrc}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />

        {isCarousel && (
          <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full devs-glass flex items-center justify-center">
            <Layers size={15} color="white" fill="white" fillOpacity={0.2} strokeWidth={2} />
          </div>
        )}

        {/* HUD brackets appear on hover */}
        {HUD_CORNERS.map((c) => (
          <span
            key={c}
            className={`absolute w-3.5 h-3.5 pointer-events-none z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${c}`}
            style={{
              borderColor: 'rgba(34,240,255,0.8)',
              filter: 'drop-shadow(0 0 4px rgba(34,240,255,0.8))',
            }}
          />
        ))}

        <div
          onClick={() => setIsCommentsOpen(true)}
          className="overlay w-full h-full absolute top-0 left-0 flex justify-center items-end pb-4 text-[12px] font-bold text-white bg-gradient-to-t from-black/0 via-black/0 to-black/0 group-hover:from-black/85 group-hover:via-black/30 group-hover:to-transparent transition-all duration-300 cursor-pointer"
        >
          <div className="details flex justify-center items-center gap-2 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 ease-out">
            <div className="likeCount devs-glass rounded-full px-3 h-[30px] flex justify-center items-center gap-1.5 font-mono">
              <Heart
                size={14}
                color="var(--devs-magenta)"
                fill="var(--devs-magenta)"
                style={{ filter: 'drop-shadow(0 0 6px rgba(255,43,214,0.9))' }}
              />
              {likesCount}
            </div>
            <div className="cmntCount devs-glass rounded-full px-3 h-[30px] flex justify-center items-center gap-1.5 font-mono">
              <MessageCircle
                size={14}
                color="var(--devs-cyan)"
                fill="var(--devs-cyan)"
                style={{ filter: 'drop-shadow(0 0 6px rgba(34,240,255,0.9))' }}
              />
              {props.commentsCount}
            </div>
          </div>
        </div>

        {commentsOverlay}
      </motion.div>
    )
  }

  /* ---------------- Classic (light / dark) ---------------- */
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


          {commentsOverlay}
          </div>
  )
}


export default PostCard