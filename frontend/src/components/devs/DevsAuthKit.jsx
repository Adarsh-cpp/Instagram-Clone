import { forwardRef, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { Clapperboard, Heart, Loader2, MessageCircle } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

/* ====================================================================
   Shared building blocks for the Devs Mode auth pages
   (Login, Signup, Forgot password, Reset password)
   ==================================================================== */

const display = { fontFamily: "var(--devs-font-display)" };

/* ---------- Logo ---------- */
export const DevsLogo = () => (
  <div className="flex items-center gap-3">
    <div className="devs-neon-border devs-glass relative w-[44px] h-[44px] rounded-xl flex items-center justify-center">
      <span className="devs-text-gradient font-mono text-[15px] font-bold">
        {"</>"}
      </span>
    </div>
    <div className="flex flex-col leading-none">
      <span
        className="font-extrabold text-[24px] tracking-tight text-[var(--text-primary)]"
        style={display}
      >
        insta<span className="devs-text-gradient">.dev</span>
      </span>
      <span className="font-mono text-[9px] tracking-[0.3em] uppercase text-[var(--text-muted)] mt-1.5">
        social // v2.0
      </span>
    </div>
  </div>
);

/* ---------- Orbiting icon (Forgot / Reset pages) ---------- */
export const DevsHeroIcon = ({ icon: Icon }) => {
  const { lite } = useTheme();

  return (
    <div className="relative w-[104px] h-[104px] mx-auto mb-6 flex items-center justify-center">
      <motion.span
        className="absolute inset-0 rounded-full border border-dashed"
        style={{ borderColor: "rgba(34,240,255,0.45)" }}
        animate={lite ? undefined : { rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
      />
      <motion.span
        className="absolute inset-3 rounded-full border border-dashed"
        style={{ borderColor: "rgba(139,92,246,0.55)" }}
        animate={lite ? undefined : { rotate: -360 }}
        transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
      />
      <motion.span
        animate={lite ? undefined : { y: [0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="relative text-[var(--devs-cyan)]"
        style={{ filter: "drop-shadow(0 0 10px rgba(34,240,255,0.8))" }}
      >
        <Icon size={38} strokeWidth={1.6} />
      </motion.span>
    </div>
  );
};

/* ---------- Input (works with react-hook-form's register) ---------- */
export const DevsInput = forwardRef(function DevsInput(
  { label, icon: Icon, error, right, className = "", ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && (
        <label className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.25em] text-[var(--text-muted)]">
          {"// "}
          {label}
        </label>
      )}

      <div className="group relative">
        {Icon && (
          <Icon
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] group-focus-within:text-[var(--devs-cyan)] transition-colors pointer-events-none"
          />
        )}

        <input
          ref={ref}
          aria-label={label}
          {...props}
          className={`w-full h-[44px] rounded-xl bg-[var(--bg-input)] text-[var(--text-input)] text-[13px] font-mono outline-none border transition-all duration-200
            ${error ? "border-[var(--color-error)]" : "border-[var(--border-input)]"}
            focus:border-[var(--devs-cyan)] focus:shadow-[0_0_0_3px_rgba(34,240,255,0.15),0_0_20px_rgba(34,240,255,0.2)]
            ${Icon ? "pl-10" : "pl-4"} ${right ? "pr-11" : "pr-4"} ${className}`}
        />

        {right && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex">
            {right}
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 font-mono text-[11px] text-[var(--color-error)] overflow-hidden"
          >
            ! {error}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
});

/* ---------- Button ---------- */
export const DevsButton = ({
  children,
  variant = "primary",
  loading = false,
  icon,
  className = "",
  ...props
}) => {
  const primary = variant === "primary";

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
      {...props}
      disabled={loading || props.disabled}
      style={
        primary
          ? { animation: "devs-gradient-shift 6s ease infinite" }
          : undefined
      }
      className={`relative overflow-hidden w-full h-[46px] rounded-xl font-bold text-[13px] tracking-[0.12em] uppercase flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed
        ${
          primary
            ? "text-[#04050e] bg-[linear-gradient(120deg,#22f0ff,#8b5cf6,#ff2bd6)] bg-[length:200%_200%] shadow-[0_0_28px_rgba(34,240,255,0.35)]"
            : "text-[var(--text-primary)] bg-[var(--bg-secondary-btn)] border border-[var(--border-popup)] hover:bg-[var(--bg-secondary-btn-hover)]"
        } ${className}`}
    >
      {primary && (
        <span className="devs-shimmer absolute inset-0 opacity-40 pointer-events-none" />
      )}
      <span className="relative z-10 flex items-center gap-2">
        {loading ? <Loader2 size={16} className="animate-spin" /> : icon}
        {children}
      </span>
    </motion.button>
  );
};

/* ---------- Divider ---------- */
export const DevsDivider = ({ text = "OR" }) => (
  <div className="flex items-center gap-3 my-5">
    <span className="h-px flex-1 bg-[linear-gradient(90deg,transparent,var(--border-popup))]" />
    <span className="font-mono text-[10px] tracking-[0.3em] text-[var(--text-muted)]">
      {text}
    </span>
    <span className="h-px flex-1 bg-[linear-gradient(270deg,transparent,var(--border-popup))]" />
  </div>
);

/* ---------- Link ---------- */
export const DevsLink = ({ to, children, accent = false }) => (
  <Link
    to={to}
    className={`font-mono text-[12px] transition-all duration-200 hover:text-[var(--devs-cyan)] hover:[text-shadow:0_0_12px_rgba(34,240,255,0.7)] ${
      accent
        ? "text-[var(--devs-cyan)] font-bold"
        : "text-[var(--text-secondary)]"
    }`}
  >
    {children}
  </Link>
);

/* ---------- Card that tilts toward the cursor ---------- */
const TiltCard = ({ children, className = "" }) => {
  const { lite } = useTheme();
  const ref = useRef(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), {
    stiffness: 150,
    damping: 18,
  });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), {
    stiffness: 150,
    damping: 18,
  });

  const onMove = (e) => {
    if (lite || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <motion.div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      initial={{ opacity: 0, y: 30, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.2, 0.8, 0.2, 1] }}
      style={lite ? undefined : { rotateX, rotateY, transformPerspective: 1000 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

/* ---------- Left-hand hero (desktop only) ---------- */
const WORDS = ["posts", "stories", "reels", "real-time chat", "highlights"];

const Ticker = () => {
  const [i, setI] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % WORDS.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="font-mono text-[14px] text-[var(--text-secondary)] flex items-center gap-2">
      <span className="text-[var(--devs-lime)]">&gt;</span>
      <span>shipping</span>
      <span className="relative inline-block h-[22px] min-w-[150px] overflow-hidden align-bottom">
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={WORDS[i]}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute left-0 text-[var(--devs-cyan)] devs-glow-text"
          >
            {WORDS[i]}
          </motion.span>
        </AnimatePresence>
      </span>
      <span className="inline-block w-[8px] h-[16px] bg-[var(--devs-cyan)] animate-pulse" />
    </div>
  );
};

const CHIPS = [
  { icon: Heart, value: "2.4k", label: "likes", color: "var(--devs-magenta)" },
  { icon: MessageCircle, value: "128", label: "live chats", color: "var(--devs-cyan)" },
  { icon: Clapperboard, value: "56", label: "new reels", color: "var(--devs-violet)" },
];

const DevsHero = ({ headline, sub }) => {
  const { lite } = useTheme();
  const [line1, line2] = headline;

  return (
    <div className="hidden lg:flex flex-col gap-8 flex-1 max-w-[560px] pr-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-full devs-glass font-mono text-[11px] tracking-[0.2em] uppercase text-[var(--text-secondary)]"
      >
        <span className="devs-pulse-glow w-2 h-2 rounded-full bg-[var(--devs-lime)]" />
        devs mode online
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="text-[60px] leading-[1.02] font-extrabold tracking-tight text-[var(--text-primary)]"
        style={display}
      >
        {line1}
        <br />
        <span className="devs-text-gradient">{line2}</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="font-mono text-[13px] leading-relaxed text-[var(--text-muted)] max-w-[440px]"
      >
        {sub}
      </motion.p>

      <Ticker />

      <div className="flex flex-wrap gap-3 mt-2">
        {CHIPS.map(({ icon: Icon, value, label, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 20 }}
            animate={lite ? { opacity: 1, y: 0 } : { opacity: 1, y: [0, -8, 0] }}
            transition={
              lite
                ? { delay: 0.5 + i * 0.1 }
                : {
                    opacity: { delay: 0.5 + i * 0.12 },
                    y: {
                      duration: 4 + i,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: i * 0.4,
                    },
                  }
            }
            className="devs-glass rounded-2xl px-4 py-3 flex items-center gap-3"
          >
            <span style={{ color, filter: `drop-shadow(0 0 8px ${color})` }}>
              <Icon size={20} />
            </span>
            <div className="leading-none">
              <div className="font-mono text-[16px] font-bold text-[var(--text-primary)]">
                {value}
              </div>
              <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)] mt-1">
                {label}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/* ---------- Page shell ---------- */
export const DevsAuthShell = ({
  title,
  subtitle,
  children,
  footer,
  hero = true,
  headline = ["Your feed.", "Rebuilt for tomorrow."],
  sub = "Posts, stories, reels and real-time chat, wired into a faster, brighter grid.",
}) => (
  <div className="relative w-full min-h-screen flex items-center justify-center px-5 py-10">
    <div className="relative w-full max-w-[1120px] flex items-center justify-center lg:justify-between gap-10">
      {hero && <DevsHero headline={headline} sub={sub} />}

      <TiltCard className="devs-glass devs-neon-border rounded-3xl p-7 sm:p-8 w-full max-w-[410px] shrink-0">
        <DevsLogo />

        <div className="mt-7 mb-6">
          <h2
            className="text-[28px] font-extrabold tracking-tight text-[var(--text-primary)]"
            style={display}
          >
            {title}
          </h2>
          {subtitle && (
            <p className="mt-2 font-mono text-[12px] leading-relaxed text-[var(--text-muted)]">
              {subtitle}
            </p>
          )}
        </div>

        {children}
        {footer}
      </TiltCard>
    </div>
  </div>
);