// StoryCircle.jsx
import React from "react";
import { Plus } from "lucide-react";

const StoryCircle = ({
  imgSrc,
  username = "adarsh_364_",
  isOwnStory = false,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className="story w-full h-[120px] flex flex-col justify-center items-center cursor-pointer"
    >
      <div
        className={`storyRing relative w-[70px] h-[70px] md:w-[100px] md:h-[100px] rounded-full flex justify-center items-center bg-center bg-cover ${
          isOwnStory
            ? "bg-[#363636]" // plain border-ish background, no gradient
            : "bg-[linear-gradient(45deg,#ffc600,#ffc800,#ff6b0d,#c62930,#eb0089,#e100a8,#d30065)]"
        }`}
      >
        <div className="blackCircle w-[65px] h-[65px] md:w-[93px] md:h-[93px] flex justify-center items-center rounded-full bg-black">
          <img
            src={imgSrc}
            alt=""
            className="w-[60px] h-[60px] md:w-[88px] md:h-[88px] rounded-full object-cover"
          />
        </div>

        {/* plus badge — only shown on the logged-in user's own "create story" circle */}
        {isOwnStory && (
          <div className="absolute bottom-0 right-0 w-[22px] h-[22px] md:w-[26px] md:h-[26px] rounded-full bg-[#4a5df9] border-2 border-black flex justify-center items-center">
            <Plus size={14} className="text-white" strokeWidth={3} />
          </div>
        )}
      </div>
      <div className="username text-[12px] truncate max-w-[80px] text-center">
        {username}
      </div>
    </div>
  );
};

export default StoryCircle;