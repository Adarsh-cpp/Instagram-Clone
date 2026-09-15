// constants/chatAppearance.js
//
// Server-side allow-lists. These must stay in sync with the client catalog
// in frontend/src/data/chatTheme.js — the server only ever stores an id, so
// this is the single place that decides which ids are legal.

export const VALID_THEME_IDS = [
  "default",
  "midnight",
  "sunset",
  "ocean",
  "rose",
  "forest",
  "mono",
  "galaxy",
  "citrus",
  "noir",
  "aurora",
  "sakura",
  "lavender",
  "ember",
  "mint",
  "slate",
  "neon",
  "sand",
  "coffee",
  "glacier",
  "peach",
  "matrix",
];

export const VALID_FONT_IDS = [
  "default",
  "inter",
  "poppins",
  "dm-sans",
  "nunito",
  "quicksand",
  "rubik",
  "space-grotesk",
  "lora",
  "playfair",
  "caveat",
  "patrick-hand",
  "comic-neue",
  "jetbrains-mono",
];
