// HighlightViewerPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { X, MoreHorizontal } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const DEFAULT_IMAGE_SECONDS = 5;

// the owner field can come back either as a plain id string or as a
// populated user object — normalise both to an id string
const getId = (v) => (v && typeof v === "object" ? v._id : v);

// Devs Mode: glowing HUD brackets on the story card
const HUD_CORNERS = [
  "top-2 left-2 border-t-2 border-l-2 rounded-tl-lg",
  "top-2 right-2 border-t-2 border-r-2 rounded-tr-lg",
  "bottom-2 left-2 border-b-2 border-l-2 rounded-bl-lg",
  "bottom-2 right-2 border-b-2 border-r-2 rounded-br-lg",
];

const HudCorners = () => (
  <>
    {HUD_CORNERS.map((c) => (
      <span
        key={c}
        className={`absolute w-5 h-5 pointer-events-none z-20 ${c}`}
        style={{
          borderColor: "rgba(34,240,255,0.75)",
          filter: "drop-shadow(0 0 4px rgba(34,240,255,0.8))",
        }}
      />
    ))}
  </>
);

const HighlightViewerPage = () => {
  const { highlightId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDevs, lite } = useTheme();

  const [highlight, setHighlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);

  // three-dot menu + confirmation state
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmType, setConfirmType] = useState(null); // "removeStory" | "deleteHighlight" | null
  const [actionLoading, setActionLoading] = useState(false);

  const videoRef = useRef(null);
  const playingRef = useRef(true);
  playingRef.current = playing;

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axiosInstance.get(`/highlight/${highlightId}`);
        if (!res.data.highlight?.stories?.length) {
          toast.error("This highlight has no stories");
          navigate(-1);
          return;
        }
        setHighlight(res.data.highlight);
      } catch (err) {
        toast.error("Couldn't load highlight");
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightId]);

  const stories = highlight?.stories || [];
  const currentStory = stories[storyIndex];

  // only the person who created this highlight may remove stories from it
  // or delete it — everyone else just watches
  const ownerId = getId(
    highlight?.user ?? highlight?.author ?? highlight?.owner ?? highlight?.userId
  );
  const isOwner = !!user?._id && !!ownerId && String(ownerId) === String(user._id);

  const handleNext = () => {
    if (storyIndex < stories.length - 1) setStoryIndex((i) => i + 1);
    else navigate(-1);
  };
  const handlePrev = () => {
    if (storyIndex > 0) setStoryIndex((i) => i - 1);
  };

  useEffect(() => {
    if (!currentStory || currentStory.mediaType === "video") return;
    setProgress(0);
    const durationMs = (currentStory.duration || DEFAULT_IMAGE_SECONDS) * 1000;
    let raf;
    let elapsed = 0;
    let last = performance.now();

    const tick = (now) => {
      if (playingRef.current) elapsed += now - last;
      last = now;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);
      if (pct >= 100) {
        handleNext();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyIndex, currentStory?._id]);

  useEffect(() => {
    if (!currentStory || currentStory.mediaType !== "video") return;
    setProgress(0);
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (!video.duration) return;
      setProgress((video.currentTime / video.duration) * 100);
    };
    const onEnded = () => handleNext();

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.currentTime = 0;
    video.play().catch(() => {});

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storyIndex, currentStory?._id]);

  // pause the slideshow/video whenever the menu or a confirmation popup is open
  useEffect(() => {
    const shouldPause = menuOpen || !!confirmType;
    if (shouldPause) {
      setPlaying(false);
      videoRef.current?.pause();
    } else {
      setPlaying(true);
      if (currentStory?.mediaType === "video") {
        videoRef.current?.play().catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, confirmType]);

  const onPointerDown = () => {
    if (menuOpen || confirmType) return;
    setPlaying(false);
  };
  const onPointerUp = (side) => {
    if (menuOpen || confirmType) return;
    setPlaying(true);
    if (side === "left") handlePrev();
    else handleNext();
  };

  const closeMenus = () => {
    setMenuOpen(false);
    setConfirmType(null);
  };

  const handleRemoveStory = async () => {
    if (!currentStory) return;
    const removedId = currentStory._id;
    setActionLoading(true);
    try {
      const res = await axiosInstance.delete(`/highlight/${highlightId}/story/${removedId}`);

      if (res.data.deleted) {
        // that was the last story — the whole highlight is gone too
        window.dispatchEvent(
          new CustomEvent("highlightDeleted", { detail: { highlightId } })
        );
        toast.success("Highlight deleted — that was the last story");
        navigate(-1);
        return;
      }

      // backend already recomputed the cover if the removed story was it —
      // apply that here instead of leaving the old coverImage stale
      const newCoverImage = res.data.highlight?.coverImage ?? highlight.coverImage;
      const newStories = stories.filter((s) => s._id !== removedId);

      setHighlight((prev) => ({ ...prev, stories: newStories, coverImage: newCoverImage }));
      setStoryIndex((i) => Math.min(i, newStories.length - 1));

      // let the profile page (or anywhere else showing this highlight's
      // circle) know the cover changed, without needing a full refetch
      window.dispatchEvent(
        new CustomEvent("highlightCoverUpdated", {
          detail: { highlightId, coverImage: newCoverImage },
        })
      );

      toast.success("Story removed from highlight");
      closeMenus();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't remove story");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteHighlight = async () => {
    setActionLoading(true);
    try {
      await axiosInstance.delete(`/highlight/${highlightId}`);
      window.dispatchEvent(
        new CustomEvent("highlightDeleted", { detail: { highlightId } })
      );
      toast.success("Highlight deleted");
      navigate(-1);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't delete highlight");
      setActionLoading(false);
    }
  };

  if (loading || !currentStory) return null;

  return (
    <div className="w-full h-screen bg-black devs:bg-[#04050e] relative overflow-hidden flex items-center justify-center">
      {/* Devs Mode: ambient blurred backdrop */}
      {isDevs && (
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none overflow-hidden">
          {!lite && currentStory.mediaType !== "video" && (
            <img
              key={currentStory._id}
              src={currentStory.mediaUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-30 blur-3xl scale-125"
            />
          )}
          <div className="devs-grid" />
          <div className="devs-vignette" />
        </div>
      )}

      <motion.div
        {...(isDevs
          ? {
              initial: { opacity: 0, scale: 0.94, y: 20 },
              animate: { opacity: 1, scale: 1, y: 0 },
              transition: { duration: 0.45, ease: [0.2, 0.8, 0.2, 1] },
            }
          : {})}
        className="relative rounded-2xl overflow-hidden bg-neutral-900 devs:ring-1 devs:ring-[rgba(34,240,255,0.35)] devs:shadow-[0_0_70px_rgba(34,240,255,0.2),0_0_120px_rgba(139,92,246,0.15)]"
        style={{ width: 380, maxWidth: "95vw", height: "90vh" }}
      >
        {isDevs && <HudCorners />}

        <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
          {stories.map((s, i) => (
            <div key={s._id} className="h-1 flex-1 bg-white/30 devs:bg-white/15 rounded-full overflow-hidden">
              <div
                className="h-full bg-white devs:bg-gradient-to-r devs:from-[#22f0ff] devs:to-[#ff2bd6] devs:shadow-[0_0_8px_rgba(34,240,255,0.8)] rounded-full"
                style={{ width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-5 left-0 right-0 flex items-center justify-between px-3 pt-2 z-30">
          <p className="text-white text-sm font-semibold truncate devs:font-mono devs:uppercase devs:tracking-[0.15em] devs:text-xs">
            {highlight.title}
          </p>

          <div className="relative flex items-center gap-4">
            {/* three-dot menu is owner-only */}
            {isOwner && (
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="text-white devs:hover:text-[var(--devs-cyan)]"
                aria-label="More options"
              >
                <MoreHorizontal size={22} />
              </button>
            )}
            <button
              onClick={() => navigate(-1)}
              className="text-white devs:hover:text-[var(--devs-cyan)]"
              aria-label="Close"
            >
              <X size={22} />
            </button>

            {isOwner && menuOpen && (
              <>
                {/* full-screen backdrop so a tap anywhere else closes the menu */}
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-9 w-60 bg-neutral-800 devs:bg-[rgba(8,10,28,0.95)] devs:backdrop-blur-xl devs:border devs:border-[var(--border-popup)] devs:font-mono rounded-xl shadow-xl overflow-hidden z-40">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmType("removeStory");
                    }}
                    className="w-full text-left px-4 py-3 text-white text-sm hover:bg-neutral-700 devs:hover:bg-[rgba(34,240,255,0.1)] transition-colors"
                  >
                    Remove this story
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmType("deleteHighlight");
                    }}
                    className="w-full text-left px-4 py-3 text-red-500 devs:text-[var(--color-danger)] text-sm hover:bg-neutral-700 devs:hover:bg-[var(--bg-danger-hover)] transition-colors border-t border-neutral-700 devs:border-[var(--border-soft)]"
                  >
                    Delete highlight
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {currentStory.mediaType === "video" ? (
          <video
            ref={videoRef}
            src={currentStory.mediaUrl}
            muted
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <img
            src={currentStory.mediaUrl}
            alt=""
            className="w-full h-full object-cover"
            style={{ backgroundColor: currentStory.bgColor || "#000" }}
          />
        )}

        <button
          onPointerDown={onPointerDown}
          onPointerUp={() => onPointerUp("left")}
          className="absolute inset-y-0 left-0 w-1/3 z-10"
          aria-label="Previous"
        />
        <button
          onPointerDown={onPointerDown}
          onPointerUp={() => onPointerUp("right")}
          className="absolute inset-y-0 right-0 w-1/3 z-10"
          aria-label="Next"
        />
      </motion.div>

      {confirmType && (
        <div className="fixed inset-0 bg-black/60 devs:backdrop-blur-sm flex items-center justify-center z-50 px-6">
          <motion.div
            {...(isDevs
              ? {
                  initial: { scale: 0.9, y: 16, opacity: 0 },
                  animate: { scale: 1, y: 0, opacity: 1 },
                  transition: { type: "spring", stiffness: 380, damping: 28 },
                }
              : {})}
           className={`bg-neutral-900 rounded-2xl p-5 w-full max-w-xs text-center ${isDevs ? "devs-glass devs-neon-border !rounded-3xl" : ""}`}
          >
            <p className="text-white text-base font-medium mb-2 devs:font-bold">
              {confirmType === "deleteHighlight" ? "Delete highlight?" : "Remove this story?"}
            </p>
            <p className="text-neutral-400 text-sm mb-5 devs:font-mono devs:text-[11px] devs:leading-relaxed">
              {confirmType === "deleteHighlight"
                ? "This will permanently delete the whole highlight. This can't be undone."
                : stories.length <= 1
                ? "This is the only story left — removing it will delete the whole highlight."
                : "This story will be removed from the highlight. The story itself won't be deleted."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmType(null)}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-lg bg-neutral-700 text-white text-sm disabled:opacity-50 devs:bg-[var(--bg-secondary-btn)] devs:hover:bg-[var(--bg-secondary-btn-hover)] devs:font-mono"
              >
                Cancel
              </button>
              <button
                onClick={confirmType === "deleteHighlight" ? handleDeleteHighlight : handleRemoveStory}
                disabled={actionLoading}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm disabled:opacity-50 devs:bg-[var(--color-danger)] devs:font-mono devs:font-bold"
              >
                {actionLoading ? "..." : "Delete"}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default HighlightViewerPage;