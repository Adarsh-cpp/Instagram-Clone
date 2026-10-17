// FollowersFollowingOverlay.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { X, Search } from "lucide-react"
import { motion } from "framer-motion"
import axios from "axios"
import FollowUserCard from './FollowUserCard'
import { useTheme } from '../context/ThemeContext'

const INITIAL_LIMIT = 10
const LOAD_MORE_LIMIT = 5

const BASE_URL = import.meta.env.VITE_SERVER_URL

const FollowersFollowingOverlay = ({
  isOpen,
  onClose,
  mode = "followers", // "followers" | "following" — decides which single list to show
  userId, // the profile owner's user id whose followers/following we're fetching
}) => {
  const { isDevs } = useTheme()
  const [searchTerm, setSearchTerm] = useState("")
  const [items, setItems] = useState([])
  const [skip, setSkip] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [isInitialLoading, setIsInitialLoading] = useState(false)

  const listRef = useRef(null)

  const endpoint =
    mode === "followers"
      ? `${BASE_URL}/auth/get-followers`
      : `${BASE_URL}/auth/get-followings`

  // reset + fetch first page whenever the overlay is opened, or the target user/mode changes
  useEffect(() => {
    if (!isOpen || !userId) return

    const fetchInitial = async () => {
      setItems([])
      setSkip(0)
      setHasMore(true)
      setSearchTerm("")
      setIsInitialLoading(true)

      try {
        const token = localStorage.getItem("authToken")
        const response = await axios.get(endpoint, {
          params: { userId, skip: 0, limit: INITIAL_LIMIT },
          headers: { Authorization: `Bearer ${token}` },
        })

        const fetched =
          mode === "followers"
            ? response.data.followers
            : response.data.following

        setItems(fetched || [])
        setSkip(fetched?.length || 0)
        setHasMore((fetched?.length || 0) === INITIAL_LIMIT)
      } catch (error) {
        console.log(error)
      } finally {
        setIsInitialLoading(false)
      }
    }

    fetchInitial()
  }, [isOpen, userId, mode, endpoint])

  const fetchMore = useCallback(async () => {
    if (isLoading || !hasMore || !userId) return

    setIsLoading(true)
    try {
      const token = localStorage.getItem("authToken")
      const response = await axios.get(endpoint, {
        params: { userId, skip, limit: LOAD_MORE_LIMIT },
        headers: { Authorization: `Bearer ${token}` },
      })

      const fetched =
        mode === "followers"
          ? response.data.followers
          : response.data.following

      setItems((prev) => [...prev, ...(fetched || [])])
      setSkip((prev) => prev + (fetched?.length || 0))
      setHasMore((fetched?.length || 0) === LOAD_MORE_LIMIT)
    } catch (error) {
      console.log(error)
    } finally {
      setIsLoading(false)
    }
  }, [isLoading, hasMore, userId, skip, endpoint, mode])

  const handleScroll = () => {
    const el = listRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    if (nearBottom) fetchMore()
  }

  const filteredList = useMemo(() => {
    if (!searchTerm.trim()) return items
    const term = searchTerm.toLowerCase()
    return items.filter(
      (u) =>
        u.username.toLowerCase().includes(term) ||
        (u.fullName || "").toLowerCase().includes(term)
    )
  }, [items, searchTerm])

  if (!isOpen) return null

  const heading = mode === "followers" ? "Followers" : "Following"

  return (
    <div
      className="overlayBackdrop fixed inset-0 z-[99] bg-black/60 devs:bg-[rgba(2,3,10,0.75)] devs:backdrop-blur-md flex justify-center items-center"
      onClick={onClose}
    >
      <motion.div
        {...(isDevs
          ? {
              initial: { opacity: 0, scale: 0.92, y: 20 },
              animate: { opacity: 1, scale: 1, y: 0 },
              transition: { type: "spring", stiffness: 320, damping: 28 },
            }
          : {})}
        className={`FollowersFollowingOverlay relative z-[100] w-[500px] h-[500px] rounded-[12px] overflow-hidden bg-[var(--bg-surface)] flex flex-col devs:max-w-[94vw] devs:rounded-3xl ${
          isDevs ? "devs-glass devs-neon-border" : ""
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="heading w-full h-[10%] shrink-0 relative flex justify-center items-center text-[var(--text-primary)] font-semibold text-[16px] border-b border-[var(--border-container)] devs:font-mono devs:uppercase devs:tracking-[0.25em] devs:text-[13px]">
          {heading}
          {isDevs && (
            <span className="ml-2 text-[var(--devs-cyan)] font-bold">
              {items.length}
            </span>
          )}
          <button
            onClick={onClose}
            className="absolute right-4 cursor-pointer text-[var(--text-primary)] devs:hover:text-[var(--devs-cyan)] devs:transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        <div className="searchDiv relative w-full h-[10%] shrink-0 flex justify-center items-center">
          {isDevs && (
            <Search size={14} className="absolute left-6 text-[var(--text-muted)] pointer-events-none" />
          )}
          <input
            type="text"
            name="search"
            id="search"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[95%] h-[70%] rounded-md focus:outline-none bg-[var(--bg-secondary-btn)] px-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] devs:pl-9 devs:rounded-xl devs:font-mono devs:text-[13px] devs:bg-[var(--bg-input)] devs:border devs:border-[var(--border-input)] devs:focus:border-[var(--devs-cyan)] devs:focus:shadow-[0_0_18px_rgba(34,240,255,0.2)] devs:transition-all"
          />
        </div>

        <div
          ref={listRef}
          onScroll={handleScroll}
          className="listDiv w-full flex-1 overflow-y-auto"
        >
          {isInitialLoading ? (
            <div className="w-full h-full flex justify-center items-center text-[var(--text-muted)] text-[14px] devs:font-mono">
              {isDevs && <span className="text-[var(--devs-cyan)] mr-2">&gt;</span>}
              Loading...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="w-full h-full flex justify-center items-center text-[var(--text-muted)] text-[14px] devs:font-mono">
              No results found
            </div>
          ) : (
            <>
              {filteredList.map((user) => (
                <FollowUserCard
                  key={user.username}
                  userId={user._id}
                  profilePic={user?.profilePic ? user.profilePic : "/images/default-profile-pic.jpg"}
                  username={user.username}
                  fullName={user.fullName}
                  isFollowing={user.isFollowing}
                  role={user.role}
                  onToggleFollow={() => {
                    console.log("toggle follow:", user.username)
                  }}
                  onCardClick={onClose}
                />
              ))}
              {isLoading && (
                <div className="w-full h-[50px] flex justify-center items-center text-[var(--text-muted)] text-[13px] devs:font-mono">
                  {isDevs && <span className="text-[var(--devs-cyan)] mr-2">&gt;</span>}
                  Loading more...
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  )
}

export default FollowersFollowingOverlay