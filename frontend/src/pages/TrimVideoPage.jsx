import React, { useState, useEffect, useRef, useCallback } from "react";
import { trimVideoClientSide } from "../utils/trimVideoClient";
import { Play } from "lucide-react";

const MAX_DURATION = 15; // hard cap on clip length, seconds — matches the app's reel limit
const MIN_DURATION = 1; // shortest allowed clip, seconds
const THUMB_COUNT = 12; // filmstrip frames

const ASPECT_OPTIONS = [
  { label: "9 : 16", value: "9:16", ratio: 9 / 16 },
  { label: "16 : 9", value: "16:9", ratio: 16 / 9 },
];

const clamp = (v, min, max) => Math.max(min, Math.min(v, max));

const formatTime = (s) => {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/**
 * Generates a small filmstrip of frames from the source video by seeking
 * an offscreen <video> element. Runs independently of the visible preview
 * video so it never fights with playback/scrubbing.
 */
const useFilmstrip = (file, duration) => {
  const [thumbnails, setThumbnails] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!file || !duration) {
      setThumbnails([]);
      return;
    }

    let cancelled = false;
    const url = URL.createObjectURL(file);
    const offVideo = document.createElement("video");
    offVideo.muted = true;
    offVideo.playsInline = true;
    offVideo.preload = "auto";
    offVideo.src = url;

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    const seekTo = (t) =>
      new Promise((resolve) => {
        const onSeeked = () => {
          offVideo.removeEventListener("seeked", onSeeked);
          resolve();
        };
        offVideo.addEventListener("seeked", onSeeked);
        offVideo.currentTime = t;
      });

    const run = async () => {
      setLoading(true);
      try {
        await new Promise((resolve, reject) => {
          offVideo.onloadedmetadata = resolve;
          offVideo.onerror = reject;
        });

        canvas.width = 96;
        canvas.height =
          Math.round(96 * (offVideo.videoHeight / offVideo.videoWidth)) || 170;

        const frames = [];
        for (let i = 0; i < THUMB_COUNT; i++) {
          if (cancelled) return;
          const t = (duration * (i + 0.5)) / THUMB_COUNT;
          // eslint-disable-next-line no-await-in-loop
          await seekTo(Math.min(t, Math.max(duration - 0.05, 0)));
          if (cancelled) return;
          try {
            ctx.drawImage(offVideo, 0, 0, canvas.width, canvas.height);
            frames.push(canvas.toDataURL("image/jpeg", 0.6));
          } catch {
            // If a frame can't be drawn for some reason, just skip it —
            // the timeline is still fully usable without a filmstrip.
          }
        }
        if (!cancelled) setThumbnails(frames);
      } catch {
        // Non-fatal — timeline works fine without thumbnails.
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [file, duration]);

  return { thumbnails, loading };
};

const TrimVideoPage = ({ video, setTrimmedMedia, setTrimData, setAspectRatio, next, back }) => {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const dragOffsetRef = useRef(0);

  const [videoUrl, setVideoUrl] = useState(null);
  const [duration, setDuration] = useState(0);

  // The trim window is now: a position (start) + a length (clipSeconds),
  // exactly like the song trimmer — drag the window to move it, use the
  // slider to change how long it is.
  const [start, setStart] = useState(0);
  const [clipSeconds, setClipSeconds] = useState(MAX_DURATION);

  const [previewTime, setPreviewTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState(ASPECT_OPTIONS[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  const { thumbnails, loading: thumbsLoading } = useFilmstrip(video, duration);

  useEffect(() => {
    if (!video) {
      setVideoUrl(null);
      return;
    }
    const url = URL.createObjectURL(video);
    setVideoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [video]);

  const handleLoadedMetadata = () => {
    const d = videoRef.current?.duration || 0;
    const initialClip = clamp(d, MIN_DURATION, MAX_DURATION);
    setDuration(d);
    setClipSeconds(initialClip);
    setStart(0);
  };

  const end = start + clipSeconds;

  // Keep start valid whenever clip length or duration changes — e.g.
  // lengthening the clip near the end of the video shouldn't push the
  // window past the video's real end.
  useEffect(() => {
    setStart((s) => clamp(s, 0, Math.max(0, duration - clipSeconds)));
  }, [clipSeconds, duration]);

  const sliderMax = Math.max(MIN_DURATION, Math.min(MAX_DURATION, duration || MAX_DURATION));
  const sliderMin = Math.min(MIN_DURATION, sliderMax);

  const handleClipSecondsChange = (val) => {
    const v = clamp(val, sliderMin, sliderMax);
    setClipSeconds(v);
  };

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setPreviewTime(v.currentTime);
    if (v.currentTime >= end || v.currentTime < start - 0.05) {
      v.currentTime = start;
    }
  }, [start, end]);

  const togglePreview = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isPlaying) {
      v.pause();
      setIsPlaying(false);
    } else {
      v.currentTime = start;
      v.play();
      setIsPlaying(true);
    }
  };

  // --- Timeline drag handling -------------------------------------------

  const timeFromClientX = (clientX) => {
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
    return ratio * duration;
  };

  const pauseForScrub = () => {
    const v = videoRef.current;
    if (v && !v.paused) {
      v.pause();
      setIsPlaying(false);
    }
  };

  const handleWindowPointerDown = (e) => {
    if (!duration) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    pauseForScrub();
    const t = timeFromClientX(e.clientX);
    dragOffsetRef.current = t - start;
    setIsDragging(true);
  };

  const handleWindowPointerMove = (e) => {
    if (!isDragging || !duration) return;
    const t = timeFromClientX(e.clientX);
    const newStart = clamp(t - dragOffsetRef.current, 0, Math.max(0, duration - clipSeconds));
    setStart(newStart);
    if (videoRef.current) {
      videoRef.current.currentTime = newStart;
      setPreviewTime(newStart);
    }
  };

  const handleWindowPointerUp = (e) => {
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    setIsDragging(false);
  };

  // Tapping anywhere else on the track jumps the window there, centered
  // on the tap point.
  const handleTrackPointerDown = (e) => {
    if (!duration || e.target.dataset.trimWindow) return;
    pauseForScrub();
    const t = timeFromClientX(e.clientX);
    const newStart = clamp(t - clipSeconds / 2, 0, Math.max(0, duration - clipSeconds));
    setStart(newStart);
    if (videoRef.current) {
      videoRef.current.currentTime = newStart;
      setPreviewTime(newStart);
    }
  };

  // ------------------------------------------------------------------------

  const handleNext = async () => {
    setIsProcessing(true);

    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    try {
      // Actually cut the file down to just the selected window — this is what
      // shrinks the upload, not just recording start/end numbers.
      const trimmedFile = await trimVideoClientSide(video, start, clipSeconds);
      setTrimmedMedia(trimmedFile);
      setTrimData({ trimStart: 0, trimDuration: clipSeconds }); // file is already trimmed
    } catch (err) {
      // Browser can't do client-side trimming (e.g. older Safari) — fall back
      // to sending the original file + trim metadata, same as before.
      console.warn("Client-side trim unavailable, falling back:", err.message);
      setTrimmedMedia(null);
      setTrimData({ trimStart: start, trimDuration: clipSeconds });
    } finally {
      setAspectRatio(selectedAspect.value);
      setIsProcessing(false);
      next();
    }
  };

  const windowLeftPct = duration ? (start / duration) * 100 : 0;
  const windowWidthPct = duration ? (clipSeconds / duration) * 100 : 100;
  const playheadPct = duration ? (previewTime / duration) * 100 : 0;

  return (
    <div className="w-[100vw] h-[100vh] flex justify-center items-center bg-[var(--bg-app)]">
      <div className="cropContainerOverlay w-full h-full flex justify-center items-center bg-[rgba(0,0,0,0)] px-2 sm:px-4">
        <div className="cropContainer relative w-full max-w-[500px] md:w-[70%] lg:w-[50%] xl:w-[35%] h-[80%] rounded-2xl bg-[var(--bg-surface)] overflow-hidden flex flex-col">
          <div className="header w-full h-[40px] px-3 sm:px-4 flex justify-between items-center bg-[var(--bg-app)] shrink-0">
            <div onClick={back} className="back cursor-pointer">
              <img
                src="/images/arrow-back-icon.png"
                className="w-[26px] h-[26px] sm:w-[30px] sm:h-[30px]"
                alt="Back"
              />
            </div>
            <div className="heading text-[var(--text-primary)] text-[16px] sm:text-[18px] font-semibold">
              Trim
            </div>
            <div
              onClick={isProcessing ? undefined : handleNext}
              className={`next text-sm sm:text-base ${
                isProcessing
                  ? "text-[var(--text-muted)] cursor-not-allowed"
                  : "text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] hover:underline cursor-pointer"
              }`}
            >
              {isProcessing ? "Processing..." : "Next"}
            </div>
          </div>

          <hr />

          <div className="relative w-full flex-1 min-h-0 bg-[var(--bg-elevated)] flex items-center justify-center overflow-hidden">
            {videoUrl && (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="max-w-full max-h-full"
                  onLoadedMetadata={handleLoadedMetadata}
                  onTimeUpdate={handleTimeUpdate}
                  muted={false}
                  playsInline
                  onClick={togglePreview}
                />

                <div
                  className="pointer-events-none absolute border-2 border-white/80"
                  style={{
                    aspectRatio: `${selectedAspect.ratio}`,
                    height: "90%",
                    maxWidth: "90%",
                  }}
                />

                {!isPlaying && (
                  <button
                    onClick={togglePreview}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="w-14 h-14 rounded-full bg-black/50 flex items-center justify-center">
                      <Play size={22} fill="white" className="ml-0" />
                    </div>
                  </button>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 animate-spin p-[3px]">
                      <div className="w-full h-full relative bg-[var(--bg-loading)] rounded-full">
                        <div className="block absolute top-[-7px] w-[20px] h-[20px] rounded-full bg-[var(--bg-loading)]"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="w-full flex justify-center gap-2 py-2 bg-[var(--bg-panel)] shrink-0">
            {ASPECT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedAspect(opt)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                  selectedAspect.value === opt.value
                    ? "bg-[var(--accent-indigo)] text-[var(--text-on-brand)]"
                    : "bg-[var(--bg-menu)] text-[var(--text-secondary)]"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* --- Trim scrubber: drag the highlighted window to move it, use
              the slider below to change how long the clip is. Same pattern
              as the song trimmer. --- */}
          <div className="w-full px-4 py-3 bg-[var(--bg-panel)] shrink-0">
            <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-2">
              <span>Start: {start.toFixed(1)}s</span>
              <span className="text-[var(--text-primary)] font-medium">
                {clipSeconds.toFixed(1)}s clip
              </span>
              <span>End: {end.toFixed(1)}s</span>
            </div>

            <div
              ref={trackRef}
              onPointerDown={handleTrackPointerDown}
              className="relative w-full h-16 rounded-xl overflow-hidden bg-[var(--bg-elevated)] ring-1 ring-white/10 select-none touch-none cursor-pointer"
            >
              {/* Filmstrip background */}
              {thumbnails.length > 0 ? (
                <div className="absolute inset-0 flex">
                  {thumbnails.map((src, i) => (
                    <img
                      key={i}
                      src={src}
                      alt=""
                      draggable={false}
                      className="h-full flex-1 object-cover"
                    />
                  ))}
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[var(--text-muted)]">
                  {thumbsLoading ? "Loading preview…" : ""}
                </div>
              )}

              {/* Dim everything outside the selected window */}
              <div
                className="absolute inset-y-0 left-0 bg-black/60 pointer-events-none"
                style={{ width: `${windowLeftPct}%` }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-black/60 pointer-events-none"
                style={{ width: `${100 - windowLeftPct - windowWidthPct}%` }}
              />

              {/* Draggable selected window */}
              <div
                data-trim-window="true"
                onPointerDown={handleWindowPointerDown}
                onPointerMove={handleWindowPointerMove}
                onPointerUp={handleWindowPointerUp}
                onPointerCancel={handleWindowPointerUp}
                className="absolute inset-y-0 rounded-lg ring-2 ring-[var(--accent-indigo)] cursor-grab active:cursor-grabbing touch-none"
                style={{
                  left: `${windowLeftPct}%`,
                  width: `${windowWidthPct}%`,
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0)",
                }}
              >
                {/* grip bars, purely visual */}
                <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-white/90" />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 w-1 h-6 rounded-full bg-white/90" />
              </div>

              {/* Playhead */}
              {duration > 0 && (
                <div
                  className="absolute inset-y-0 w-[2px] bg-white pointer-events-none"
                  style={{ left: `${playheadPct}%` }}
                />
              )}
            </div>

            <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-1">
              <span>0:00</span>
              <span>{formatTime(duration)}</span>
            </div>

            <div className="mt-3">
              <div className="flex items-center justify-between text-[11px] text-[var(--text-muted)] mb-1">
                <span>Clip length</span>
                <span className="text-[var(--text-primary)] font-medium">
                  {clipSeconds.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min={sliderMin}
                max={sliderMax}
                step={0.1}
                value={clipSeconds}
                onChange={(e) => handleClipSecondsChange(Number(e.target.value))}
                className="w-full accent-[var(--accent-indigo)]"
                aria-label="Clip length in seconds"
              />
            </div>

            <div className="text-[10px] text-[var(--text-muted)] mt-2 text-center">
              Drag the highlighted window to choose your {clipSeconds.toFixed(1)}s clip
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrimVideoPage;
