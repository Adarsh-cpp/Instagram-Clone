// HighlightViewerPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { X } from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../utils/axiosInstance";

const DEFAULT_IMAGE_SECONDS = 5;

const HighlightViewerPage = () => {
  const { highlightId } = useParams();
  const navigate = useNavigate();

  const [highlight, setHighlight] = useState(null);
  const [loading, setLoading] = useState(true);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [playing, setPlaying] = useState(true);

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

  const onPointerDown = () => setPlaying(false);
  const onPointerUp = (side) => {
    setPlaying(true);
    if (side === "left") handlePrev();
    else handleNext();
  };

  if (loading || !currentStory) return null;

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden flex items-center justify-center">
      <div
        className="relative rounded-2xl overflow-hidden bg-neutral-900"
        style={{ width: 380, maxWidth: "95vw", height: "90vh" }}
      >
        <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
          {stories.map((s, i) => (
            <div key={s._id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full"
                style={{ width: i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%" }}
              />
            </div>
          ))}
        </div>

        <div className="absolute top-5 left-0 right-0 flex items-center justify-between px-3 pt-2 z-20">
          <p className="text-white text-sm font-semibold truncate">{highlight.title}</p>
          <button onClick={() => navigate(-1)} className="text-white">
            <X size={22} />
          </button>
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
      </div>
    </div>
  );
};

export default HighlightViewerPage;