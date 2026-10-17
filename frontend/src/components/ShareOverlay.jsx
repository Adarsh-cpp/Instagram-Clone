import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Check, BadgeCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useTheme } from '../context/ThemeContext'

const BASE_URL = import.meta.env.VITE_SERVER_URL

const authConfig = () => ({
  withCredentials: true,
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
});

const LIMIT = 12;
const SEARCH_DEBOUNCE_MS = 400;

// Pass EXACTLY ONE of:
// `post`  ({ _id, media: [{url, mediaType}], author, caption })
// `reel`  ({ _id, media: {url, thumbnailUrl}, author, caption })
// `story` ({ _id, mediaType, mediaUrl, bgColor, author })
// onShared(optional) fires once after a successful send, useful for the caller
// to bump a local sharesCount (e.g. ReelsPage's Repeat2 counter). Reel-only.
const ShareOverlay = ({ onClose, post, reel, story, onShared }) => {
  const { isDevs } = useTheme()

  const shareType = story ? 'story' : reel ? 'reel' : 'post';
  const item = story || reel || post;
  const shareLabel = shareType === 'story' ? 'Story' : shareType === 'reel' ? 'Reel' : 'Post';

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedUsers, setSelectedUsers] = useState(new Set())

  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isLoading, setIsLoading] = useState(false) // loading more (pagination)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState(null)

  const listRef = useRef(null)
  const isFetchingRef = useRef(false)
  const searchTermRef = useRef('')

  const fetchUsers = useCallback(async (pageToFetch, search) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true

    if (pageToFetch === 1) {
      setIsInitialLoading(true)
    } else {
      setIsLoading(true)
    }

    try {
      const res = await axios.get(
        `${BASE_URL}/conversation/share-list?page=${pageToFetch}&limit=${LIMIT}&search=${encodeURIComponent(search || '')}`,
        authConfig()
      )

      if (res.data.success) {
        setUsers((prev) =>
          pageToFetch === 1 ? res.data.users : [...prev, ...res.data.users]
        )
        setHasMore(res.data.hasMore)
        setPage(pageToFetch)
        setError(null)
      }
    } catch (err) {
      console.log(err)
      setError('Failed to load users')
    } finally {
      setIsInitialLoading(false)
      setIsLoading(false)
      isFetchingRef.current = false
    }
  }, [])

  // debounced search — resets pagination and refetches page 1 whenever searchTerm changes
  useEffect(() => {
    searchTermRef.current = searchTerm

    const timeout = setTimeout(() => {
      setUsers([])
      setHasMore(true)
      fetchUsers(1, searchTerm)
    }, SEARCH_DEBOUNCE_MS)

    return () => clearTimeout(timeout)
  }, [searchTerm, fetchUsers])

  const handleScroll = () => {
    const el = listRef.current
    if (!el || isFetchingRef.current || !hasMore) return

    const { scrollTop, scrollHeight, clientHeight } = el
    if (scrollHeight - (scrollTop + clientHeight) < 80) {
      fetchUsers(page + 1, searchTermRef.current)
    }
  }

  // Escape key closes the overlay, same as clicking backdrop / X
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const toggleUser = (id) => {
    setSelectedUsers((prev) => {
      const updated = new Set(prev)
      if (updated.has(id)) {
        updated.delete(id)
      } else {
        updated.add(id)
      }
      return updated
    })
  }

  const handleSend = async () => {
    if (selectedUsers.size === 0 || isSending || !item?._id) return

    setIsSending(true)
    const receiverIds = Array.from(selectedUsers)

    const sharedPayloadKey =
      shareType === 'story' ? 'sharedStoryId' : shareType === 'reel' ? 'sharedReel' : 'sharedPost'

    try {
      await Promise.all(
        receiverIds.map(async (receiverId) => {
          // 1. get-or-create the conversation with this user
          const convRes = await axios.post(
            `${BASE_URL}/conversation/${receiverId}`,
            {},
            authConfig()
          )
          const conversationId = convRes.data.conversation._id

          // 2. send the shared post/reel/story as a message in that conversation
          await axios.post(
            `${BASE_URL}/message/${conversationId}`,
            { [sharedPayloadKey]: item._id },
            authConfig()
          )
        })
      )

      // register the share on the reel itself (bumps sharesCount), once per share action
      if (shareType === 'reel') {
        try {
          const shareRes = await axios.post(
            `${BASE_URL}/reels/${item._id}/share`,
            {},
            authConfig()
          )
          onShared?.(shareRes.data.sharesCount)
        } catch (err) {
          console.log(err); // non-critical — the message itself already sent successfully
        }
      }

      toast.success(
        receiverIds.length > 1
          ? `${shareLabel} shared with selected people`
          : `${shareLabel} shared`
      )
      onClose()
    } catch (err) {
      console.log(err)
      toast.error(`Failed to share ${shareLabel.toLowerCase()}`)
    } finally {
      setIsSending(false)
    }
  }

  const previewThumbUrl =
    shareType === 'story'
      ? item?.mediaUrl
      : shareType === 'reel'
      ? item?.media?.thumbnailUrl || item?.media?.url
      : item?.media?.[0]?.url

  const previewIsVideo =
    shareType === 'story'
      ? item?.mediaType === 'video'
      : shareType === 'reel'
      ? !item?.media?.thumbnailUrl // no thumbnail generated — fall back to rendering the raw video
      : item?.media?.[0]?.mediaType === 'video'

  return (
    <div
      className="overlayBackdrop fixed inset-0 z-[99] bg-black/60 flex justify-center items-center devs:bg-[rgba(2,3,10,0.75)] devs:backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        {...(isDevs
          ? {
              initial: { opacity: 0, scale: 0.92, y: 20 },
              animate: { opacity: 1, scale: 1, y: 0 },
              transition: { type: 'spring', stiffness: 320, damping: 28 },
            }
          : {})}
        className={`ShareOverlay relative z-[100] w-[500px] h-[500px] rounded-[12px] overflow-hidden bg-[var(--bg-surface)] flex flex-col devs:max-w-[94vw] devs:!rounded-3xl ${
          isDevs ? 'devs-glass devs-neon-border' : ''
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Heading */}
        <div className="heading w-full h-[10%] shrink-0 relative flex justify-center items-center text-[var(--text-primary)] font-semibold text-[16px] border-b border-[var(--border-container)] devs:font-mono devs:uppercase devs:tracking-[0.25em] devs:text-[12px]">
          Share
          <button
            onClick={onClose}
            className="absolute right-4 cursor-pointer text-[var(--text-primary)] devs:hover:text-[var(--devs-cyan)] devs:transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Preview of item being shared */}
        {previewThumbUrl && (
          <div className="postPreview w-full h-[60px] shrink-0 flex items-center gap-3 px-4 border-b border-[var(--border-container)]">
            <div
              className="w-[42px] h-[42px] rounded-md overflow-hidden shrink-0 devs:rounded-xl devs:ring-1 devs:ring-[var(--devs-cyan)] devs:shadow-[0_0_14px_rgba(34,240,255,0.35)]"
              style={shareType === 'story' ? { backgroundColor: item.bgColor || undefined } : undefined}
            >
              {previewIsVideo ? (
                <video src={previewThumbUrl} className="w-full h-full object-cover" muted />
              ) : (
                <img src={previewThumbUrl} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[var(--text-primary)] text-[13px] font-medium inline-flex items-center gap-1 devs:font-bold">
                {shareType === 'story' ? (
                  <>
                    {item.author?.username}
                    {item.author?.role === "admin" && (
                      <BadgeCheck size={14} className="text-sky-400 devs:text-[var(--devs-cyan)] shrink-0" />
                    )}
                    's story
                  </>
                ) : (
                  <>
                    {item.author?.username}
                    {item.author?.role === "admin" && (
                      <BadgeCheck size={14} className="text-sky-400 devs:text-[var(--devs-cyan)] shrink-0" />
                    )}
                  </>
                )}
              </span>
              {item.caption && (
                <span className="text-[var(--text-muted)] text-[12px] truncate max-w-[380px] devs:font-mono devs:text-[11px]">
                  {item.caption}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Search */}
        <div className="searchDiv w-full h-[10%] shrink-0 flex justify-center items-center">
          <input
            type="text"
            name="search"
            id="search"
            placeholder="Search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-[95%] h-[70%] rounded-md focus:outline-none bg-[var(--bg-secondary-btn)] px-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] devs:rounded-xl devs:px-4 devs:font-mono devs:text-[13px] devs:bg-[var(--bg-input)] devs:border devs:border-[var(--border-input)] devs:focus:border-[var(--devs-cyan)] devs:focus:shadow-[0_0_18px_rgba(34,240,255,0.25)] devs:transition-all"
          />
        </div>

        {/* List */}
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="listDiv w-full flex-1 overflow-y-auto px-3 py-3"
        >
          {isInitialLoading ? (
            <div className="w-full h-full flex justify-center items-center text-[var(--text-muted)] text-[14px] devs:font-mono">
              {isDevs && <span className="text-[var(--devs-cyan)] mr-2">&gt;</span>}
              Loading...
            </div>
          ) : error ? (
            <div className="w-full h-full flex justify-center items-center text-[var(--text-muted)] text-[14px] devs:font-mono">
              {error}
            </div>
          ) : users.length === 0 ? (
            <div className="w-full h-full flex justify-center items-center text-[var(--text-muted)] text-[14px] devs:font-mono">
              No results found
            </div>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-y-4">
                {users.map((user) => {
                  const isSelected = selectedUsers.has(user._id)
                  return (
                    <motion.div
                      key={user._id}
                      {...(isDevs ? { whileTap: { scale: 0.92 }, whileHover: { y: -2 } } : {})}
                      onClick={() => toggleUser(user._id)}
                      className="flex flex-col items-center justify-start gap-1 cursor-pointer"
                    >
                      <div className="relative">
                        <img
                          src={user.profilePic || "/images/default-profile-pic.jpg"}
                          alt={user.username}
                          className={`w-[60px] h-[60px] rounded-full object-cover border-2 devs:transition-all devs:duration-200 ${
                            isSelected
                              ? 'border-[var(--brand-blue)] devs:shadow-[0_0_18px_rgba(34,240,255,0.65)]'
                              : 'border-[var(--border-container)]'
                          }`}
                        />
                        {isSelected && (
                          <div className="absolute bottom-0 right-0 bg-[var(--brand-blue)] rounded-full w-[18px] h-[18px] flex items-center justify-center border-2 border-[var(--bg-surface)] devs:bg-[linear-gradient(135deg,#22f0ff,#8b5cf6)] devs:border-[#04050e]">
                            <Check size={11} className="text-[var(--text-on-brand)]" strokeWidth={3} />
                          </div>
                        )}
                      </div>
                      <span className="text-[var(--text-primary)] text-[12px] max-w-[70px] flex items-center justify-center gap-1 devs:font-mono devs:text-[11px]">
                        <span className="truncate min-w-0">{user.username}</span>
                        {user.role === "admin" && (
                          <BadgeCheck size={14} className="text-sky-400 devs:text-[var(--devs-cyan)] shrink-0" />
                        )}
                      </span>
                    </motion.div>
                  )
                })}
              </div>
              {isLoading && (
                <div className="w-full h-[50px] flex justify-center items-center text-[var(--text-muted)] text-[13px] devs:font-mono">
                  {isDevs && <span className="text-[var(--devs-cyan)] mr-2">&gt;</span>}
                  Loading more...
                </div>
              )}
            </>
          )}
        </div>

        {/* Send footer */}
        {selectedUsers.size > 0 && (
          <div className="sendFooter w-full shrink-0 border-t border-[var(--border-container)] flex justify-center items-center py-2.5">
            <button
              onClick={handleSend}
              disabled={isSending}
              className="w-[95%] py-2 rounded-md bg-[var(--brand-blue)] text-[var(--text-on-brand)] text-[14px] font-semibold cursor-pointer hover:bg-[var(--brand-blue-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 devs:rounded-full devs:bg-[linear-gradient(120deg,#22f0ff,#8b5cf6,#ff2bd6)] devs:hover:bg-[linear-gradient(120deg,#22f0ff,#8b5cf6,#ff2bd6)] devs:font-mono devs:uppercase devs:tracking-wider devs:text-[12px] devs:font-bold devs:shadow-[0_0_22px_rgba(34,240,255,0.4)] devs:active:scale-95"
            >
              {isSending ? (
                <>
                  <div className="w-[14px] h-[14px] border-2 border-white/40 border-t-white devs:border-[#04050e]/40 devs:border-t-[#04050e] rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                `Send${selectedUsers.size > 1 ? ` to ${selectedUsers.size} people` : ''}`
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default ShareOverlay