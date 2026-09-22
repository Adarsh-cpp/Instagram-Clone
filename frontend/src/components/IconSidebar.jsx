import React, { useState, useRef, useEffect } from "react";
import ProfileIconCard from "./ProfileIconCard";
import { NavLink, useNavigate } from "react-router-dom";
import { useNotifications } from "../context/NotificationContext";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import axios from "axios";


const BASE_URL = import.meta.env.VITE_SERVER_URL

const IconSidebar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();
  const { theme, toggleTheme } = useTheme();

  const [isLogoutPopupOpen, setIsLogoutPopupOpen] = useState(false);
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        setIsLogoutPopupOpen(false);
        setIsConfirmingLogout(false);
        setIsConfirmingDelete(false);
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
        `${BASE_URL}/auth/logout`,
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

  const handleDeleteAccount = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      const token = localStorage.getItem("authToken");

      const response = await axios.delete(`${BASE_URL}/user/profile/delete-profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 200) {
        localStorage.removeItem("authToken");
        navigate("/");
      }
    } catch (error) {
      console.error("Delete account error:", error.message);
      setIsDeleting(false);
    }
  };

  const toggleLogoutPopup = () => {
    setIsLogoutPopupOpen((prev) => !prev);
    setIsConfirmingLogout(false);
    setIsConfirmingDelete(false);
  };

  const handleAboutClick = () => {
    setIsLogoutPopupOpen(false);
    setIsConfirmingLogout(false);
    setIsConfirmingDelete(false);
    navigate("/about");
  };

  const handlePrivacyPolicyClick = () => {
    setIsLogoutPopupOpen(false);
    setIsConfirmingLogout(false);
    setIsConfirmingDelete(false);
    navigate("/privacy-policy");
  };

  const handleTermsClick = () => {
    setIsLogoutPopupOpen(false);
    setIsConfirmingLogout(false);
    setIsConfirmingDelete(false);
    navigate("/terms");
  };

  return (
    <div className="iconSection hidden md:block md:w-[12%] 2xl:w-[20%] h-full border-r border-r-[var(--border-soft)] overflow-visible">
      
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

        {/* <NavLink to="/user/search">
          {({ isActive }) => (
            <ProfileIconCard
              iconName="Search"
              isActive={isActive}
            />
          )}
        </NavLink> */}

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
              text-[var(--text-primary)]
              text-[18px]
              rounded-lg
              cursor-pointer
              transition-all
              duration-200
              font-normal
              ${
                isLogoutPopupOpen
                  ? "bg-[var(--bg-row-hover)]"
                  : "hover:bg-[var(--bg-row-hover)]"
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
                className="text-[var(--text-primary)]"
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

          {/* Popup */}
          {isLogoutPopupOpen && (
            <div
              className="
                absolute
                left-0
                bottom-full
                mb-2
                w-[220px]
                bg-[var(--bg-panel)]
                border
                border-[var(--border-popup)]
                rounded-xl
                shadow-[0_8px_30px_rgba(0,0,0,0.45)]
                p-1.5
                z-[9999]
                animate-[fadeIn_0.15s_ease-out]
                overflow-hidden
              "
            >
              {!isConfirmingLogout && !isConfirmingDelete ? (
                <>
                  {/* Theme toggle row */}
                  <div
                    onClick={toggleTheme}
                    className="
                      w-full
                      h-[48px]
                      px-3
                      flex
                      items-center
                      justify-between
                      gap-3
                      rounded-lg
                      text-[var(--text-primary)]
                      text-[14px]
                      font-medium
                      cursor-pointer
                      transition-all
                      duration-200
                      hover:bg-[var(--bg-popup-hover)]
                      active:scale-[0.98]
                    "
                  >
                    <span>{theme === "dark" ? "Dark mode" : "Light mode"}</span>

                    {/* Slider-style toggle */}
                    <div
                      className={`
                        relative w-[42px] h-[22px] rounded-full shrink-0
                        transition-colors duration-200
                        ${theme === "dark" ? "bg-[var(--brand-blue)]" : "bg-[var(--toggle-track-off)]"}
                      `}
                    >
                      <div
                        className={`
                          absolute top-[2px] left-[2px]
                          w-[18px] h-[18px] rounded-full bg-white
                          flex items-center justify-center
                          transition-transform duration-200
                          ${theme === "dark" ? "translate-x-[20px]" : "translate-x-0"}
                        `}
                      >
                        {theme === "dark" ? (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--icon-on-toggle)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                          </svg>
                        ) : (
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--icon-on-toggle)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="4" />
                            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
                          </svg>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="h-[1px] bg-[var(--border-popup)] my-1 mx-1" />

                  {/* About row */}
                  <button
                    onClick={handleAboutClick}
                    className="
                      w-full
                      h-[48px]
                      px-3
                      flex
                      items-center
                      gap-3
                      rounded-lg
                      text-[var(--text-primary)]
                      text-[14px]
                      font-medium
                      transition-all
                      duration-200
                      hover:bg-[var(--bg-popup-hover)]
                      active:scale-[0.98]
                    "
                  >
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
                      <circle cx="12" cy="12" r="9" />
                      <line x1="12" y1="16" x2="12" y2="11.5" />
                      <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
                    </svg>
                    <span>About this project</span>
                  </button>

                  {/* Privacy Policy row */}
                  <button
                    onClick={handlePrivacyPolicyClick}
                    className="
                      w-full
                      h-[48px]
                      px-3
                      flex
                      items-center
                      gap-3
                      rounded-lg
                      text-[var(--text-primary)]
                      text-[14px]
                      font-medium
                      transition-all
                      duration-200
                      hover:bg-[var(--bg-popup-hover)]
                      active:scale-[0.98]
                    "
                  >
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
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Privacy Policy</span>
                  </button>

                  {/* Terms row */}
                  <button
                    onClick={handleTermsClick}
                    className="
                      w-full
                      h-[48px]
                      px-3
                      flex
                      items-center
                      gap-3
                      rounded-lg
                      text-[var(--text-primary)]
                      text-[14px]
                      font-medium
                      transition-all
                      duration-200
                      hover:bg-[var(--bg-popup-hover)]
                      active:scale-[0.98]
                    "
                  >
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
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="8" y1="13" x2="16" y2="13" />
                      <line x1="8" y1="17" x2="16" y2="17" />
                    </svg>
                    <span>Terms</span>
                  </button>

                  <div className="h-[1px] bg-[var(--border-popup)] my-1 mx-1" />

                  {/* Logout row */}
                  <button
                    onClick={() => setIsConfirmingLogout(true)}
                    className="
                      w-full
                      h-[48px]
                      px-3
                      flex
                      items-center
                      gap-3
                      rounded-lg
                      text-[var(--color-danger)]
                      text-[14px]
                      font-semibold
                      transition-all
                      duration-200
                      hover:bg-[var(--bg-danger-hover)]
                      active:scale-[0.98]
                    "
                  >
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

                  <div className="h-[1px] bg-[var(--border-popup)] my-1 mx-1" />

                  {/* Delete account row */}
                  <button
                    onClick={() => setIsConfirmingDelete(true)}
                    className="
                      w-full
                      h-[48px]
                      px-3
                      flex
                      items-center
                      gap-3
                      rounded-lg
                      text-[var(--color-danger)]
                      text-[14px]
                      font-semibold
                      transition-all
                      duration-200
                      hover:bg-[var(--bg-danger-hover)]
                      active:scale-[0.98]
                    "
                  >
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
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6" />
                      <path d="M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                    <span>Delete account</span>
                  </button>
                </>
              ) : isConfirmingLogout ? (
                <div className="p-2">
                  <p className="text-[var(--text-primary)] text-[13px] font-medium px-1 pb-3 pt-1 text-center">
                    Log out of your account?
                  </p>

                  <div className="flex flex-col gap-1">
                    <button
                      onClick={handleLogout}
                      className="
                        w-full
                        h-[40px]
                        rounded-lg
                        bg-[var(--color-danger)]
                        text-white
                        text-[14px]
                        font-semibold
                        transition-all
                        duration-200
                        hover:bg-[var(--color-danger-hover)]
                        active:scale-[0.98]
                      "
                    >
                      Yes, log out
                    </button>

                    <button
                      onClick={() => setIsConfirmingLogout(false)}
                      className="
                        w-full
                        h-[40px]
                        rounded-lg
                        text-[var(--text-primary)]
                        text-[14px]
                        font-medium
                        transition-all
                        duration-200
                        hover:bg-[var(--bg-popup-hover)]
                        active:scale-[0.98]
                      "
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  <p className="text-[var(--color-danger)] text-[13px] font-semibold px-1 pt-1 text-center">
                    Delete your account?
                  </p>
                  <p className="text-[var(--text-primary)] text-[12px] px-1 pb-3 pt-1.5 text-center leading-snug">
                    This is permanent. All your posts, reels, messages, chats,
                    followers and profile data will be deleted forever and
                    cannot be recovered.
                  </p>

                  <div className="flex flex-col gap-1">
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting}
                      className="
                        w-full
                        h-[40px]
                        rounded-lg
                        bg-[var(--color-danger)]
                        text-white
                        text-[14px]
                        font-semibold
                        transition-all
                        duration-200
                        hover:bg-[var(--color-danger-hover)]
                        active:scale-[0.98]
                        disabled:opacity-60
                        disabled:cursor-not-allowed
                      "
                    >
                      {isDeleting ? "Deleting..." : "Yes, delete my account"}
                    </button>

                    <button
                      onClick={() => setIsConfirmingDelete(false)}
                      disabled={isDeleting}
                      className="
                        w-full
                        h-[40px]
                        rounded-lg
                        text-[var(--text-primary)]
                        text-[14px]
                        font-medium
                        transition-all
                        duration-200
                        hover:bg-[var(--bg-popup-hover)]
                        active:scale-[0.98]
                        disabled:opacity-60
                        disabled:cursor-not-allowed
                      "
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IconSidebar;
