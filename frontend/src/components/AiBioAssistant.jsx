// AiBioAssistant.jsx
//
// ✨ bio generator for the Edit Profile page. Returns text through onBio;
// the user still has to press Submit for anything to be persisted.

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, X, RotateCw } from "lucide-react";
import { BIO_TONES, generateAiBio, getAiErrorMessage } from "../api/aiApi";

// tones that rewrite an existing bio rather than inventing a new one
const NEEDS_EXISTING_BIO = ["improve", "shorter"];

const AiBioAssistant = ({ currentBio, onBio }) => {
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
        className={`flex items-center gap-1.5 h-[30px] px-3 rounded-full border border-[var(--border-input)] text-[13px] font-normal transition-colors ${
          isGenerating
            ? "opacity-60 cursor-not-allowed text-[var(--text-muted)]"
            : "cursor-pointer text-[var(--accent-blue)] hover:bg-[var(--bg-elevated)]"
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
            <Sparkles size={14} />
            <span>Generate Bio</span>
          </>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[38px] z-30 w-[290px] sm:w-[320px] rounded-2xl bg-[var(--bg-menu)] border border-[var(--border-popup)] shadow-xl overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-popup)]">
            <span className="flex items-center gap-1.5 text-[14px] font-semibold text-[var(--text-primary)]">
              <Sparkles size={14} className="text-[var(--accent-blue)]" />
              AI Bio
            </span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close"
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
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
              className="w-full resize-none rounded-xl bg-[var(--bg-input)] border border-[var(--border-input)] p-2.5 text-[13px] text-[var(--text-input)] placeholder-[var(--text-muted)] outline-none"
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
                className="w-full text-left px-3 py-2.5 rounded-lg text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-row-hover)] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {tone.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="px-4 py-2.5 border-t border-[var(--border-popup)] flex items-start justify-between gap-2">
              <p className="text-[12px] text-[var(--color-error)] leading-snug">
                {error}
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
        </div>
      )}
    </div>
  );
};

export default AiBioAssistant;