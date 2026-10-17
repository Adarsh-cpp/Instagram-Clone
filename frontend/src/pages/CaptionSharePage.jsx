import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import EmojiPicker from "emoji-picker-react";
import { Play, ChevronLeft, ChevronRight, MapPin, UserPlus, X, ArrowLeft, Smile, BadgeCheck, Wifi } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import LocationPicker from "../components/LocationPicker";
import TagPeoplePicker from "../components/TagPeoplePicker";
import AiCaptionAssistant from "../components/AiCaptionAssistant";

// Maps the aspect value chosen in TrimVideoPage (or CropImagePage) to a
// numeric ratio so the video preview box can match it. Falls back to a
// sensible default if something unexpected comes through.
const ASPECT_RATIO_MAP = {
  "9:16": 9 / 16,
  "16:9": 16 / 9,
  "1:1": 1,
  "4:5": 4 / 5,
};

const getVideoAspectRatio = (aspectRatio) => ASPECT_RATIO_MAP[aspectRatio] || 9 / 16;

// Small look-ahead so the loop cuts back to trimStart just before the
// window's real end rather than after it — timeupdate only fires every
// ~250ms, so without this margin playback can visibly spill a frame or
// two into the untrimmed footage before jumping back, which reads as a
// stutter.
const LOOP_MARGIN = 0.08;

// Devs Mode: glowing HUD brackets on the preview
const HUD_CORNERS = [
  "top-2 left-2 border-t-2 border-l-2 rounded-tl-lg",
  "top-2 right-2 border-t-2 border-r-2 rounded-tr-lg",
  "bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg",
  "bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg",
];

