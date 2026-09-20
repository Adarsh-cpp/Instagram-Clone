// Chat.jsx
import React, { useEffect, useState, useRef, useCallback, useLayoutEffect } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Image, Send, Smile, X, ArrowLeft, Sticker, Info, BadgeCheck, Sparkles, RotateCw } from "lucide-react";
import socket from '../socket';
import axios from 'axios';
import { toast } from 'react-toastify';
import { useAuth } from '../context/AuthContext';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import MessageBox from './MessageBox';
import StickerPicker from './StickerPicker';
import ThemeOverlay from './ThemeOverlay';
import { useSocket } from '../context/SocketContext';
import { getTimeAgo } from '../utils/timeAgo';
import { formatDateHeader, isSameDay } from '../utils/dateTime';
import { CHAT_THEMES, getFontById, loadChatFont } from "../data/chatTheme";
import {
  generateAiReplySuggestions,
  getAiErrorMessage,
  AI_REPLY_CONTEXT_SIZE,
} from "../api/aiApi";

const MAX_IMAGES = 4;
const MESSAGE_PAGE_SIZE = 30;
const LOAD_OLDER_THRESHOLD_PX = 300;

// ---- emoji picker data ----
// Self-contained (no extra package). `icon` is what shows on the category
// tab; "Recent" is added on top automatically once the user has picked some.
const RECENT_EMOJIS_KEY = "chatRecentEmojis";
const MAX_RECENT_EMOJIS = 24;

const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    label: "Smileys",
    icon: "😀",
    emojis: [
      "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰",
      "😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏",
      "😒","😞","😔","😟","😕","🙁","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡",
      "🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶",
      "😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴",
      "🤢","🤮","🤧","😷","🤒","🤕","🤑","🤠","😈","👿","👹","👺","🤡","💩","👻","💀",
      "👽","🤖","🎃",
    ],
  },
  {
    id: "people",
    label: "People",
    icon: "👋",
    emojis: [
      "👋","🤚","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇",
      "☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳",
      "💪","🦾","🦵","🦶","👂","👃","🧠","👀","👅","👄","💋","🧑","👶","👦","👧","👨",
      "👩","🧔","👴","👵","🙋","🙆","🙅","🤷","🤦","💁","🙇","🕺","💃","🏃","🚶",
    ],
  },
  {
    id: "hearts",
    label: "Hearts & symbols",
    icon: "❤️",
    emojis: [
      "❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖",
      "💘","💝","💟","✨","⭐","🌟","💫","🔥","💥","💯","✅","❌","❗","❓","‼️","⁉️",
      "💢","💤","💬","💭","🔔","🎵","🎶","➕","➖","➗","✔️","♻️","⚠️","🚫","🔞","🆗",
      "🆒","🆕","🔝","💲","™️","©️","®️",
    ],
  },
  {
    id: "nature",
    label: "Animals & nature",
    icon: "🐶",
    emojis: [
      "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈",
      "🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛",
      "🦋","🐌","🐞","🐜","🐢","🐍","🦎","🐙","🦑","🦀","🐠","🐟","🐬","🐳","🦈","🐊",
      "🐘","🦒","🦓","🐪","🌵","🌲","🌳","🌴","🌱","🌿","🍀","🍁","🍂","🌸","🌼","🌻",
      "🌹","🌷","🌺","🌈","☀️","⛅","☁️","⚡","❄️","🌙","🌊","🔥",
    ],
  },
  {
    id: "food",
    label: "Food & drink",
    icon: "🍔",
    emojis: [
      "🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🥑",
      "🥦","🥕","🌽","🥔","🍞","🥐","🥖","🧀","🥚","🍳","🥞","🥓","🍗","🍖","🌭","🍔",
      "🍟","🍕","🥪","🌮","🌯","🍜","🍝","🍣","🍤","🍙","🍚","🍛","🍦","🍧","🍨","🍩",
      "🍪","🎂","🍰","🧁","🍫","🍬","🍭","🍿","☕","🍵","🥤","🍺","🍷","🥂","🍹",
    ],
  },
  {
    id: "activities",
    label: "Activities",
    icon: "⚽",
    emojis: [
      "⚽","🏀","🏈","⚾","🎾","🏐","🏉","🎱","🏓","🏸","🥊","🥋","⛳","🏹","🎣","🎯",
      "🎮","🎲","🧩","🎨","🎬","🎤","🎧","🎸","🎹","🥁","🎺","🎻","🏆","🥇","🥈","🥉",
      "🏅","🎉","🎊","🎈","🎁","🏋️","🚴","🏊","🧘",
    ],
  },
  {
    id: "travel",
    label: "Travel & objects",
    icon: "🚗",
    emojis: [
      "🚗","🚕","🚌","🚓","🚑","🚒","🚲","🛵","🏍️","✈️","🚀","🛸","🚁","⛵","🚢","🏠",
      "🏢","🏰","🗼","🗽","⛰️","🏖️","🏝️","🌍","🌎","📱","💻","⌨️","🖥️","📷","📸","🎥",
      "📺","⏰","⌚","💡","🔋","🔑","🔒","💰","💳","💎","🎓","📚","✏️","📌","📎","✂️","🔍",
    ],
  },
];

