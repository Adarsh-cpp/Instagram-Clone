import { useMemo } from "react";
import { useTheme } from "../../context/ThemeContext";

/*
  Animated backgrounds for the Devs Mode chat themes.

  - Rendered inside the chat's themed area, which has `isolate`, so the layer
    sits at z-index -1: above the theme's background but behind the messages.
  - Pure CSS animations (transform / opacity / background-position), so it
    stays light. Not rendered at all on lite devices (phones, touch,
    low-end, reduced motion): those just see the theme's static `bg`.
*/

const FX_CSS = `
@keyframes cfx-drift-a { from { transform: translate3d(-8%, -4%, 0) scale(1); } to { transform: translate3d(14%, 10%, 0) scale(1.3); } }
@keyframes cfx-drift-b { from { transform: translate3d(8%, 6%, 0) scale(1.2); } to { transform: translate3d(-14%, -10%, 0) scale(0.95); } }
@keyframes cfx-rain { from { transform: translateY(-100%); } to { transform: translateY(110vh); } }
@keyframes cfx-grid { from { background-position: 0 0; } to { background-position: 0 48px; } }
@keyframes cfx-twinkle { 0%, 100% { opacity: 0.15; transform: scale(0.8); } 50% { opacity: 1; transform: scale(1.4); } }
@keyframes cfx-pulse-x { from { transform: translateX(-160px); } to { transform: translateX(110vw); } }
@keyframes cfx-pulse-y { from { transform: translateY(-160px); } to { transform: translateY(120vh); } }
@keyframes cfx-spin { to { transform: rotate(360deg); } }
@keyframes cfx-scan { from { transform: translateY(-30%); } to { transform: translateY(130%); } }
@keyframes cfx-plasma { 0% { background-position: 0% 0%; } 50% { background-position: 100% 60%; } 100% { background-position: 30% 100%; } }
@keyframes cfx-hue { to { filter: hue-rotate(360deg); } }
@keyframes cfx-flicker { 0%, 100% { opacity: 1; } 92% { opacity: 1; } 93% { opacity: 0.82; } 94% { opacity: 1; } 97% { opacity: 0.9; } }
`;

const rand = (min, max) => min + Math.random() * (max - min);

const Blob = ({ style }) => (
  <div
    style={{
      position: "absolute",
      borderRadius: "9999px",
      filter: "blur(60px)",
      opacity: 0.55,
      willChange: "transform",
      ...style,
    }}
  />
);

/* ---------- Aurora Flux ---------- */
const Aurora = () => (
  <>
    <Blob style={{ left: "-15%", top: "-15%", width: "75%", height: "60%", background: "radial-gradient(circle,#22f0ff,transparent 65%)", animation: "cfx-drift-a 14s ease-in-out infinite alternate" }} />
    <Blob style={{ right: "-20%", bottom: "-10%", width: "80%", height: "65%", background: "radial-gradient(circle,#8b5cf6,transparent 65%)", animation: "cfx-drift-b 18s ease-in-out infinite alternate" }} />
    <Blob style={{ left: "25%", top: "35%", width: "50%", height: "40%", background: "radial-gradient(circle,#ff2bd6,transparent 65%)", opacity: 0.35, animation: "cfx-drift-a 22s ease-in-out infinite alternate-reverse" }} />
  </>
);

/* ---------- Code Rain ---------- */
const CHARS = "01ABCDEF<>{}/*+=アイウエオカキクケコ";

