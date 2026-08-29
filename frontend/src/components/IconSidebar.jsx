// IconSidebar.jsx
import React from "react";
import ProfileIconCard from "./ProfileIconCard";
import { NavLink } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";

const IconSidebar = () => {

  const{ user } = useAuth()

  const { unreadCount } = useNotifications();

  return (
    <div className="iconSection hidden md:block md:w-[12%] 2xl:w-[20%] h-full border border-r-[#2b3036] overflow-hidden">
      <div className="logoSection w-full h-[130px] p-6 flex justify-start items-center">
        <img src="/images/instagram-icon.png" alt="" className="w-[30px] h-[40px] 2xl:hidden" />
        <img src="/images/instagram-logo.png" alt="Instagram" className="h-[40px] hidden 2xl:inline" />
      </div>

      <div className="iconLists w-full h-[calc(100vh-130px)]">
        <NavLink to="/home">
          {({ isActive }) => (
            <ProfileIconCard iconName="Home" isActive={isActive} />
          )}
        </NavLink>

        <NavLink to="/user/search">
          {({ isActive }) => (
            <ProfileIconCard iconName="Search" isActive={isActive} />
          )}
        </NavLink>

        <NavLink to="/explore">
          {({ isActive }) => (
            <ProfileIconCard iconName="Explore" isActive={isActive} />
          )}
        </NavLink>

        <NavLink to="/reels">
          {({ isActive }) => (
            <ProfileIconCard iconName="Reels" isActive={isActive} />
          )}
        </NavLink>

        <NavLink to="/user/messages">
          {({ isActive }) => (
            <ProfileIconCard iconName="Messages" isActive={isActive} />
          )}
        </NavLink>

        <NavLink to="/user/notifications">
          {({ isActive }) => (
            <ProfileIconCard
              iconName="Notifications"
              isActive={isActive}
              badgeCount={unreadCount}
            />
          )}
        </NavLink>

        <NavLink to="/create/post">
          {({ isActive }) => (
            <ProfileIconCard iconName="Create" isActive={isActive} />
          )}
        </NavLink>

        <NavLink to="/user/get-profile">
          {({ isActive }) => (
            <ProfileIconCard imgSrc={user?.profilePic} iconName="Profile" isActive={isActive} />
          )}
        </NavLink>

        <NavLink to="/user/more">
          {({ isActive }) => (
            <ProfileIconCard iconName="More" isActive={isActive} />
          )}
        </NavLink>
      </div>
    </div>
  );
};

export default IconSidebar;