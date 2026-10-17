// EmojiPickerPanel.jsx
// Lightweight, dependency-free emoji grid used for the "+" (full reaction
// picker) button inside the message context menu. No search — just a
// scrollable categorized grid, which is all this feature needs.
import React from "react";

const EMOJI_CATEGORIES = [
  {
    label: "Smileys",
    emojis: [
      "😀", "😁", "😂", "🤣", "😊", "😍", "😘", "😜", "🤩", "🥳",
      "😎", "🤔", "😴", "😭", "😡", "🥰", "😇", "🙃", "😅", "😏",
    ],
  },
  {
    label: "Gestures",
    emojis: [
      "👍", "👎", "👏", "🙌", "🙏", "👋", "💪", "🤝", "✌️", "🤞",
      "👌", "🤙", "💯", "🔥", "✨", "🎉", "🎊", "💥", "💫", "⭐",
    ],
  },
  {
    label: "Hearts",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
      "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘",
    ],
  },
  {
    label: "Animals & Food",
    emojis: [
      "🐶", "🐱", "🐼", "🦊", "🍕", "🍔", "🍟", "🍩",
      "🍦", "☕", "🍺", "🍷", "🎂", "🍓", "🍉", "🥑",
    ],
  },
];

const EmojiPickerPanel = ({ onSelect, onClose }) => {
  return (
    <div className="w-[250px] sm:w-[290px] max-h-[260px] overflow-y-auto no-scrollbar bg-[var(--bg-panel)] border border-[var(--border-popup)] rounded-xl shadow-lg p-2 devs:backdrop-blur-xl devs:rounded-2xl devs:shadow-[0_0_30px_rgba(34,240,255,0.18)]">
      {EMOJI_CATEGORIES.map((cat) => (
        <div key={cat.label} className="mb-2">
          <div className="text-[11px] text-[var(--text-muted)] px-1 mb-1 devs:font-mono devs:uppercase devs:tracking-[0.2em] devs:text-[9px]">
            {cat.label}
          </div>
          <div className="grid grid-cols-7 sm:grid-cols-8 gap-1">
            {cat.emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onSelect(emoji);
                  onClose?.();
                }}
                className="text-[19px] w-[28px] h-[28px] flex items-center justify-center rounded-md hover:bg-[var(--bg-menu-hover)] cursor-pointer devs:hover:scale-125 devs:active:scale-90 devs:transition-transform"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default EmojiPickerPanel;