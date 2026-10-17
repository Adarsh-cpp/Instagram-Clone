// components/ThemeOverlay.jsx
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Check, Zap } from "lucide-react";
import {
  CHAT_THEMES,
  DEVS_CHAT_THEMES,
  CHAT_FONTS,
  getThemeById,
  isDevsChatTheme,
  loadAllChatFonts,
} from "../data/chatTheme";
import ThemePreviewPanel from "./ThemePreviewPanel";
import SharedMediaPanel from "./SharedMediaPanel";
import { ChatThemePreview } from "./devs/ChatThemeFx";
import { useTheme } from "../context/ThemeContext";

const TABS = [
  { id: "theme", label: "Theme" },
  { id: "font", label: "Font" },
  { id: "media", label: "Shared media" },
];

export default function ThemeOverlay({
  isOpen,
  onClose,
  conversationId,
  currentThemeId,
  currentFontId,
  onApply,
}) {
  const { isDevs } = useTheme();

  const [activeTab, setActiveTab] = useState("theme");
  const [selectedThemeId, setSelectedThemeId] = useState(currentThemeId || "default");
  const [selectedFontId, setSelectedFontId] = useState(currentFontId || "default");
  const [showPreview, setShowPreview] = useState(false);

  // the media tab only ever mounts once the user actually opens it, so the
  // first media request isn't fired just because someone wanted to change a font
  const [hasOpenedMedia, setHasOpenedMedia] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("theme");
      setSelectedThemeId(currentThemeId || "default");
      setSelectedFontId(currentFontId || "default");
      setShowPreview(false);
      setHasOpenedMedia(false);

      // every font row renders in its own typeface, so pull the whole
      // catalog in one stylesheet request when the sheet opens
      loadAllChatFonts();
    }
  }, [isOpen, currentThemeId, currentFontId]);

  useEffect(() => {
    if (activeTab === "media") setHasOpenedMedia(true);
  }, [activeTab]);

  if (!isOpen) return null;

  const hasChanged =
    selectedThemeId !== (currentThemeId || "default") ||
    selectedFontId !== (currentFontId || "default");

  const handleApply = () => {
    if (!hasChanged) return;
    onApply(selectedThemeId, selectedFontId);
    onClose();
  };

  // Devs themes are only offered while Devs Mode is on; light/dark keep
  // exactly the original single grid.
  const sections = isDevs
    ? [
        { key: "devs", title: "Devs themes", themes: DEVS_CHAT_THEMES },
        { key: "classic", title: "Classic", themes: CHAT_THEMES },
      ]
    : [{ key: "classic", title: null, themes: CHAT_THEMES }];

  // selection colours: blue in classic, neon cyan in Devs Mode
  const selectedRing = isDevs ? "ring-[var(--devs-cyan)]" : "ring-blue-500";
  const checkBadge = isDevs
    ? "bg-[var(--devs-cyan)] text-[#04050e]"
    : "bg-blue-500";
  const selectedRow = isDevs
    ? "border-[var(--devs-cyan)] bg-[rgba(34,240,255,0.1)]"
    : "border-blue-500 bg-blue-500/10";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "var(--overlay-scrim)" }}
      onClick={onClose}
    >
      <motion.div
        {...(isDevs
          ? {
              initial: { opacity: 0, y: 40, scale: 0.97 },
              animate: { opacity: 1, y: 0, scale: 1 },
              transition: { type: "spring", stiffness: 300, damping: 30 },
            }
          : {})}
        className={`w-full max-w-md rounded-t-3xl pb-6 shadow-2xl sm:rounded-3xl ${
          isDevs
            ? "backdrop-blur-xl border border-[var(--border-popup)] shadow-[0_0_60px_rgba(34,240,255,0.15)]"
            : "animate-slide-up"
        }`}
        style={{ background: "var(--bg-panel)", color: "var(--text-primary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--border-input)" }} />
        </div>

        {/* header */}
        <div className="relative flex items-center justify-center px-4 pt-3 pb-2">
          <h2
            className={`text-base font-medium ${
              isDevs ? "font-mono text-[13px] uppercase tracking-[0.25em]" : ""
            }`}
          >
            Chat settings
          </h2>
          <button
            onClick={onClose}
            className="absolute right-4 rounded-full p-1 hover:bg-[var(--bg-menu-hover)]"
            style={{ color: "var(--text-muted)" }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* tabs */}
        <div className="mt-1 flex border-b border-[var(--border-soft)] px-4">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-3 pb-3 text-sm transition ${
                  isActive
                    ? "font-semibold text-[var(--text-primary)]"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                } ${isDevs ? "font-mono text-[12px] uppercase tracking-wider" : ""}`}
              >
                {tab.label}
                {isActive && (
                  <span
                    className={`absolute inset-x-0 -bottom-px h-[2px] rounded ${
                      isDevs
                        ? "bg-[linear-gradient(90deg,#22f0ff,#8b5cf6,#ff2bd6)] shadow-[0_0_10px_rgba(34,240,255,0.9)]"
                        : "bg-[var(--text-primary)]"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "theme" && (
          <>
            {/* live mock preview of whichever swatch is currently selected —
                never touches the real chat behind the sheet */}
            {showPreview && (
              <div className="pt-3">
                {isDevsChatTheme(selectedThemeId) ? (
                  <ChatThemePreview
                    theme={getThemeById(selectedThemeId)}
                    animated={isDevs}
                  />
                ) : (
                  <ThemePreviewPanel themeId={selectedThemeId} />
                )}
              </div>
            )}

            {/* theme grid(s) */}
            <div className="max-h-[46vh] overflow-y-auto px-4 py-4 sm:max-h-[52vh]">
              {sections.map((section) => (
                <div key={section.key} className={section.key === "classic" && isDevs ? "mt-5" : ""}>
                  {section.title && (
                    <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--text-muted)]">
                      {section.key === "devs" && (
                        <Zap size={12} className="text-[var(--devs-cyan)]" />
                      )}
                      {section.title}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3">
                    {section.themes.map((theme) => {
                      const isSelected = theme.id === selectedThemeId;
                      // the "default" swatch mirrors the app-wide light/dark
                      // vars instead of a fixed color, so it previews black in
                      // dark mode and white in light mode, matching the real
                      // chat's behavior for this theme.
                      const isDefault = theme.id === "default";

                      return (
                        <button
                          key={theme.id}
                          onClick={() => setSelectedThemeId(theme.id)}
                          className="flex flex-col items-center gap-1.5 text-left"
                        >
                          <div
                            className={`relative aspect-[3/4] w-full overflow-hidden rounded-xl ring-2 transition ${
                              isSelected ? selectedRing : "ring-transparent"
                            }`}
                            style={{
                              background: isDefault ? "var(--bg-app)" : theme.bg,
                              ...(theme.devs
                                ? {
                                    boxShadow: isSelected
                                      ? `0 0 22px ${theme.senderBubble}88`
                                      : `0 0 10px ${theme.senderBubble}33`,
                                  }
                                : {}),
                            }}
                          >
                            {/* mini bubble preview so the swatch reads as "a chat", not just a color */}
                            <div className="absolute inset-x-2 bottom-2 flex flex-col gap-1">
                              <div
                                className="ml-auto h-2.5 w-2/3 rounded-full"
                                style={{ background: isDefault ? "var(--bg-elevated)" : theme.senderBubble }}
                              />
                              <div
                                className="h-2.5 w-1/2 rounded-full"
                                style={{ background: isDefault ? "var(--border-soft)" : theme.receiverBubble }}
                              />
                            </div>

                            {theme.devs && (
                              <span className="absolute left-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-black/60 px-1.5 py-[1px] font-mono text-[8px] font-bold tracking-wider text-[var(--devs-cyan)]">
                                <Zap size={8} />
                                FX
                              </span>
                            )}

                            {isSelected && (
                              <div className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full ${checkBadge}`}>
                                <Check size={13} strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <span
                            className={`w-full truncate text-xs ${isDevs ? "font-mono" : ""}`}
                            style={{ color: "var(--text-primary)" }}
                          >
                            {theme.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === "font" && (
          // Font list — each row is set in its own typeface, so the list is
          // the preview. No mock panel needed here.
          <div className="max-h-[46vh] overflow-y-auto px-4 py-3 sm:max-h-[52vh]">
            {CHAT_FONTS.map((font) => {
              const isSelected = font.id === selectedFontId;
              return (
                <button
                  key={font.id}
                  onClick={() => setSelectedFontId(font.id)}
                  className={`mb-2 flex w-full items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition ${
                    isSelected
                      ? selectedRow
                      : "border-[var(--border-soft)] bg-[var(--bg-elevated)] hover:bg-[var(--bg-menu-hover)]"
                  }`}
                >
                  <div className="min-w-0" style={{ fontFamily: font.stack }}>
                    <div className="truncate text-[15px]" style={{ color: "var(--text-primary)" }}>
                      {font.name}
                    </div>
                    <div className="truncate text-[13px]" style={{ color: "var(--text-muted)" }}>
                      Talk to me in this one
                    </div>
                  </div>

                  {isSelected && (
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${checkBadge}`}>
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Kept mounted (just hidden) once visited, so flicking back to the
            media tab doesn't re-fetch every page the user already scrolled. */}
        {hasOpenedMedia && (
          <div className={activeTab === "media" ? "block" : "hidden"}>
            <SharedMediaPanel conversationId={conversationId} />
          </div>
        )}

        {/* action bar — theme/font only; the media tab has nothing to apply */}
        {activeTab !== "media" && (
          <div className="flex gap-3 px-4 pt-2">
            {activeTab === "theme" && (
              <button
                onClick={() => setShowPreview((prev) => !prev)}
                className={`flex-1 rounded-xl py-3 text-sm font-semibold hover:bg-[var(--bg-menu-hover)] ${
                  isDevs ? "font-mono uppercase tracking-wider text-[12px] border border-[var(--border-popup)]" : ""
                }`}
                style={{ background: "var(--bg-elevated)", color: "var(--text-primary)" }}
              >
                {showPreview ? "Hide preview" : "Preview"}
              </button>
            )}
            <button
              onClick={handleApply}
              disabled={!hasChanged}
              className={`flex-1 rounded-xl py-3 text-sm font-semibold transition ${
                hasChanged
                  ? isDevs
                    ? "bg-[linear-gradient(120deg,#22f0ff,#8b5cf6,#ff2bd6)] text-[#04050e] shadow-[0_0_22px_rgba(34,240,255,0.4)] font-mono uppercase tracking-wider text-[12px] active:scale-95"
                    : "bg-blue-600 text-white active:bg-blue-700"
                  : `bg-blue-600/30 ${isDevs ? "font-mono uppercase tracking-wider text-[12px]" : ""}`
              }`}
              style={!hasChanged ? { color: "var(--text-muted)" } : undefined}
            >
              Apply
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}