// StoryCircle.jsx
import React from "react";
import { Plus } from "lucide-react";

const RING_GRADIENT =
  "bg-[linear-gradient(45deg,#ffc600,#ffc800,#ff6b0d,#c62930,#eb0089,#e100a8,#d30065)]";
const FALLBACK_AVATAR = "/images/profile-pic.JPG";

const StoryCircle = ({
  imgSrc,
  username,
  isOwn = false,
  hasStory = false,
  isSeen = false,
  onClick,
  onPlusClick,
}) => {
  // No story at all -> no ring color of any kind (not gradient, not gray).
  // Has a story and it's been seen -> gray. Has a story, unseen -> gradient.
  const ringClass = !hasStory ? "" : isSeen ? "bg-[var(--toggle-track-off)]" : RING_GRADIENT;

  return (
    <div
      onClick={onClick}
      className="story w-full h-[120px] flex flex-col justify-center items-center cursor-pointer"
    >
      <div
        className={`storyRing relative w-[85px] h-[85px] md:w-[100px] md:h-[100px] rounded-full flex justify-center items-center bg-center bg-cover ${ringClass}`}
      >
        <div className="blackCircle w-[80px] h-[80px] md:w-[93px] md:h-[93px] flex justify-center items-center rounded-full bg-[var(--bg-app)]">
          <img
            src={imgSrc || "/images/default-profile-pic.jpg"}
            onError={(e) => { e.currentTarget.src = FALLBACK_AVATAR; }}
            alt=""
            className="w-[75px] h-[75px] md:w-[88px] md:h-[88px] rounded-full object-cover"
          />
        </div>

        {isOwn && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onPlusClick?.();
            }}
            className="absolute bottom-0 right-0 z-30 w-[22px] h-[22px] md:w-[26px] md:h-[26px] rounded-full bg-[var(--accent-indigo)] border-2 border-[var(--bg-app)] flex justify-center items-center"
          >
            <Plus size={14} className="text-[var(--text-on-brand)]" strokeWidth={3} />
          </div>
        )}
      </div>
      {/* mobile: label kept within the 1/4-width slot; md+: unchanged 80px */}
      <div className="username text-[12px] truncate max-w-[70px] md:max-w-[80px] text-center text-[var(--text-primary)]">
        {username}
      </div>
    </div>
  );
};

export default StoryCircle;
