import React, { useState, useMemo } from 'react'
import { X, Download, ChevronLeft, ChevronRight, Video, Film, Clapperboard } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { getTimeAgo } from '../utils/timeAgo';
import CommentsOverlay from './CommentsOverlay';

const TILT_ANGLES = [-8, 5, -4, 7];
const CAPTION_TRIM_LENGTH = 60;

const trimCaption = (text) => {
  if (!text) return "";
  return text.length > CAPTION_TRIM_LENGTH
    ? `${text.slice(0, CAPTION_TRIM_LENGTH).trim()}...`
    : text;
};

const MessageBox = ({ message, showSeen }) => {
  const { user } = useAuth();
  const [isImageOpen, setIsImageOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);

  const senderId =
    typeof message?.senderId === "object"
      ? message?.senderId?._id
      : message?.senderId;

  const isSenderMessage = senderId === user?._id;

  const imageList = message?.images?.length
    ? message.images
    : message?.image
    ? [message.image]
    : [];

  const sharedPost = message?.sharedPost;
  const sharedReel = message?.sharedReel;
  const sharedItem = sharedPost || sharedReel; // only one is ever set on a given message

  // thumbnail to show in the compact chat card
  const sharedThumbUrl = sharedPost
    ? sharedPost.media?.[0]?.url
    : sharedReel?.media?.thumbnailUrl || sharedReel?.media?.url;
  const sharedThumbIsVideo = sharedPost
    ? sharedPost.media?.[0]?.mediaType === "video"
    : !sharedReel?.media?.thumbnailUrl; // no thumbnail generated — render the raw video

  // Reshape sharedPost/sharedReel into the exact `post`/`reel` shape
  // CommentsOverlay expects. Posts use a `media` array; reels use a single
  // `media` object with width/height (needed for aspect-ratio rendering).
  const sharedPostAsItem = useMemo(() => {
    if (!sharedPost) return null;
    return {
      _id: sharedPost._id,
      media: sharedPost.media || [],
      author: {
        _id: sharedPost.author?._id,
        username: sharedPost.author?.username,
        profilePic: sharedPost.author?.profilePic,
      },
      caption: sharedPost.caption,
      createdAt: sharedPost.createdAt,
      likes: sharedPost.likes || [],
    };
  }, [sharedPost]);

  const sharedReelAsItem = useMemo(() => {
    if (!sharedReel) return null;
    return {
      _id: sharedReel._id,
      media: {
        url: sharedReel.media?.url,
        thumbnailUrl: sharedReel.media?.thumbnailUrl,
        width: sharedReel.media?.width,
        height: sharedReel.media?.height,
      },
      author: {
        _id: sharedReel.author?._id,
        username: sharedReel.author?.username,
        profilePic: sharedReel.author?.profilePic,
      },
      caption: sharedReel.caption,
      createdAt: sharedReel.createdAt,
      likes: sharedReel.likes || [],
    };
  }, [sharedReel]);

  const initialIsLiked = useMemo(() => {
    if (!sharedItem?.likes || !user?._id) return false;
    return sharedItem.likes.some((id) => id.toString() === user._id.toString());
  }, [sharedItem, user?._id]);

  const [likesCount, setLikesCount] = useState(sharedItem?.likes?.length || 0);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isSaved, setIsSaved] = useState(false); // save-status for a shared item isn't sent with the message payload

  const openOverlay = (index) => {
    setActiveIndex(index);
    setIsImageOpen(true);
  };

  const closeOverlay = () => setIsImageOpen(false);

  const showPrev = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + imageList.length) % imageList.length);
  };

  const showNext = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % imageList.length);
  };

  const handleDownload = async (e) => {
    e.stopPropagation();
    const currentUrl = imageList[activeIndex];
    if (isDownloading || !currentUrl) return;

    setIsDownloading(true);
    try {
      const response = await fetch(currentUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `image-${message?._id || Date.now()}-${activeIndex}.jpg`;
      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(currentUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const hasMedia = imageList.length > 0 || !!sharedItem;

  return (
    <div className={`w-full flex flex-col ${isSenderMessage ? "items-end" : "items-start"} px-4`}>
      <div
        className={`messageBox max-w-[70%] w-fit min-h-[40px] rounded-3xl my-1 text-white ${
          hasMedia ? "px-0 py-2 bg-transparent" : "px-4 py-2"
        } ${isSenderMessage ? "bg-[#4a5df9]" : "bg-gray-500"}`}
      >
        {imageList.length === 1 && (
          <img
            src={imageList[0]}
            alt="attachment"
            onClick={() => openOverlay(0)}
            className="max-w-[280px] max-h-[280px] rounded-2xl object-cover cursor-pointer"
          />
        )}

        {imageList.length > 1 && (
          <div className="flex items-center bg-transparent">
            {imageList.map((img, idx) => (
              <div
                key={idx}
                onClick={() => openOverlay(idx)}
                style={{
                  transform: `rotate(${TILT_ANGLES[idx % TILT_ANGLES.length]}deg)`,
                  marginLeft: idx === 0 ? 0 : "-22px",
                  zIndex: idx,
                }}
                className="relative w-[120px] h-[200px] mx-2 shrink-0 rounded-lg overflow-hidden border-2 border-white/20 shadow-md cursor-pointer hover:z-20 hover:scale-110 transition-transform"
              >
                <img src={img} alt="attachment" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        {sharedItem && (
          <div
            onClick={() => setIsCommentsOpen(true)}
            className={`sharedPostCard rounded-xl overflow-hidden bg-[#1a1e23] border border-white/10 cursor-pointer ${
              sharedReel ? "w-[160px]" : "w-[220px]"
            }`}
          >
            {sharedReel ? (
              // Reel: portrait card, transparent header overlay, no caption
              <div className="relative w-full h-[280px]">
                {sharedThumbIsVideo ? (
                  <video
                    src={sharedThumbUrl}
                    className="w-full h-full object-cover"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={sharedThumbUrl}
                    alt="shared content"
                    className="w-full h-full object-cover"
                  />
                )}

                <div className="absolute top-0 left-0 right-0 flex items-center gap-2 px-2.5 py-2 bg-gradient-to-b from-black/60 to-transparent">
                  <Link
                    to={`/user/get-profile/${sharedItem.author?._id}`}
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <img
                      src={sharedItem.author?.profilePic}
                      alt=""
                      className="w-[22px] h-[22px] rounded-full object-cover"
                    />
                    <span className="text-white text-[12px] font-medium">
                      {sharedItem.author?.username}
                    </span>
                  </Link>
                 
                </div>
                <div className="videoIcon absolute bottom-2 left-2">
                  <Clapperboard size={24} className="text-white ml-auto shrink-0" />
                  </div>
              </div>
            ) : (
              // Post: square card, solid header, caption shown
              <>
                <Link
                  to={`/user/get-profile/${sharedItem.author?._id}`}
                  className="flex items-center gap-2 px-2.5 py-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <img
                    src={sharedItem.author?.profilePic}
                    alt=""
                    className="w-[22px] h-[22px] rounded-full object-cover"
                  />
                  <span className="text-white text-[12px] font-medium">
                    {sharedItem.author?.username}
                  </span>
                </Link>

                {sharedThumbIsVideo ? (
                  <video
                    src={sharedThumbUrl}
                    className="w-full h-[220px] object-cover"
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={sharedThumbUrl}
                    alt="shared content"
                    className="w-full h-[220px] object-cover"
                  />
                )}

                {sharedItem.caption && (
                  <div className="px-2.5 py-2 text-[#d0d0d0] text-[12px] leading-snug">
                    {trimCaption(sharedItem.caption)}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {message?.text && (
          <span className={hasMedia ? "block px-3 pb-2" : ""}>{message.text}</span>
        )}
      </div>

      {showSeen && (
        <div className="text-[#a2a3a3] text-[11px] mr-1 mb-1">
          Seen {getTimeAgo(message?.updatedAt)}
        </div>
      )}

      {isImageOpen && imageList.length > 0 && (
        <div
          onClick={closeOverlay}
          className="fixed inset-0 z-[100] flex justify-center items-center bg-black/90 p-4 sm:p-8"
        >
          <button
            onClick={closeOverlay}
            className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white hover:opacity-70 transition cursor-pointer z-[101]"
          >
            <X size={32} />
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="absolute top-4 right-16 sm:top-6 sm:right-20 text-white hover:opacity-70 transition cursor-pointer z-[101] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isDownloading ? (
              <div className="w-[28px] h-[28px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Download size={28} />
            )}
          </button>

          {imageList.length > 1 && (
            <>
              <button
                onClick={showPrev}
                className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 text-white hover:opacity-70 transition cursor-pointer z-[101]"
              >
                <ChevronLeft size={36} />
              </button>

              <button
                onClick={showNext}
                className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 text-white hover:opacity-70 transition cursor-pointer z-[101]"
              >
                <ChevronRight size={36} />
              </button>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-white text-sm bg-black/50 px-3 py-1 rounded-full z-[101]">
                {activeIndex + 1} / {imageList.length}
              </div>
            </>
          )}

          <img
            src={imageList[activeIndex]}
            alt="attachment full view"
            onClick={(e) => e.stopPropagation()}
            className="max-w-full max-h-full w-auto h-auto object-contain rounded-md"
          />
        </div>
      )}

      {isCommentsOpen && sharedPostAsItem && (
        <CommentsOverlay
          post={sharedPostAsItem}
          authorId={sharedPost.author?._id}
          onClose={() => setIsCommentsOpen(false)}
          onLikesCountChange={(count) => setLikesCount(count)}
          onSaveChange={(saved) => setIsSaved(saved)}
          initialIsLiked={isLiked}
          initialIsSaved={isSaved}
        />
      )}

      {isCommentsOpen && sharedReelAsItem && (
        <CommentsOverlay
          reel={sharedReelAsItem}
          authorId={sharedReel.author?._id}
          onClose={() => setIsCommentsOpen(false)}
          onLikesCountChange={(count) => setLikesCount(count)}
          onSaveChange={(saved) => setIsSaved(saved)}
          initialIsLiked={isLiked}
          initialIsSaved={isSaved}
        />
      )}
    </div>
  );
};

export default MessageBox