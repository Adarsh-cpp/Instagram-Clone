// data/chatTheme.js
//
// Static catalog of pre-built chat themes and chat fonts. Only the `id` of
// each gets persisted on the Conversation document
// (conversation.chatTheme = "sunset", conversation.chatFont = "caveat").
// Everything else here is looked up client-side at render time, so tweaking
// a color or adding a new theme/font later never requires touching existing
// conversations in the DB.
//
// mode: "dark" | "light" — controls default text color on system UI
// (timestamps, date dividers) that sits directly on `bg`, independent of
// the message bubbles themselves.

export const CHAT_THEMES = [
  {
    id: "default",
    name: "Default",
    mode: "dark",
    bg: "#000000",
    senderBubble: "#3797F0",
    senderText: "#FFFFFF",
    receiverBubble: "#262626",
    receiverText: "#FFFFFF",
  },
  {
    id: "midnight",
    name: "Midnight",
    mode: "dark",
    bg: "linear-gradient(180deg, #0F1226 0%, #1C1F3D 100%)",
    senderBubble: "#5B5FE8",
    senderText: "#FFFFFF",
    receiverBubble: "#2A2D52",
    receiverText: "#E8E8F5",
  },
  {
    id: "sunset",
    name: "Sunset",
    mode: "dark",
    bg: "linear-gradient(180deg, #3A1C4D 0%, #C1436A 60%, #F2874F 100%)",
    senderBubble: "#F2874F",
    senderText: "#2A1220",
    receiverBubble: "#4A2440",
    receiverText: "#FFF1E8",
  },
  {
    id: "ocean",
    name: "Ocean",
    mode: "dark",
    bg: "linear-gradient(180deg, #012A3D 0%, #045C73 100%)",
    senderBubble: "#0FA3B1",
    senderText: "#00232B",
    receiverBubble: "#053E4E",
    receiverText: "#E3F6F8",
  },
  {
    id: "rose",
    name: "Rose",
    mode: "light",
    bg: "linear-gradient(180deg, #FFE9EF 0%, #FFD3DE 100%)",
    senderBubble: "#E8577B",
    senderText: "#FFFFFF",
    receiverBubble: "#FFFFFF",
    receiverText: "#3A2229",
  },
  {
    id: "forest",
    name: "Forest",
    mode: "dark",
    bg: "linear-gradient(180deg, #10241B 0%, #1F3D2C 100%)",
    senderBubble: "#4CAF7D",
    senderText: "#08160F",
    receiverBubble: "#28402F",
    receiverText: "#E4F3EA",
  },
  {
    id: "mono",
    name: "Mono",
    mode: "light",
    bg: "#F2F2F2",
    senderBubble: "#111111",
    senderText: "#FFFFFF",
    receiverBubble: "#FFFFFF",
    receiverText: "#111111",
  },
  {
    id: "galaxy",
    name: "Galaxy",
    mode: "dark",
    bg: "linear-gradient(180deg, #0B0B1E 0%, #241B4A 50%, #4A2E6B 100%)",
    senderBubble: "#9D6FE0",
    senderText: "#FFFFFF",
    receiverBubble: "#2A2350",
    receiverText: "#EDE7FA",
  },
  {
    id: "citrus",
    name: "Citrus",
    mode: "light",
    bg: "linear-gradient(180deg, #FFF7DB 0%, #FFE9A8 100%)",
    senderBubble: "#F2A93B",
    senderText: "#3A2900",
    receiverBubble: "#FFFFFF",
    receiverText: "#4A3A1A",
  },
  {
    id: "noir",
    name: "Noir",
    mode: "dark",
    bg: "#111111",
    senderBubble: "#E0E0E0",
    senderText: "#111111",
    receiverBubble: "#2B2B2B",
    receiverText: "#F0F0F0",
  },

  // ---------------------------------------------------------------
  // additional themes
  // ---------------------------------------------------------------

  {
    id: "aurora",
    name: "Aurora",
    mode: "dark",
    bg: "linear-gradient(180deg, #041E2B 0%, #0B3A4A 45%, #146B63 100%)",
    senderBubble: "#2DD4BF",
    senderText: "#04262B",
    receiverBubble: "#0E3B4A",
    receiverText: "#DFF7F5",
  },
  {
    id: "sakura",
    name: "Sakura",
    mode: "light",
    bg: "linear-gradient(180deg, #FFF1F6 0%, #FBDDEC 100%)",
    senderBubble: "#F06292",
    senderText: "#FFFFFF",
    receiverBubble: "#FFFFFF",
    receiverText: "#4A2B38",
  },
  {
    id: "lavender",
    name: "Lavender",
    mode: "light",
    bg: "linear-gradient(180deg, #F4EEFF 0%, #E4DAFF 100%)",
    senderBubble: "#7C5CE0",
    senderText: "#FFFFFF",
    receiverBubble: "#FFFFFF",
    receiverText: "#332A4D",
  },
  {
    id: "ember",
    name: "Ember",
    mode: "dark",
    bg: "linear-gradient(180deg, #1A0F0B 0%, #3D1A12 60%, #6B2618 100%)",
    senderBubble: "#FF7043",
    senderText: "#2A0E06",
    receiverBubble: "#3A201A",
    receiverText: "#FFE8DF",
  },
  {
    id: "mint",
    name: "Mint",
    mode: "light",
    bg: "linear-gradient(180deg, #EBFBF3 0%, #C9EFDF 100%)",
    senderBubble: "#12A17A",
    senderText: "#FFFFFF",
    receiverBubble: "#FFFFFF",
    receiverText: "#17392F",
  },
  {
    id: "slate",
    name: "Slate",
    mode: "dark",
    bg: "linear-gradient(180deg, #0E1116 0%, #1B222B 100%)",
    senderBubble: "#4C8DFF",
    senderText: "#FFFFFF",
    receiverBubble: "#232B36",
    receiverText: "#E6EAF0",
  },
  {
    id: "neon",
    name: "Neon",
    mode: "dark",
    bg: "linear-gradient(180deg, #0A0118 0%, #1A0533 50%, #2D0A4E 100%)",
    senderBubble: "#FF2E9A",
    senderText: "#FFFFFF",
    receiverBubble: "#21103F",
    receiverText: "#F2E6FF",
  },
  {
    id: "sand",
    name: "Sand",
    mode: "light",
    bg: "linear-gradient(180deg, #FBF3E6 0%, #EFDFC5 100%)",
    senderBubble: "#B07D4B",
    senderText: "#FFF9F0",
    receiverBubble: "#FFFFFF",
    receiverText: "#4A3A28",
  },
  {
    id: "coffee",
    name: "Coffee",
    mode: "dark",
    bg: "linear-gradient(180deg, #1C1410 0%, #33241C 100%)",
    senderBubble: "#C08457",
    senderText: "#1B1008",
    receiverBubble: "#3A2A20",
    receiverText: "#F3E6DA",
  },
  {
    id: "glacier",
    name: "Glacier",
    mode: "light",
    bg: "linear-gradient(180deg, #EDF5FF 0%, #D0E4F9 100%)",
    senderBubble: "#2F80ED",
    senderText: "#FFFFFF",
    receiverBubble: "#FFFFFF",
    receiverText: "#1B3A57",
  },
  {
    id: "peach",
    name: "Peach",
    mode: "light",
    bg: "linear-gradient(180deg, #FFF0E6 0%, #FFD9C4 100%)",
    senderBubble: "#FF8A5B",
    senderText: "#FFFFFF",
    receiverBubble: "#FFFFFF",
    receiverText: "#4A3026",
  },
  {
    id: "matrix",
    name: "Matrix",
    mode: "dark",
    bg: "linear-gradient(180deg, #000000 0%, #04190E 100%)",
    senderBubble: "#00D26A",
    senderText: "#00220F",
    receiverBubble: "#0C2418",
    receiverText: "#CFF8E2",
  },
];

// ---------------------------------------------------------------
// Fonts
// ---------------------------------------------------------------
//
// All Google Fonts (SIL Open Font License / Apache 2.0 — free for
// commercial use). `google` is the family spec used to build the
// fonts.googleapis.com URL; leave it out for the system default.
//
// Fonts are never previewed in a mock chat — each row in the picker is
// rendered in its own typeface, which is the preview.

export const CHAT_FONTS = [
  {
    id: "default",
    name: "System default",
    stack: "inherit",
  },
  {
    id: "inter",
    name: "Inter",
    google: "Inter:wght@400;500;600",
    stack: "'Inter', system-ui, sans-serif",
  },
  {
    id: "poppins",
    name: "Poppins",
    google: "Poppins:wght@400;500;600",
    stack: "'Poppins', system-ui, sans-serif",
  },
  {
    id: "dm-sans",
    name: "DM Sans",
    google: "DM Sans:wght@400;500;700",
    stack: "'DM Sans', system-ui, sans-serif",
  },
  {
    id: "nunito",
    name: "Nunito",
    google: "Nunito:wght@400;600;700",
    stack: "'Nunito', system-ui, sans-serif",
  },
  {
    id: "quicksand",
    name: "Quicksand",
    google: "Quicksand:wght@400;500;600",
    stack: "'Quicksand', system-ui, sans-serif",
  },
  {
    id: "rubik",
    name: "Rubik",
    google: "Rubik:wght@400;500;600",
    stack: "'Rubik', system-ui, sans-serif",
  },
  {
    id: "space-grotesk",
    name: "Space Grotesk",
    google: "Space Grotesk:wght@400;500;600",
    stack: "'Space Grotesk', system-ui, sans-serif",
  },
  {
    id: "lora",
    name: "Lora",
    google: "Lora:wght@400;500;600",
    stack: "'Lora', Georgia, serif",
  },
  {
    id: "playfair",
    name: "Playfair Display",
    google: "Playfair Display:wght@400;500;600",
    stack: "'Playfair Display', Georgia, serif",
  },
  {
    id: "caveat",
    name: "Caveat",
    google: "Caveat:wght@400;600",
    stack: "'Caveat', cursive",
    // handwriting faces read small at body size, so bump them a little
    sizeAdjust: 1.15,
  },
  {
    id: "patrick-hand",
    name: "Patrick Hand",
    google: "Patrick Hand",
    stack: "'Patrick Hand', cursive",
    sizeAdjust: 1.08,
  },
  {
    id: "comic-neue",
    name: "Comic Neue",
    google: "Comic Neue:wght@400;700",
    stack: "'Comic Neue', cursive",
  },
  {
    id: "jetbrains-mono",
    name: "JetBrains Mono",
    google: "JetBrains Mono:wght@400;500",
    stack: "'JetBrains Mono', ui-monospace, monospace",
    sizeAdjust: 0.94,
  },
];

export const getThemeById = (id) =>
  CHAT_THEMES.find((theme) => theme.id === id) || CHAT_THEMES[0];

export const getFontById = (id) =>
  CHAT_FONTS.find((font) => font.id === id) || CHAT_FONTS[0];

const encodeFamily = (family) => family.replace(/ /g, "+");

const buildFontsUrl = (fonts) => {
  const families = fonts
    .filter((font) => font.google)
    .map((font) => `family=${encodeFamily(font.google)}`)
    .join("&");

  return `https://fonts.googleapis.com/css2?${families}&display=swap`;
};

// Injects a single <link> for one font, once. Used by the chat window so a
// conversation only pays for the face it actually uses.
export const loadChatFont = (fontId) => {
  if (typeof document === "undefined") return;

  const font = getFontById(fontId);
  if (!font.google) return;

  const linkId = `chat-font-${font.id}`;
  if (document.getElementById(linkId)) return;

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = buildFontsUrl([font]);
  document.head.appendChild(link);
};

// Injects one combined <link> for every font in the catalog. Used by the
// picker, where each row has to render in its own face.
export const loadAllChatFonts = () => {
  if (typeof document === "undefined") return;

  const linkId = "chat-fonts-all";
  if (document.getElementById(linkId)) return;

  const link = document.createElement("link");
  link.id = linkId;
  link.rel = "stylesheet";
  link.href = buildFontsUrl(CHAT_FONTS);
  document.head.appendChild(link);
};
