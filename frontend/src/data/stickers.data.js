// stickers.data.js
//
// Static "stickers" are rendered as large emoji — no external image assets
// needed, so there's zero licensing risk and they always load instantly.
// Swap STATIC_STICKERS for real sticker image URLs later if you want.
//
// Animated stickers use free Lottie JSON animations (played with
// lottie-react). The URLs below are commonly-used public LottieFiles demo
// assets — if any of them ever 404, grab a free animation from
// lottiefiles.com, drop it on https://lottie.host (free instant hosting),
// and paste the resulting direct .json URL in here instead.
//
// GIFs are handled separately in StickerPicker.jsx via the GIPHY SDK.

export const STICKER_CATEGORIES = [
  { id: "stickers", label: "Stickers" },
  { id: "animated", label: "Animated" },
  { id: "gifs", label: "GIFs" },
];

export const STATIC_STICKERS = [
  { id: "s1", emoji: "😂", name: "Laughing" },
  { id: "s2", emoji: "❤️", name: "Heart" },
  { id: "s3", emoji: "🔥", name: "Fire" },
  { id: "s4", emoji: "👍", name: "Thumbs Up" },
  { id: "s5", emoji: "🎉", name: "Party" },
  { id: "s6", emoji: "😍", name: "Heart Eyes" },
  { id: "s7", emoji: "😢", name: "Crying" },
  { id: "s8", emoji: "😎", name: "Cool" },
  { id: "s9", emoji: "🥳", name: "Celebrate" },
  { id: "s10", emoji: "😴", name: "Sleepy" },
  { id: "s11", emoji: "🤔", name: "Thinking" },
  { id: "s12", emoji: "👀", name: "Eyes" },
  { id: "s13", emoji: "💯", name: "100" },
  { id: "s14", emoji: "🙌", name: "Praise" },
  { id: "s15", emoji: "😭", name: "Sobbing" },
  { id: "s16", emoji: "🤝", name: "Deal" },
];

// See file header note — verify these still resolve, or replace via
// lottie.host with your own picks.
export const ANIMATED_STICKERS = [
  {
    id: "a1",
    url: "https://assets9.lottiefiles.com/packages/lf20_touohxv0.json",
    name: "Heart",
  },
  {
    id: "a2",
    url: "https://assets2.lottiefiles.com/packages/lf20_jbrw3hcz.json",
    name: "Loading Hearts",
  },
  {
    id: "a3",
    url: "https://assets10.lottiefiles.com/packages/lf20_khzniaya.json",
    name: "Clap",
  },
  {
    id: "a4",
    url: "https://assets1.lottiefiles.com/packages/lf20_2ks3pjua.json",
    name: "Fire",
  },
  {
    id: "a5",
    url: "https://assets5.lottiefiles.com/packages/lf20_obhph3sh.json",
    name: "Confetti",
  },
  {
    id: "a6",
    url: "https://assets3.lottiefiles.com/packages/lf20_u4yrau.json",
    name: "Thumbs Up",
  },
];
