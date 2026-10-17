// AiBioAssistant.jsx
//
// ✨ bio generator for the Edit Profile page. Returns text through onBio;
// the user still has to press Submit for anything to be persisted.

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, X, RotateCw } from "lucide-react";
import { BIO_TONES, generateAiBio, getAiErrorMessage } from "../api/aiApi";
import { useTheme } from "../context/ThemeContext";

// tones that rewrite an existing bio rather than inventing a new one
const NEEDS_EXISTING_BIO = ["improve", "shorter"];

// Sparkle that gently pulses in Devs Mode (static in classic / on lite devices)
const SparkIcon = ({ size }) => {
  const { isDevs, lite } = useTheme();
  if (!isDevs || lite) return <Sparkles size={size} />;
  return (
    <motion.span
      className="flex"
      animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.18, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <Sparkles size={size} />
    </motion.span>
  );
};

const AiBioAssistant = ({ currentBio, onBio }) => {
  const { isDevs } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [info, setInfo] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTone, setActiveTone] = useState(null);
  const [error, setError] = useState("");

  const panelRef = useRef(null);
  const abortRef = useRef(null);
  const lastToneRef = useRef("generate");

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleGenerate = async (tone) => {
    if (isGenerating) return;

    const trimmedBio = (currentBio || "").trim();

    if (NEEDS_EXISTING_BIO.includes(tone) && !trimmedBio) {
      setError("Write a bio first, or use Generate Bio instead.");
      return;
    }

    if (!NEEDS_EXISTING_BIO.includes(tone) && !trimmedBio && !info.trim()) {
      setError("Tell the AI a little about you first.");
      return;
    }

    setError("");
    setActiveTone(tone);
    lastToneRef.current = tone;
    setIsGenerating(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const bio = await generateAiBio({
        tone,
        currentBio: trimmedBio || undefined,
        info: info.trim() || undefined,
        signal: controller.signal,
      });

      if (bio) {
        // straight into the editable bio field — nothing is saved here
        onBio?.(bio);
        setIsOpen(false);
      }
    } catch (err) {
      const message = getAiErrorMessage(
        err,
        "Unable to generate bio. Please try again."
      );
      if (message) setError(message);
    } finally {
      setIsGenerating(false);
      setActiveTone(null);
    }
  };

  const activeToneLabel =
    BIO_TONES.find((t) => t.id === activeTone)?.label || "Generating";

  return (
    <div className="aiBioAssistant relative">
      <button
        type="button"
        disabled={isGenerating}
        onClick={() => {
          setError("");
          setIsOpen((prev) => !prev);
        }}
        className={`flex items-center gap-1.5 h-[30px] px-3 rounded-full border border-[var(--border-input)] text-[13px] font-normal transition-colors devs:font-mono devs:uppercase devs:tracking-wider devs:text-[11px] devs:border-[var(--devs-cyan)] devs:shadow-[0_0_14px_rgba(34,240,255,0.25)] ${
          isGenerating
            ? "opacity-60 cursor-not-allowed text-[var(--text-muted)]"
            : "cursor-pointer text-[var(--accent-blue)] hover:bg-[var(--bg-elevated)] devs:hover:bg-[rgba(34,240,255,0.1)]"
        }`}
      >
        {isGenerating ? (
          <>
            <span className="w-[13px] h-[13px] border-2 border-[var(--text-muted)]/40 border-t-[var(--accent-blue)] rounded-full animate-spin" />
            <span className="text-[var(--text-muted)]">
              {activeToneLabel}...
            </span>
          </>
        ) : (
          <>
            <SparkIcon size={14} />
            <span>Generate Bio</span>
          </>
        )}
      </button>

      {isOpen && (
        <motion.div
          {...(isDevs
            ? {
                initial: { opacity: 0, y: -8, scale: 0.96 },
                animate: { opacity: 1, y: 0, scale: 1 },
                transition: { duration: 0.18 },
              }
            : {})}
          ref={panelRef}
          className="absolute right-0 top-[38px] z-30 w-[290px] sm:w-[320px] rounded-2xl bg-[var(--bg-menu)] border border-[var(--border-popup)] shadow-xl overflow-hidden devs:backdrop-blur-xl devs:rounded-3xl devs:font-mono devs:shadow-[0_0_40px_rgba(34,240,255,0.18)]"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-popup)]">
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--text-primary)] devs:text-[12px] devs:uppercase devs:tracking-[0.2em]">
              <Sparkles size={14} className="text-[var(--accent-blue)]" />
              AI Bio
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] devs:hover:text-[var(--devs-cyan)] cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          <div className="px-4 py-3">
            <textarea
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="A few things about you — work, interests, city, vibe..."
              className="w-full resize-none rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] p-2.5 text-[13px] text-[var(--text-input)] placeholder-[var(--text-muted)] outline-none devs:transition-all devs:focus:border-[var(--devs-cyan)] devs:focus:shadow-[0_0_0_3px_rgba(34,240,255,0.15),0_0_18px_rgba(34,240,255,0.2)]"
            />

            {currentBio?.trim() ? (
              <p className="mt-2 text-[11px] text-[var(--text-muted)] leading-snug">
                Your current bio is sent too, so Improve and Make it Shorter
                work on it.
              </p>
            ) : null}
          </div>

          <div className="px-2 pb-2 max-h-[200px] overflow-y-auto">
            {BIO_TONES.map((tone) => (
              <button
                key={tone.id}
                type="button"
                disabled={isGenerating}
                onClick={() => handleGenerate(tone.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-row-hover)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer devs:text-[13px] devs:hover:text-[var(--devs-cyan)]"
              >
                {tone.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="px-4 py-2.5 border-t border-[var(--border-popup)] flex items-start justify-between gap-2">
              <p className="text-[12px] text-[var(--color-error)] leading-snug">
                {isDevs ? "! " : ""}{error}
              </p>
              <button
                type="button"
                onClick={() => handleGenerate(lastToneRef.current)}
                className="shrink-0 flex items-center gap-1 text-[12px] text-[var(--accent-blue)] cursor-pointer hover:underline"
              >
                <RotateCw size={12} />
                Retry
              </button>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AiBioAssistant;