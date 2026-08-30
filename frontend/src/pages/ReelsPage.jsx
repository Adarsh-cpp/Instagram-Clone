import React, { useRef, useState, useEffect, useCallback } from 'react'
import IconSidebar from '../components/IconSidebar'
import {
  Heart,
  MessageCircle,
  Repeat2,
  ListFilter,
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

const BASE_URL = "http://localhost:4000"
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

  // ── feed state ──────────────────────────────────────────────
  const [reels, setReels] = useState([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFeedLoading, setIsFeedLoading] = useState(false)

  const currentReel = reels[currentIndex] || null

  // ── playback / UI state ─────────────────────────────────────
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(true)
  const [showPlayIcon, setShowPlayIcon] = useState(true)
  const [showLikeBurst, setShowLikeBurst] = useState(false)

  // ── aspect-ratio-driven sizing ───────────────────────────────
  const [videoAspect, setVideoAspect] = useState(9 / 16)
  const [isLandscape, setIsLandscape] = useState(false)
  const [dims, setDims] = useState({ width: 0, height: 0 })

  const [isCommentsOpen, setIsCommentsOpen] = useState(false)
  const [isShareOpen, setIsShareOpen] = useState(false)

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

  // Seed the aspect ratio from the reel's stored data immediately (no flash
  // while the video element itself is still loading), then confirm/refine
  // it once real metadata is available.
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

  // ── fetching reels ───────────────────────────────────────────
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

  // Fetch the next batch proactively once the user is within 2 reels of
  // the end of what's currently loaded.
  useEffect(() => {
    if (reels.length === 0) return
    if (currentIndex >= reels.length - 2 && hasMore) {
      loadReels()
    }
  }, [currentIndex, reels.length, hasMore, loadReels])

  // ── navigation between reels ────────────────────────────────
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

  // Reset per-reel playback UI whenever the active reel changes
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
        // autoplay blocked — user will tap to play, which is fine
      })
    }
  }, [currentIndex])

  // Close the comments sheet whenever the viewer swipes to a different reel,
  // so it never lingers open over the wrong video.
  useEffect(() => {
    setIsCommentsOpen(false)
    setIsShareOpen(false)
  }, [currentIndex])

  // ── playback controls ───────────────────────────────────────
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

    // optimistic UI update
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
      // revert on failure
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

  // updates the local sharesCount after ShareOverlay successfully registers a share
  const handleShared = (newSharesCount) => {
    setReels((prev) =>
      prev.map((r, i) =>
        i === currentIndex ? { ...r, sharesCount: newSharesCount } : r
      )
    )
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
    <div className="reelsPage w-[100vw] h-[100vh] bg-[#0c1014] flex justify-center items-center text-white overflow-x-hidden">
      <IconSidebar />

      <div
        ref={sectionRef}
        className="reelSection w-full md:w-[80%] min-h-full flex justify-center items-center overflow-y-auto bg-[#0c1014] relative"
      >
        {/* up / down nav arrows */}
        <div className="hidden sm:flex fixed right-4 md:right-6 top-1/2 -translate-y-1/2 flex-col gap-3 md:gap-4 z-30">
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-neutral-800/70 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <ChevronUp size={18} />
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex >= reels.length - 1}
            className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-neutral-800/70 hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center"
          >
            <ChevronDown size={18} />
          </button>
        </div>

        {!currentReel && !isFeedLoading && (
          <div className="text-neutral-400 text-sm">No reels yet</div>
        )}

        {currentReel && (
          <div className="relative flex items-end gap-2 md:gap-3 w-full h-full justify-center px-2">
            {/* video container */}
            <div
              className="relative bg-neutral-900 rounded-md overflow-hidden select-none cursor-pointer shrink-0"
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
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>

              {/* bottom-left creator info */}
              <div className="absolute bottom-3 left-3 right-14 sm:right-16 z-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <NavLink to={`/user/get-profile/${currentReel?.author?._id}`}>
                  <img
                    src={currentReel.author?.profilePic || "/images/default-avatar.png"}
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

            {/* right action rail */}
            <div
              className="
                flex flex-col items-center gap-4 sm:gap-5 pb-4 sm:pb-6
                sm:static absolute bottom-16 right-2 sm:right-auto
                bg-transparent 
              "
            >
              <button className="flex flex-col items-center gap-1 cursor-pointer" onClick={triggerLike}>
                <Heart
                  size={24}
                  className={currentReel.isLiked ? 'text-red-500' : 'text-white'}
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

              <button className="hidden sm:block">
                <ListFilter size={22} />
              </button>

              <button className="cursor-pointer" onClick={triggerSave}>
                <Bookmark
                  size={20}
                  className="text-white"
                  fill={currentReel.isSaved ? 'white' : 'none'}
                />
              </button>

              <button className="hidden sm:block">
                <MoreHorizontal size={22} />
              </button>
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