// Emoji picker panel. Purely presentational: the parent owns open/close,
// caret-aware insertion and the recents list. `onMouseDown` preventDefault on
// the interactive bits keeps focus (and the caret) inside the message input.
const EmojiPicker = ({ pickerRef, recentEmojis, onSelect }) => {
  const [activeCategoryId, setActiveCategoryId] = useState(
    recentEmojis.length > 0 ? "recent" : "smileys"
  );

  const categories =
    recentEmojis.length > 0
      ? [{ id: "recent", label: "Recent", icon: "🕘", emojis: recentEmojis }, ...EMOJI_CATEGORIES]
      : EMOJI_CATEGORIES;

  const activeCategory =
    categories.find((category) => category.id === activeCategoryId) || categories[0];

  return (
    <div
      ref={pickerRef}
      className="emojiPicker absolute bottom-full left-2 mb-2 z-30 w-[340px] max-w-[96%] rounded-2xl overflow-hidden bg-[var(--bg-elevated)] border border-[var(--border-soft)] shadow-lg"
    >
      <div className="flex items-center border-b border-[var(--border-soft)] px-1">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            title={category.label}
            aria-label={category.label}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setActiveCategoryId(category.id)}
            className={`flex-1 h-[38px] flex items-center justify-center text-[18px] cursor-pointer border-b-2 transition-colors ${
              activeCategory.id === category.id
                ? "border-[var(--accent-blue)]"
                : "border-transparent opacity-60 hover:opacity-100"
            }`}
          >
            {category.icon}
          </button>
        ))}
      </div>

      <div className="no-scrollbar h-[220px] overflow-y-auto p-2">
        <div className="px-1 pb-1.5 text-[12px] text-[var(--text-muted)]">
          {activeCategory.label}
        </div>

        <div className="grid grid-cols-8 gap-0.5">
          {activeCategory.emojis.map((emoji) => (
            <button
              key={`${activeCategory.id}-${emoji}`}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onSelect(emoji)}
              className="aspect-square flex items-center justify-center text-[22px] leading-none rounded-lg hover:bg-[var(--bg-menu-hover)] cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};


const BASE_URL = import.meta.env.VITE_SERVER_URL

// `onConversationActivity` comes from MessagesPage. The server only pushes
// "newMessage" to the OTHER participant, so when WE send something we tell
// the parent directly, and it updates the conversation list on the left
// (last message, time, and move-to-top).
const Chat = ({ onConversationActivity }) => {

  const { onlineUsers, lastSeenMap } = useSocket()

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversation, setConversation] = useState();
  const [isFriendTyping, setIsFriendTyping] = useState(false);

  // pagination state
  const [initialLoading, setInitialLoading] = useState(true);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMoreOlder, setHasMoreOlder] = useState(true);
  const [scrollMargin, setScrollMargin] = useState(0);

  // selectedImages: [{ id, file, preview }]
  const [selectedImages, setSelectedImages] = useState([]);
  const fileInputRef = useRef(null);

  const [sendingImage, setSendingImage] = useState(false);

  // sticker/animated-sticker/GIF picker overlay
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);

  // emoji picker (the smiley on the left of the input bar) + the user's
  // most recently used emojis, remembered across sessions
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(RECENT_EMOJIS_KEY) || "[]");
      return Array.isArray(stored) ? stored.slice(0, MAX_RECENT_EMOJIS) : [];
    } catch (error) {
      return [];
    }
  });

  // info ("i") popup menu + chat settings overlay
  const [isInfoMenuOpen, setIsInfoMenuOpen] = useState(false);
  const [isThemeOverlayOpen, setIsThemeOverlayOpen] = useState(false);

  // AI reply suggestions — the blue sparkle button in the input bar opens a
  // small panel of suggested replies to the friend's latest message
  const [isSuggestionPanelOpen, setIsSuggestionPanelOpen] = useState(false);
  const [replySuggestions, setReplySuggestions] = useState([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState("");
  const suggestAbortRef = useRef(null);

  const typingTimeoutRef = useRef(null);
  const containerRef = useRef(null);
  const listStartRef = useRef(null);
  const messageInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);

  // pagination refs — kept in sync with state for use inside callbacks
  // that shouldn't be re-created every render
  const oldestCursorRef = useRef(null);
  const hasMoreOlderRef = useRef(true);
  const isLoadingOlderRef = useRef(false);
  const isNearBottomRef = useRef(true);

  // tells the scroll-restoration effect below what just happened to
  // `messages`, so it knows whether to jump, smooth-scroll, or anchor
  const pendingActionRef = useRef(null); // "initial" | "append" | { type: "prepend", prevScrollHeight, prevScrollTop } | null

  const { user } = useAuth();
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const friend = conversation?.participants.find(
    (participant) => participant?._id !== user?._id
  );

  const isFriendOnline = onlineUsers?.includes(friend?._id);
  const friendLastSeen = lastSeenMap?.[friend?._id] || friend?.lastSeen;

  const activeStatusText = isFriendOnline
    ? "Active now"
    : friendLastSeen
    ? `Active ${getTimeAgo(friendLastSeen)} ago`
    : null;

  // The theme actually applied to this conversation. ThemeOverlay's
  // preview is fully self-contained (see ThemePreviewPanel) and never
  // reaches into this component's state.
  const currentThemeId = conversation?.chatTheme || "default";
  const isDefaultTheme = currentThemeId === "default";
  const activeTheme =
    CHAT_THEMES.find((theme) => theme.id === currentThemeId) ||
    CHAT_THEMES.find((theme) => theme.id === "default");

  // The font applied to this conversation. Only the id is persisted; the
  // stack + stylesheet are resolved client-side from the catalog.
  const currentFontId = conversation?.chatFont || "default";
  const activeFont = getFontById(currentFontId);

  const chatFontStyle = {
    fontFamily: activeFont.stack,
    ...(activeFont.sizeAdjust ? { fontSize: `${activeFont.sizeAdjust}em` } : {}),
  };

  // pull the webfont only when a conversation actually uses it
  useEffect(() => {
    loadChatFont(currentFontId);
  }, [currentFontId]);

  // The input pill: for the "default" chat theme it rides the app's
  // global light/dark CSS vars (so it flips automatically with the
  // site-wide theme toggle). A custom picked chat theme keeps its own
  // fixed flat black/white regardless of app mode, per its own `mode`.
  const isCustomLightTheme = !isDefaultTheme && activeTheme?.mode === "light";
  const inputBarBg = isDefaultTheme
    ? "var(--bg-input)"
    : isCustomLightTheme ? "#FFFFFF" : "#000000";
  const inputBarText = isDefaultTheme
    ? "var(--text-input)"
    : isCustomLightTheme ? "#111111" : "#FFFFFF";
  const inputBarBorder = isDefaultTheme
    ? "var(--border-input)"
    : isCustomLightTheme ? "#E0E0E0" : "#2A2A2A";

  // Mobile back arrow: pop the history entry that opening this chat
  // pushed (see MessageCard's `replace={isDesktop}`), so we land back on
  // the list instead of stacking yet another "list" entry on top of it.
 const handleBack = () => {
    navigate("/user/messages", { replace: true });
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_IMAGES - selectedImages.length;
    if (remainingSlots <= 0) {
      toast.error(`You can only attach up to ${MAX_IMAGES} images`);
      e.target.value = "";
      return;
    }

    const validFiles = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error("Only image files are allowed");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is over 10MB`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} more image${remainingSlots === 1 ? "" : "s"} allowed`);
    }

    const toAdd = validFiles.slice(0, remainingSlots).map((file) => ({
      id: `${file.name}-${file.lastModified}-${Math.random()}`,
      file,
      preview: URL.createObjectURL(file),
    }));

    setSelectedImages((prev) => [...prev, ...toAdd]);
    e.target.value = ""; // lets you re-pick the same file later if you clear it
  };

  const removeSelectedImage = (id) => {
    setSelectedImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((img) => img.id !== id);
    });
  };

  const clearSelectedImages = () => {
    setSelectedImages((prev) => {
      prev.forEach((img) => URL.revokeObjectURL(img.preview));
      return [];
    });
  };

  // avoid leaking blob URLs on unmount
  useEffect(() => {
    return () => {
      selectedImages.forEach((img) => URL.revokeObjectURL(img.preview));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shared helper — called on new incoming visible messages and on tab
  // refocus. Always fire-and-forget: a failure here shouldn't block or
  // delay anything else in the chat.
  const markConversationSeen = async () => {
    try {
      const token = localStorage.getItem("authToken");
      await axios.patch(
        `${BASE_URL}/message/${conversationId}/mark-seen`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      // silent: marking seen failing shouldn't interrupt the chat
    }
  };

  // Tells the parent list that a message WE sent just succeeded, so the
  // conversation card on the left updates (last message + time) and jumps
  // to the top. Guarantees the fields the parent relies on are present even
  // if the API response omits them.
  const notifyMessageSent = (sentMessage) => {
    if (!sentMessage) return;
    onConversationActivity?.({
      ...sentMessage,
      conversationId: sentMessage.conversationId || conversationId,
      senderId: sentMessage.senderId || user?._id,
      createdAt: sentMessage.createdAt || new Date().toISOString(),
    });
  };

  // fetch conversation (for friend details)
  useEffect(() => {
    if (!conversationId) return;

    const getConversation = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const url = `${BASE_URL}/conversation/${conversationId}`;

        const response = await axios.get(url, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 200) {
          setConversation(response.data.conversation);
        } else {
          toast.error("Error fetching conversation");
        }
      } catch (error) {
        toast.error("Some error occurred");
      }
    };

    getConversation();
  }, [conversationId]);

  // initial page — most recent MESSAGE_PAGE_SIZE messages for this conversation
  useEffect(() => {
    if (!conversationId) return;

    oldestCursorRef.current = null;
    hasMoreOlderRef.current = true;
    setHasMoreOlder(true);
    setInitialLoading(true);
    setMessages([]);

    const getInitialMessages = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const response = await axios.get(
          `${BASE_URL}/message/${conversationId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: { limit: MESSAGE_PAGE_SIZE },
          }
        );

        if (response.status === 200) {
          const { messages: initialMessages, nextCursor, hasMore } = response.data;

          oldestCursorRef.current = nextCursor;
          hasMoreOlderRef.current = hasMore;
          setHasMoreOlder(hasMore);

          pendingActionRef.current = "initial";
          setMessages(initialMessages);

          // fire-and-forget, deliberately NOT awaited
          markConversationSeen();
        }
      } catch (error) {
        toast.error("Something went wrong");
      } finally {
        setInitialLoading(false);
      }
    };

    getInitialMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  // fetches the next page of OLDER messages, anchoring scroll position
  // so the message the user was looking at doesn't visually jump
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlderRef.current || !hasMoreOlderRef.current || !conversationId) return;

    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);

    const el = containerRef.current;
    const prevScrollHeight = el ? el.scrollHeight : 0;
    const prevScrollTop = el ? el.scrollTop : 0;

    try {
      const token = localStorage.getItem("authToken");
      const params = { limit: MESSAGE_PAGE_SIZE };
      if (oldestCursorRef.current) params.cursor = oldestCursorRef.current;

      const response = await axios.get(
        `${BASE_URL}/message/${conversationId}`,
        { headers: { Authorization: `Bearer ${token}` }, params }
      );

      const { messages: olderMessages, nextCursor, hasMore } = response.data;

      oldestCursorRef.current = nextCursor;
      hasMoreOlderRef.current = hasMore;
      setHasMoreOlder(hasMore);

      if (olderMessages.length > 0) {
        pendingActionRef.current = { type: "prepend", prevScrollHeight, prevScrollTop };
        setMessages((prev) => [...olderMessages, ...prev]);
      }
    } catch (error) {
      toast.error("Failed to load earlier messages");
    } finally {
      isLoadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [conversationId]);

  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    if (el.scrollTop < LOAD_OLDER_THRESHOLD_PX && hasMoreOlderRef.current && !isLoadingOlderRef.current) {
      loadOlderMessages();
    }

    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom < 150;
  }, [loadOlderMessages]);

  // measure where the virtualized list starts inside the scroll container
  // (profile header + the fixed-height "loading older" slot sit above it).
  // Re-measured on font change too: a different typeface can change the
  // header block's height, which would otherwise desync every row offset.
  useLayoutEffect(() => {
    if (listStartRef.current) {
      setScrollMargin(listStartRef.current.offsetTop);
    }
  }, [initialLoading, friend?._id, currentFontId]);

  // keep offsets correct when the viewport is resized / rotated
  useEffect(() => {
    const handleResize = () => {
      if (listStartRef.current) {
        setScrollMargin(listStartRef.current.offsetTop);
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 70,
    overscan: 8,
    scrollMargin,
    getItemKey: (index) => messages[index]?._id ?? index,
    useFlushSync: false,
  });

  const virtualItems = virtualizer.getVirtualItems();

  // resolves the scroll position AFTER messages actually re-render, based
  // on what kind of change just happened.
  useLayoutEffect(() => {
    if (initialLoading) return;

    const el = containerRef.current;
    if (!el || messages.length === 0) return;

    const action = pendingActionRef.current;
    if (!action) return;
    pendingActionRef.current = null;

    if (action === "initial") {
      const lastIndex = messages.length - 1;
      virtualizer.scrollToIndex(lastIndex, { align: "end" });
      // dynamic-height rows (images, shared-post cards) can still be
      // settling their measured size right after this first pass — a
      // second call next frame corrects any small overshoot/undershoot
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(lastIndex, { align: "end" });
      });
    } else if (action?.type === "prepend") {
      // keep the same message visually anchored after older ones are added above it
      el.scrollTop = el.scrollHeight - action.prevScrollHeight + action.prevScrollTop;
    } else if (action === "append") {
      if (isNearBottomRef.current) {
        virtualizer.scrollToIndex(messages.length - 1, { align: "end" });
      }
    }
  }, [messages, initialLoading, virtualizer]);

  // handle the seen feature when new messages arrive
  useEffect(() => {
    const handleNewMessage = (incomingMessage) => {
      if (incomingMessage.conversationId !== conversationId) return;

      pendingActionRef.current = "append";
      setMessages((prev) => [...prev, incomingMessage]);

      const incomingSenderId =
        typeof incomingMessage.senderId === "object"
          ? incomingMessage.senderId._id
          : incomingMessage.senderId;

      if (
        incomingSenderId !== user?._id &&
        document.visibilityState === "visible"
      ) {
        markConversationSeen();
      }
    };

    socket.on("newMessage", handleNewMessage);
    return () => socket.off("newMessage", handleNewMessage);
  }, [conversationId, user?._id]);

  // handle a message being unsent — by us (other tab/device) or by the friend
  useEffect(() => {
    const handleMessageDeleted = ({ messageId, conversationId: convId }) => {
      if (convId !== conversationId) return;
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    socket.on("messageDeleted", handleMessageDeleted);
    return () => socket.off("messageDeleted", handleMessageDeleted);
  }, [conversationId]);

  // handle the seen feature during a tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        markConversationSeen();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [conversationId]);

  // listen for messagesSeen from the receiver
  useEffect(() => {
    const handleMessagesSeen = ({ conversationId: convId, seenAt }) => {
      if (convId !== conversationId) return;

      setMessages((prev) =>
        prev.map((msg) => {
          const senderId =
            typeof msg.senderId === "object"
              ? msg.senderId._id
              : msg.senderId;

          return senderId === user?._id
            ? { ...msg, seen: true, updatedAt: seenAt }
            : msg;
        })
      );
    };

    socket.on("messagesSeen", handleMessagesSeen);
    return () => socket.off("messagesSeen", handleMessagesSeen);
  }, [conversationId, user?._id]);

  // listen for a reaction change (added/removed/swapped) from the friend —
  // our own reactions are applied optimistically in handleReactToMessage,
  // so this only needs to handle the OTHER participant's reactions arriving
  useEffect(() => {
    const handleMessageReacted = ({ messageId, conversationId: convId, reactions }) => {
      if (convId !== conversationId) return;

      setMessages((prev) =>
        prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg))
      );
    };

    socket.on("messageReacted", handleMessageReacted);
    return () => socket.off("messageReacted", handleMessageReacted);
  }, [conversationId]);

  // listen for the friend (or another one of our own tabs/devices)
  // changing the chat theme/font, so both sides stay in sync
  useEffect(() => {
    const handleThemeChanged = ({ conversationId: convId, chatTheme, chatFont }) => {
      if (convId !== conversationId) return;

      setConversation((prev) =>
        prev
          ? {
              ...prev,
              ...(chatTheme ? { chatTheme } : {}),
              ...(chatFont ? { chatFont } : {}),
            }
          : prev
      );
    };

    socket.on("themeChanged", handleThemeChanged);
    return () => socket.off("themeChanged", handleThemeChanged);
  }, [conversationId]);

  // derive which message gets the "Seen X ago" label
  const lastSeenMessageId = [...messages]
    .reverse()
    .find((msg) => {
      const senderId =
        typeof msg.senderId === "object"
          ? msg.senderId._id
          : msg.senderId;
      return senderId === user?._id && msg.seen === true;
    })?._id;

  // typing indicator: listen
  useEffect(() => {
    const handleTypingEvent = ({ senderId, conversationId: convId }) => {
      if (convId === conversationId && senderId === friend?._id) {
        setIsFriendTyping(true);
      }
    };

    const handleStopTypingEvent = ({ senderId, conversationId: convId }) => {
      if (convId === conversationId && senderId === friend?._id) {
        setIsFriendTyping(false);
      }
    };

    socket.on("typing", handleTypingEvent);
    socket.on("stopTyping", handleStopTypingEvent);

    return () => {
      socket.off("typing", handleTypingEvent);
      socket.off("stopTyping", handleStopTypingEvent);
    };
  }, [conversationId, friend?._id]);

  useEffect(() => {
    return () => clearTimeout(typingTimeoutRef.current);
  }, []);

  // switching to another conversation must not carry over the previous
  // chat's suggestions (or leave a request running for it)
  useEffect(() => {
    suggestAbortRef.current?.abort();
    setIsSuggestionPanelOpen(false);
    setReplySuggestions([]);
    setSuggestionError("");
    setIsSuggesting(false);
  }, [conversationId]);

  useEffect(() => {
    return () => suggestAbortRef.current?.abort();
  }, []);

  // emoji picker: close it when switching to another conversation
  useEffect(() => {
    setIsEmojiPickerOpen(false);
  }, [conversationId]);

  // emoji picker: close on outside press or Escape. Presses on the picker
  // itself and on the smiley button are ignored here (the button toggles it
  // on its own). Pressing the sticker / sparkle / attach buttons or the chat
  // area counts as "outside", so the picker never stacks with those panels.
  useEffect(() => {
    if (!isEmojiPickerOpen) return;

    const handlePointerDown = (e) => {
      if (
        emojiPickerRef.current?.contains(e.target) ||
        emojiButtonRef.current?.contains(e.target)
      ) {
        return;
      }
      setIsEmojiPickerOpen(false);
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setIsEmojiPickerOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isEmojiPickerOpen]);

  const handleTyping = (e) => {
    setMessage(e.target.value);

    socket.emit("typing", {
      senderId: user._id,
      receiverId: friend?._id,
      conversationId,
    });

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", {
        senderId: user._id,
        receiverId: friend?._id,
        conversationId,
      });
    }, 2000);
  };

  const handleSendMessage = async () => {
    if (!message.trim() && selectedImages.length === 0) return;
    if (sendingImage) return; // guard against double-fires while an upload is in flight

    const isImageSend = selectedImages.length > 0;

    try {
      const token = localStorage.getItem("authToken");
      const url = `${BASE_URL}/message/${conversationId}`;

      clearTimeout(typingTimeoutRef.current);
      socket.emit("stopTyping", { senderId: user._id, receiverId: friend?._id, conversationId });

      let response;

      if (isImageSend) {
        setSendingImage(true);
        const formData = new FormData();
        selectedImages.forEach(({ file }) => formData.append("images", file));
        if (message.trim()) formData.append("message", message.trim());

        response = await axios.post(url, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
      } else {
        response = await axios.post(url, { message }, { headers: { Authorization: `Bearer ${token}` } });
      }

      if (response.status === 201) {
        pendingActionRef.current = "append";
        setMessages((prev) => [...prev, response.data.data]);
        notifyMessageSent(response.data.data); // update the list on the left
        setMessage("");
        clearSelectedImages();
        messageInputRef.current?.focus();
      } else {
        toast.error("Error sending message");
      }
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      if (isImageSend) setSendingImage(false);
    }
  };

  // send a sticker / animated sticker / GIF as its own message — plain
  // JSON POST (no file upload involved, it's just a reference/emoji)
  const handleSendSticker = async (sticker) => {
    setIsStickerPickerOpen(false);

    try {
      const token = localStorage.getItem("authToken");
      const url = `${BASE_URL}/message/${conversationId}`;

      clearTimeout(typingTimeoutRef.current);
      socket.emit("stopTyping", { senderId: user._id, receiverId: friend?._id, conversationId });

      const response = await axios.post(
        url,
        { sticker },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 201) {
        pendingActionRef.current = "append";
        setMessages((prev) => [...prev, response.data.data]);
        notifyMessageSent(response.data.data); // update the list on the left
        messageInputRef.current?.focus();
      } else {
        toast.error("Error sending sticker");
      }
    } catch (error) {
      toast.error("Something went wrong");
    }
  };

  // unsend a message — sender-only, enforced again server-side.
  const handleDeleteMessage = async (messageId) => {
    // optimistic — remove immediately, roll back if the request fails
    const previousMessages = messages;
    setMessages((prev) => prev.filter((msg) => msg._id !== messageId));

    try {
      const token = localStorage.getItem("authToken");
      await axios.delete(`${BASE_URL}/message/${messageId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      setMessages(previousMessages);
      toast.error("Could not unsend message");
    }
  };

  // react to a message with an emoji — one reaction per user, toggling
  // off on repeat-tap and swapping on a different emoji, same as the
  // backend's logic. Applied optimistically, rolled back on failure.
  const handleReactToMessage = async (messageId, emoji) => {
    const previousMessages = messages;

    setMessages((prev) =>
      prev.map((msg) => {
        if (msg._id !== messageId) return msg;

        const reactions = msg.reactions || [];
        const existingIndex = reactions.findIndex((r) => {
          const rid = typeof r.userId === "object" ? r.userId?._id : r.userId;
          return rid === user?._id;
        });

        let nextReactions;
        if (existingIndex !== -1 && reactions[existingIndex].emoji === emoji) {
          nextReactions = reactions.filter((_, idx) => idx !== existingIndex);
        } else if (existingIndex !== -1) {
          nextReactions = reactions.map((r, idx) =>
            idx === existingIndex ? { ...r, emoji } : r
          );
        } else {
          nextReactions = [
            ...reactions,
            {
              userId: {
                _id: user._id,
                fullname: user.fullname,
                username: user.username,
                profilePic: user.profilePic,
              },
              emoji,
            },
          ];
        }

        return { ...msg, reactions: nextReactions };
      })
    );

    try {
      const token = localStorage.getItem("authToken");
      const response = await axios.patch(
        `${BASE_URL}/message/${messageId}/react`,
        { emoji },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.status === 200) {
        const { reactions } = response.data;
        setMessages((prev) =>
          prev.map((msg) => (msg._id === messageId ? { ...msg, reactions } : msg))
        );
      }
    } catch (error) {
      setMessages(previousMessages);
      toast.error("Could not react to message");
    }
  };

  // apply a new chat theme + font — optimistic local update, persisted via
  // one PATCH, broadcast over the socket so the friend's open chat updates too
  const handleApplyCustomization = async (themeId, fontId) => {
    if (!conversationId) return;

    const previousThemeId = conversation?.chatTheme;
    const previousFontId = conversation?.chatFont;

    setConversation((prev) =>
      prev ? { ...prev, chatTheme: themeId, chatFont: fontId } : prev
    );

    try {
      const token = localStorage.getItem("authToken");
      await axios.patch(
        `${BASE_URL}/conversation/${conversationId}/theme`,
        { chatTheme: themeId, chatFont: fontId },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      socket.emit("themeChanged", {
        conversationId,
        chatTheme: themeId,
        chatFont: fontId,
      });
    } catch (error) {
      setConversation((prev) =>
        prev
          ? { ...prev, chatTheme: previousThemeId, chatFont: previousFontId }
          : prev
      );
      toast.error("Could not update chat appearance");
    }
  };

  // ---- AI reply suggestions ----
  // Builds the recent TEXT context (stickers / bare images have no text to
  // work from), asks the backend for replies, and shows them in a panel
  // above the input. Nothing is auto-sent: tapping a suggestion only fills
  // the input so the user can edit it first.
  const fetchReplySuggestions = async () => {
    const senderIdOf = (msg) =>
      typeof msg.senderId === "object" ? msg.senderId?._id : msg.senderId;

    const context = messages
      .filter((msg) => typeof msg.text === "string" && msg.text.trim())
      .slice(-AI_REPLY_CONTEXT_SIZE)
      .map((msg) => ({
        sender: senderIdOf(msg) === user?._id ? "me" : "friend",
        text: msg.text.trim(),
      }));

    if (!context.some((item) => item.sender === "friend")) {
      toast.info("No message from your friend to reply to yet");
      return;
    }

    suggestAbortRef.current?.abort();
    const controller = new AbortController();
    suggestAbortRef.current = controller;

    setIsSuggestionPanelOpen(true);
    setIsSuggesting(true);
    setSuggestionError("");
    setReplySuggestions([]);

    try {
      const suggestions = await generateAiReplySuggestions({
        messages: context,
        signal: controller.signal,
      });

      if (controller.signal.aborted) return;

      if (suggestions.length === 0) {
        setSuggestionError("No suggestions this time. Please try again.");
      } else {
        setReplySuggestions(suggestions);
      }
    } catch (error) {
      const errorMessage = getAiErrorMessage(
        error,
        "Unable to get suggestions. Please try again."
      );
      // an aborted request returns "" — stay quiet in that case
      if (errorMessage) setSuggestionError(errorMessage);
    } finally {
      if (suggestAbortRef.current === controller) {
        setIsSuggesting(false);
      }
    }
  };

  const handleSuggestButtonClick = () => {
    // tapping the sparkle again while the panel is open closes it
    if (isSuggestionPanelOpen) {
      suggestAbortRef.current?.abort();
      setIsSuggestionPanelOpen(false);
      setIsSuggesting(false);
      return;
    }

    setIsStickerPickerOpen(false);
    fetchReplySuggestions();
  };

  const closeSuggestionPanel = () => {
    suggestAbortRef.current?.abort();
    setIsSuggestionPanelOpen(false);
    setIsSuggesting(false);
  };

  const handlePickSuggestion = (text) => {
    setMessage(text);
    setIsSuggestionPanelOpen(false);
    messageInputRef.current?.focus();
  };

  // ---- emoji picker ----
  // The smiley toggles the picker; opening it closes the sticker picker and
  // the AI suggestions panel so only one panel sits above the input at a time.
  const handleEmojiButtonClick = () => {
    if (isEmojiPickerOpen) {
      setIsEmojiPickerOpen(false);
      return;
    }

    setIsStickerPickerOpen(false);
    if (isSuggestionPanelOpen) closeSuggestionPanel();
    setIsEmojiPickerOpen(true);
  };

  // Inserts the emoji at the caret (or replaces the current selection) and
  // puts the caret right after it, so several emojis can be added in a row.
  // The picker stays open on purpose for the same reason.
  const handleEmojiSelect = (emoji) => {
    const input = messageInputRef.current;
    const start = Math.min(input?.selectionStart ?? message.length, message.length);
    const end = Math.min(input?.selectionEnd ?? message.length, message.length);

    setMessage(message.slice(0, start) + emoji + message.slice(end));

    const nextRecent = [emoji, ...recentEmojis.filter((item) => item !== emoji)].slice(
      0,
      MAX_RECENT_EMOJIS
    );
    setRecentEmojis(nextRecent);
    try {
      localStorage.setItem(RECENT_EMOJIS_KEY, JSON.stringify(nextRecent));
    } catch (error) {
      // silent: recents are a nicety, not worth interrupting the chat
    }

    requestAnimationFrame(() => {
      const el = messageInputRef.current;
      if (!el) return;
      el.focus();
      const caret = start + emoji.length;
      el.setSelectionRange(caret, caret);
    });
  };

    return (
    <div className={`messageDisplay ${conversationId ? "flex" : "hidden"} md:flex flex-col relative w-full md:w-[65%] lg:w-[70%] h-[100dvh] md:h-full bg-[var(--bg-app)] overflow-hidden`}>

      <div className="reciverDetails w-full h-[64px] md:h-[85px] shrink-0 flex items-center border-b border-[var(--border-soft)]">

        <button
          type="button"
          onClick={handleBack}
          aria-label="Back to messages"
          className="backBtn md:hidden w-[44px] h-full flex-shrink-0 flex justify-center items-center"
        >
          <ArrowLeft size={22} color="var(--text-primary)" />
        </button>

        <div className="messageCard flex-1 min-w-0 h-full flex items-center gap-2 px-2 cursor-pointer">

          <div className="profilePicSection shrink-0 flex justify-center items-center">
            <div className="profilePic w-[40px] h-[40px] md:w-[52px] md:h-[52px] lg:w-[64px] lg:h-[64px] rounded-full overflow-hidden">
              <img src={friend?.profilePic ? friend.profilePic : "/images/default-profile-pic.jpg" } alt="" className="w-full h-full object-cover" />
            </div>
          </div>

          <div className="messageDetails min-w-0 flex flex-col justify-center">
            <div className="fullname text-[var(--text-primary)] text-[15px] lg:text-[18px] truncate">
                <Link
                  to={`/user/get-profile/${friend?._id}`}
                  className="inline-flex items-center gap-1 max-w-full"
                >
                  <span className="truncate">
                    {friend?.fullname}
                  </span>

                  {friend?.role === "admin" && (
                    <BadgeCheck
                      size={18}
                      className="text-sky-400 shrink-0"
                    />
                  )}
                </Link>
              </div>
            <div className="lastMsg text-[12px] lg:text-[14px] truncate">
              <span className={isFriendOnline ? "text-green-500" : "text-[var(--text-muted)]"}>
                {activeStatusText}
              </span>
            </div>
          </div>

        </div>

        <div className="profileInfoBtnSection shrink-0 h-full flex justify-end items-center relative">
          <button
            type="button"
            aria-label="Chat options"
            onClick={() => setIsInfoMenuOpen((prev) => !prev)}
            className="btn w-[30px] h-[30px] md:w-[35px] md:h-[35px] mr-3 md:mr-4 flex items-center justify-center cursor-pointer"
          >
            <Info size={22} color="var(--text-primary)" />
          </button>

          {isInfoMenuOpen && (
            <>
              {/* backdrop — closes the popup on outside click without
                  stealing clicks from the rest of the page */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsInfoMenuOpen(false)}
              />
              <div className="absolute right-3 md:right-4 top-[52px] md:top-[60px] z-50 w-[200px] rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-soft)] shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsInfoMenuOpen(false);
                    setIsThemeOverlayOpen(true);
                  }}
                  className="w-full text-left px-4 py-2.5 text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-menu-hover)] cursor-pointer"
                >
                  Change chat settings
                </button>
              </div>
            </>
          )}
        </div>

      </div>

      {/* The ONLY element carrying the theme. It owns both the scrolling
          message area and the footer, so a gradient is painted once across
          the whole region and runs continuously behind the input pill —
          no second background to keep in sync, no seam where the scroll
          area ends. The font lives here too, so the input inherits it.
          For the "default" theme we deliberately paint no inline
          background at all, so the app-level bg-[var(--bg-app)] on the
          outer wrapper shows through and flips with the global toggle. */}
      <div
        className="themedArea flex-1 min-h-0 w-full flex flex-col transition-[background] duration-700 ease-in-out"
        style={{
          ...(activeTheme?.bg && !isDefaultTheme ? { background: activeTheme.bg } : {}),
          ...chatFontStyle,
        }}
      >

        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="chatContainer no-scrollbar flex-1 min-h-0 w-full overflow-y-auto overflow-x-hidden"
        >

          <div className="viewProfileSection w-full h-[220px] sm:h-[250px] flex flex-col justify-center items-center">

            <div className="profilePicSection w-full h-[100px] sm:h-[120px] flex justify-center items-center">
              <div className="profilePic w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] lg:w-[100px] lg:h-[100px] rounded-full overflow-hidden">
                <img src={friend?.profilePic ? friend.profilePic : "/images/default-profile-pic.jpg"} alt="" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="namesSection w-full px-4 text-center">
              <div className="fullname w-full flex justify-center items-center text-[var(--text-primary)] text-[18px] sm:text-[20px] lg:text-[24px]">
                <span className="truncate">{friend?.fullname}</span>
              </div>
              <div className="username w-full flex justify-center items-center text-[var(--text-muted)] text-[13px] sm:text-[14px] lg:text-[18px]">
                <span className="truncate">{friend?.username}</span>
              </div>
            </div>

            <div className="viewProfileBtn mt-3 flex justify-center items-center">
              <Link to={`/user/get-profile/${friend?._id}`}>
                <button className='w-[130px] sm:w-[150px] h-[38px] sm:h-[40px] bg-[var(--bg-elevated)] hover:bg-[var(--bg-menu-hover)] cursor-pointer text-[var(--text-primary)] text-[14px] sm:text-[16px] font-bold rounded-xl'>
                  View Profile
                </button>
              </Link>
            </div>

          </div>

          {/* fixed height regardless of loading state, so it never shifts
              the measured offset of the virtualized list below it */}
          <div className="h-[32px] w-full flex items-center justify-center text-[var(--text-muted)] text-xs">
            {isLoadingOlder && "Loading earlier messages..."}
          </div>

          {initialLoading ? (
            <div className="w-full h-[100px] flex items-center justify-center text-[var(--text-muted)] text-sm">
              Loading conversation...
            </div>
          ) : (
            <div
              ref={listStartRef}
              className="Chat w-full"
              style={{ position: "relative", height: `${virtualizer.getTotalSize()}px` }}
            >
              {virtualItems.map((virtualRow) => {
                const msg = messages[virtualRow.index];
                if (!msg) return null;

                // A date header renders above this message whenever it's
                // the first message of the list, or the previous message
                // (chronologically, i.e. index - 1) falls on a different
                // calendar day. Living inside the same measured row keeps
                // the virtualizer's dynamic-height measurement correct —
                // no separate "header" virtual items to juggle.
                const prevMsg = messages[virtualRow.index - 1];
                const showDateHeader =
                  !prevMsg || !isSameDay(prevMsg.createdAt, msg.createdAt);

                return (
                  <div
                    key={msg._id}
                    data-index={virtualRow.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      transform: `translateY(${virtualRow.start - scrollMargin}px)`,
                    }}
                  >
                    {showDateHeader && (
                      <div className="w-full flex justify-center items-center my-3">
                        <span className="text-[11px] sm:text-[12px] font-medium px-3 py-1 rounded-full bg-[var(--bg-elevated)] text-[var(--text-muted)]">
                          {formatDateHeader(msg.createdAt)}
                        </span>
                      </div>
                    )}

                    <MessageBox
                      message={msg}
                      showSeen={msg._id === lastSeenMessageId}
                      onDelete={handleDeleteMessage}
                      onReact={handleReactToMessage}
                      senderBubbleColor={activeTheme?.senderBubble}
                      receiverBubbleColor={activeTheme?.receiverBubble}
                      senderTextColor={activeTheme?.senderText}
                      receiverTextColor={activeTheme?.receiverText}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {isFriendTyping && (
            <div className="w-full px-4 py-3 text-[var(--text-muted)] text-[15px] sm:text-[18px]">
              Typing...
            </div>
          )}

        </div>

        {/* last flex child of themedArea, so it's pinned to the bottom and
            sits ON the theme — it needs no background of its own */}
        <div className="footer shrink-0 relative w-full flex flex-col justify-center px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">

          {/* AI reply suggestions — opened by the blue sparkle button */}
          {isSuggestionPanelOpen && (
            <div className="aiSuggestions w-[98%] mx-auto mb-2 rounded-2xl p-3 bg-[var(--bg-elevated)] border border-[var(--border-soft)]">

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-[13px] text-[var(--text-muted)]">
                  <Sparkles size={15} className="text-[var(--accent-blue)]" />
                  <span>Suggested replies</span>
                </div>

                <button
                  type="button"
                  onClick={closeSuggestionPanel}
                  aria-label="Close suggestions"
                  className="w-[24px] h-[24px] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {isSuggesting && (
                <div className="flex items-center gap-1.5 px-1 py-2">
                  <span className="w-[7px] h-[7px] rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-[7px] h-[7px] rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-[7px] h-[7px] rounded-full bg-[var(--text-muted)] animate-bounce" />
                </div>
              )}

              {!isSuggesting && suggestionError && (
                <div className="flex flex-col items-start gap-1">
                  <p className="text-[var(--color-error)] text-[13px] leading-snug">
                    {suggestionError}
                  </p>
                  <button
                    type="button"
                    onClick={fetchReplySuggestions}
                    className="flex items-center gap-1 text-[13px] text-[var(--accent-blue)] cursor-pointer hover:underline"
                  >
                    <RotateCw size={13} />
                    Retry
                  </button>
                </div>
              )}

              {!isSuggesting && !suggestionError && replySuggestions.length > 0 && (
                <div className="flex flex-col gap-2">
                  {replySuggestions.map((suggestion, idx) => (
                    <button
                      key={`${idx}-${suggestion}`}
                      type="button"
                      onClick={() => handlePickSuggestion(suggestion)}
                      className="w-full text-left px-4 py-2.5 rounded-2xl bg-[var(--bg-app)] hover:bg-[var(--bg-menu-hover)] text-[var(--text-primary)] text-[14px] leading-snug break-words cursor-pointer transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}

                  <button
                    type="button"
                    onClick={fetchReplySuggestions}
                    className="self-start mt-0.5 flex items-center gap-1 text-[13px] text-[var(--accent-blue)] cursor-pointer hover:underline"
                  >
                    <RotateCw size={13} />
                    More suggestions
                  </button>
                </div>
              )}

            </div>
          )}

          {selectedImages.length > 0 && (
            <div className="imagePreview w-[98%] mx-auto mb-2 flex flex-wrap items-center gap-3 sm:gap-4 bg-[var(--bg-elevated)] rounded-2xl p-3">

              {/* tilted fanned stack of selected images */}
              <div className="flex items-center pl-3">
                {selectedImages.map((img, idx) => {
                  const rotations = [-8, 5, -4, 7]; // fixed tilt per slot, alternating
                  return (
                    <div
                      key={img.id}
                      style={{
                        transform: `rotate(${rotations[idx % rotations.length]}deg)`,
                        marginLeft: idx === 0 ? 0 : "-18px",
                        zIndex: idx,
                      }}
                      className="relative w-[48px] h-[48px] sm:w-[56px] sm:h-[56px] shrink-0 rounded-lg overflow-hidden border-2 border-[var(--bg-elevated)] shadow-md hover:z-10 hover:scale-105 transition-transform"
                    >
                      <img src={img.preview} alt="" className="w-full h-full object-cover" />

                      {sendingImage && (
                        <div className="absolute inset-0 bg-black/50 flex justify-center items-center">
                          <div className="w-[16px] h-[16px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        </div>
                      )}

                      {!sendingImage && (
                        <button
                          onClick={() => removeSelectedImage(img.id)}
                          aria-label="Remove image"
                          className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-black/80 rounded-full flex justify-center items-center text-white text-[12px] cursor-pointer hover:bg-black"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              <span className="text-[var(--text-muted)] text-[13px]">
                {selectedImages.length}/{MAX_IMAGES} selected
              </span>

              <button
                onClick={clearSelectedImages}
                disabled={sendingImage}
                className="ml-auto text-[var(--text-primary)] text-[13px] px-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:text-[var(--text-muted)]"
              >
                Clear all
              </button>
            </div>
          )}

          <div
            style={{ background: inputBarBg, borderColor: inputBarBorder }}
            className="messageBar relative w-[98%] mx-auto h-[48px] sm:h-[55px] rounded-3xl flex items-center border overflow-hidden"
          >

            <div className="emojiSection w-[42px] sm:w-[48px] shrink-0 flex justify-center items-center">
              <button
                type="button"
                ref={emojiButtonRef}
                onClick={handleEmojiButtonClick}
                aria-label="Emojis"
                aria-expanded={isEmojiPickerOpen}
                className="emoji w-[36px] h-[36px] flex justify-center items-center cursor-pointer"
              >
                <Smile
                  size={24}
                  style={{ color: isEmojiPickerOpen ? "var(--accent-blue)" : inputBarText }}
                />
              </button>
            </div>

            <div className="messageInput flex-1 min-w-0 h-full">
              <input
                type="text"
                name="message"
                id="message"
                value={message}
                onChange={handleTyping}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    handleSendMessage();
                  }
                }}
                ref={messageInputRef}
                style={{ color: inputBarText, fontFamily: activeFont.stack }}
                className="w-full h-full outline-none text-[16px] lg:text-[18px] px-2 sm:px-4 bg-transparent placeholder-current placeholder:opacity-50"
                placeholder="Message..."
              />
            </div>

            <div className="gllerySection shrink-0 h-full flex justify-center items-center gap-1 sm:gap-2 pr-2 sm:pr-3">
              <button
                type="button"
                onClick={handleSuggestButtonClick}
                disabled={initialLoading}
                aria-label="Suggest replies with AI"
                title="Suggest replies"
                className="aiSuggest w-[36px] h-[36px] flex justify-center items-center disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Sparkles size={22} className="text-[var(--accent-blue)]" />
              </button>
              <button
                type="button"
                onClick={handleSendMessage}
                aria-label="Send message"
                className="send w-[36px] h-[36px] flex justify-center items-center cursor-pointer"
              >
                <Send size={22} className="text-[var(--accent-blue)]" />
              </button>
              <button
                type="button"
                onClick={() => setIsStickerPickerOpen((prev) => !prev)}
                aria-label="Stickers and GIFs"
                className="sticker w-[36px] h-[36px] flex justify-center items-center cursor-pointer"
              >
                <Sticker size={22} style={{ color: inputBarText }} />
              </button>
              <button
                type="button"
                aria-label="Attach images"
                onClick={() => {
                  if (selectedImages.length < MAX_IMAGES) {
                    setIsStickerPickerOpen(false);
                    fileInputRef.current?.click();
                  }
                }}
                className={`gallery w-[36px] h-[36px] flex justify-center items-center ${
                  selectedImages.length >= MAX_IMAGES ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                <Image size={22} style={{ color: inputBarText }} />
              </button>
              <input
                type="file"
                accept="image/*"
                multiple
                ref={fileInputRef}
                onChange={handleImageSelect}
                className="hidden"
              />
            </div>

          </div>

          {/* emoji picker — sibling of messageBar for the same reason as the
              sticker picker below: messageBar has overflow-hidden, which
              would clip it. Anchored to the footer, above the input. */}
          {isEmojiPickerOpen && (
            <EmojiPicker
              pickerRef={emojiPickerRef}
              recentEmojis={recentEmojis}
              onSelect={handleEmojiSelect}
            />
          )}

          {/* sibling of messageBar (not a child of it) — messageBar has
              overflow-hidden for its rounded corners, which would clip this
              overlay to nothing. footer keeps `relative` so it stays the
              containing block for the picker's absolute positioning. */}
          {isStickerPickerOpen && (
            <StickerPicker
              onSelectSticker={handleSendSticker}
              onClose={() => setIsStickerPickerOpen(false)}
            />
          )}

        </div>

      </div>

      <ThemeOverlay
        isOpen={isThemeOverlayOpen}
        onClose={() => setIsThemeOverlayOpen(false)}
        conversationId={conversationId}
        currentThemeId={currentThemeId}
        currentFontId={currentFontId}
        onApply={handleApplyCustomization}
      />

    </div>
  )
}

export default Chat
