
import React, { useState, useRef, useEffect } from "react";
import ProfileIconCard from "./ProfileIconCard";
import { NavLink, useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import axios from "axios";

const IconSidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  const [isLogoutPopupOpen, setIsLogoutPopupOpen] = useState(false);
  const popupRef = useRef(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsLogoutPopupOpen(false);
      }
    };

    if (isLogoutPopupOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isLogoutPopupOpen]);

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem("authToken");

      const response = await axios.post(
        "http://localhost:4000/auth/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.status === 200) {
        localStorage.removeItem("authToken");
        navigate("/");
      }
    } catch (error) {
      console.error("Logout error:", error.message);
    }
  };

  const toggleLogoutPopup = () => {
    setIsLogoutPopupOpen((prev) => !prev);
  };

  return (
    <div className="iconSection hidden md:block md:w-[12%] 2xl:w-[20%] h-full border-r border-r-[#2b3036] overflow-visible">
      
      {/* Logo */}
      <div className="logoSection w-full h-[130px] p-6 flex justify-start items-center">
        <img
          src="/images/instagram-icon.png"
          alt="Instagram"
          className="w-[30px] h-[40px] 2xl:hidden"
        />

        <img
          src="/images/instagram-logo.png"
          alt="Instagram"
          className="h-[40px] hidden 2xl:inline"
        />
      </div>

      {/* Navigation */}
      <div className="iconLists w-full h-[calc(100vh-130px)]">

        <NavLink to="/home">
          {({ isActive }) => (
            <ProfileIconCard
              iconName="Home"
              isActive={isActive}
            />
          )}
        </NavLink>

        <NavLink to="/user/search">
          {({ isActive }) => (
            <ProfileIconCard
              iconName="Search"
              isActive={isActive}
            />
          )}
        </NavLink>

        <NavLink to="/explore">
          {({ isActive }) => (
            <ProfileIconCard
              iconName="Explore"
              isActive={isActive}
            />
          )}
        </NavLink>

        <NavLink to="/reels">
          {({ isActive }) => (
            <ProfileIconCard
              iconName="Reels"
              isActive={isActive}
            />
          )}
        </NavLink>

        <NavLink to="/user/messages">
          {({ isActive }) => (
            <ProfileIconCard
              iconName="Messages"
              isActive={isActive}
            />
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
            <ProfileIconCard
              iconName="Create"
              isActive={isActive}
            />
          )}
        </NavLink>

        <NavLink to="/user/get-profile">
          {({ isActive }) => (
            <ProfileIconCard
              imgSrc={user?.profilePic}
              iconName="Profile"
              isActive={isActive}
            />
          )}
        </NavLink>

        {/* More */}
        <div
          className="relative"
          ref={popupRef}
        >
          <div
            onClick={toggleLogoutPopup}
            className={`
              iconcard
              w-full
              h-[60px]
              p-6
              flex
              justify-start
              items-center
              text-white
              text-[18px]
              rounded-lg
              cursor-pointer
              transition-all
              duration-200
              font-normal
              ${
                isLogoutPopupOpen
                  ? "bg-[#25282c]"
                  : "hover:bg-[#25282c]"
              }
            `}
          >
            {/* More Icon */}
            <div className="relative shrink-0 rounded-full overflow-hidden w-[40px] h-[40px] flex items-center justify-center">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-white"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
              </svg>
            </div>

            <span className="m-4 hidden 2xl:inline">
              More
            </span>
          </div>

          {/* Logout Popup */}
          {isLogoutPopupOpen && (
            <div
              className="
                absolute
                left-full
                bottom-[45px]
                ml-1
                w-[190px]
                bg-[#1f2226]
                border
                border-[#34383e]
                rounded-xl
                shadow-[0_8px_30px_rgba(0,0,0,0.45)]
                p-1.5
                z-[9999]
                animate-[fadeIn_0.15s_ease-out]
              "
            >
              <button
                onClick={handleLogout}
                className="
                  w-full
                  h-[48px]
                  px-3
                  flex
                  items-center
                  gap-3
                  rounded-lg
                  text-[#ed4956]
                  text-[14px]
                  font-semibold
                  transition-all
                  duration-200
                  hover:bg-[#2b2225]
                  active:scale-[0.98]
                "
              >
                {/* Logout Icon */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>

                <span>Log out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IconSidebar;

