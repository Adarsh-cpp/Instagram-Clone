import React, { useState, useRef, useEffect } from "react";
import EmojiPicker from "emoji-picker-react";
import { Play, ChevronLeft, ChevronRight, MapPin, UserPlus, X } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import LocationPicker from "../components/LocationPicker";
import TagPeoplePicker from "../components/TagPeoplePicker";

const CaptionSharePage = ({
  images,
  video,
  mediaType,
  trimData,
  isPreTrimmed,
  back,
  handlePost,
  user,
  isLoading,
}) => {
  const { theme } = useTheme();
  const [caption, setCaption] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [mediaUrls, setMediaUrls] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // location + tagging state
  const [location, setLocation] = useState(null); // { name, lat, lng } | null
  const [taggedUsers, setTaggedUsers] = useState([]); // array of { _id, username, profilePic }
  const [activePanel, setActivePanel] = useState(null); // "location" | "tag" | null

  const captionRef = useRef(null);
  const pickerRef = useRef(null);
  const videoRef = useRef(null);
  const touchStartX = useRef(null);

  const isCarousel = mediaType === "image" && mediaUrls.length > 1;

  useEffect(() => {
    if (mediaType === "video") {
      if (!video) {
        setMediaUrls([]);
        return;
      }
      const url = URL.createObjectURL(video);
      setMediaUrls([url]);
      return () => URL.revokeObjectURL(url);
    }

    if (!images || images.length === 0) {
      setMediaUrls([]);
      return;
    }
    const urls = images.map((f) => URL.createObjectURL(f));
    setMediaUrls(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [images, video, mediaType]);

  useEffect(() => {
    setActiveSlide(0);
  }, [mediaUrls.length]);

  const goPrev = () => setActiveSlide((i) => Math.max(0, i - 1));
  const goNext = () => setActiveSlide((i) => Math.min(mediaUrls.length - 1, i + 1));

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e) => {
    if (touchStartX.current == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(delta) > 40) {
      delta > 0 ? goPrev() : goNext();
    }
    touchStartX.current = null;
  };

  const handleLoadedMetadata = () => {
    if (mediaType === "video" && !isPreTrimmed && videoRef.current && trimData?.trimStart != null) {
      videoRef.current.currentTime = trimData.trimStart;
    }
  };

  const handleTimeUpdate = () => {
    if (mediaType !== "video" || isPreTrimmed || !trimData?.trimDuration) return;
    const v = videoRef.current;
    if (!v) return;
    const windowEnd = trimData.trimStart + trimData.trimDuration;
    if (v.currentTime >= windowEnd) {
      v.currentTime = trimData.trimStart;
    }
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    const textarea = captionRef.current;
    if (!textarea) return;

    textarea.focus();
    const start = textarea.selectionStart || 0;
    const end = textarea.selectionEnd || 0;

    const newCaption = caption.slice(0, start) + emojiData.emoji + caption.slice(end);
    setCaption(newCaption);

    setTimeout(() => {
      textarea.selectionStart = textarea.selectionEnd = start + emojiData.emoji.length;
    }, 0);
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-[100vw] h-[100vh] flex justify-center items-center bg-[var(--bg-app)]">
      <div className="cropContainerOverlay w-full h-full flex justify-center items-center bg-[rgba(0,0,0,0)] px-2 sm:px-4">
        <div className="cropContainer relative w-full max-w-[950px] md:w-[90%] lg:w-[80%] xl:w-[60%] h-[95vh] md:h-[70%] rounded-2xl bg-[var(--bg-surface)] overflow-hidden">
          {/* Header */}
          <div className="header w-full h-[40px] px-3 sm:px-4 flex justify-between items-center bg-[var(--bg-app)]">
            <div onClick={back} className="back cursor-pointer">
              <img
                src="/images/arrow-back-icon.png"
                className="w-[26px] h-[26px] sm:w-[30px] sm:h-[30px]"
                alt="Back"
              />
            </div>

            <div className="heading text-[var(--text-primary)] text-[15px] sm:text-[18px] font-semibold">
              {mediaType === "video" ? "Create new reel" : "Create new post"}
            </div>

            <div
              onClick={() => handlePost(caption, location, taggedUsers)}
              className="next text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] hover:underline cursor-pointer text-sm sm:text-base"
            >
              Share
            </div>
          </div>

          <hr />

          <div className="main w-full h-[calc(100%-40px)] flex flex-col md:flex-row">
            {/* Left — preview */}
            <div
              className="left relative w-full md:w-[50%] h-[40%] md:h-full flex justify-center items-center overflow-hidden bg-[var(--bg-elevated)]"
              onTouchStart={isCarousel ? handleTouchStart : undefined}
              onTouchEnd={isCarousel ? handleTouchEnd : undefined}
            >
              {mediaType === "video" ? (
                mediaUrls[0] &&
                (isPreTrimmed ? (
                  <video
                    ref={videoRef}
                    src={mediaUrls[0]}
                    className="w-full h-full object-contain"
                    controls
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <div
                    className="relative w-full h-full flex items-center justify-center cursor-pointer"
                    onClick={togglePlay}
                  >
                    <video
                      ref={videoRef}
                      src={mediaUrls[0]}
                      className="w-full h-full object-contain"
                      muted
                      loop
                      playsInline
                      onLoadedMetadata={handleLoadedMetadata}
                      onTimeUpdate={handleTimeUpdate}
                    />
                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
                          <Play size={22} fill="white" className="ml-0" />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                mediaUrls[activeSlide] && (
                  <img src={mediaUrls[activeSlide]} alt="Preview" className="w-full h-full object-contain" />
                )
              )}

              {isCarousel && activeSlide > 0 && (
                <div
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10"
                >
                  <ChevronLeft size={20} color="white" />
                </div>
              )}
              {isCarousel && activeSlide < mediaUrls.length - 1 && (
                <div
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10"
                >
                  <ChevronRight size={20} color="white" />
                </div>
              )}

              {isCarousel && (
                <>
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-10">
                    {activeSlide + 1}/{mediaUrls.length}
                  </div>
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {mediaUrls.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i === activeSlide ? "bg-[var(--accent-blue)]" : "bg-white/60"
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Right */}
            <div className="right relative w-full md:w-[50%] h-[60%] md:h-full flex flex-col overflow-hidden">
              <div className="accountDetails w-full h-[60px] flex-shrink-0 flex justify-start items-center px-4">
                <div className="profilePicSection w-[40px] h-[40px] rounded-full overflow-hidden">
                  <img src={user?.profilePic ? user.profilePic : "/images/default-profile-pic.jpg"} alt="" />
                </div>
                <div className="usernameSection h-full flex items-center px-2 text-[var(--text-primary)] font-semibold text-sm sm:text-base">
                  {user?.username}
                </div>
              </div>

              <div className="caption w-full flex-1 min-h-[60px]">
                <div className="captionSpace w-full h-full">
                  <textarea
                    ref={captionRef}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    placeholder={mediaType === "video" ? "Describe your reel" : "Describe your post"}
                    maxLength={2200}
                    name="caption"
                    id="caption"
                    className="w-full h-full resize-none focus:outline-none text-[var(--text-primary)] text-[16px] sm:text-[18px] px-4 bg-transparent"
                  />
                </div>
              </div>

              {/* Location + Tag People rows */}
              <div className="detailsRow w-full flex-shrink-0 border-t border-[rgba(128,128,128,0.15)]">
                <div
                  onClick={() => setActivePanel("location")}
                  className="flex items-center justify-between px-4 h-[46px] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin size={18} className="text-[var(--text-primary)] shrink-0" />
                    <span
                      className={`text-sm truncate ${
                        location ? "text-[var(--text-primary)]" : "text-[#8e8e8e]"
                      }`}
                    >
                      {location ? location.name : "Add location"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {location && (
                      <X
                        size={14}
                        className="text-[#8e8e8e] hover:text-[var(--text-primary)]"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(null);
                        }}
                      />
                    )}
                    <ChevronRight size={16} className="text-[#8e8e8e]" />
                  </div>
                </div>

                <div
                  onClick={() => setActivePanel("tag")}
                  className="flex items-center justify-between px-4 h-[46px] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors border-t border-[rgba(128,128,128,0.15)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserPlus size={18} className="text-[var(--text-primary)] shrink-0" />
                    <span
                      className={`text-sm truncate ${
                        taggedUsers.length > 0 ? "text-[var(--text-primary)]" : "text-[#8e8e8e]"
                      }`}
                    >
                      {taggedUsers.length > 0
                        ? taggedUsers.map((u) => u.username).join(", ")
                        : "Tag people"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {taggedUsers.length > 0 && (
                      <span className="text-xs text-[#8e8e8e]">{taggedUsers.length}</span>
                    )}
                    <ChevronRight size={16} className="text-[#8e8e8e]" />
                  </div>
                </div>
              </div>

              <div className="emojiSection relative w-full h-[50px] flex-shrink-0 flex">
                <div className="emojiPart w-[50%] h-full flex justify-start items-center px-4">
                  <img
                    onClick={() => setShowPicker(!showPicker)}
                    src="/images/emoji-picker-icon.png"
                    alt="Emoji"
                    className="w-[28px] h-[28px] sm:w-[30px] sm:h-[30px] cursor-pointer"
                  />

                  {showPicker && (
                    <div
                      ref={pickerRef}
                      className="absolute bottom-16 left-2 sm:left-4 z-50 max-w-[calc(100vw-20px)] overflow-hidden"
                    >
                      <EmojiPicker theme={theme} onEmojiClick={handleEmojiClick} />
                    </div>
                  )}
                </div>

                <div className="letterCount w-[50%] h-full flex justify-end items-center px-4 text-[var(--text-primary)] text-sm sm:text-base">
                  {caption.length}/2,200
                </div>
              </div>

              {/* Slide-over panels */}
              {activePanel === "location" && (
                <LocationPicker
                  value={location}
                  onChange={setLocation}
                  onClose={() => setActivePanel(null)}
                />
              )}
              {activePanel === "tag" && (
                <TagPeoplePicker
                  selected={taggedUsers}
                  onChange={setTaggedUsers}
                  onClose={() => setActivePanel(null)}
                />
              )}

              {isLoading && (
                <div className="loadingSection absolute z-50 w-full h-full top-0">
                  <div className="absolute inset-0 flex items-center justify-center bg-[rgb(0,0,0,0.4)]">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 animate-spin p-[3px]">
                      <div className="w-full h-full relative bg-[var(--bg-loading)] rounded-full">
                        <div className="block absolute top-[-7px] w-[20px] h-[20px] rounded-full bg-[var(--bg-loading)]"></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CaptionSharePage;