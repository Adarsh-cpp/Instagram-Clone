import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  CalendarDays,
  ChevronDown,
  Clock,
  FileText,
  List,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

/*
  Typography for the legal text. Pages pass plain <p>, <ul>, <li>, <a>;
  everything is styled here so both documents stay identical.
*/
const PROSE_CSS = `
.legal-prose { font-size: 15px; line-height: 1.75; color: var(--text-secondary); }
.legal-prose p { margin: 0.85rem 0 0; }
.legal-prose p:first-child { margin-top: 0; }
.legal-prose ul { margin: 0.9rem 0 0; padding: 0; list-style: none; display: grid; gap: 0.55rem; }
.legal-prose li { position: relative; padding-left: 1.35rem; }
.legal-prose li::before {
  content: ""; position: absolute; left: 0.2rem; top: 0.72em;
  width: 6px; height: 6px; border-radius: 9999px; background: var(--brand-blue);
}
.legal-prose a { color: var(--brand-blue); font-weight: 500; text-underline-offset: 3px; }
.legal-prose a:hover { text-decoration: underline; }
html.devs .legal-prose li::before { background: var(--devs-cyan); box-shadow: 0 0 8px var(--devs-cyan); }
html.devs .legal-prose a { color: var(--devs-cyan); }
`;

const NEON = "linear-gradient(90deg,#22f0ff,#8b5cf6,#ff2bd6)";

