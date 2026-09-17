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
    <div className="w-[250px] sm:w-[290px] max-h-[260px] overflow-y-auto no-scrollbar bg-[var(--bg-panel)] border border-[var(--border-popup)] rounded-xl shadow-lg p-2">
      {EMOJI_CATEGORIES.map((cat) => (
        <div key={cat.label} className="mb-2">
          <div className="text-[11px] text-[var(--text-muted)] px-1 mb-1">
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
                className="text-[19px] w-[28px] h-[28px] flex items-center justify-center rounded-md hover:bg-[var(--bg-menu-hover)] cursor-pointer"
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