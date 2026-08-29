// ProfileIconCard.jsx
import React from "react";
import {
  HomeIcon,
  SearchIcon,
  ExploreIcon,
  ReelsIcon,
  MessagesIcon,
  NotificationsIcon,
  CreateIcon,
  MoreIcon,
} from "./Icons";

const iconMap = {
  Home: HomeIcon,
  Search: SearchIcon,
  Explore: ExploreIcon,
  Reels: ReelsIcon,
  Messages: MessagesIcon,
  Notifications: NotificationsIcon,
  Create: CreateIcon,
  More: MoreIcon,
};

const ProfileIconCard = ({ imgSrc, iconName, isActive, badgeCount = 0 }) => {
  const IconComponent = iconMap[iconName];

  return (
    <div
      className={`iconcard w-full h-[60px] p-6 flex justify-start items-center text-white text-[18px] rounded-lg cursor-pointer transition-colors ${
        isActive ? "bg-[#25282c] font-bold" : "hover:bg-[#25282c] font-normal"
      }`}
    >
      <div className="relative shrink-0 rounded-full overflow-hidden w-[40px] h-[40px] flex items-center justify-center">
        {iconName === "Profile" ? (
          <img src={imgSrc} alt="" className="w-[40px] h-[40px]" />
        ) : (
          IconComponent && <IconComponent active={isActive} />
        )}
        {badgeCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-[3px] rounded-full bg-[#ED4956] text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {badgeCount > 99 ? "99+" : badgeCount}
          </span>
        )}
      </div>

      <span className="m-4 hidden 2xl:inline">{iconName}</span>
    </div>
  );
};

export default ProfileIconCard;