const CaptionSharePage = ({
  images,
  video,
  mediaType,
  trimData,
  aspectRatio,
  back,
  handlePost,
  user,
  isLoading,
}) => {
  const { theme, isDevs } = useTheme();
  const [caption, setCaption] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [mediaUrls, setMediaUrls] = useState([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showUploadNotice, setShowUploadNotice] = useState(true);

  // location + tagging state
  const [location, setLocation] = useState(null); // { name, lat, lng } | null
  const [taggedUsers, setTaggedUsers] = useState([]); // array of { _id, username, profilePic }
  const [activePanel, setActivePanel] = useState(null); // "location" | "tag" | null

  const captionRef = useRef(null);
  const pickerRef = useRef(null);
  const videoRef = useRef(null);
  const touchStartX = useRef(null);

  const isCarousel = mediaType === "image" && mediaUrls.length > 1;

  // The video preview needs to be boxed into the same aspect ratio the
  // user picked in TrimVideoPage and rendered with object-cover, so the
  // review actually shows how the final cropped clip will look — not the
  // raw, untouched source video dimensions.
  const videoAspectRatio = getVideoAspectRatio(aspectRatio);

  // The File the AI should look at: whichever slide is currently on screen.
  // These are the already-cropped Files from CropImagePage, so the caption
  // is generated from exactly what the user will post. Videos have no
  // caption AI, so this stays null for reels.
  const aiImageFile =
    mediaType === "image" ? images?.[activeSlide] || images?.[0] || null : null;

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

  // The uploaded file is always the untouched original now (server does the
  // trimming), so the preview always needs to seek to trimStart and loop
  // within the trim window — there's no "already trimmed" file to special-case.
  const handleLoadedMetadata = () => {
    const v = videoRef.current;
    if (v && trimData?.trimStart != null) {
      v.currentTime = trimData.trimStart;
    }
  };

  const handleTimeUpdate = () => {
    if (mediaType !== "video" || !trimData?.trimDuration) return;
    const v = videoRef.current;
    if (!v) return;
    const windowEnd = trimData.trimStart + trimData.trimDuration;
    if (v.currentTime >= windowEnd - LOOP_MARGIN) {
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

  // AI result goes straight into the same controlled caption state the
  // textarea already uses, so it stays fully editable and nothing is
  // posted automatically — Share is still a separate, manual action.
  const handleAiCaption = (generated) => {
    setCaption(generated.slice(0, 2200));
    captionRef.current?.focus();
  };

  // Ignore extra taps on Share while a post is already in flight, so a
  // double-tap can't start the same upload twice.
  const onShare = () => {
    if (isLoading) return;
    handlePost(caption, location, taggedUsers);
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
        <div
          className={`cropContainer relative w-full max-w-[950px] md:w-[90%] lg:w-[80%] xl:w-[60%] h-[95vh] md:h-[70%] rounded-2xl overflow-hidden ${
            isDevs ? "devs-glass devs-neon-border !rounded-3xl" : "bg-[var(--bg-surface)]"
          }`}
        >
          {/* Header */}
          <div className="header w-full h-[40px] px-3 sm:px-4 flex justify-between items-center bg-[var(--bg-app)] devs:bg-transparent">
            <div onClick={back} className="back cursor-pointer devs:hover:drop-shadow-[0_0_8px_rgba(34,240,255,0.8)] devs:transition-all">
              <ArrowLeft
                size={24}
                className="text-[var(--text-primary)] sm:w-[26px] sm:h-[26px]"
              />
            </div>

            <div className="heading text-[var(--text-primary)] text-[15px] sm:text-[18px] font-semibold devs:font-mono devs:uppercase devs:tracking-[0.2em] devs:text-[12px] devs:sm:text-[12px]">
              {mediaType === "video" ? "Create new reel" : "Create new post"}
            </div>

            <motion.div
              {...(isDevs ? { whileTap: { scale: 0.94 }, whileHover: { y: -1 } } : {})}
              onClick={onShare}
              className="next text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] hover:underline cursor-pointer text-sm sm:text-base devs:no-underline devs:font-mono devs:uppercase devs:tracking-wider devs:text-[11px] devs:sm:text-[11px] devs:font-bold devs:px-4 devs:py-1.5 devs:rounded-full devs:bg-[linear-gradient(120deg,#22f0ff,#8b5cf6,#ff2bd6)] devs:text-[#04050e] devs:hover:text-[#04050e] devs:shadow-[0_0_18px_rgba(34,240,255,0.45)]"
            >
              Share
            </motion.div>
          </div>

          <hr className="devs:border-[var(--border-soft)]" />

          <div className="main w-full h-[calc(100%-40px)] flex flex-col md:flex-row">
            {/* Left — preview */}
            <div
              className="left relative w-full md:w-[50%] h-[40%] md:h-full flex justify-center items-center overflow-hidden bg-[var(--bg-elevated)] devs:bg-[#04050e]"
              onTouchStart={isCarousel ? handleTouchStart : undefined}
              onTouchEnd={isCarousel ? handleTouchEnd : undefined}
            >
              {/* Devs Mode: HUD brackets */}
              {isDevs &&
                HUD_CORNERS.map((c) => (
                  <span
                    key={c}
                    className={`absolute w-4 h-4 pointer-events-none z-20 ${c}`}
                    style={{
                      borderColor: "rgba(34,240,255,0.75)",
                      filter: "drop-shadow(0 0 4px rgba(34,240,255,0.8))",
                    }}
                  />
                ))}

              {mediaType === "video" ? (
                mediaUrls[0] && (
                  // Boxed to the chosen crop aspect ratio, video fills it
                  // with object-cover — this is what makes the review match
                  // how the reel will actually be cropped, instead of just
                  // showing the untouched source video's own dimensions.
                  <div
                    className="relative overflow-hidden bg-black"
                    style={{
                      aspectRatio: videoAspectRatio,
                      height: "100%",
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }}
                  >
                    <div
                      className="relative w-full h-full flex items-center justify-center cursor-pointer"
                      onClick={togglePlay}
                    >
                      <video
                        ref={videoRef}
                        src={mediaUrls[0]}
                        className="w-full h-full object-cover"
                        muted
                        loop
                        playsInline
                        preload="auto"
                        onLoadedMetadata={handleLoadedMetadata}
                        onTimeUpdate={handleTimeUpdate}
                      />
                      {!isPlaying && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center devs:backdrop-blur-md devs:border devs:border-[var(--devs-cyan)] devs:shadow-[0_0_24px_rgba(34,240,255,0.5)]">
                            <Play size={22} fill="white" className="ml-0" />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                mediaUrls[activeSlide] && (
                  <img src={mediaUrls[activeSlide]} alt="Preview" className="w-full h-full object-contain" />
                )
              )}

              {isCarousel && activeSlide > 0 && (
                <div
                  onClick={goPrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10 devs:backdrop-blur-md devs:border devs:border-[var(--border-popup)]"
                >
                  <ChevronLeft size={20} color="white" />
                </div>
              )}
              {isCarousel && activeSlide < mediaUrls.length - 1 && (
                <div
                  onClick={goNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10 devs:backdrop-blur-md devs:border devs:border-[var(--border-popup)]"
                >
                  <ChevronRight size={20} color="white" />
                </div>
              )}

              {isCarousel && (
                <>
                  <div className="absolute top-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full z-10 devs:font-mono devs:tracking-widest devs:border devs:border-[var(--border-popup)]">
                    {activeSlide + 1}/{mediaUrls.length}
                  </div>
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {mediaUrls.map((_, i) => (
                      <div
                        key={i}
                        className={`w-1.5 h-1.5 rounded-full ${
                          i === activeSlide
                            ? "bg-[var(--accent-blue)] devs:shadow-[0_0_8px_rgba(34,240,255,0.9)]"
                            : "bg-white/60"
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
                <div className="profilePicSection w-[40px] h-[40px] rounded-full overflow-hidden devs:ring-2 devs:ring-[var(--devs-violet)] devs:ring-offset-2 devs:ring-offset-[#04050e]">
                  <img src={user?.profilePic ? user.profilePic : "/images/default-profile-pic.jpg"} alt="" />
                </div>
                <div className="usernameSection h-full flex items-center gap-1 px-2 text-[var(--text-primary)] font-semibold text-sm sm:text-base devs:font-bold">
                  {user?.username}
                  {user?.role === "admin" && (
                    <BadgeCheck
                      size={14}
                      className="text-sky-400 devs:text-[var(--devs-cyan)] devs:drop-shadow-[0_0_5px_rgba(34,240,255,0.9)] shrink-0"
                    />
                  )}
                </div>
              </div>

              {/* Reel-only heads-up: uploads can be slow on weak connections */}
              {mediaType === "video" && showUploadNotice && (
                <div className="uploadNotice mx-4 mb-2 flex-shrink-0 flex items-start gap-2.5 rounded-lg border border-[rgba(250,204,21,0.35)] bg-[rgba(250,204,21,0.12)] px-3 py-2 devs:rounded-xl devs:font-mono">
                  <Wifi size={16} className="mt-0.5 shrink-0 text-amber-500" />
                  <p className="flex-1 text-xs leading-snug text-[var(--text-primary)]">
                    <span className="font-semibold">Use a fast, stable internet connection.</span>{" "}
                    Uploading a reel can take a few minutes. Keep the app open until it's posted.
                  </p>
                  <X
                    size={14}
                    className="mt-0.5 shrink-0 cursor-pointer text-[#8e8e8e] hover:text-[var(--text-primary)]"
                    onClick={() => setShowUploadNotice(false)}
                    aria-label="Dismiss"
                  />
                </div>
              )}

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
                    className="w-full h-full resize-none focus:outline-none text-[var(--text-primary)] text-[16px] sm:text-[18px] px-4 bg-transparent devs:font-mono devs:text-[14px] devs:sm:text-[14px] devs:caret-[var(--devs-cyan)] devs:placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>

              {/* --- AI caption row (images only — reels have no image to read) --- */}
              {mediaType === "image" && (
                <div className="aiCaptionRow w-full flex-shrink-0 px-4 pb-2">
                  <AiCaptionAssistant
                    imageFile={aiImageFile}
                    onCaption={handleAiCaption}
                    disabled={isLoading}
                  />
                </div>
              )}

              {/* Location + Tag People rows */}
              <div className="detailsRow w-full flex-shrink-0 border-t border-[rgba(128,128,128,0.15)] devs:border-[var(--border-soft)]">
                <div
                  onClick={() => setActivePanel("location")}
                  className="flex items-center justify-between px-4 h-[46px] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors devs:hover:bg-[var(--bg-row-hover)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin size={18} className="text-[var(--text-primary)] shrink-0 devs:text-[var(--devs-magenta)]" />
                    <span
                      className={`text-sm truncate devs:font-mono devs:text-[13px] ${
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
                  className="flex items-center justify-between px-4 h-[46px] cursor-pointer hover:bg-[var(--bg-elevated)] transition-colors border-t border-[rgba(128,128,128,0.15)] devs:hover:bg-[var(--bg-row-hover)] devs:border-[var(--border-soft)]"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserPlus size={18} className="text-[var(--text-primary)] shrink-0 devs:text-[var(--devs-cyan)]" />
                    <span
                      className={`text-sm truncate devs:font-mono devs:text-[13px] ${
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
                      <span className="text-xs text-[#8e8e8e] devs:font-mono">{taggedUsers.length}</span>
                    )}
                    <ChevronRight size={16} className="text-[#8e8e8e]" />
                  </div>
                </div>
              </div>

              <div className="emojiSection relative w-full h-[50px] flex-shrink-0 flex">
                <div className="emojiPart w-[50%] h-full flex justify-start items-center px-4">
                  <Smile
                    size={26}
                    onClick={() => setShowPicker(!showPicker)}
                    className="text-[var(--text-primary)] hover:text-[var(--text-muted)] cursor-pointer sm:w-[28px] sm:h-[28px] devs:hover:text-[var(--devs-cyan)] devs:transition-colors"
                  />

                  {showPicker && (
                    <div
                      ref={pickerRef}
                      className="absolute bottom-16 left-2 sm:left-4 z-50 max-w-[calc(100vw-20px)] overflow-hidden"
                    >
                      <EmojiPicker
                        theme={theme === "light" ? "light" : "dark"}
                        onEmojiClick={handleEmojiClick}
                      />
                    </div>
                  )}
                </div>

                <div className="letterCount w-[50%] h-full flex justify-end items-center px-4 text-[var(--text-primary)] text-sm sm:text-base devs:font-mono devs:text-[12px] devs:sm:text-[12px] devs:text-[var(--text-muted)]">
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
                <div className="loadingSection absolute inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/50 backdrop-blur-[2px] px-6 text-center">
                  <div
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full animate-spin"
                    style={{
                      background: isDevs
                        ? "conic-gradient(from 90deg, #22f0ff, #8b5cf6, #ff2bd6, #22f0ff)"
                        : "conic-gradient(from 90deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5, #feda75)",
                      WebkitMask:
                        "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
                      mask:
                        "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
                      ...(isDevs ? { filter: "drop-shadow(0 0 10px rgba(34,240,255,0.7))" } : {}),
                    }}
                  />
                  {mediaType === "video" && (
                    <p className="text-white text-sm font-medium max-w-[240px] devs:font-mono devs:text-[12px]">
                      Uploading your reel… this can take a few minutes. Please keep the app open.
                    </p>
                  )}
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