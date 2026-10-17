import { useState } from "react";
import { motion } from "framer-motion";
import { Layers, Heart, MessageCircle } from "lucide-react";
import CommentsOverlay from "./CommentsOverlay";
import DevsTileOverlay from "./devs/DevsTileOverlay";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";


const ExplorePostCard = ({ post }) => {


    const { user } = useAuth();
  const { isDevs } = useTheme();


  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likes.length || 0);


 const [isSaved, setIsSaved] = useState(
    () =>
      user?.savedPosts?.some(
        (id) => id.toString() === post._id.toString()
      ) || false
  );


  const likedBool = post?.likes?.some(
    (like) => (like?._id || like)?.toString() === user?._id?.toString()
  ) || false;


  const isCarousel = (post.media?.length || 0) > 1;

  const commentsOverlay = isCommentsOpen && (
    <CommentsOverlay
      post={post}
      authorId={post?.author._id}
      authorRole={post?.author?.role}
      onClose={() => setIsCommentsOpen(false)}
      onLikesCountChange={setLikesCount}
      onSaveChange={setIsSaved}
      initialIsLiked={likedBool}
      initialIsSaved={isSaved}
    />
  );

  /* ---------------- Devs Mode ---------------- */
  if (isDevs) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, margin: "0px 0px -40px 0px" }}
        whileHover={{ y: -3 }}
        transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
        className="group w-full h-full relative rounded-2xl overflow-hidden bg-black border border-[var(--border-soft)] hover:border-[var(--devs-cyan)] hover:shadow-[0_0_28px_rgba(34,240,255,0.25)] transition-[border-color,box-shadow] duration-300"
      >
        <img
          src={post.media[0]?.url}
          alt=""
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
        />

        {isCarousel && (
          <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full devs-glass flex items-center justify-center">
            <Layers size={15} color="white" fill="white" fillOpacity={0.2} strokeWidth={2} />
          </div>
        )}

        <DevsTileOverlay
          likesCount={likesCount}
          commentsCount={post.commentsCount}
          onClick={() => setIsCommentsOpen(true)}
        />

        {commentsOverlay}
      </motion.div>
    );
  }

  /* ---------------- Classic (light / dark) ---------------- */
  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden">
      <img src={post.media[0]?.url} alt="" className="w-full h-full object-cover" />


      {isCarousel && (
        <div className="absolute top-2 right-2 z-10">
          <Layers size={18} color="white" fill="white" fillOpacity={0.2} strokeWidth={2} />
        </div>
      )}


      <div
        onClick={() => setIsCommentsOpen(true)}
        className="overlay group w-full h-full absolute top-0 left-0 flex justify-center items-center text-[12px] font-bold text-white bg-[rgba(0,0,0,0)] hover:bg-[rgba(0,0,0,0.8)] cursor-pointer"
      >
        <div className="details w-[120px] h-[40px] flex justify-center items-center opacity-0 group-hover:opacity-100 transition-all ease-in-out">
          <div className="likeCount w-[50%] h-full flex justify-center items-center gap-1">
            <Heart size={16} fill="white" /> {likesCount}
          </div>
          <div className="cmntCount w-[50%] h-full flex justify-center items-center gap-1">
            <MessageCircle size={16} fill="white" /> {post.commentsCount}
          </div>
        </div>
      </div>


      {commentsOverlay}
    </div>
  );
};


export default ExplorePostCard;