const Matrix = () => {
  const cols = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        left: `${(i / 16) * 100 + Math.random() * 3}%`,
        dur: rand(7, 16),
        delay: -rand(0, 12),
        size: 12 + Math.floor(Math.random() * 4),
        text: Array.from({ length: 26 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join("\n"),
      })),
    []
  );

  return (
    <>
      {cols.map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: 0,
            left: c.left,
            whiteSpace: "pre",
            fontFamily: "var(--devs-font-mono, monospace)",
            fontSize: c.size,
            lineHeight: 1.25,
            color: "#00ff9c",
            textShadow: "0 0 8px #00ff9c",
            opacity: 0.45,
            WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 70%)",
            maskImage: "linear-gradient(to bottom, transparent, #000 70%)",
            animation: `cfx-rain ${c.dur}s linear ${c.delay}s infinite`,
            willChange: "transform",
          }}
        >
          {c.text}
        </div>
      ))}
    </>
  );
};

/* ---------- Synthwave ---------- */
const Synthwave = () => (
  <>
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: "36%",
        width: "40%",
        aspectRatio: "1",
        transform: "translateX(-50%)",
        borderRadius: "9999px",
        background: "linear-gradient(180deg,#ffd23f 0%,#ff6b9d 55%,#ff2bd6 100%)",
        boxShadow: "0 0 80px rgba(255,43,214,0.6)",
        opacity: 0.9,
      }}
    />
    <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "42%", perspective: "300px", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: "-50%",
          right: "-50%",
          top: 0,
          bottom: "-50%",
          transform: "rotateX(62deg)",
          transformOrigin: "50% 0",
          backgroundImage:
            "linear-gradient(rgba(255,43,214,0.75) 1px, transparent 1px), linear-gradient(90deg, rgba(255,43,214,0.75) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          animation: "cfx-grid 1.6s linear infinite",
          WebkitMaskImage: "linear-gradient(to bottom, transparent, #000 60%)",
          maskImage: "linear-gradient(to bottom, transparent, #000 60%)",
        }}
      />
    </div>
  </>
);

