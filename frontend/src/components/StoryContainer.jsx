// StoryContainer.jsx
import React, { useEffect, useRef, useState } from "react";
import StoryCircle from "./StoryCircle";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../utils/axiosInstance";
import { getVideoDuration, compressVideo } from "../utils/videoTools";

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 50;
const MAX_VIDEO_SECONDS = 15;

const edgeFadeMask = {
  maskImage:
    "linear-gradient(to right, transparent 0, black 0px, black calc(100% - 0px), transparent 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0, black 0px, black calc(100% - 0px), transparent 100%)",
};

// Swiper layout per screen size.
// - Mobile (< 768px): exactly 4 equal-width slides fit across the row, like
//   Instagram. Extra stories are reached by swiping.
// - md and up (>= 768px): original behaviour — auto-width slides, 20px gap.
// 768 matches Tailwind's `md` breakpoint (same one StoryCircle uses).
const SWIPER_BREAKPOINTS = {
  768: {
    slidesPerView: "auto",
    spaceBetween: 20,
  },
};

const isGroupSeen = (group, myId) =>
  group.stories.length > 0 &&
  group.stories.every((s) => s.viewers.some((v) => v.user === myId));

// ---- local "have I seen my own story" tracking ----
// The backend never marks the owner as a viewer of their own story (view
// tracking is explicitly skipped for isOwnAccount in StoryViewerPage), so
// there's no server-side signal to know if the logged-in user has watched
// their own story. We track the set of own-story ids they've opened in
// localStorage instead, scoped per user. If a new own story gets posted
// later, its id won't be in this set yet, so the ring correctly goes back
// to the gradient (unseen) state until it's opened again.
const ownSeenKey = (uid) => `ownStoryViewed_${uid}`;

