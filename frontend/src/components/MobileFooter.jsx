// MobileFooter.jsx
import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'
import { useTheme } from '../context/ThemeContext'
import MobileIcons from './MobileIcons'
import {
  HomeIcon,
  ExploreIcon,
  ReelsIcon,
  MessagesIcon,
} from './Icons'

const BASE_URL = import.meta.env.VITE_SERVER_URL

const svgProps = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const MobileFooter = () => {
  const { user } = useAuth()
  const { unreadCount } = useNotifications()
  const { theme, toggleTheme } = useTheme()
  const navigate = useNavigate()
  const location = useLocation()

  const [isSheetOpen, setIsSheetOpen] = useState(false)
  const [isConfirmingLogout, setIsConfirmingLogout] = useState(false)
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Close the sheet whenever the route changes
  useEffect(() => {
    setIsSheetOpen(false)
    setIsConfirmingLogout(false)
    setIsConfirmingDelete(false)
  }, [location.pathname])

  // Lock background scroll while the sheet is open
  useEffect(() => {
    document.body.style.overflow = isSheetOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [isSheetOpen])

  const closeSheet = () => {
    setIsSheetOpen(false)
    setIsConfirmingLogout(false)
    setIsConfirmingDelete(false)
  }

  const toggleSheet = () => {
    setIsSheetOpen((prev) => !prev)
    setIsConfirmingLogout(false)
    setIsConfirmingDelete(false)
  }

  const handleAboutClick = () => {
    closeSheet()
    navigate('/about')
  }

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('authToken')

      const response = await axios.post(
        `${BASE_URL}/auth/logout`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      if (response.status === 200) {
        localStorage.removeItem('authToken')
        closeSheet()
        navigate('/')
      }
    } catch (error) {
      console.error('Logout error:', error.message)
    }
  }

  const handleDeleteAccount = async () => {
    if (isDeleting) return
    try {
      setIsDeleting(true)
      const token = localStorage.getItem('authToken')

      const response = await axios.delete(`${BASE_URL}/user/profile/delete-profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.status === 200) {
        localStorage.removeItem('authToken')
        setIsDeleting(false)
        closeSheet()
        navigate('/')
      }
    } catch (error) {
      console.error('Delete account error:', error.message)
      setIsDeleting(false)
    }
  }

  // Highlight "More" when the user is on a page that lives inside the sheet
  const isMoreRouteActive = ['/user/notifications', '/create/post', '/user/get-profile', '/about'].some(
    (path) => location.pathname.startsWith(path)
  )
  const isMoreActive = isSheetOpen || isMoreRouteActive

  const badgeText = unreadCount > 99 ? '99+' : unreadCount

  const tileClass = (isActive) =>
    `relative flex flex-col items-center justify-center gap-2 h-[84px] rounded-xl text-[13px] font-medium
     text-[var(--text-primary)] transition-all duration-200 active:scale-[0.97]
     ${isActive ? 'bg-[var(--bg-row-hover)]' : 'hover:bg-[var(--bg-row-hover)]'}`

  const rowClass = `w-full h-[48px] px-3 flex items-center gap-3 rounded-lg text-[14px] font-medium
    text-[var(--text-primary)] transition-all duration-200 hover:bg-[var(--bg-popup-hover)] active:scale-[0.98]`

  return (
    <>
      {/* Backdrop */}
      {isSheetOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden animate-[fadeIn_0.15s_ease-out]"
          onClick={closeSheet}
        />
      )}

      {/* Bottom sheet */}
      {isSheetOpen && (
        <div
          className="fixed left-0 right-0 bottom-[50px] z-50 md:hidden bg-[var(--bg-panel)]
                     border-t border-[var(--border-popup)] rounded-t-2xl p-3
                     shadow-[0_-8px_30px_rgba(0,0,0,0.35)] animate-[fadeIn_0.15s_ease-out]"
        >
          {/* Grab handle */}
          <div className="w-10 h-1 rounded-full bg-[var(--border-popup)] mx-auto mb-3" />

          {!isConfirmingLogout && !isConfirmingDelete ? (
            <>
              {/* Quick links */}
              <div className="grid grid-cols-3 gap-2">
                <NavLink to="/user/notifications">
                  {({ isActive }) => (
                    <div className={tileClass(isActive)}>
                      <div className="relative">
                        <svg {...svgProps}>
                          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                        </svg>
                        {unreadCount > 0 && (
                          <span
                            className="absolute -top-2 -right-3 min-w-[18px] h-[18px] px-1 rounded-full
                                       bg-[var(--color-danger)] text-white text-[10px] font-semibold
                                       flex items-center justify-center"
                          >
                            {badgeText}
                          </span>
                        )}
                      </div>
                      <span>Notifications</span>
                    </div>
                  )}
                </NavLink>

                <NavLink to="/create/post">
                  {({ isActive }) => (
                    <div className={tileClass(isActive)}>
                      <svg {...svgProps}>
                        <rect x="3" y="3" width="18" height="18" rx="4" />
                        <line x1="12" y1="8" x2="12" y2="16" />
                        <line x1="8" y1="12" x2="16" y2="12" />
                      </svg>
                      <span>Create</span>
                    </div>
                  )}
                </NavLink>

                <NavLink to="/user/get-profile">
                  {({ isActive }) => (
                    <div className={tileClass(isActive)}>
                      {user?.profilePic ? (
                        <img
                          src={user.profilePic}
                          alt="Profile"
                          className="w-6 h-6 rounded-full object-cover"
                        />
                      ) : (
                        <svg {...svgProps}>
                          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                        </svg>
                      )}
                      <span>Profile</span>
                    </div>
                  )}
                </NavLink>
              </div>

              <div className="h-[1px] bg-[var(--border-popup)] my-3 mx-1" />

              {/* Theme toggle */}
              <div onClick={toggleTheme} className={`${rowClass} justify-between cursor-pointer`}>
                <span>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</span>

                <div
                  className={`relative w-[42px] h-[22px] rounded-full shrink-0 transition-colors duration-200
                    ${theme === 'dark' ? 'bg-[var(--brand-blue)]' : 'bg-[var(--toggle-track-off)]'}`}
                >
                  <div
                    className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white
                      flex items-center justify-center transition-transform duration-200
                      ${theme === 'dark' ? 'translate-x-[20px]' : 'translate-x-0'}`}
                  >
                    {theme === 'dark' ? (
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

              {/* About */}
              <button onClick={handleAboutClick} className={rowClass}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="12" y1="16" x2="12" y2="11.5" />
                  <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
                </svg>
                <span>About this project</span>
              </button>

              {/* Log out */}
              <button
                onClick={() => setIsConfirmingLogout(true)}
                className="w-full h-[48px] px-3 flex items-center gap-3 rounded-lg text-[14px] font-semibold
                           text-[var(--color-danger)] transition-all duration-200
                           hover:bg-[var(--bg-danger-hover)] active:scale-[0.98]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                <span>Log out</span>
              </button>

              {/* Delete account */}
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="w-full h-[48px] px-3 flex items-center gap-3 rounded-lg text-[14px] font-semibold
                           text-[var(--color-danger)] transition-all duration-200
                           hover:bg-[var(--bg-danger-hover)] active:scale-[0.98]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
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
              <p className="text-[var(--text-primary)] text-[14px] font-medium pb-4 pt-1 text-center">
                Log out of your account?
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleLogout}
                  className="w-full h-[44px] rounded-lg bg-[var(--color-danger)] text-white text-[14px]
                             font-semibold transition-all duration-200 hover:bg-[var(--color-danger-hover)]
                             active:scale-[0.98]"
                >
                  Yes, log out
                </button>

                <button
                  onClick={() => setIsConfirmingLogout(false)}
                  className="w-full h-[44px] rounded-lg text-[var(--text-primary)] text-[14px] font-medium
                             transition-all duration-200 hover:bg-[var(--bg-popup-hover)] active:scale-[0.98]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="p-2">
              <p className="text-[var(--color-danger)] text-[14px] font-semibold pt-1 text-center">
                Delete your account?
              </p>
              <p className="text-[var(--text-primary)] text-[13px] pb-4 pt-2 text-center leading-snug">
                This is permanent. All your posts, reels, messages, chats,
                followers and profile data will be deleted forever and cannot
                be recovered.
              </p>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="w-full h-[44px] rounded-lg bg-[var(--color-danger)] text-white text-[14px]
                             font-semibold transition-all duration-200 hover:bg-[var(--color-danger-hover)]
                             active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, delete my account'}
                </button>

                <button
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isDeleting}
                  className="w-full h-[44px] rounded-lg text-[var(--text-primary)] text-[14px] font-medium
                             transition-all duration-200 hover:bg-[var(--bg-popup-hover)] active:scale-[0.98]
                             disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer bar */}
      <div className="mobileFooter w-full h-[50px] fixed bottom-0 flex justify-center items-center md:hidden bg-[var(--bg-app)] border-t border-[var(--border-soft)] z-30">
        <NavLink to="/home" className="w-1/5 h-full">
          {({ isActive }) => <MobileIcons Icon={HomeIcon} isActive={isActive} label="Home" />}
        </NavLink>

        <NavLink to="/explore" className="w-1/5 h-full">
          {({ isActive }) => <MobileIcons Icon={ExploreIcon} isActive={isActive} label="Explore" />}
        </NavLink>

        <NavLink to="/reels" className="w-1/5 h-full">
          {({ isActive }) => <MobileIcons Icon={ReelsIcon} isActive={isActive} label="Reels" />}
        </NavLink>

        <NavLink to="/user/messages" className="w-1/5 h-full">
          {({ isActive }) => <MobileIcons Icon={MessagesIcon} isActive={isActive} label="Messages" />}
        </NavLink>

        {/* More */}
        <button
          onClick={toggleSheet}
          aria-label="More"
          aria-expanded={isSheetOpen}
          className="relative w-1/5 h-full flex justify-center items-center text-[var(--text-primary)]"
        >
          <div
            className={`relative flex items-center justify-center w-[36px] h-[36px] rounded-full transition-all duration-200
              ${isMoreActive ? 'bg-[var(--bg-row-hover)]' : ''}`}
          >
            <svg {...svgProps} strokeWidth={isMoreActive ? 2.5 : 2}>
              <line x1="4" y1="7" x2="20" y2="7" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="17" x2="20" y2="17" />
            </svg>

            {/* Unread dot, so notifications aren't hidden inside the sheet */}
            {unreadCount > 0 && !isSheetOpen && (
              <span className="absolute top-[4px] right-[4px] w-[9px] h-[9px] rounded-full bg-[var(--color-danger)] border-2 border-[var(--bg-app)]" />
            )}
          </div>
        </button>
      </div>
    </>
  )
}

export default MobileFooter
