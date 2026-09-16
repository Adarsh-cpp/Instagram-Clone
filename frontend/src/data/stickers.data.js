// stickers.data.js
//
// Static "stickers" are rendered as large emoji — no external image assets
// needed, so there's zero licensing risk and they always load instantly.
// Swap STATIC_STICKERS for real sticker image URLs later if you want.
//
// Animated stickers use free Lottie JSON animations (played with
// lottie-react). The URLs below have been spot-checked (fetched directly
// or sourced from a curated list of working LottieFiles URLs) as of this
// writing — if any of them ever 404, grab a free animation from
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

export const ANIMATED_STICKERS = [
  { id: "a1", url: "https://assets9.lottiefiles.com/packages/lf20_touohxv0.json", name: "Trophy" },
  { id: "a2", url: "https://assets2.lottiefiles.com/packages/lf20_jbrw3hcz.json", name: "Loading Hearts" },
  { id: "a3", url: "https://assets10.lottiefiles.com/packages/lf20_khzniaya.json", name: "Clap" },
  { id: "a4", url: "https://assets1.lottiefiles.com/packages/lf20_2ks3pjua.json", name: "Fire" },
  { id: "a5", url: "https://assets5.lottiefiles.com/packages/lf20_obhph3sh.json", name: "Confetti" },
  { id: "a6", url: "https://assets3.lottiefiles.com/packages/lf20_u4yrau.json", name: "Thumbs Up" },
  { id: "a7", url: "https://assets10.lottiefiles.com/packages/lf20_zpowlrfb.json", name: "Waving Character" },
  { id: "a8", url: "https://assets8.lottiefiles.com/packages/lf20_q0cz4zhn.json", name: "Talking Character" },
  { id: "a9", url: "https://assets9.lottiefiles.com/packages/lf20_gigyrcoy.json", name: "Pulse Loader" },
  { id: "a10", url: "https://assets3.lottiefiles.com/packages/lf20_2hmdq2ap.json", name: "Sparkle" },
  { id: "a11", url: "https://assets3.lottiefiles.com/packages/lf20_wmiodxph.json", name: "Bounce" },
  { id: "a12", url: "https://assets3.lottiefiles.com/packages/lf20_1gekp2md.json", name: "Glow" },
  { id: "a13", url: "https://assets3.lottiefiles.com/packages/lf20_wzgyw4zk.json", name: "Shine" },
  { id: "a14", url: "https://assets9.lottiefiles.com/packages/lf20_wzigwqwi.json", name: "Spin" },
  { id: "a15", url: "https://assets9.lottiefiles.com/packages/lf20_2plouhmo.json", name: "Pop" },
  { id: "a16", url: "https://assets9.lottiefiles.com/packages/lf20_2cghrrpi.json", name: "Wave" },
  { id: "a17", url: "https://assets9.lottiefiles.com/packages/lf20_dk09m2uo.json", name: "Flash" },
  { id: "a18", url: "https://assets3.lottiefiles.com/packages/lf20_zhl8lan4.json", name: "Twinkle" },
  { id: "a19", url: "https://assets6.lottiefiles.com/packages/lf20_0zomy8eb.json", name: "Glimmer" },
  { id: "a20", url: "https://assets9.lottiefiles.com/packages/lf20_jcikwtux.json", name: "Orbit" },
  { id: "a21", url: "https://assets3.lottiefiles.com/packages/lf20_vf9lvx3t.json", name: "Drift" },
  { id: "a22", url: "https://assets8.lottiefiles.com/packages/lf20_q0cz4zhn.json", name: "Character 2" },
];