const getViewedOwnStoryIds = (uid) => {
  if (!uid) return [];
  try {
    const raw = localStorage.getItem(ownSeenKey(uid));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const setViewedOwnStoryIds = (uid, ids) => {
  if (!uid) return;
  try {
    localStorage.setItem(ownSeenKey(uid), JSON.stringify(ids));
  } catch {
    // localStorage unavailable (private mode, etc.) — non-fatal, ring will
    // just fall back to "unseen" styling on next load.
  }
};

const StoryContainer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const swiperRef = useRef(null);

  const [feed, setFeed] = useState([]);       // others only, dynamic — only users WITH an active story
  const [ownGroup, setOwnGroup] = useState(null);
  const [viewedOwnIds, setViewedOwnIdsState] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await axiosInstance.get("/story/feed");
        const groups = res.data.feed || []; // backend already only returns authors with active stories
        const mine = groups.find((g) => g.author._id === user?._id) || null;
        const others = groups.filter((g) => g.author._id !== user?._id);
        setOwnGroup(mine);
        setFeed(others);
      } catch (err) {
        console.error("Failed to load story feed:", err);
      } finally {
        setLoading(false);
      }
    };
    if (user?._id) {
      fetchFeed();
      setViewedOwnIdsState(getViewedOwnStoryIds(user._id));
    }
  }, [user?._id]);

  const openViewer = (clickedGroup) => {
    const combined =
      ownGroup && ownGroup.stories.length > 0 ? [ownGroup, ...feed] : feed;
    navigate(`/story/view/${clickedGroup.author._id}`, {
      state: { feed: combined },
    });
  };

  const handleOwnClick = () => {
    if (ownGroup && ownGroup.stories.length > 0) {
      // Opening your own story counts as having viewed it — mark every
      // current own-story id as seen so the ring turns gray on return.
      const ids = ownGroup.stories.map((s) => s._id);
      setViewedOwnIdsState(ids);
      setViewedOwnStoryIds(user?._id, ids);
      openViewer(ownGroup);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handlePlusClick = () => fileInputRef.current?.click();

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");

    if (!isImage && !isVideo) {
      toast.error("Please select an image or video");
      return;
    }
    if (isImage && file.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_IMAGE_MB}MB`);
      return;
    }
    if (isVideo && file.size > MAX_VIDEO_MB * 1024 * 1024) {
      toast.error(`Video must be under ${MAX_VIDEO_MB}MB`);
      return;
    }

    try {
      setProcessing(true);
      if (isVideo) {
        const duration = await getVideoDuration(file);
        if (duration > MAX_VIDEO_SECONDS) {
          toast.error(`Video must be ${MAX_VIDEO_SECONDS} seconds or shorter`);
          setProcessing(false);
          return;
        }
        let finalFile = file;
        try {
          const compressedBlob = await compressVideo(file);
          finalFile = new File([compressedBlob], "story-video.webm", {
            type: "video/webm",
          });
        } catch (err) {
          console.warn("Compression failed, using original file:", err);
        }
        navigate("/story/create", { state: { file: finalFile, mediaType: "video" } });
      } else {
        navigate("/story/create", { state: { file, mediaType: "image" } });
      }
    } catch (err) {
      toast.error("Something went wrong processing your media");
    } finally {
      setProcessing(false);
    }
  };

  const updateNavState = (swiper) => {
    setHasPrev(!swiper.isBeginning);
    setHasNext(!swiper.isEnd);
  };

  // Fully dynamic: if nobody (besides possibly you) has an active story,
  // don't render an empty scroll strip — just your own circle.
  if (loading) return null;

  const showEmptyRowOnly = feed.length === 0;

  const hasOwnStory = !!(ownGroup && ownGroup.stories.length > 0);
  const isOwnSeen =
    hasOwnStory && ownGroup.stories.every((s) => viewedOwnIds.includes(s._id));

  return (
    <div className="storyContainer relative w-full h-[130px] px-2 md:px-10 flex items-center mt-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={handleFileSelected}
      />

      {/* arrows are desktop-only — on mobile you just swipe, like Instagram */}
      {hasPrev && !showEmptyRowOnly && (
        <button
          onClick={() => swiperRef.current?.slidePrev()}
          className="absolute left-0 z-10 w-8 h-8 rounded-full bg-black/60 hidden md:flex items-center justify-center text-white"
          aria-label="Previous stories"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      <Swiper
        onSwiper={(swiper) => {
          swiperRef.current = swiper;
          updateNavState(swiper);
        }}
        onSlideChange={updateNavState}
        onReachEnd={updateNavState}
        onReachBeginning={updateNavState}
        slidesPerView={4}
        spaceBetween={0}
        breakpoints={SWIPER_BREAKPOINTS}
        grabCursor={true}
        style={edgeFadeMask}
        className="w-full h-full flex items-center"
      >
        {/* own story is ALWAYS the first slide — same swiper, same alignment as everyone else */}
        {/* mobile: Swiper sizes each slide to 1/4 of the row. md+: auto width as before. */}
        <SwiperSlide className="md:!w-auto relative">
          <StoryCircle
            imgSrc={user.profilePic ? user.profilePic : "images/default-profile-pic.jpg"}
            username="Your story"
            isOwn={true}
            hasStory={hasOwnStory}
            isSeen={isOwnSeen}
            onClick={handleOwnClick}
            onPlusClick={handlePlusClick}
          />
          {processing && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </SwiperSlide>

        {feed.map((group) => (
          <SwiperSlide key={group.author._id} className="md:!w-auto">
            <StoryCircle
              imgSrc={group.author.profilePic ? group.author.profilePic : "images/default-profile-pic.jpg" }
              username={group.author.username}
              hasStory={true}
              isSeen={isGroupSeen(group, user?._id)}
              onClick={() => openViewer(group)}
            />
          </SwiperSlide>
        ))}
      </Swiper>

      {hasNext && !showEmptyRowOnly && (
        <button
          onClick={() => swiperRef.current?.slideNext()}
          className="absolute right-0 z-10 w-8 h-8 rounded-full bg-black/60 hidden md:flex items-center justify-center text-white"
          aria-label="Next stories"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
};

export default StoryContainer;
