// FollowersFollowingOverlay.jsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { X } from "lucide-react"
import axios from "axios"
import FollowUserCard from './FollowUserCard'

const INITIAL_LIMIT = 10
const LOAD_MORE_LIMIT = 5

const BASE_URL = import.meta.env.VITE_SERVER_URL

const FollowersFollowingOverlay = ({
  isOpen,
  onClose,
  mode = "followers", // "followers" | "following" — decides which single list to show
  userId, // the profile owner's user id whose followers/following we're fetching
}) => {
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
      className="overlayBackdrop fixed inset-0 z-[99] bg-black/60 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="FollowersFollowingOverlay relative z-[100] w-[500px] h-[500px] rounded-[12px] overflow-hidden bg-[var(--bg-surface)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="heading w-full h-[10%] shrink-0 relative flex justify-center items-center text-[var(--text-primary)] font-semibold text-[16px] border-b border-[var(--border-container)]">
          {heading}
          <button
            onClick={onClose}
            className="absolute right-4 cursor-pointer text-[var(--text-primary)]"
          >
            <X size={22} />
          </button>
        </div>

        <div className="searchDiv w-full h-[10%] shrink-0 flex justify-center items-center">
          <input
            type="text"
            name="search"
            id="search"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[95%] h-[70%] rounded-md focus:outline-none bg-[var(--bg-secondary-btn)] px-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)]"
          />
        </div>

        <div
          ref={listRef}
          onScroll={handleScroll}
          className="listDiv w-full flex-1 overflow-y-auto"
        >
          {isInitialLoading ? (
            <div className="w-full h-full flex justify-center items-center text-[var(--text-muted)] text-[14px]">
              Loading...
            </div>
          ) : filteredList.length === 0 ? (
            <div className="w-full h-full flex justify-center items-center text-[var(--text-muted)] text-[14px]">
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
                <div className="w-full h-[50px] flex justify-center items-center text-[var(--text-muted)] text-[13px]">
                  Loading more...
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default FollowersFollowingOverlay
