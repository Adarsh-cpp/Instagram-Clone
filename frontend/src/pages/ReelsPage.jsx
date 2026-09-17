import React, { useRef, useState, useEffect, useCallback } from 'react'
import IconSidebar from '../components/IconSidebar'
import {
  Heart,
  MessageCircle,
  Repeat2,
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

const authHeaders = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("authToken")}` },
})

const formatCount = (n = 0) => {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return n
}

const ReelsPage = () => {

  const { user, refreshUser } = useAuth();

  const videoRef = useRef(null)
  const sectionRef = useRef(null)
  const clickTimer = useRef(null)
  const isFetchingRef = useRef(false)
  const menuRef = useRef(null)

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

  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

  // 3-dot menu / delete flow
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const isOwnReel = currentReel && user?._id?.toString() === currentReel?.author?._id?.toString()

  const computeDims = useCallback(() => {
    const section = sectionRef.current
    if (!section) return

    const isMobile = window.innerWidth < 768
    const rect = section.getBoundingClientRect()

    const railSpace = isMobile ? 0 : 72
    const horizontalPadding = isMobile ? 16 : 48
    const verticalPadding = isMobile ? 96 : 64

    const availWidth = rect.width - railSpace - horizontalPadding
    const availHeight = rect.height - verticalPadding

    let width = availHeight * videoAspect
    let height = availHeight

    if (width > availWidth) {
      width = availWidth
      height = width / videoAspect
    }

    const maxWidth = isMobile ? availWidth : Math.min(availWidth, 780)
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

  return (
    <div className="reelsPage w-[100vw] h-[100vh] bg-[var(--bg-app)] flex justify-center items-center text-[var(--text-primary)] overflow-x-hidden">
      <IconSidebar />

      <div
        ref={sectionRef}
        className="reelSection w-full md:w-[80%] min-h-full flex justify-center items-center overflow-y-auto bg-[var(--bg-app)] relative"
      >
        {/* up / down nav arrows — floating over media, stays fixed dark */}
        <div className="hidden sm:flex fixed right-4 md:right-6 top-1/2 -translate-y-1/2 flex-col gap-3 md:gap-4 z-30">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-neutral-800/70 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white"
          >
            <ChevronUp size={18} />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex >= reels.length - 1}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-neutral-800/70 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-white"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {!currentReel && !isFeedLoading && (
          <div className="text-[var(--text-muted)] text-sm">No reels yet</div>
        )}

        {currentReel && (
          <div className="relative flex items-end gap-2 md:gap-3 w-full h-full justify-center px-2">
            {/* video container — backdrop behind the media itself */}
            <div
              className="relative bg-[var(--bg-elevated)] rounded-md overflow-hidden select-none cursor-pointer shrink-0"
              style={
                dims.width && dims.height
                  ? { width: dims.width, height: dims.height }
                  : { width: '90vw', maxWidth: 380, aspectRatio: '9 / 16' }
              }
              onClick={handleVideoClick}
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

              {showPlayIcon && !isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-black/50 flex items-center justify-center">
                    <Play size={22} fill="white" className="ml-1" />
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

              {isCommentsOpen && (
                <ReelCommentsOverlay
                  reelId={currentReel._id}
                  isOpen={isCommentsOpen}
                  onClose={() => setIsCommentsOpen(false)}
                />
              )}

              <button
                className="absolute bottom-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsMuted((m) => !m)
                }}
              >
                {isMuted ? <VolumeX size={16} className="text-white" /> : <Volume2 size={16} className="text-white" />}
              </button>

              {/* bottom-left creator info — overlays the video itself, stays fixed white */}
              <div className="absolute bottom-3 left-3 right-14 sm:right-16 z-10 text-white">
                <div className="flex items-center gap-2 flex-wrap">
                  <NavLink to={`/user/get-profile/${currentReel?.author?._id}`}>
                  <img
                    src={currentReel.author?.profilePic || "/images/default-profile-pic.jpg"}
                    alt={currentReel.author?.username}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-yellow-400 object-cover"
                  />
                  </NavLink>
                  <NavLink to={`/user/get-profile/${currentReel?.author?._id}`}>
                  <span className="font-semibold text-xs sm:text-sm flex items-center gap-1">
                    {currentReel.author?.username}
                    {/* {currentReel.author?.isVerified && (
                      <BadgeCheck size={13} className="text-sky-400" />
                    )} */}
                  </span>
                  </NavLink>
                  <span className="text-xs sm:text-sm text-neutral-300">·</span>
                  
                {!user?.following?.some(
                  (id) =>
                    id.toString() === currentReel?.author?._id?.toString()
                ) &&
                  user?._id?.toString() !== currentReel?.author?._id?.toString() && (
                    <button className="text-sky-400 text-xs sm:text-sm font-semibold">
                      Follow
                    </button>
                  )}
                </div>

                {currentReel.location && (
                  <div className="flex items-center gap-1 text-[11px] sm:text-xs text-neutral-300 mt-0.5 ml-9 sm:ml-10">
                    <MapPin size={12} />
                    {currentReel.location}
                  </div>
                )}

                {currentReel.caption && (
                  <p className="text-xs sm:text-sm mt-2">{currentReel.caption}</p>
                )}
              </div>
            </div>

            {/* right action rail — sits on page background on desktop, so it themes */}
            <div
              className="
                flex flex-col items-center gap-4 sm:gap-5 pb-4 sm:pb-6
                sm:static absolute bottom-16 right-2 sm:right-auto
                bg-transparent text-[var(--text-primary)]
              "
            >
              <button className="flex flex-col items-center gap-1 cursor-pointer" onClick={triggerLike}>
                <Heart
                  size={24}
                  className={currentReel.isLiked ? 'text-red-500' : ''}
                  fill={currentReel.isLiked ? 'currentColor' : 'none'}
                />
                <span className="text-[11px] sm:text-xs">{formatCount(currentReel.likesCount)}</span>
              </button>

              <button
              onClick={()=>setIsCommentsOpen(!isCommentsOpen)}
              className="flex flex-col items-center gap-1 cursor-pointer">
                <MessageCircle size={24} />
                <span className="text-[11px] sm:text-xs">{formatCount(currentReel.commentsCount)}</span>
              </button>

              <button
                onClick={() => setIsShareOpen(true)}
                className="flex flex-col items-center gap-1 cursor-pointer"
              >
                <Send size={24} />
                <span className="text-[11px] sm:text-xs">{formatCount(currentReel.sharesCount)}</span>
              </button>

              <button className="cursor-pointer" onClick={triggerSave}>
                <Bookmark
                  size={20}
                  fill={currentReel.isSaved ? 'currentColor' : 'none'}
                />
              </button>

              {isOwnReel && (
                <div ref={menuRef} className="relative">
                  <button
                    className="cursor-pointer"
                    onClick={() => setIsMenuOpen((prev) => !prev)}
                    aria-label="Reel options"
                  >
                    <MoreHorizontal size={22} />
                  </button>

                  {isMenuOpen && (
                    <div className="absolute right-0 bottom-[110%] sm:bottom-auto sm:top-[110%] w-[160px] bg-[var(--bg-surface)] border border-[var(--border-soft)] rounded-xl shadow-2xl overflow-hidden z-20">
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