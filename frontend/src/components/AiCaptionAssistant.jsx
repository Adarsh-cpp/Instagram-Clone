// AiCaptionAssistant.jsx
//
// The ✨ caption button for the post creation page. Purely a generator —
// it hands the text back through onCaption and never posts anything.

import React, { useState, useRef, useEffect } from "react";
import { Sparkles, RotateCw } from "lucide-react";
import {
  CAPTION_TONES,
  generateAiCaption,
  getAiErrorMessage,
} from "../api/aiApi";

const AiCaptionAssistant = ({ imageFile, onCaption, disabled }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTone, setActiveTone] = useState(null);
  const [error, setError] = useState("");

  const menuRef = useRef(null);
  const abortRef = useRef(null);

  // close the tone menu on an outside click, same pattern as the emoji
  // picker already on this page
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  // don't leave a request hanging if the user navigates away mid-generate
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handleGenerate = async (tone) => {
    if (!imageFile || isGenerating) return;

    setIsMenuOpen(false);
    setError("");
    setActiveTone(tone);
    setIsGenerating(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const caption = await generateAiCaption({
        imageFile,
        tone,
        signal: controller.signal,
      });

      if (caption) onCaption?.(caption);
    } catch (err) {
      const message = getAiErrorMessage(
        err,
        "Unable to generate caption. Please try again."
      );
      // empty message means the request was cancelled — not a real failure
      if (message) setError(message);
    } finally {
      setIsGenerating(false);
      setActiveTone(null);
    }
  };

  const isDisabled = disabled || !imageFile;

  const activeToneLabel =
    CAPTION_TONES.find((t) => t.id === activeTone)?.label || "Generating";

  return (
    <div className="aiCaptionAssistant relative w-full">
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={isDisabled || isGenerating}
          onClick={() => setIsMenuOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 h-[32px] px-3 rounded-full border border-[var(--border-input)] text-[13px] transition-colors ${
            isDisabled || isGenerating
              ? "opacity-50 cursor-not-allowed text-[var(--text-muted)]"
              : "cursor-pointer text-[var(--accent-blue)] hover:bg-[var(--bg-elevated)]"
          }`}
        >
          {isGenerating ? (
            <>
              <span className="w-[14px] h-[14px] border-2 border-[var(--text-muted)]/40 border-t-[var(--accent-blue)] rounded-full animate-spin" />
              <span className="text-[var(--text-muted)]">
                {activeToneLabel}...
              </span>
            </>
          ) : (
            <>
              <Sparkles size={15} />
              <span>Generate Caption</span>
            </>
          )}
        </button>

        {error && !isGenerating && (
          <button
            type="button"
            onClick={() => handleGenerate("default")}
            className="flex items-center gap-1 text-[12px] text-[var(--accent-blue)] cursor-pointer hover:underline"
          >
            <RotateCw size={12} />
            Retry
          </button>
        )}
      </div>

      {error && (
        <p className="mt-1.5 text-[12px] text-[var(--color-error)] leading-snug">
          {error}
        </p>
      )}

      {isMenuOpen && (
        <div
          ref={menuRef}
          className="absolute bottom-[40px] left-0 z-50 w-[220px] rounded-xl bg-[var(--bg-menu)] border border-[var(--border-popup)] shadow-lg py-1 overflow-hidden"
        >
          {CAPTION_TONES.map((tone) => (
            <button
              key={tone.id}
              type="button"
              onClick={() => handleGenerate(tone.id)}
              className="w-full text-left px-4 py-2.5 text-[14px] text-[var(--text-primary)] hover:bg-[var(--bg-row-hover)] cursor-pointer"
            >
              {tone.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AiCaptionAssistant;