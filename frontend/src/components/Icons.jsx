// Icons.jsx
import React from "react";
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
  EyeOff,
  MapPin,
  AtSign,
  MessageSquare,
} from "lucide-react";

const iconProps = (active) => ({
  size: 26,
  color: "var(--text-primary)",
  fill: active ? "var(--text-primary)" : "none",
  strokeWidth: active ? 1.5 : 2,
});

// ---- Sidebar icons (active/inactive) ----
export const HomeIcon = ({ active }) => <Home {...iconProps(active)} />;
export const SearchIcon = ({ active }) => <Search {...iconProps(active)} strokeWidth={active ? 2.5 : 2} />;
export const ExploreIcon = ({ active }) => <Compass {...iconProps(active)} />;
export const ReelsIcon = ({ active }) => <Clapperboard {...iconProps(active)} />;
export const MessagesIcon = ({ active }) => <MessageCircle {...iconProps(active)} />;
export const NotificationsIcon = ({ active }) => <Heart {...iconProps(active)} />;
export const CreateIcon = ({ active }) => <PlusSquare {...iconProps(active)} strokeWidth={active ? 2.5 : 2} />;
export const MoreIcon = ({ active }) => <Menu {...iconProps(active)} strokeWidth={active ? 2.5 : 2} />;

// ---- Settings icons (static, no active state) ----
const settingsIconProps = { size: 26, color: "var(--text-primary)", strokeWidth: 2 };

export const EditProfileIcon = () => <UserPen {...settingsIconProps} />;
export const SettingsNotificationsIcon = () => <Bell {...settingsIconProps} />;
export const AccountPrivacyIcon = () => <Lock {...settingsIconProps} />;
export const CloseFriendsIcon = () => <Star {...settingsIconProps} />;
export const BlockedIcon = () => <Ban {...settingsIconProps} />;
export const RestrictedAccountsIcon = () => <EyeOff {...settingsIconProps} />;
export const StoryLocationsIcon = () => <MapPin {...settingsIconProps} />;
export const TagsMentionsIcon = () => <AtSign {...settingsIconProps} />;
export const CommentsIcon = () => <MessageSquare {...settingsIconProps} />;