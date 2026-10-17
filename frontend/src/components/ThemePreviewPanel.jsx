// components/ThemePreviewPanel.jsx
import { getThemeById } from "../data/chatTheme";
import { useTheme } from "../context/ThemeContext";
import ChatThemeFx from "./devs/ChatThemeFx";

// A small, static mock conversation used to preview a chat theme.
// Purely presentational: it has no connection to the real conversation
// or the Chat window behind the sheet, so selecting it never mutates
// anything outside ThemeOverlay's own state.
// getThemeById also knows the Devs Mode themes; those get their animated
// background here too when Devs Mode is on.
export default function ThemePreviewPanel({ themeId }) {
  const theme = getThemeById(themeId);
  const { isDevs } = useTheme();

  return (
    <div
      className="relative isolate mx-4 mb-3 overflow-hidden rounded-2xl border border-white/10"
      style={{ background: theme.bg }}
    >
      {isDevs && theme.fx && <ChatThemeFx fx={theme.fx} />}

      <div className="flex flex-col gap-2 p-4">
        <div
          className="max-w-[75%] self-start rounded-2xl rounded-bl-sm px-3 py-2 text-sm"
          style={{ background: theme.receiverBubble, color: theme.receiverText }}
        >
          Hey! Have you seen the new theme options?
        </div>
        <div
          className="max-w-[75%] self-end ml-auto rounded-2xl rounded-br-sm px-3 py-2 text-sm"
          style={{ background: theme.senderBubble, color: theme.senderText }}
        >
          Yeah, this one looks great 👀
        </div>
        <div
          className="max-w-[75%] self-start rounded-2xl rounded-bl-sm px-3 py-2 text-sm"
          style={{ background: theme.receiverBubble, color: theme.receiverText }}
        >
          Let's try a few more before deciding.
        </div>
      </div>
    </div>
  );
}