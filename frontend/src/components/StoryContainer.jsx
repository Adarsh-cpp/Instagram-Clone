import React from "react";
import StoryCircle from "./StoryCircle";

import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";

// same 9 placeholder stories as before — replace with real story data later
const stories = Array.from({ length: 9 }, () => ({
  imgSrc: "/images/profile-pic.JPG",
}));

// fades content out over the last 40px on each side; fully opaque in the middle
const edgeFadeMask = {
  maskImage:
    "linear-gradient(to right, transparent 0, black 0px, black calc(100% - 0px), transparent 100%)",
  WebkitMaskImage:
    "linear-gradient(to right, transparent 0, black 0px, black calc(100% - 0px), transparent 100%)",
};

const StoryContainer = () => {
  return (
    <div className="storyContainer w-full h-[130px] px-4 flex items-center mt-4">
      <Swiper
        slidesPerView="auto"
        spaceBetween={20}
        grabCursor={true}
        style={edgeFadeMask}
        className="w-full"
      >
        {stories.map((story, index) => (
          <SwiperSlide key={index} className="!w-auto">
            <StoryCircle imgSrc={story.imgSrc} />
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default StoryContainer;