import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import axios from "axios";
import CommentsOverlay from "./CommentsOverlay";
import ShareOverlay from "./ShareOverlay";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

const BASE_URL = "http://localhost:4000";

const getTimeAgo = (date) => {
  const seconds = Math.floor((Date.now() - new Date(date)) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(days / 365)}y`;
};

const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
});

const HomepagePostCard = ({ ...props }) => {
  const { user } = useAuth();
  const isOwnPost = user?._id === props?.authorId;

  const isFollowing = user?.following?.some(
    (id) => id?.toString() === props?.authorId?.toString()
  );

  const followDisplay = !isOwnPost && !isFollowing;

  const profileURL = isOwnPost ? "/user/get-profile" : `/user/get-profile/${props?.authorId}`;

  const animatedLikeRef = useRef();
  const touchStartX = useRef(null);

  const [isLiked, setIsLiked] = useState(props.isLiked || false);
  const [likesCount, setLikesCount] = useState(props.likesCount || 0);
  const [isSaved, setIsSaved] = useState(props.isSaved || false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    setIsLiked(props.isLiked);
  }, [props.isLiked]);

  // Prefer the real media array from the backend (media: [{url, mediaType}]).
  // Falls back to the old single-image props so any caller that hasn't been
  // updated to pass `media` yet still renders correctly.
  const mediaList = useMemo(() => {
    if (props.media && props.media.length > 0) return props.media;
    return props.postImgSrc ? [{ url: props.postImgSrc, mediaType: "image" }] : [];
  }, [props.media, props.postImgSrc]);

  const isCarousel = mediaList.length > 1;

  const goPrev = useCallback((e) => {
    e.stopPropagation();
    setActiveSlide((i) => Math.max(0, i - 1));
  }, []);

  const goNext = useCallback(
    (e) => {
      e.stopPropagation();
      setActiveSlide((i) => Math.min(mediaList.length - 1, i + 1));
    },
    [mediaList.length]
  );

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      setActiveSlide((i) =>
        delta > 0 ? Math.max(0, i - 1) : Math.min(mediaList.length - 1, i + 1)
      );
    }
    touchStartX.current = null;
  };

  const toggleLike = useCallback(async () => {
    try {
      const response = await axios.post(
        `${BASE_URL}/post/${props.postId}/toggle-likes`,
        {},
        authConfig()
      );
      setIsLiked(response.data.liked);
      setLikesCount((prev) => (response.data.liked ? prev + 1 : prev - 1));
    } catch (error) {
      console.log(error);
    }
  }, [props?.postId]);

  const doubleClickToLike = useCallback(async () => {
    const heart = animatedLikeRef.current;
    heart.style.transition = "none";
    heart.style.width = "0px";
    heart.style.opacity = "1";
    heart.style.transform = "translate(0%, 0%)";
    void heart.offsetWidth;
    heart.style.transition = "all 0.5s ease-out";
    heart.style.width = "300px";
    setTimeout(() => {
      heart.style.opacity = "0";
      heart.style.transform = "translateY(-200%)";
    }, 1000);

    if (!isLiked) {
      await toggleLike();
    }
  }, [isLiked, toggleLike]);

  const handleSave = useCallback(async () => {
    const prevValue = isSaved;
    const next = !prevValue;
    setIsSaved(next);

    try {
      await axios.post(`${BASE_URL}/post/${props.postId}/toggle-save`, {}, authConfig());
    } catch (error) {
      setIsSaved(prevValue);
      toast.error("Something went wrong");
    }
  }, [props?.postId, isSaved]);

  const post = useMemo(
    () => ({
      _id: props.postId,
      media: mediaList,
      author: {
        username: props.author,
        profilePic: props.profileImgSrc,
      },
      caption: props.caption,
      createdAt: props.createdAt,
      likes: Array(likesCount).fill(null),
    }),
    [props.postId, mediaList, props.author, props.profileImgSrc, props.caption, props.createdAt, likesCount]
  );

  return (
    <div className="postCard w-full mt-4 ">
      {/* Header */}
      <div className="header w-full h-[50px] flex items-center px-2 bg-[#0c1014]">
        <div className="profilePic w-[45px] h-[45px] rounded-full overflow-hidden cursor-pointer">
          <img src={props.profileImgSrc ? props.profileImgSrc : "/images/default-profile-pic.jpg"} alt="" />
        </div>
        <div className="profileInfo min-w-[70%] h-full px-2 ">
          <div className="info w-full h-[50%] flex justify-start items-center">
            <NavLink to={profileURL} className="w-[40%] h-full">
              <div className="name w-full h-full cursor-pointer ">{props.author}</div>
            </NavLink>
            <div className="day w-[20%] h-full ">{getTimeAgo(props.createdAt)}</div>
            <div
              className={`follow w-[40%] h-full text-[#85a1ff] hover:text-[#a3bcff] cursor-pointer ${
                followDisplay ? "" : "hidden"
              }`}
            >
              Follow
            </div>
          </div>
          <div className="location w-full h-[50%]">Odisha, India</div>
        </div>
      </div>

      {/* Post media (carousel) */}
      <div
        className={`postImg relative w-full select-none ${
          props.aspectRatio === "1:1"
            ? "aspect-square"
            : props.aspectRatio === "16:9"
            ? "aspect-video"
            : "aspect-[4/5]"
        }`}
        onDoubleClick={doubleClickToLike}
        onTouchStart={isCarousel ? handleTouchStart : undefined}
        onTouchEnd={isCarousel ? handleTouchEnd : undefined}
      >
        <div
          ref={animatedLikeRef}
          className="likeAnimation absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] w-[0px] h-[150px] rounded-full flex justify-center items-center transition-all ease-in-out duration-[3s]"
        >
          <img src="/images/gradient-like-icon.png" alt="" className="w-full" />
        </div>

        {mediaList[activeSlide]?.mediaType === "video" ? (
          <video
            src={mediaList[activeSlide].url}
            className="w-full h-full object-cover"
            controls
            muted
            loop
            playsInline
          />
        ) : (
          <img src={mediaList[activeSlide]?.url} alt="" className="w-full h-full object-cover rounded-md" />
        )}

        {isCarousel && activeSlide > 0 && (
          <div
            onClick={goPrev}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10"
          >
            <ChevronLeft size={18} color="white" />
          </div>
        )}
        {isCarousel && activeSlide < mediaList.length - 1 && (
          <div
            onClick={goNext}
            onDoubleClick={(e) => e.stopPropagation()}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10"
          >
            <ChevronRight size={18} color="white" />
          </div>
        )}

        {isCarousel && (
          <div className="absolute top-2 right-2 bg-black/60 text-white text-[11px] px-2 py-0.5 rounded-full z-10">
            {activeSlide + 1}/{mediaList.length}
          </div>
        )}

        {isCarousel && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
            {mediaList.map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full ${i === activeSlide ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="footer w-full min-h-[140px] mt-2">
        <div className="iconSection w-full h-[35px] flex">
          <div className="left flex items-center gap-5 px-2">
            <div className="like flex items-center gap-1">
              <img
                src={isLiked ? "/images/redlike-icon.png" : "/images/postlike-icon.png"}
                alt=""
                onClick={toggleLike}
                className="w-[35px] h-[30px] cursor-pointer"
              />
              <span className="text-sm font-semibold">{likesCount}</span>
            </div>

            <div onClick={() => setIsCommentsOpen(true)} className="cmnt flex items-center gap-1">
              <img
                src="/images/postcmnt-icon.png"
                alt=""
                className="w-[30px] h-[30px] cursor-pointer"
              />
              <span className="text-sm font-semibold">{props.commentsCount}</span>
            </div>

            <div onClick={() => setIsShareOpen(true)} className="share flex items-center">
              <img
                src="/images/postshare-icon.png"
                alt=""
                className="w-[30px] h-[30px] cursor-pointer"
              />
            </div>
          </div>

          <div className="right flex-1 flex justify-end items-center pr-2">
            <img
              src={isSaved ? "/images/filledsave-icon.png" : "/images/postsave-icon.png"}
              alt=""
              onClick={handleSave}
              className="w-[30px] h-[30px] cursor-pointer"
            />
          </div>
        </div>

        <div className="captionSection w-full px-2">
          <span className="font-semibold">{props.author}&nbsp;</span>
          {!showFullCaption ? (
            <>
              <span>{props.caption?.slice(0, 50)}</span>
              {props.caption?.length > 50 && (
                <span
                  onClick={() => setShowFullCaption(true)}
                  className="text-[#a8a8a8] pl-2 cursor-pointer"
                >
                  more
                </span>
              )}
            </>
          ) : (
            <>
              <div className="mt-1 break-words">{props.caption}</div>
              <span onClick={() => setShowFullCaption(false)} className="text-[#a8a8a8] cursor-pointer">
                less
              </span>
            </>
          )}
        </div>

        <div className="cmntSection w-full h-[34%]">
          <div
            onClick={() => setIsCommentsOpen(true)}
            className="cmntsCount w-full h-[50%] px-2 text-[#a8a8a8] cursor-pointer"
          >
            View all {props.commentsCount} comments
          </div>
          <div className="allCmnts w-full h-[50%] px-2 text-[#a8a8a8]">Add a comment...</div>
        </div>
      </div>

      {isCommentsOpen && (
        <CommentsOverlay
          post={post}
          authorId={props.authorId}
          onClose={() => setIsCommentsOpen(false)}
          onLikesCountChange={(count) => setLikesCount(count)}
          onSaveChange={(saved) => setIsSaved(saved)}
          initialIsLiked={isLiked}
          initialIsSaved={isSaved}
        />
      )}

      {isShareOpen && (
        <ShareOverlay post={post} onClose={() => setIsShareOpen(false)} />
      )}
    </div>
  );
};

export default HomepagePostCard;