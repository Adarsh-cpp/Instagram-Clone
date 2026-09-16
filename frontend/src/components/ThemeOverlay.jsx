// components/ThemeOverlay.jsx
import { useEffect, useState } from "react";
import { X, Check } from "lucide-react";
import { CHAT_THEMES, CHAT_FONTS, loadAllChatFonts } from "../data/chatTheme";
import ThemePreviewPanel from "./ThemePreviewPanel";

export default function ThemeOverlay({
  isOpen,
  onClose,
  currentThemeId,
  currentFontId,
  onApply,
}) {
  const [activeTab, setActiveTab] = useState("theme");
  const [selectedThemeId, setSelectedThemeId] = useState(currentThemeId || "default");
  const [selectedFontId, setSelectedFontId] = useState(currentFontId || "default");
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setActiveTab("theme");
      setSelectedThemeId(currentThemeId || "default");
      setSelectedFontId(currentFontId || "default");
      setShowPreview(false);

      // every font row renders in its own typeface, so pull the whole
      // catalog in one stylesheet request when the sheet opens
      loadAllChatFonts();
    }
  }, [isOpen, currentThemeId, currentFontId]);

  if (!isOpen) return null;

  const hasChanged =
    selectedThemeId !== (currentThemeId || "default") ||
    selectedFontId !== (currentFontId || "default");

  const handleApply = () => {
    if (!hasChanged) return;
    onApply(selectedThemeId, selectedFontId);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      style={{ background: "var(--overlay-scrim)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl pb-6 shadow-2xl animate-slide-up sm:rounded-3xl"
        style={{ background: "var(--bg-panel)", color: "var(--text-primary)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div className="h-1 w-10 rounded-full" style={{ background: "var(--border-input)" }} />
        </div>

        {/* header */}
        <div className="relative flex items-center justify-center px-4 pt-3 pb-2">
          <h2 className="text-base font-medium">Customize</h2>
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
          <button
            onClick={() => setActiveTab("theme")}
            className={`relative px-3 pb-3 text-sm transition ${
              activeTab === "theme"
                ? "font-semibold text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Theme
            {activeTab === "theme" && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded bg-[var(--text-primary)]" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("font")}
            className={`relative px-3 pb-3 text-sm transition ${
              activeTab === "font"
                ? "font-semibold text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            Font
            {activeTab === "font" && (
              <span className="absolute inset-x-0 -bottom-px h-[2px] rounded bg-[var(--text-primary)]" />
            )}
          </button>
        </div>

        {activeTab === "theme" ? (
          <>
            {/* live mock preview of whichever swatch is currently selected —
                never touches the real chat behind the sheet */}
            {showPreview && (
              <div className="pt-3">
                <ThemePreviewPanel themeId={selectedThemeId} />
              </div>
            )}

            {/* theme grid */}
            <div className="grid max-h-[46vh] grid-cols-3 gap-3 overflow-y-auto px-4 py-4 sm:max-h-[52vh]">
              {CHAT_THEMES.map((theme) => {
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
                        isSelected ? "ring-blue-500" : "ring-transparent"
                      }`}
                      style={{ background: isDefault ? "var(--bg-app)" : theme.bg }}
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

                      {isSelected && (
                        <div className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500">
                          <Check size={13} strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    <span className="w-full truncate text-xs" style={{ color: "var(--text-primary)" }}>
                      {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
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
                      ? "border-blue-500 bg-blue-500/10"
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
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-500">
                      <Check size={13} strokeWidth={3} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* action bar */}
        <div className="flex gap-3 px-4 pt-2">
          {activeTab === "theme" && (
            <button
              onClick={() => setShowPreview((prev) => !prev)}
              className="flex-1 rounded-xl py-3 text-sm font-semibold hover:bg-[var(--bg-menu-hover)]"
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
                ? "bg-blue-600 text-white active:bg-blue-700"
                : "bg-blue-600/30"
            }`}
            style={!hasChanged ? { color: "var(--text-muted)" } : undefined}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}