/* ---------- Nebula Drift ---------- */
const Nebula = () => {
  const stars = useMemo(
    () =>
      Array.from({ length: 70 }, () => ({
        left: `${rand(0, 100)}%`,
        top: `${rand(0, 100)}%`,
        size: rand(1, 2.6),
        dur: rand(2, 5),
        delay: -rand(0, 5),
      })),
    []
  );

  return (
    <>
      <Blob style={{ left: "-10%", top: "5%", width: "70%", height: "55%", background: "radial-gradient(circle,#8b5cf6,transparent 65%)", opacity: 0.45, animation: "cfx-drift-a 26s ease-in-out infinite alternate" }} />
      <Blob style={{ right: "-15%", bottom: "0%", width: "70%", height: "55%", background: "radial-gradient(circle,#ff2bd6,transparent 65%)", opacity: 0.3, animation: "cfx-drift-b 30s ease-in-out infinite alternate" }} />
      {stars.map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: "9999px",
            background: "#fff",
            boxShadow: "0 0 6px #fff",
            animation: `cfx-twinkle ${s.dur}s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
};

/* ---------- Circuit Pulse ---------- */
const Circuit = () => {
  const horizontals = useMemo(
    () => Array.from({ length: 6 }, () => ({ top: `${rand(5, 95)}%`, dur: rand(4, 8), delay: -rand(0, 8) })),
    []
  );
  const verticals = useMemo(
    () => Array.from({ length: 5 }, () => ({ left: `${rand(5, 95)}%`, dur: rand(5, 9), delay: -rand(0, 9) })),
    []
  );

  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(182,255,59,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(182,255,59,0.07) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      {horizontals.map((h, i) => (
        <span
          key={`h${i}`}
          style={{
            position: "absolute",
            top: h.top,
            left: 0,
            width: 140,
            height: 2,
            background: "linear-gradient(90deg, transparent, #b6ff3b, transparent)",
            boxShadow: "0 0 10px #b6ff3b",
            animation: `cfx-pulse-x ${h.dur}s linear ${h.delay}s infinite`,
          }}
        />
      ))}
      {verticals.map((v, i) => (
        <span
          key={`v${i}`}
          style={{
            position: "absolute",
            left: v.left,
            top: 0,
            width: 2,
            height: 140,
            background: "linear-gradient(180deg, transparent, #22f0ff, transparent)",
            boxShadow: "0 0 10px #22f0ff",
            animation: `cfx-pulse-y ${v.dur}s linear ${v.delay}s infinite`,
          }}
        />
      ))}
    </>
  );
};

/* ---------- Hologram ---------- */
const Hologram = () => (
  <>
    <div
      style={{
        position: "absolute",
        inset: "-50%",
        background:
          "conic-gradient(from 0deg, rgba(34,240,255,0.35), rgba(139,92,246,0.35), rgba(255,43,214,0.3), rgba(182,255,59,0.25), rgba(34,240,255,0.35))",
        filter: "blur(50px)",
        animation: "cfx-spin 24s linear infinite",
        willChange: "transform",
      }}
    />
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(125,247,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(125,247,255,0.06) 1px, transparent 1px)",
        backgroundSize: "36px 36px",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: "28%",
        background: "linear-gradient(180deg, transparent, rgba(125,247,255,0.22), transparent)",
        animation: "cfx-scan 6s ease-in-out infinite",
      }}
    />
  </>
);

/* ---------- Plasma Wave ---------- */
const Plasma = () => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      backgroundImage:
        "radial-gradient(circle at 20% 30%, #ff2bd6 0%, transparent 38%), radial-gradient(circle at 80% 70%, #22f0ff 0%, transparent 40%), radial-gradient(circle at 50% 50%, #8b5cf6 0%, transparent 45%)",
      backgroundSize: "200% 200%",
      opacity: 0.55,
      animation: "cfx-plasma 14s ease-in-out infinite alternate, cfx-hue 28s linear infinite",
      willChange: "background-position, filter",
    }}
  />
);

/* ---------- Terminal ---------- */
const Terminal = () => (
  <>
    <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(57,255,20,0.1), transparent 70%)", animation: "cfx-flicker 5s steps(1) infinite" }} />
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage: "repeating-linear-gradient(0deg, rgba(57,255,20,0.09) 0, rgba(57,255,20,0.09) 1px, transparent 1px, transparent 3px)",
      }}
    />
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 0,
        height: "18%",
        background: "linear-gradient(180deg, transparent, rgba(57,255,20,0.12), transparent)",
        animation: "cfx-scan 7s linear infinite",
      }}
    />
    <div style={{ position: "absolute", inset: 0, boxShadow: "inset 0 0 120px rgba(0,0,0,0.85)" }} />
  </>
);

const FX = {
  aurora: Aurora,
  matrix: Matrix,
  synthwave: Synthwave,
  nebula: Nebula,
  circuit: Circuit,
  hologram: Hologram,
  plasma: Plasma,
  terminal: Terminal,
};

const ChatThemeFx = ({ fx }) => {
  const { lite } = useTheme();
  const Layer = FX[fx];

  if (!Layer || lite) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      <style>{FX_CSS}</style>
      <Layer />
    </div>
  );
};

/* Mini live preview used by the theme picker (ThemeOverlay) */
export const ChatThemePreview = ({ theme, animated = true }) => (
  <div
    className="relative isolate mx-4 h-[190px] overflow-hidden rounded-2xl border border-[var(--border-popup)]"
    style={{ background: theme.bg }}
  >
    {animated && <ChatThemeFx fx={theme.fx} />}

    <div className="flex h-full flex-col justify-end gap-2 p-4">
      <div
        className="max-w-[70%] rounded-2xl px-3 py-2 text-[13px]"
        style={{ background: theme.receiverBubble, color: theme.receiverText }}
      >
        Hey! How does this look?
      </div>
      <div
        className="ml-auto max-w-[70%] rounded-2xl px-3 py-2 text-[13px]"
        style={{ background: theme.senderBubble, color: theme.senderText }}
      >
        Love it. Pick this one.
      </div>
    </div>
  </div>
);

export default ChatThemeFx;