/*
  Props:
    type        "privacy" | "terms"
    title, subtitle, lastUpdated
    highlights  [{ icon: LucideIcon, title, text }]  (key-point cards)
    sections    [{ title, body: JSX }]               (numbered automatically)
*/
const LegalLayout = ({ type, title, subtitle, lastUpdated, highlights = [], sections = [] }) => {
  const isPrivacy = type === "privacy";
  const { isDevs, reducedMotion } = useTheme();

  const articleRef = useRef(null);
  const [active, setActive] = useState(0);
  const [minutes, setMinutes] = useState(null);
  const [showTop, setShowTop] = useState(false);
  const [tocOpen, setTocOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 30, restDelta: 0.001 });

  const HeaderIcon = isPrivacy ? ShieldCheck : FileText;

  // reading time, measured from the rendered text
  useEffect(() => {
    const words = (articleRef.current?.innerText || "").trim().split(/\s+/).length;
    setMinutes(Math.max(1, Math.round(words / 200)));
  }, []);

  // which section is currently being read (drives the table of contents)
  useEffect(() => {
    const els = sections
      .map((_, i) => document.getElementById(`legal-s-${i + 1}`))
      .filter(Boolean);
    const visible = new Set();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const idx = Number(entry.target.dataset.index);
          if (entry.isIntersecting) visible.add(idx);
          else visible.delete(idx);
        });
        if (visible.size) setActive(Math.min(...visible));
      },
      { rootMargin: "-90px 0px -65% 0px", threshold: 0 }
    );

    els.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  // back-to-top visibility
  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const goTo = (i) => {
    document
      .getElementById(`legal-s-${i + 1}`)
      ?.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    setTocOpen(false);
  };

  const scrollTop = () =>
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });

  // Table of contents list. Called as a function (not a component) so the
  // sliding highlight keeps its identity between renders.
  const renderToc = () => (
    <nav aria-label="Table of contents" className="space-y-0.5">
      {sections.map((s, i) => {
        const isActive = active === i;
        return (
          <button
            key={s.title}
            type="button"
            onClick={() => goTo(i)}
            className={`relative flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition-colors cursor-pointer ${
              isActive
                ? "bg-[var(--bg-elevated)] font-semibold text-[var(--text-primary)]"
                : "text-[var(--text-muted)] hover:bg-[var(--bg-row-hover)] hover:text-[var(--text-primary)]"
            }`}
          >
            {isActive && (
              <motion.span
                layoutId={`legal-toc-${type}`}
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full"
                style={{
                  background: isDevs ? NEON : "var(--brand-blue)",
                  boxShadow: isDevs ? "0 0 10px rgba(34,240,255,0.9)" : "none",
                }}
              />
            )}
            <span
              className={`shrink-0 tabular-nums ${
                isDevs
                  ? "font-mono text-[11px] text-[var(--devs-cyan)]"
                  : "text-[12px] opacity-60"
              }`}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            <span className="leading-snug">{s.title}</span>
          </button>
        );
      })}
    </nav>
  );

  const tabBase =
    "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors";
  const tabActive = isDevs
    ? "bg-[linear-gradient(120deg,#22f0ff,#8b5cf6)] text-[#04050e] font-bold shadow-[0_0_14px_rgba(34,240,255,0.4)]"
    : "bg-[var(--bg-elevated)] text-[var(--text-primary)]";
  const tabIdle =
    "text-[var(--text-muted)] hover:bg-[var(--bg-row-hover)] hover:text-[var(--text-primary)]";

  return (
    <div className="min-h-screen bg-[var(--bg-app)] text-[var(--text-primary)] transition-colors duration-200">
      <style>{PROSE_CSS}</style>

      {/* Reading progress */}
      <motion.div
        aria-hidden="true"
        className="fixed left-0 right-0 top-0 z-[60] h-[3px] origin-left"
        style={{
          scaleX: progress,
          background: isDevs ? NEON : "var(--brand-blue)",
          boxShadow: isDevs ? "0 0 12px rgba(34,240,255,0.8)" : "none",
        }}
      />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-[var(--border-soft)] bg-[var(--glass-panel-bg)] backdrop-blur-[var(--overlay-blur)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-3 transition-opacity hover:opacity-80"
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                isDevs
                  ? "devs-neon-border bg-[rgba(10,12,32,0.7)] text-[var(--devs-cyan)]"
                  : "bg-[var(--brand-blue)] text-white shadow-sm"
              }`}
            >
              <HeaderIcon size={18} />
            </span>

            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold leading-none">
                Instagram Clone
              </p>
              <p className="mt-1 truncate text-[11px] text-[var(--text-muted)] devs:font-mono">
                Independent project
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-1 sm:flex">
              <Link
                to="/privacy-policy"
                className={`${tabBase} ${isPrivacy ? tabActive : tabIdle}`}
              >
                Privacy
              </Link>
              <Link
                to="/terms"
                className={`${tabBase} ${!isPrivacy ? tabActive : tabIdle}`}
              >
                Terms
              </Link>
            </div>

            <Link
              to="/home"
              className="flex items-center gap-2 rounded-lg border border-[var(--border-container)] bg-[var(--bg-secondary-btn)] px-3 py-2 text-[13px] font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-secondary-btn-hover)] devs:rounded-full devs:hover:border-[var(--devs-cyan)]"
            >
              <ArrowLeft size={15} />
              <span className="hidden sm:inline">Back to website</span>
              <span className="sm:hidden">Back</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="border-b border-[var(--border-soft)]"
        style={{
          background: isDevs
            ? "radial-gradient(60% 120% at 50% 0%, rgba(139,92,246,0.18), transparent 70%)"
            : "radial-gradient(60% 120% at 50% 0%, rgba(0,149,246,0.08), transparent 70%)",
        }}
      >
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16 lg:px-8">
          <motion.div
            {...(isDevs
              ? {
                  initial: { opacity: 0, y: 18 },
                  animate: { opacity: 1, y: 0 },
                  transition: { duration: 0.5, ease: [0.2, 0.8, 0.2, 1] },
                }
              : {})}
            className="max-w-3xl"
          >
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium ${
                isDevs
                  ? "devs-glass font-mono uppercase tracking-[0.25em] text-[10px] text-[var(--devs-cyan)]"
                  : "border-[var(--border-container)] bg-[var(--bg-panel)] text-[var(--text-secondary)]"
              }`}
            >
              <HeaderIcon size={13} />
              {isDevs ? `// legal.${isPrivacy ? "privacy" : "terms"}` : "Legal"}
            </span>

            <h1
              className={`mt-5 text-[34px] font-bold leading-[1.1] tracking-tight sm:text-[46px] ${
                isDevs ? "devs-text-gradient !font-extrabold" : ""
              }`}
              style={isDevs ? { fontFamily: "var(--devs-font-display)" } : undefined}
            >
              {title}
            </h1>

            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[var(--text-secondary)] sm:text-[17px]">
              {subtitle}
            </p>

            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-[var(--text-muted)] devs:font-mono devs:text-[12px]">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays size={14} />
                Last updated: {lastUpdated}
              </span>
              {minutes && (
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={14} />
                  {minutes} min read
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">

        {/* Key points */}
        {highlights.length > 0 && (
          <section aria-label="Key points" className="mb-10">
            <p className="mb-4 text-[12px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] devs:font-mono devs:text-[10px]">
              Key points
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {highlights.map(({ icon: Icon, title: hTitle, text }, i) => (
                <motion.div
                  key={hTitle}
                  {...(isDevs
                    ? {
                        initial: { opacity: 0, y: 14 },
                        animate: { opacity: 1, y: 0 },
                        transition: { delay: 0.1 + i * 0.07, duration: 0.4 },
                        whileHover: { y: -3 },
                      }
                    : {})}
                  className={`rounded-2xl border border-[var(--border-container)] bg-[var(--bg-panel)] p-4 ${
                    isDevs
                      ? "devs-glass transition-shadow hover:border-[var(--devs-cyan)] hover:shadow-[0_0_26px_rgba(34,240,255,0.2)]"
                      : "shadow-sm"
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                      isDevs
                        ? "bg-[rgba(34,240,255,0.1)] text-[var(--devs-cyan)]"
                        : "bg-[var(--bg-elevated)] text-[var(--brand-blue)]"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <h3 className="mt-3 text-[14px] font-semibold leading-snug devs:font-bold">
                    {hTitle}
                  </h3>
                  <p className="mt-1 text-[13px] leading-relaxed text-[var(--text-muted)]">
                    {text}
                  </p>
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Mobile table of contents */}
        <div className="mb-6 lg:hidden">
          <button
            type="button"
            onClick={() => setTocOpen((o) => !o)}
            aria-expanded={tocOpen}
            className={`flex w-full items-center justify-between rounded-xl border border-[var(--border-container)] bg-[var(--bg-panel)] px-4 py-3 text-[14px] font-medium cursor-pointer ${
              isDevs ? "devs-glass font-mono text-[12px] uppercase tracking-widest" : ""
            }`}
          >
            <span className="flex items-center gap-2">
              <List size={16} />
              On this page
            </span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${tocOpen ? "rotate-180" : ""}`}
            />
          </button>

          {tocOpen && (
            <div
              className={`mt-2 rounded-xl border border-[var(--border-container)] bg-[var(--bg-panel)] p-2 ${
                isDevs ? "devs-glass" : ""
              }`}
            >
              {renderToc()}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-10 lg:grid-cols-[250px_minmax(0,1fr)]">

          {/* Desktop table of contents */}
          <aside className="hidden lg:block">
            <div className="sticky top-[88px]">
              <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] devs:font-mono devs:text-[10px]">
                On this page
              </p>
              <div className="max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
                {renderToc()}
              </div>
            </div>
          </aside>

          {/* Document */}
          <div className="min-w-0">
            <article
              ref={articleRef}
              className={
                isDevs
                  ? "devs-glass rounded-3xl"
                  : "rounded-2xl border border-[var(--border-container)] bg-[var(--bg-panel)] shadow-sm"
              }
            >
              <div className="p-6 sm:p-9 lg:p-10">
                {sections.map((s, i) => (
                  <section
                    key={s.title}
                    id={`legal-s-${i + 1}`}
                    data-index={i}
                    className="scroll-mt-28 border-b border-[var(--border-soft)] py-8 first:pt-0 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-start gap-4">
                      <span
                        className={`mt-0.5 flex h-8 min-w-8 shrink-0 items-center justify-center rounded-lg px-1.5 text-[12px] font-bold tabular-nums ${
                          isDevs
                            ? "bg-[rgba(34,240,255,0.1)] font-mono text-[var(--devs-cyan)]"
                            : "bg-[var(--bg-elevated)] text-[var(--brand-blue)]"
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>

                      <div className="min-w-0 flex-1">
                        <h2
                          className="text-[19px] font-semibold tracking-tight sm:text-[21px] devs:font-bold"
                          style={isDevs ? { fontFamily: "var(--devs-font-display)" } : undefined}
                        >
                          {s.title}
                        </h2>
                        <div className="legal-prose mt-3">{s.body}</div>
                      </div>
                    </div>
                  </section>
                ))}
              </div>
            </article>

            {/* Developer card */}
            <section
              className={`mt-6 rounded-2xl border border-[var(--border-container)] bg-[var(--bg-panel)] p-5 sm:p-7 ${
                isDevs ? "devs-glass" : "shadow-sm"
              }`}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--brand-blue)] devs:font-mono devs:text-[10px] devs:text-[var(--devs-cyan)]">
                    Developer
                  </p>

                  <h2 className="mt-1 text-lg font-semibold devs:font-bold">
                    Adarsh Pattanayak
                  </h2>

                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Independent educational and personal project
                  </p>
                </div>

                <a
                  href="mailto:adarshpattanayak2004@gmail.com"
                  className={`inline-flex w-fit items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                    isDevs
                      ? "rounded-full bg-[linear-gradient(120deg,#22f0ff,#8b5cf6,#ff2bd6)] font-mono text-[12px] uppercase tracking-wider text-[#04050e] shadow-[0_0_22px_rgba(34,240,255,0.4)] hover:scale-[1.03]"
                      : "bg-[var(--brand-blue)] text-white hover:bg-[var(--brand-blue-hover)]"
                  }`}
                >
                  <Mail size={16} />
                  Contact developer
                </a>
              </div>
            </section>

            {/* The other document */}
            <Link
              to={isPrivacy ? "/terms" : "/privacy-policy"}
              className={`group mt-6 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-container)] bg-[var(--bg-panel)] p-5 transition ${
                isDevs
                  ? "devs-glass hover:border-[var(--devs-cyan)] hover:shadow-[0_0_26px_rgba(34,240,255,0.2)]"
                  : "shadow-sm hover:bg-[var(--bg-row-hover)]"
              }`}
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)] devs:font-mono devs:text-[10px]">
                  Also read
                </p>
                <p className="mt-1 text-[16px] font-semibold devs:font-bold">
                  {isPrivacy ? "Terms of Service" : "Privacy Policy"}
                </p>
              </div>

              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform group-hover:translate-x-1 ${
                  isDevs
                    ? "bg-[rgba(34,240,255,0.1)] text-[var(--devs-cyan)]"
                    : "bg-[var(--bg-elevated)] text-[var(--text-primary)]"
                }`}
              >
                <ArrowRight size={18} />
              </span>
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-soft)] px-5 py-8 text-center">
        <p className="mx-auto max-w-3xl text-xs leading-5 text-[var(--text-muted)] devs:font-mono">
          This website is an independent educational/personal project and is
          not affiliated with, sponsored by, or endorsed by Instagram or Meta
          Platforms, Inc.
        </p>

        <p className="mt-2 text-xs text-[var(--text-muted)] devs:font-mono">
          © {new Date().getFullYear()} Adarsh Pattanayak. All rights reserved.
        </p>
      </footer>

      {/* Back to top */}
      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            onClick={scrollTop}
            aria-label="Back to top"
            initial={{ opacity: 0, y: 12, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.9 }}
            className={`fixed bottom-6 right-6 z-50 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border shadow-lg ${
              isDevs
                ? "devs-glass !rounded-full text-[var(--devs-cyan)] hover:shadow-[0_0_20px_rgba(34,240,255,0.5)]"
                : "border-[var(--border-container)] bg-[var(--bg-panel)] text-[var(--text-primary)] hover:bg-[var(--bg-row-hover)]"
            }`}
          >
            <ArrowUp size={18} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LegalLayout;