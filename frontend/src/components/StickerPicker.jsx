// StickerPicker.jsx
import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Lottie } from "lottie-react";
import { GiphyFetch } from "@giphy/js-fetch-api";
import { Grid } from "@giphy/react-components";
import { Search } from "lucide-react";
import {
  STICKER_CATEGORIES,
  STATIC_STICKERS,
  ANIMATED_STICKERS,
} from "../data/stickers.data";
import { useTheme } from "../context/ThemeContext";


const giphyFetch = new GiphyFetch(import.meta.env.VITE_GIPHY_API_KEY || "");

// onSelectSticker receives a plain object shaped one of:
//   { type: "sticker", emoji, name }
//   { type: "animated_sticker", url, name }
//   { type: "gif", url, name }
const StickerPicker = ({ onSelectSticker, onClose }) => {
  const { isDevs } = useTheme();
  const [activeCategory, setActiveCategory] = useState("stickers");
  const [gifSearch, setGifSearch] = useState("");
  const pickerRef = useRef(null);

  // close on outside click/tap, same pattern as MessageBox's unsend menu
  useEffect(() => {
    const handleOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside);

    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside);
    };
  }, [onClose]);

  const fetchGifs = (offset) =>
    gifSearch.trim()
      ? giphyFetch.search(gifSearch.trim(), { offset, limit: 12 })
      : giphyFetch.trending({ offset, limit: 12 });

  const handleGifClick = (gif, e) => {
    e?.preventDefault?.();
    onSelectSticker({
      type: "gif",
      url: gif.images.original.url,
      name: gif.title || "GIF",
    });
  };

  return (
    <motion.div
      {...(isDevs
        ? {
            initial: { opacity: 0, y: 14, scale: 0.96 },
            animate: { opacity: 1, y: 0, scale: 1 },
            transition: { type: "spring", stiffness: 360, damping: 28 },
          }
        : {})}
      ref={pickerRef}
      className="stickerPicker absolute bottom-[62px] right-2 sm:right-4 w-[320px] sm:w-[360px] h-[380px] bg-[var(--bg-panel)] border border-[var(--border-popup)] rounded-2xl shadow-xl flex flex-col overflow-hidden z-[90] devs:backdrop-blur-xl devs:rounded-3xl devs:shadow-[0_0_40px_rgba(34,240,255,0.18)]"
    >
      <div className="flex border-b border-[var(--border-soft)] shrink-0">
        {STICKER_CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setActiveCategory(cat.id)}
            className={`relative flex-1 py-2.5 text-[13px] font-medium cursor-pointer transition-colors devs:font-mono devs:uppercase devs:tracking-wider devs:text-[11px] ${
              activeCategory === cat.id
                ? "text-[var(--text-primary)] border-b-2 border-[var(--accent-indigo)] devs:border-b-0"
                : "text-[var(--text-muted)]"
            }`}
          >
            {cat.label}

            {/* Devs Mode: neon underline that glides between tabs */}
            {isDevs && activeCategory === cat.id && (
              <motion.span
                layoutId="devs-sticker-tab"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute bottom-0 inset-x-2 h-[2px] rounded-full"
                style={{
                  background: "linear-gradient(90deg,#22f0ff,#8b5cf6,#ff2bd6)",
                  boxShadow: "0 0 10px rgba(34,240,255,0.9)",
                }}
              />
            )}
          </button>
        ))}
      </div>

      {activeCategory === "gifs" && (
        <div className="px-3 pt-2 pb-2 flex items-center gap-2 border-b border-[var(--border-soft)] shrink-0 devs:focus-within:shadow-[inset_0_-1px_0_var(--devs-cyan)]">
          <Search size={16} className="text-[var(--text-muted)] shrink-0 devs:text-[var(--devs-cyan)]" />
          <input
            type="text"
            value={gifSearch}
            onChange={(e) => setGifSearch(e.target.value)}
            placeholder="Search GIFs..."
            className="flex-1 bg-transparent outline-none text-[13px] text-[var(--text-primary)] devs:font-mono devs:caret-[var(--devs-cyan)]"
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto no-scrollbar p-2">
        {activeCategory === "stickers" && (
          <div className="grid grid-cols-4 gap-2">
            {STATIC_STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                title={sticker.name}
                onClick={() =>
                  onSelectSticker({
                    type: "sticker",
                    emoji: sticker.emoji,
                    name: sticker.name,
                  })
                }
                className="w-full aspect-square flex items-center justify-center text-[36px] rounded-xl hover:bg-[var(--bg-popup-hover)] cursor-pointer transition-colors devs:hover:scale-110 devs:active:scale-90 devs:transition-transform"
              >
                {sticker.emoji}
              </button>
            ))}
          </div>
        )}

        {activeCategory === "animated" && (
          <div className="grid grid-cols-3 gap-2">
            {ANIMATED_STICKERS.map((sticker) => (
              <button
                key={sticker.id}
                type="button"
                title={sticker.name}
                onClick={() =>
                  onSelectSticker({
                    type: "animated_sticker",
                    url: sticker.url,
                    name: sticker.name,
                  })
                }
                className="w-full aspect-square flex items-center justify-center rounded-xl hover:bg-[var(--bg-popup-hover)] cursor-pointer transition-colors overflow-hidden devs:hover:shadow-[0_0_18px_rgba(34,240,255,0.3)]"
              >
               <Lottie src={sticker.url} autoplay loop style={{ width: "100%", height: "100%" }} />
              </button>
            ))}
          </div>
        )}

        {activeCategory === "gifs" && (
          <Grid
            key={gifSearch}
            width={300}
            columns={3}
            gutter={6}
            fetchGifs={fetchGifs}
            onGifClick={handleGifClick}
            noLink
            hideAttribution={false}
          />
        )}
      </div>
    </motion.div>
  );
};

export default StickerPicker;