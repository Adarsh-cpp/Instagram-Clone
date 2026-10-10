import React, { useRef, useState, useEffect, useCallback } from 'react'
import IconSidebar from '../components/IconSidebar'
import {
  Heart,
  MessageCircle,
  Bookmark,
  MoreHorizontal,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown,
  Play,
  BadgeCheck,
  MapPin,
  Send
} from 'lucide-react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ReelCommentsOverlay from '../components/ReelCommentsOverlay'
import ShareOverlay from '../components/ShareOverlay'

const BASE_URL = import.meta.env.VITE_SERVER_URL
const LIMIT = 5

// Swipe distance (px) needed to move to the next / previous reel on touch screens
const SWIPE_THRESHOLD = 50

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
})

const formatCount = (n = 0) => {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return n
}

const stop = (e) => e.stopPropagation()

const ReelsPage = () => {

  const { user, refreshUser } = useAuth();

  const videoRef = useRef(null)
  const sectionRef = useRef(null)
  const clickTimer = useRef(null)
  const isFetchingRef = useRef(false)
  const menuRef = useRef(null)
  const touchStartY = useRef(null)
  const wheelLock = useRef(false)

  const [reels, setReels] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFeedLoading, setIsFeedLoading] = useState(false)

  const currentReel = reels[currentIndex] || null

  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showPlayIcon, setShowPlayIcon] = useState(true)
  const [showLikeBurst, setShowLikeBurst] = useState(false)

  const [videoAspect, setVideoAspect] = useState(9 / 16)
  const [isLandscape, setIsLandscape] = useState(false)
  const [dims, setDims] = useState({ width: 0, height: 0 })
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  // 3-dot menu / delete flow
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwnReel = currentReel && user?._id?.toString() === currentReel?.author?._id?.toString()
  const canDeleteReel = isOwnReel || user?.role === "admin"

  // Desktop only: size the reel "card" to fit the available space while keeping
  // the video's aspect ratio. On mobile the reel simply fills the screen, so
  // no sizing is needed.
  const computeDims = useCallback(() => {
    setIsMobile(window.innerWidth < 768)

    const section = sectionRef.current
    if (!section) return

    const rect = section.getBoundingClientRect()

    const horizontalPadding = 48
    const verticalPadding = 32

    const availWidth = rect.width - horizontalPadding
    const availHeight = rect.height - verticalPadding

    let width = availHeight * videoAspect
    let height = availHeight

    if (width > availWidth) {
      width = availWidth
      height = width / videoAspect
    }

    const maxWidth = Math.min(availWidth, 780)
    if (width > maxWidth) {
      width = maxWidth
      height = width / videoAspect
    }

    setDims({ width: Math.round(width), height: Math.round(height) })
  }, [videoAspect])

  useEffect(() => {
    computeDims()
    window.addEventListener('resize', computeDims)
    return () => window.removeEventListener('resize', computeDims)
  }, [computeDims])

  useEffect(() => {
    if (!currentReel) return
    const seeded = currentReel.aspectRatio === "16:9" ? 16 / 9 : 9 / 16
    setVideoAspect(seeded)
    setIsLandscape(seeded > 1)
  }, [currentReel])

  const handleLoadedMetadata = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) return
    const aspect = video.videoWidth / video.videoHeight
    setVideoAspect(aspect)
    setIsLandscape(aspect > 1)
  }

  const loadReels = useCallback(async () => {
    if (isFetchingRef.current || !hasMore) return
    isFetchingRef.current = true
    setIsFeedLoading(true)

    try {
      const response = await axios.get(`${BASE_URL}/reels/get-reels`, {
        ...authHeaders(),
        params: { page, limit: LIMIT },
      })

      const { reels: newReels, hasMore: more } = response.data
      setReels((prev) => [...prev, ...newReels])
      setHasMore(more)
      setPage((prev) => prev + 1)
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load reels')
    } finally {
      setIsFeedLoading(false)
      isFetchingRef.current = false
    }
  }, [page, hasMore])

  useEffect(() => {
    loadReels()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (reels.length === 0) return
    if (currentIndex >= reels.length - 2 && hasMore) {
      loadReels()
    }
  }, [currentIndex, reels.length, hasMore, loadReels])

  const goToNext = () => {
    if (currentIndex < reels.length - 1) {
      setCurrentIndex((i) => i + 1)
    }
  }

  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1)
    }
  }

  // Keyboard navigation (desktop)
  useEffect(() => {
    const onKeyDown = (e) => {
      const tag = e.target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (isCommentsOpen || isShareOpen || isDeleteConfirmOpen) return
      if (e.key === 'ArrowDown') goToNext()
      if (e.key === 'ArrowUp') goToPrev()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  // Mouse wheel / trackpad navigation (desktop), throttled so one scroll = one reel
  const handleWheel = (e) => {
    if (isCommentsOpen || isShareOpen || isDeleteConfirmOpen) return
    if (wheelLock.current || Math.abs(e.deltaY) < 20) return
    wheelLock.current = true
    if (e.deltaY > 0) goToNext()
    else goToPrev()
    window.setTimeout(() => {
      wheelLock.current = false
    }, 600)
  }

  // Swipe up / down navigation (touch)
  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    if (touchStartY.current == null) return
    const delta = e.changedTouches[0].clientY - touchStartY.current
    touchStartY.current = null
    if (isCommentsOpen) return
    if (Math.abs(delta) < SWIPE_THRESHOLD) return
    if (delta < 0) goToNext()
    else goToPrev()
  }

  useEffect(() => {
    setIsPlaying(false)
    setShowPlayIcon(true)
    const video = videoRef.current
    if (video) {
      video.currentTime = 0
      video.play().then(() => {
        setIsPlaying(true)
        setShowPlayIcon(false)
      }).catch(() => {
      })
    }
  }, [currentIndex])

  useEffect(() => {
    setIsCommentsOpen(false)
    setIsShareOpen(false)
    setIsMenuOpen(false)
    setIsDeleteConfirmOpen(false)
  }, [currentIndex])

  // close the 3-dot menu when clicking anywhere outside it
  useEffect(() => {
    if (!isMenuOpen) return
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isMenuOpen])

  const togglePlay = () => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      video.play()
      setIsPlaying(true)
      setShowPlayIcon(false)
    } else {
      video.pause()
      setIsPlaying(false)
      setShowPlayIcon(true)
    }
  }


  const triggerLike = async () => {
    if (!currentReel) return
    const reelId = currentReel._id
    const wasLiked = currentReel.isLiked

    setReels((prev) =>
      prev.map((r, i) =>
        i === currentIndex
          ? {
              ...r,
              isLiked: !wasLiked,
              likesCount: wasLiked ? r.likesCount - 1 : r.likesCount + 1,
            }
          : r
      )
    )

    setShowLikeBurst(true)
    window.clearTimeout(triggerLike._t)
    triggerLike._t = window.setTimeout(() => setShowLikeBurst(false), 900)

    try {
      await axios.post(`${BASE_URL}/reels/${reelId}/like`, {}, authHeaders())
      await refreshUser()
    } catch (error) {
      setReels((prev) =>
        prev.map((r, i) =>
          i === currentIndex
            ? {
                ...r,
                isLiked: wasLiked,
                likesCount: wasLiked ? r.likesCount + 1 : r.likesCount - 1,
              }
            : r
        )
      )
      toast.error('Failed to update like')
    }
  }

  const triggerSave = async () => {
    if (!currentReel) return
    const reelId = currentReel._id
    const wasSaved = currentReel.isSaved

    setReels((prev) =>
      prev.map((r, i) =>
        i === currentIndex
          ? {
              ...r,
              isSaved: !wasSaved,
              savesCount: wasSaved ? r.savesCount - 1 : r.savesCount + 1,
            }
          : r
      )
    )

    try {
      await axios.post(`${BASE_URL}/reels/${reelId}/toggle-save`, {}, authHeaders())
      await refreshUser()
    } catch (error) {
      setReels((prev) =>
        prev.map((r, i) =>
          i === currentIndex
            ? {
                ...r,
                isSaved: wasSaved,
                savesCount: wasSaved ? r.savesCount + 1 : r.savesCount - 1,
              }
            : r
        )
      )
      toast.error('Failed to update save')
    }
  }

  const handleShared = (newSharesCount) => {
    setReels((prev) =>
      prev.map((r, i) =>
        i === currentIndex ? { ...r, sharesCount: newSharesCount } : r
      )
    )
  }

  // Keeps the reel's commentsCount in sync with the comments overlay —
  // mirrors handleShared above. Supports both an absolute count and a delta.
  const handleCommentCountChange = (payload) => {
    setReels((prev) =>
      prev.map((r, i) => {
        if (i !== currentIndex) return r
        const newCount =
          typeof payload === "number"
            ? payload
            : Math.max(0, (r.commentsCount || 0) + (payload?.delta || 0))
        return { ...r, commentsCount: newCount }
      })
    )
  }

  const handleDeleteReel = async () => {
    if (!currentReel) return
    setIsDeleting(true)
    try {
      await axios.delete(`${BASE_URL}/reels/${currentReel._id}/delete`, authHeaders())
      toast.success("Reel deleted")

      setIsDeleteConfirmOpen(false)
      setIsMenuOpen(false)

      setReels((prev) => {
        const next = prev.filter((r) => r._id !== currentReel._id)
        // keep the index in bounds once the current reel is removed
        setCurrentIndex((idx) => Math.min(idx, Math.max(next.length - 1, 0)))
        return next
      })
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete reel")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleVideoClick = () => {
    if (clickTimer.current) {
      clearTimeout(clickTimer.current)
      clickTimer.current = null
      triggerLike()
    } else {
      clickTimer.current = setTimeout(() => {
        togglePlay()
        clickTimer.current = null
      }, 220)
    }
  }

  useEffect(() => {
    return () => {
      if (clickTimer.current) clearTimeout(clickTimer.current)
    }
  }, [])

  // Mobile: the reel fills the whole screen (portrait = full width + height,
  // landscape = full width, centered on black). Desktop: a sized "card".
  const reelBoxStyle = isMobile
    ? { width: '100%', height: '100%' }
    : dims.width && dims.height
      ? { width: dims.width, height: dims.height }
      : { width: '90vw', maxWidth: 380, aspectRatio: '9 / 16' }

  const overlayShadow = 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.7)]'

  return (
    <div className="reelsPage w-[100vw] h-[100dvh] bg-[var(--bg-app)] flex justify-center items-center text-[var(--text-primary)] overflow-hidden">
      <IconSidebar />

      <div
        ref={sectionRef}
        onWheel={handleWheel}
        className="reelSection w-full md:w-[80%] h-full flex justify-center items-center overflow-hidden bg-[var(--bg-app)] relative overscroll-none"
      >
        {/* up / down nav arrows — desktop only, floating over media, stays fixed dark */}
        <div className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 flex-col gap-4 z-30">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="w-10 h-10 rounded-full bg-neutral-800/70 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white"
          >
            <ChevronUp size={18} />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex >= reels.length - 1}
            className="w-10 h-10 rounded-full bg-neutral-800/70 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {!currentReel && !isFeedLoading && (
          <div className="text-[var(--text-muted)] text-sm">No reels yet</div>
        )}

        {currentReel && (
          // The reel box: full screen on mobile, a rounded card on desktop.
          // Everything (video, action icons, creator info) lives inside it.
          <div
            className="relative bg-black md:rounded-md overflow-hidden select-none cursor-pointer shrink-0"
            style={reelBoxStyle}
            onClick={handleVideoClick}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <video
              ref={videoRef}
              key={currentReel._id}
              className={`w-full h-full ${isLandscape ? 'object-contain bg-black' : 'object-cover'}`}
              src={currentReel.media.url}
              poster={currentReel.media.thumbnailUrl}
              loop
              muted={isMuted}
              playsInline
              onLoadedMetadata={handleLoadedMetadata}
              onClick={(e) => e.stopPropagation()}
              style={{ pointerEvents: 'none' }}
            />

            {/* readability gradient behind the bottom overlays */}
            <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

            {showPlayIcon && !isPlaying && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-black/50 flex items-center justify-center">
                  <Play size={22} fill="white" className="ml-1 text-white" />
                </div>
              </div>
            )}

            {showLikeBurst && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <img
                  src="/images/gradient-like-icon.png"
                  alt="like"
                  className="w-32 sm:w-40 md:w-48 h-auto like-burst-anim"
                />
              </div>
            )}

            {/* mute toggle — top right so the bottom-right corner is free for the action icons */}
            <button
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10"
              onClick={(e) => {
                e.stopPropagation()
                setIsMuted((m) => !m)
              }}
            >
              {isMuted ? <VolumeX size={16} className="text-white" /> : <Volume2 size={16} className="text-white" />}
            </button>

            {/* bottom-left creator info — overlays the video, stays fixed white */}
            {!isCommentsOpen && (
              <div
                onClick={stop}
                onTouchStart={stop}
                onTouchEnd={stop}
                className="absolute left-3 right-16 bottom-3 md:bottom-4 z-10 text-white cursor-default"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <NavLink to={`/user/get-profile/${currentReel?.author?._id}`}>
                    <img
                      src={currentReel.author?.profilePic || "/images/default-profile-pic.jpg"}
                      alt={currentReel.author?.username}
                      className="w-8 h-8 rounded-full border border-yellow-400 object-cover"
                    />
                  </NavLink>
                  <NavLink to={`/user/get-profile/${currentReel?.author?._id}`}>
                    <span className={`font-semibold text-sm flex items-center gap-1 ${overlayShadow}`}>
                      {currentReel.author?.username}
                      {currentReel.author?.role === "admin" && (
                        <BadgeCheck size={13} className="text-sky-400" />
                      )}
                    </span>
                  </NavLink>

                  {!user?.following?.some(
                    (id) =>
                      id.toString() === currentReel?.author?._id?.toString()
                  ) &&
                    user?._id?.toString() !== currentReel?.author?._id?.toString() && (
                      <>
                        <span className="text-sm text-neutral-300">·</span>
                        <button className={`text-sky-400 text-sm font-semibold ${overlayShadow}`}>
                          Follow
                        </button>
                      </>
                    )}
                </div>

                {currentReel.location && (
                  <div className={`flex items-center gap-1 text-xs text-neutral-200 mt-1 ml-10 ${overlayShadow}`}>
                    <MapPin size={12} />
                    {currentReel.location}
                  </div>
                )}

                {currentReel.caption && (
                  <p className={`text-sm mt-2 line-clamp-3 ${overlayShadow}`}>{currentReel.caption}</p>
                )}
              </div>
            )}

            {/* right action rail — bottom-right corner, vertical, on top of the video */}
            {!isCommentsOpen && (
              <div
                onClick={stop}
                onTouchStart={stop}
                onTouchEnd={stop}
                className="absolute right-2 bottom-[76px] md:bottom-4 z-10 flex flex-col items-center gap-5 text-white cursor-default"
              >
                <button className="flex flex-col items-center gap-1 cursor-pointer" onClick={triggerLike}>
                  <Heart
                    size={26}
                    className={`${currentReel.isLiked ? 'text-red-500' : 'text-white'} ${overlayShadow}`}
                    fill={currentReel.isLiked ? 'currentColor' : 'none'}
                  />
                  <span className={`text-xs ${overlayShadow}`}>{formatCount(currentReel.likesCount)}</span>
                </button>

                <button
                  onClick={() => setIsCommentsOpen(true)}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                >
                  <MessageCircle size={26} className={overlayShadow} />
                  <span className={`text-xs ${overlayShadow}`}>{formatCount(currentReel.commentsCount)}</span>
                </button>

                <button
                  onClick={() => setIsShareOpen(true)}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                >
                  <Send size={26} className={overlayShadow} />
                  <span className={`text-xs ${overlayShadow}`}>{formatCount(currentReel.sharesCount)}</span>
                </button>

                <button className="cursor-pointer" onClick={triggerSave}>
                  <Bookmark
                    size={24}
                    className={overlayShadow}
                    fill={currentReel.isSaved ? 'currentColor' : 'none'}
                  />
                </button>

                {canDeleteReel && (
                  <div ref={menuRef} className="relative">
                    <button
                      className="cursor-pointer"
                      onClick={() => setIsMenuOpen((prev) => !prev)}
                      aria-label="Reel options"
                    >
                      <MoreHorizontal size={24} className={overlayShadow} />
                    </button>

                    {isMenuOpen && (
                      <div className="absolute right-0 bottom-[130%] w-[160px] bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl shadow-2xl overflow-hidden z-20">
                        <button
                          onClick={() => {
                            setIsMenuOpen(false)
                            setIsDeleteConfirmOpen(true)
                          }}
                          className="w-full text-left px-4 py-3 text-sm font-semibold text-[var(--color-danger)] hover:bg-[var(--bg-row-hover)] cursor-pointer transition"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* comments overlay — wrapped so taps/swipes inside it never
                toggle play, like, or change the reel */}
            {isCommentsOpen && (
              <div onClick={stop} onTouchStart={stop} onTouchEnd={stop}>
                <ReelCommentsOverlay
                  reelId={currentReel._id}
                  isOpen={isCommentsOpen}
                  authorId={currentReel?.author?._id}
                  authorRole={currentReel?.author?.role}
                  onClose={() => setIsCommentsOpen(false)}
                  onCommentCountChange={handleCommentCountChange}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {isShareOpen && currentReel && (
        <ShareOverlay
          reel={currentReel}
          onClose={() => setIsShareOpen(false)}
          onShared={handleShared}
        />
      )}

      {/* Delete confirmation */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/70 p-4">
          <div className="w-full max-w-[340px] rounded-2xl bg-[var(--bg-surface)] overflow-hidden text-center shadow-2xl">
            <div className="px-6 py-6 border-b border-[var(--border-soft)]">
              <h3 className="text-[var(--text-primary)] font-semibold text-base mb-2">Delete reel?</h3>
              <p className="text-[var(--text-muted)] text-sm">
                This action cannot be undone. This reel will be permanently removed.
              </p>
            </div>
            <button
              onClick={handleDeleteReel}
              disabled={isDeleting}
              className="w-full py-3 text-[var(--color-danger)] font-semibold text-sm border-b border-[var(--border-soft)] hover:bg-[var(--bg-row-hover)] transition cursor-pointer disabled:opacity-50"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
            <button
              onClick={() => setIsDeleteConfirmOpen(false)}
              disabled={isDeleting}
              className="w-full py-3 text-[var(--text-primary)] font-medium text-sm hover:bg-[var(--bg-row-hover)] transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes likeBurst {
          0% { transform: scale(0); opacity: 0; }
          25% { transform: scale(1.15); opacity: 1; }
          40% { transform: scale(1); opacity: 1; }
          80% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.3); opacity: 0; }
        }
        .like-burst-anim {
          animation: likeBurst 0.9s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

export default ReelsPage
