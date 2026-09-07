// SongTrimClipper.jsx
import React from "react";
import { Rnd } from "react-rnd";

const CLIP_SECONDS = 15;
const TRACK_HEIGHT = 56;

// Instagram-style trimmer: a fixed-width (15s) draggable window sliding
// along a bar representing the full song, styled with IG's gradient.
const SongTrimClipper = ({ duration, startTime, onChange, trackWidth = 220 }) => {
  const safeDuration = Math.max(duration, CLIP_SECONDS); // guard against very short tracks
  const pxPerSecond = trackWidth / safeDuration;
  const clipWidthPx = Math.min(CLIP_SECONDS, safeDuration) * pxPerSecond;
  const maxX = trackWidth - clipWidthPx;

  return (
    <div
      className="relative rounded-lg overflow-hidden select-none"
      style={{ width: trackWidth, height: TRACK_HEIGHT, background: "#2a2a2a" }}
    >
      {/* decorative waveform bars — no real waveform data, just visual texture */}
      <div className="absolute inset-0 flex items-center gap-[2px] px-1 opacity-30 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-white rounded-full"
            style={{ height: `${20 + Math.abs(Math.sin(i * 0.7)) * 60}%` }}
          />
        ))}
      </div>

      <Rnd
        size={{ width: clipWidthPx, height: TRACK_HEIGHT }}
        position={{ x: (startTime / safeDuration) * trackWidth, y: 0 }}
        enableResizing={false}
        dragAxis="x"
        bounds="parent"
        onDragStop={(e, d) => {
          const clampedX = Math.max(0, Math.min(d.x, maxX));
          const newStart = (clampedX / trackWidth) * safeDuration;
          onChange(Math.round(newStart * 10) / 10);
        }}
        style={{
          border: "3px solid transparent",
          borderRadius: 8,
          borderImage:
            "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888) 1",
          boxSizing: "border-box",
          cursor: "grab",
        }}
      >
        <div className="w-full h-full bg-white/10 flex items-center justify-between px-1 pointer-events-none">
          <div className="w-1.5 h-7 rounded-full bg-gradient-to-b from-[#f09433] via-[#dc2743] to-[#bc1888]" />
          <div className="w-1.5 h-7 rounded-full bg-gradient-to-b from-[#f09433] via-[#dc2743] to-[#bc1888]" />
        </div>
      </Rnd>
    </div>
  );
};

export default SongTrimClipper;