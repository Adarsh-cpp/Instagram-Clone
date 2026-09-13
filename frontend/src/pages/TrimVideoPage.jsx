import React, { useState, useEffect, useRef, useCallback } from "react";
import { trimVideoClientSide } from "../utils/trimVideoClient";
import { Play } from "lucide-react";

const MAX_DURATION = 30;
const ASPECT_OPTIONS = [
  { label: "9 : 16", value: "9:16", ratio: 9 / 16 },
  { label: "16 : 9", value: "16:9", ratio: 16 / 9 },
];

const TrimVideoPage = ({ video, setTrimmedMedia, setTrimData, setAspectRatio, next, back }) => {
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState(null);

  const [duration, setDuration] = useState(0);
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState(ASPECT_OPTIONS[0]);
  const [isProcessing, setIsProcessing] = useState(false);

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
    setDuration(d);
    setStart(0);
    setEnd(Math.min(d, MAX_DURATION));
  };

  const handleStartChange = (val) => {
    let s = Math.max(0, Math.min(val, duration));
    let e = end;
    if (e - s > MAX_DURATION) e = s + MAX_DURATION;
    if (e > duration) e = duration;
    if (e - s < 1) e = Math.min(s + 1, duration);
    setStart(s);
    setEnd(e);
    if (videoRef.current) videoRef.current.currentTime = s;
  };

  const handleEndChange = (val) => {
    let e = Math.max(0, Math.min(val, duration));
    let s = start;
    if (e - s > MAX_DURATION) s = e - MAX_DURATION;
    if (s < 0) s = 0;
    if (e - s < 1) s = Math.max(e - 1, 0);
    setStart(s);
    setEnd(e);
    if (videoRef.current) videoRef.current.currentTime = s;
  };

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.currentTime >= end) {
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

  const windowLength = end - start;

  const handleNext = async () => {
    setIsProcessing(true);

    if (videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause();
      setIsPlaying(false);
    }

    try {
      // Actually cut the file down to just the selected window — this is what
      // shrinks the upload, not just recording start/end numbers.
      const trimmedFile = await trimVideoClientSide(video, start, windowLength);
      setTrimmedMedia(trimmedFile);
      setTrimData({ trimStart: 0, trimDuration: windowLength }); // file is already trimmed
    } catch (err) {
      // Browser can't do client-side trimming (e.g. older Safari) — fall back
      // to sending the original file + trim metadata, same as before.
      console.warn("Client-side trim unavailable, falling back:", err.message);
      setTrimmedMedia(null);
      setTrimData({ trimStart: start, trimDuration: windowLength });
    } finally {
      setAspectRatio(selectedAspect.value);
      setIsProcessing(false);
      next();
    }
  };

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

          <div className="w-full px-4 py-3 bg-[var(--bg-panel)] shrink-0">
            <div className="flex justify-between text-xs text-[var(--text-secondary)] mb-1">
              <span>Start: {start.toFixed(1)}s</span>
              <span
                className={
                  windowLength > MAX_DURATION ? "text-[var(--color-error)]" : "text-[var(--text-secondary)]"
                }
              >
                Length: {windowLength.toFixed(1)}s / {MAX_DURATION}s max
              </span>
              <span>End: {end.toFixed(1)}s</span>
            </div>

            <label className="text-[11px] text-[var(--text-muted)]">Start</label>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={start}
              onChange={(e) => handleStartChange(Number(e.target.value))}
              className="w-full"
            />

            <label className="text-[11px] text-[var(--text-muted)]">End</label>
            <input
              type="range"
              min={0}
              max={duration}
              step={0.1}
              value={end}
              onChange={(e) => handleEndChange(Number(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrimVideoPage;