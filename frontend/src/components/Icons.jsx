// Icons.jsx
import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Home,
  Search,
  Compass,
  Clapperboard,
  MessageCircle,
  Heart,
  PlusSquare,
  Menu,
  UserPen,
  Bell,
  Lock,
  Star,
  Ban,
  Eye,
  EyeOff,
  MapPin,
  AtSign,
  MessageSquare,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/* ====================================================================
   CLASSIC (light / dark) icon props - unchanged
   ==================================================================== */
const iconProps = (active) => ({
  size: 26,
  color: "var(--text-primary)",
  fill: active ? "var(--text-primary)" : "none",
  strokeWidth: active ? 1.5 : 2,
});

const settingsIconProps = { size: 26, color: "var(--text-primary)", strokeWidth: 2 };

/* ====================================================================
   DEVS MODE - animated icon system
   Every icon gets: its own neon accent, a hover animation, a glowing
   "active" state and a tap squish. Endless loops are disabled on lite
   devices (phones / touch / low-end / reduced motion).
   ==================================================================== */
const SPRING_BACK = { type: "spring", stiffness: 320, damping: 18 };
const REST = { scale: 1, scaleY: 1, rotate: 0, x: 0, y: 0, transition: SPRING_BACK };

const ANIMS = {
  pop: {
    hover: { scale: 1.18, rotate: [0, -8, 8, 0], transition: { duration: 0.4 } },
  },
  home: {
    hover: { y: [0, -5, 0], scale: 1.15, transition: { duration: 0.45 } },
  },
  compass: {
    hover: { rotate: [0, 70, -20, 45], scale: 1.15, transition: { duration: 0.7 } },
    active: {
      rotate: [0, 14, -14, 0],
      transition: { duration: 5, repeat: Infinity, ease: "easeInOut" },
    },
  },
  reels: {
    hover: {
      scaleY: [1, 0.78, 1.12, 1],
      rotate: [0, -10, 0],
      scale: 1.12,
      transition: { duration: 0.5 },
    },
  },
  chat: {
    hover: { y: [0, -4, 0], rotate: [0, -7, 7, 0], scale: 1.12, transition: { duration: 0.5 } },
  },
  beat: {
    hover: { scale: [1, 1.3, 1, 1.22, 1], transition: { duration: 0.7 } },
    active: {
      scale: [1, 1.18, 1, 1.12, 1],
      transition: { duration: 1.5, repeat: Infinity },
    },
  },
  spin: {
    hover: { rotate: 90, scale: 1.18, transition: { type: "spring", stiffness: 260, damping: 14 } },
  },
  slide: {
    hover: { x: [0, 4, -4, 0], scale: 1.1, transition: { duration: 0.45 } },
  },
  wiggle: {
    hover: { rotate: [0, -14, 14, -8, 0], scale: 1.12, transition: { duration: 0.5 } },
  },
};

const DevsIcon = ({
  Icon,
  active = false,
  hovered = false,
  anim = "pop",
  accent = "var(--devs-cyan)",
  size = 26,
  bold = false,
}) => {
  const { lite } = useTheme();
  const def = ANIMS[anim] || ANIMS.pop;

  const variants = useMemo(
    () => ({
      rest: REST,
      hover: def.hover,
      active: !lite && def.active ? def.active : { ...REST, scale: 1.08 },
      tap: { scale: 0.82 },
    }),
    [def, lite]
  );

  const state = hovered ? "hover" : active ? "active" : "rest";
  const lit = active || hovered;

  return (
    <motion.span
      variants={variants}
      initial={false}
      animate={state}
      whileHover="hover"
      whileTap="tap"
      className="inline-flex"
      style={{
        color: lit ? accent : "var(--text-primary)",
        filter: active ? `drop-shadow(0 0 7px ${accent})` : "none",
        transition: "color 0.2s ease, filter 0.25s ease",
      }}
    >
      <Icon
        size={size}
        color="currentColor"
        fill="currentColor"
        fillOpacity={active ? 0.22 : 0}
        strokeWidth={active ? (bold ? 2.6 : 2.2) : 1.8}
      />
    </motion.span>
  );
};

/* ---------- factories (classic output stays identical) ---------- */
const makeNavIcon = (Icon, { anim, accent, bold = false }) => {
  const Comp = ({ active, hovered }) => {
    const { isDevs } = useTheme();

    if (!isDevs) {
      return bold ? (
        <Icon {...iconProps(active)} strokeWidth={active ? 2.5 : 2} />
      ) : (
        <Icon {...iconProps(active)} />
      );
    }

    return (
      <DevsIcon
        Icon={Icon}
        active={active}
        hovered={hovered}
        anim={anim}
        accent={accent}
        bold={bold}
      />
    );
  };
  Comp.displayName = `NavIcon(${Icon.displayName || "icon"})`;
  return Comp;
};

const makeSettingsIcon = (Icon, accent) => {
  const Comp = ({ hovered }) => {
    const { isDevs } = useTheme();
    if (!isDevs) return <Icon {...settingsIconProps} />;
    return <DevsIcon Icon={Icon} hovered={hovered} anim="wiggle" accent={accent} />;
  };
  Comp.displayName = `SettingsIcon(${Icon.displayName || "icon"})`;
  return Comp;
};

const makeAuthIcon = (Icon) => {
  const Comp = () => {
    const { isDevs } = useTheme();
    if (!isDevs) return <Icon size={20} color="var(--text-muted)" />;
    return (
      <motion.span
        whileHover={{ scale: 1.2 }}
        whileTap={{ scale: 0.9 }}
        className="inline-flex"
        style={{
          color: "var(--devs-cyan)",
          filter: "drop-shadow(0 0 5px rgba(34, 240, 255, 0.7))",
        }}
      >
        <Icon size={20} color="currentColor" />
      </motion.span>
    );
  };
  Comp.displayName = `AuthIcon(${Icon.displayName || "icon"})`;
  return Comp;
};

/* ====================================================================
   Sidebar / footer icons (active / inactive)
   ==================================================================== */
export const HomeIcon = makeNavIcon(Home, { anim: "home", accent: "var(--devs-cyan)" });
export const SearchIcon = makeNavIcon(Search, { anim: "slide", accent: "var(--devs-cyan)", bold: true });
export const ExploreIcon = makeNavIcon(Compass, { anim: "compass", accent: "var(--devs-violet)" });
export const ReelsIcon = makeNavIcon(Clapperboard, { anim: "reels", accent: "var(--devs-magenta)" });
export const MessagesIcon = makeNavIcon(MessageCircle, { anim: "chat", accent: "var(--devs-cyan)" });
export const NotificationsIcon = makeNavIcon(Heart, { anim: "beat", accent: "var(--devs-magenta)" });
export const CreateIcon = makeNavIcon(PlusSquare, { anim: "spin", accent: "var(--devs-lime)", bold: true });
export const MoreIcon = makeNavIcon(Menu, { anim: "slide", accent: "var(--devs-violet)", bold: true });

/* ====================================================================
   Settings icons (no active state; optional `hovered` from parent row)
   ==================================================================== */
export const EditProfileIcon = makeSettingsIcon(UserPen, "var(--devs-cyan)");
export const SettingsNotificationsIcon = makeSettingsIcon(Bell, "var(--devs-magenta)");
export const AccountPrivacyIcon = makeSettingsIcon(Lock, "var(--devs-violet)");
export const CloseFriendsIcon = makeSettingsIcon(Star, "var(--devs-lime)");
export const BlockedIcon = makeSettingsIcon(Ban, "var(--color-danger)");
export const RestrictedAccountsIcon = makeSettingsIcon(EyeOff, "var(--devs-violet)");
export const StoryLocationsIcon = makeSettingsIcon(MapPin, "var(--devs-cyan)");
export const TagsMentionsIcon = makeSettingsIcon(AtSign, "var(--devs-magenta)");
export const CommentsIcon = makeSettingsIcon(MessageSquare, "var(--devs-lime)");

/* ====================================================================
   Auth page icons
   ==================================================================== */
export const PasswordVisibleIcon = makeAuthIcon(Eye);
export const PasswordHiddenIcon = makeAuthIcon(EyeOff);

// Google's official multi-color "G" mark. Not in lucide-react on purpose —
// lucide excludes trademarked brand logos, so every site hand-embeds this SVG.
export const GoogleIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.9 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.4 0 10.3-2.1 14-5.5l-6.5-5.5C29.4 34.9 26.8 36 24 36c-5.2 0-9.6-3.1-11.3-7.6l-6.6 5.1C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.4-2.3 4.4-4.2 5.9l6.5 5.5C39.7 37.3 44 31.4 44 24c0-1.3-.1-2.7-.4-3.5z"/>
  </svg>
);