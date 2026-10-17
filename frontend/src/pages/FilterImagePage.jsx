import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, ArrowLeft, Eye, RotateCcw, CopyCheck } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import {
  IMAGE_FILTERS,
  ADJUST_CONTROLS,
  DEFAULT_ADJUST,
  defaultEdit,
  isIdentityEdit,
  opsToCss,
  editToCss,
  vignetteCss,
  renderEditedBlob,
} from "../utils/imageFilters";

/*
  Filter + Adjust step for image posts (sits between Crop and Caption/Share).

  Props
   - images          : the cropped Files from CropImagePage
   - initialEdits    : edits kept by CreatePostPage so going Back -> Next keeps your work
   - onEditsChange   : called whenever edits change (CreatePostPage stores them)
   - setFilteredImages : receives the final Files (originals pass straight through
                         when a slide has no edit, so nothing is re-compressed needlessly)
   - next / back
*/
const FilterImagePage = ({
  images,
  initialEdits,
  onEditsChange,
  setFilteredImages,
  next,
  back,
}) => {
  const { isDevs } = useTheme();

  const [activeIndex, setActiveIndex] = useState(0);
  const [tab, setTab] = useState("filters"); // "filters" | "adjust"
  const [imageUrls, setImageUrls] = useState([]);
  const [naturals, setNaturals] = useState([]); // [{w,h}] per slide
  const [slides, setSlides] = useState(() =>
    initialEdits && initialEdits.length === images.length
      ? initialEdits
      : images.map(() => defaultEdit())
  );
  const [comparing, setComparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 }); // preview area size

  const previewRef = useRef(null);

  const hasMultiple = images.length > 1;
  const edit = slides[activeIndex] || defaultEdit();

  // object URLs + natural sizes
  useEffect(() => {
    const urls = images.map((f) => URL.createObjectURL(f));
    setImageUrls(urls);
    setNaturals(images.map(() => null));

    let alive = true;
    urls.forEach((u, i) => {
      const img = new Image();
      img.onload = () => {
        if (!alive) return;
        setNaturals((prev) => {
          const copy = [...prev];
          copy[i] = { w: img.naturalWidth, h: img.naturalHeight };
          return copy;
        });
      };
      img.src = u;
    });

    return () => {
      alive = false;
      urls.forEach((u) => URL.revokeObjectURL(u));
    };
  }, [images]);

  // keep the parent in sync so edits survive Back / Next
  useEffect(() => {
    onEditsChange?.(slides);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides]);

  // measure the preview area so the image + vignette overlay share one exact box
  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const updateActive = (patch) =>
    setSlides((prev) => {
      const copy = [...prev];
      copy[activeIndex] = { ...copy[activeIndex], ...patch };
      return copy;
    });

  const setFilter = (key) => updateActive({ filter: key });
  const setAdjust = (key, value) =>
    updateActive({ adjust: { ...edit.adjust, [key]: value } });

  const resetActive = () => updateActive(defaultEdit());
  const applyToAll = () => setSlides((prev) => prev.map(() => ({ filter: edit.filter, adjust: { ...edit.adjust } })));

  const handleNext = async () => {
    try {
      setIsSaving(true);
      const files = await Promise.all(
        images.map(async (file, i) => {
          if (isIdentityEdit(slides[i])) return file; // untouched slide -> keep as-is
          const blob = await renderEditedBlob(imageUrls[i], slides[i]);
          return new File([blob], `slide-${i}.jpg`, { type: "image/jpeg" });
        })
      );
      setFilteredImages(files);
      next();
    } catch (err) {
      console.log(err);
    } finally {
      setIsSaving(false);
    }
  };

  // fitted (object-contain) size of the active image inside the preview area
  const nat = naturals[activeIndex];
  let fitW = 0;
  let fitH = 0;
  if (nat && box.w && box.h) {
    const s = Math.min(box.w / nat.w, box.h / nat.h);
    fitW = Math.round(nat.w * s);
    fitH = Math.round(nat.h * s);
  }

  const shownEdit = comparing ? defaultEdit() : edit;

  /* ---------------- theme classes ---------------- */
  const tabClass = (active) =>
    isDevs
      ? `flex-1 h-full flex items-center justify-center font-mono uppercase tracking-[0.2em] text-[11px] cursor-pointer transition-all border-b-2 ${
          active
            ? "text-[var(--devs-cyan)] border-[var(--devs-cyan)] [text-shadow:0_0_10px_rgba(34,240,255,0.7)]"
            : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]"
        }`
      : `flex-1 h-full flex items-center justify-center text-sm font-semibold cursor-pointer transition-colors border-b-2 ${
          active
            ? "text-[var(--text-primary)] border-[var(--text-primary)]"
            : "text-[var(--text-muted)] border-transparent hover:text-[var(--text-primary)]"
        }`;

  const smallBtn =
    "flex items-center gap-1 text-xs cursor-pointer text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] devs:font-mono devs:uppercase devs:tracking-wider devs:text-[10px] devs:text-[var(--devs-cyan)] devs:hover:text-[var(--devs-cyan)] devs:hover:drop-shadow-[0_0_6px_rgba(34,240,255,0.8)] transition-all";

  return (
    <div className="w-[100vw] h-[100vh] flex justify-center items-center bg-[var(--bg-app)]">
      <div className="cropContainerOverlay w-full h-full flex justify-center items-center bg-[rgba(0,0,0,0)] px-2 sm:px-4">
        <div
          className={`cropContainer relative w-full max-w-[560px] md:w-[70%] lg:w-[50%] xl:w-[34%] h-[95vh] md:h-[88%] rounded-2xl overflow-hidden flex flex-col ${
            isDevs
              ? "devs-glass devs-neon-border !rounded-3xl"
              : "bg-[var(--bg-surface)] border border-[var(--border-container)] shadow-xl"
          }`}
        >
          {/* Header */}
          <div className="header w-full h-[40px] flex-shrink-0 px-3 sm:px-4 flex justify-between items-center bg-[var(--bg-app)] border-b border-[var(--border-soft)] devs:bg-transparent">
            <div
              onClick={isSaving ? undefined : back}
              className="back cursor-pointer devs:hover:drop-shadow-[0_0_8px_rgba(34,240,255,0.8)] devs:transition-all"
            >
              <ArrowLeft size={24} color="var(--text-primary)" />
            </div>

            <div className="heading text-[var(--text-primary)] text-[16px] sm:text-[18px] font-semibold devs:font-mono devs:uppercase devs:tracking-[0.2em] devs:text-[12px]">
              {hasMultiple ? `Edit  ${activeIndex + 1}/${images.length}` : "Edit"}
            </div>

            <div
              onClick={isSaving ? undefined : handleNext}
              className={`next text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] hover:underline cursor-pointer text-sm sm:text-base devs:no-underline devs:font-mono devs:uppercase devs:tracking-wider devs:text-[11px] devs:font-bold devs:px-3 devs:py-1 devs:rounded-full devs:bg-[linear-gradient(120deg,#22f0ff,#8b5cf6)] devs:text-[#04050e] devs:hover:text-[#04050e] devs:shadow-[0_0_14px_rgba(34,240,255,0.45)] ${
                isSaving ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              {isSaving ? "Saving..." : "Next"}
            </div>
          </div>

          {/* Preview */}
          <div
            ref={previewRef}
            className="relative flex-1 min-h-0 w-full flex items-center justify-center overflow-hidden bg-[var(--bg-elevated)] devs:bg-[#04050e]"
          >
            {imageUrls[activeIndex] && fitW > 0 && (
              <div className="relative overflow-hidden" style={{ width: fitW, height: fitH }}>
                <img
                  src={imageUrls[activeIndex]}
                  alt="Preview"
                  draggable={false}
                  className="w-full h-full block select-none"
                  style={{ filter: editToCss(shownEdit), transition: "filter 0.15s ease-out" }}
                />
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{ background: vignetteCss(shownEdit) }}
                />
              </div>
            )}

            {/* Press & hold to compare with the original */}
            <button
              type="button"
              onPointerDown={() => setComparing(true)}
              onPointerUp={() => setComparing(false)}
              onPointerLeave={() => setComparing(false)}
              onPointerCancel={() => setComparing(false)}
              onContextMenu={(e) => e.preventDefault()}
              aria-label="Hold to compare with original"
              className="absolute bottom-3 left-3 z-10 w-[34px] h-[34px] rounded-full flex justify-center items-center bg-[rgba(0,0,0,0.6)] cursor-pointer select-none devs:backdrop-blur-md devs:border devs:border-[var(--border-popup)] devs:transition-all devs:hover:shadow-[0_0_16px_rgba(34,240,255,0.5)] active:scale-90"
              style={{ touchAction: "none" }}
            >
              <Eye size={18} color="white" />
            </button>

            {comparing && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-black/60 text-white text-xs px-3 py-1 rounded-full devs:font-mono devs:uppercase devs:tracking-widest devs:border devs:border-[var(--border-popup)]">
                Original
              </div>
            )}

            {hasMultiple && activeIndex > 0 && (
              <div
                onClick={() => setActiveIndex((i) => i - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10 devs:backdrop-blur-md devs:border devs:border-[var(--border-popup)]"
              >
                <ChevronLeft size={18} color="white" />
              </div>
            )}
            {hasMultiple && activeIndex < images.length - 1 && (
              <div
                onClick={() => setActiveIndex((i) => i + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10 devs:backdrop-blur-md devs:border devs:border-[var(--border-popup)]"
              >
                <ChevronRight size={18} color="white" />
              </div>
            )}
          </div>

          {/* Filmstrip (carousel only) — thumbnails show each slide's current edit */}
          {hasMultiple && (
            <div className="w-full h-[56px] flex-shrink-0 bg-[var(--bg-app)] flex items-center gap-2 px-2 overflow-x-auto devs:bg-[rgba(4,5,14,0.8)] devs:backdrop-blur-md border-t border-[var(--border-soft)]">
              {imageUrls.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`flex-shrink-0 w-[40px] h-[40px] rounded-md overflow-hidden cursor-pointer border-2 devs:rounded-lg devs:transition-all ${
                    i === activeIndex
                      ? "border-[var(--accent-blue)] devs:shadow-[0_0_14px_rgba(34,240,255,0.6)]"
                      : "border-transparent"
                  }`}
                >
                  <img
                    src={url}
                    className="w-full h-full object-cover"
                    alt=""
                    style={{ filter: editToCss(slides[i]) }}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="w-full h-[42px] flex-shrink-0 flex border-t border-[var(--border-soft)] bg-[var(--bg-app)] devs:bg-transparent">
            <div className={tabClass(tab === "filters")} onClick={() => setTab("filters")}>
              Filters
            </div>
            <div className={tabClass(tab === "adjust")} onClick={() => setTab("adjust")}>
              Adjust
            </div>
          </div>

          {/* Panel */}
          <div className="w-full h-[210px] flex-shrink-0 overflow-y-auto no-scrollbar bg-[var(--bg-surface)] devs:bg-transparent">
            <div className="flex items-center justify-between px-4 pt-2.5">
              <span
                className="text-[11px] text-[var(--text-muted)] devs:font-mono devs:uppercase devs:tracking-widest"
              >
                {tab === "filters"
                  ? IMAGE_FILTERS.find((f) => f.key === edit.filter)?.label
                  : "Double-tap a slider to reset it"}
              </span>
              <div className="flex items-center gap-4">
                {hasMultiple && (
                  <span onClick={applyToAll} className={smallBtn}>
                    <CopyCheck size={13} /> Apply to all
                  </span>
                )}
                <span onClick={resetActive} className={smallBtn}>
                  <RotateCcw size={13} /> Reset
                </span>
              </div>
            </div>

            {tab === "filters" && (
              <div className="grid grid-cols-5 gap-2.5 px-4 py-3">
                {IMAGE_FILTERS.map((f) => {
                  const isActive = edit.filter === f.key;
                  return (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFilter(f.key)}
                      className="flex flex-col items-center gap-1.5 min-w-0"
                      aria-label={f.label}
                    >
                      <div
                        className={`relative w-full aspect-square rounded-lg overflow-hidden bg-black/40 ring-2 transition-all duration-150 devs:rounded-xl ${
                          isActive
                            ? "ring-[var(--accent-blue)] scale-[1.04] devs:ring-[var(--devs-cyan)] devs:shadow-[0_0_14px_rgba(34,240,255,0.6)]"
                            : "ring-transparent hover:ring-[var(--border-popup)]"
                        }`}
                      >
                        {imageUrls[activeIndex] && (
                          <img
                            src={imageUrls[activeIndex]}
                            alt=""
                            draggable={false}
                            className="w-full h-full object-cover"
                            style={{ filter: opsToCss(f.ops) || "none" }}
                          />
                        )}
                      </div>
                      <span
                        className={`text-[11px] w-full text-center truncate devs:font-mono ${
                          isActive
                            ? "text-[var(--text-primary)] font-semibold"
                            : "text-[var(--text-muted)]"
                        }`}
                      >
                        {f.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {tab === "adjust" && (
              <div className="flex flex-col gap-3 px-4 py-3">
                {ADJUST_CONTROLS.map((c) => {
                  const value = edit.adjust?.[c.key] ?? DEFAULT_ADJUST[c.key];
                  return (
                    <div key={c.key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-[var(--text-primary)] devs:font-mono devs:uppercase devs:tracking-wider devs:text-[11px]">
                          {c.label}
                        </span>
                        <span
                          className={`text-xs tabular-nums devs:font-mono ${
                            value !== 0
                              ? "text-[var(--accent-blue)] devs:text-[var(--devs-cyan)] font-semibold"
                              : "text-[var(--text-muted)]"
                          }`}
                        >
                          {value}
                          {c.unit}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={c.min}
                        max={c.max}
                        step={1}
                        value={value}
                        onChange={(e) => setAdjust(c.key, Number(e.target.value))}
                        onDoubleClick={() => setAdjust(c.key, DEFAULT_ADJUST[c.key])}
                        className="w-full accent-[var(--accent-blue)] devs:accent-[var(--devs-cyan)]"
                        aria-label={c.label}
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterImagePage;
