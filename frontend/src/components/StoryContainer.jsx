// StoryContainer.jsx
import React, { useRef, useState } from "react";
import StoryCircle from "./StoryCircle";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getVideoDuration, compressVideo } from "../utils/videoTools";

const BATCHES = [
  Array.from({ length: 9 }, () => ({ imgSrc: "/images/profile-pic.JPG" })),
  Array.from({ length: 6 }, () => ({ imgSrc: "/images/profile-pic.JPG" })),
  Array.from({ length: 12 }, () => ({ imgSrc: "/images/profile-pic.JPG" })),
];

const MAX_IMAGE_MB = 10;
const MAX_VIDEO_MB = 50;
const MAX_VIDEO_SECONDS = 15;

const edgeFadeMask = {
  maskImage:
    "linear-gradient(to right, transparent 0, black 0px, black calc(100% - 0px), transparent 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0, black 0px, black calc(100% - 0px), transparent 100%)",
};

const StoryContainer = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const swiperRef = useRef(null);
  const [batchIndex, setBatchIndex] = useState(0);
  const [processing, setProcessing] = useState(false);

  const hasPrev = batchIndex > 0;
  const hasNext = batchIndex < BATCHES.length - 1;

  const goToBatch = (index) => {
    setBatchIndex(index);
    requestAnimationFrame(() => {
      swiperRef.current?.slideTo(0, 0);
      swiperRef.current?.update();
    });
  };

  const handleNext = () => hasNext && goToBatch(batchIndex + 1);
  const handlePrev = () => hasPrev && goToBatch(batchIndex - 1);

  const handleCreateStory = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
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
          // fall back to original file rather than blocking the user
        }

        navigate("/story/create", {
          state: { file: finalFile, mediaType: "video" },
        });
      } else {
        navigate("/story/create", {
          state: { file, mediaType: "image" },
        });
      }
    } catch (err) {
      toast.error("Something went wrong processing your media");
    } finally {
      setProcessing(false);
    }
  };

  const stories = BATCHES[batchIndex];

  return (
    <div className="storyContainer relative w-full h-[130px] px-10 flex items-center mt-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        hidden
        onChange={handleFileSelected}
      />

      {hasPrev && (
        <button
          onClick={handlePrev}
          className="absolute left-0 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white"
          aria-label="Previous stories"
        >
          <ChevronLeft size={18} className="cursor-pointer" />
        </button>
      )}

      <div className="shrink-0 mr-2 relative">
        <StoryCircle
          imgSrc={user?.profilePic}
          username="Your story"
          isOwnStory={true}
          onClick={handleCreateStory}
        />
        {processing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <Swiper
        onSwiper={(swiper) => (swiperRef.current = swiper)}
        slidesPerView="auto"
        spaceBetween={20}
        grabCursor={true}
        style={edgeFadeMask}
        className="w-full"
      >
        {stories.map((story, index) => (
          <SwiperSlide key={`${batchIndex}-${index}`} className="!w-auto">
            <StoryCircle imgSrc={story.imgSrc} />
          </SwiperSlide>
        ))}
      </Swiper>

      {hasNext && (
        <button
          onClick={handleNext}
          className="absolute right-0 z-10 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center text-white"
          aria-label="Next stories"
        >
          <ChevronRight size={18} className="cursor-pointer" />
        </button>
      )}
    </div>
  );
};

export default StoryContainer;