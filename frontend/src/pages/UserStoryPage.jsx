// UserStoryPage.jsx
import React, { useEffect, useRef, useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fabric } from "fabric";
import { Rnd } from "react-rnd";
import axios from "axios";
import { toast } from "react-toastify";
import {
  X, Type, Pencil, Palette, Music, Check, Undo2, SlidersHorizontal,
  CaseSensitive, Baseline, ChevronLeft, Loader2,
} from "lucide-react";
import { getImageFilterPreset, VIDEO_FILTER_CSS, FILTER_NAMES } from "../utils/storyFilters";
import SongTrimClipper from "../components/SongTrimClipper";

const EXPORT_W = 1080;
const EXPORT_H = 1920;
const STORY_RATIO = 9 / 16;
const CLIP_SECONDS = 15;

const BG_SWATCHES = ["#000000", "#1a1a2e", "#4a5df9", "#ff6b0d", "#eb0089", "#0f9d58", "#ffffff"];
const PEN_SWATCHES = ["#ffffff", "#000000", "#ffc600", "#ff6b0d", "#eb0089", "#4a5df9", "#0f9d58"];
const TEXT_SWATCHES = ["#ffffff", "#000000", "#ffc600", "#ff6b0d", "#eb0089", "#4a5df9", "#0f9d58"];

const FONT_OPTIONS = [
  "Poppins", "Roboto", "Montserrat", "Playfair Display",
  "Oswald", "Pacifico", "Dancing Script", "Bebas Neue", "Caveat", "Anton",
];

// Human-friendly labels for the filter grid
const FILTER_META = {
  none: { label: "Original" },
  vintage: { label: "Vintage" },
  retro: { label: "Retro" },
  modern: { label: "Modern" },
  noir: { label: "Noir" },
  warm: { label: "Warm" },
  cool: { label: "Cool" },
  dramatic: { label: "Dramatic" },
  fade: { label: "Fade" },
};

const PANEL_TITLES = {
  "pen-color": "Pen color",
  "bg-color": "Background",
  "text-color": "Text color",
  "font": "Font",
  "filters": "Filters",
};

fabric.Object.prototype.set({
  transparentCorners: false,
  cornerColor: "#4a5df9",
  cornerStrokeColor: "#ffffff",
  cornerStyle: "circle",
  cornerSize: 16,
  borderColor: "#4a5df9",
  padding: 6,
});

// Visible, easy-to-grab corner handle for the video frame (mirrors the
// fabric.js text-corner styling above so the whole editor feels consistent)
const cornerHandle = (offset, cursor) => ({
  width: 18,
  height: 18,
  background: "#ffffff",
  border: "2px solid #4a5df9",
  borderRadius: "9999px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.45)",
  zIndex: 20,
  cursor,
  ...offset,
});

// Larger (but invisible) hit-area for edges so "squeezing" the frame from
// the sides is easy on both trackpad/mouse and touch screens
const edgeHandle = (offset, cursor) => ({
  background: "transparent",
  zIndex: 15,
  cursor,
  ...offset,
});

const RND_HANDLE_STYLES = {
  top: edgeHandle({ height: 16, top: -8 }, "ns-resize"),
  bottom: edgeHandle({ height: 16, bottom: -8 }, "ns-resize"),
  left: edgeHandle({ width: 16, left: -8 }, "ew-resize"),
  right: edgeHandle({ width: 16, right: -8 }, "ew-resize"),
  topLeft: cornerHandle({ top: -9, left: -9 }, "nwse-resize"),
  topRight: cornerHandle({ top: -9, right: -9 }, "nesw-resize"),
  bottomLeft: cornerHandle({ bottom: -9, left: -9 }, "nesw-resize"),
  bottomRight: cornerHandle({ bottom: -9, right: -9 }, "nwse-resize"),
};

// Injected once — small keyframes for panel/backdrop/page entrance so
// nothing feels like it just "pops" into existence
const STORY_PAGE_STYLES = `
@keyframes storyFadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes storyPanelIn { from { opacity: 0; transform: scale(0.96) translateY(4px); } to { opacity: 1; transform: scale(1) translateY(0); } }
@keyframes storyPop { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
`;

const ColorPickerRow = ({ colors, value, onChange }) => {
  const nativeRef = useRef(null);
  return (
    <div className="flex items-center gap-3 flex-wrap p-4 pt-2">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{ backgroundColor: c }}
          className={`w-9 h-9 rounded-full border-2 shrink-0 transition-all duration-150 hover:scale-110 active:scale-95 ${
            value === c
              ? "border-[#4a5df9] scale-110 shadow-[0_0_0_3px_rgba(74,93,249,0.35)]"
              : "border-white/30 hover:border-white/60"
          }`}
          aria-label={`Choose ${c}`}
        />
      ))}
      <button
        type="button"
        onClick={() => nativeRef.current?.click()}
        title="Custom color"
        className="w-9 h-9 rounded-full border-2 border-white/50 shrink-0 relative transition-transform duration-150 hover:scale-110 active:scale-95"
        style={{ background: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)" }}
        aria-label="Custom color wheel"
      />
      <input
        ref={nativeRef}
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-0 h-0 opacity-0 absolute pointer-events-none"
        tabIndex={-1}
      />
    </div>
  );
};

const UserStoryPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { file, mediaType } = location.state || {};

  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const videoElRef = useRef(null);
  const bgImageRef = useRef(null);
  const audioRef = useRef(null);

  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState("select");
  const [penColor, setPenColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textFont, setTextFont] = useState("Poppins");
  const [bgColor, setBgColor] = useState("#000000");
  const [activeFilter, setActiveFilter] = useState("none");
  const [panel, setPanel] = useState(null);
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songStartTime, setSongStartTime] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [isTextSelected, setIsTextSelected] = useState(false);

  const [videoBox, setVideoBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Purely cosmetic: a small preview URL used only for the filter-thumbnail
  // grid. Independent of the canvas/video loading logic below so it can't
  // affect any existing behavior.
  const [previewUrl, setPreviewUrl] = useState(null);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    if (!file) {
      toast.error("No media selected");
      navigate(-1);
    }
  }, [file, navigate]);

  useEffect(() => {
    const families = FONT_OPTIONS.map((f) => f.replace(/ /g, "+")).join("&family=");
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${families}&display=swap`;
    document.head.appendChild(link);
    return () => document.head.removeChild(link);
  }, []);

  useEffect(() => {
    const topBar = 56;
    const bottomBar = 88;
    const toolbarWidth = window.innerWidth < 768 ? 60 : 76;
    const sidePadding = 24;

    const availHeight = window.innerHeight - topBar - bottomBar - 24;
    const availWidth = window.innerWidth - toolbarWidth - sidePadding * 2;

    let height = Math.min(availHeight, 820);
    let width = height * STORY_RATIO;

    if (width > availWidth) {
      width = availWidth;
      height = width / STORY_RATIO;
    }

    const w = Math.round(width);
    const h = Math.round(height);
    setDims({ width: w, height: h });
    setVideoBox({ x: 0, y: 0, width: w, height: h });
  }, []);

  useEffect(() => {
    if (!file || !dims.width || !dims.height) return;

    const canvas = new fabric.Canvas(canvasElRef.current, {
      width: dims.width,
      height: dims.height,
      backgroundColor: mediaType === "image" ? bgColor : "transparent",
      preserveObjectStacking: true,
    });
    fabricRef.current = canvas;

    const updateSelection = () => {
      const obj = canvas.getActiveObject();
      setIsTextSelected(!!obj && obj.type === "textbox");
    };
    canvas.on("selection:created", updateSelection);
    canvas.on("selection:updated", updateSelection);
    canvas.on("selection:cleared", () => setIsTextSelected(false));

    const objectUrl = URL.createObjectURL(file);

    if (mediaType === "image") {
      fabric.Image.fromURL(objectUrl, (img) => {
        const scaleToCover = Math.max(dims.width / img.width, dims.height / img.height);
        img.set({
          left: dims.width / 2,
          top: dims.height / 2,
          originX: "center",
          originY: "center",
          scaleX: scaleToCover,
          scaleY: scaleToCover,
          selectable: true,
        });
        bgImageRef.current = img;
        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    }

    return () => {
      canvas.dispose();
      URL.revokeObjectURL(objectUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, mediaType, dims.width, dims.height]);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await axios.get("http://localhost:4000/song/list", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSongs(res.data.songs || []);
      } catch (err) {
        // Non-fatal: music is optional. Log the real backend message if present.
        console.error("Failed to load songs:", err.response?.data || err.message);
      }
    };
    fetchSongs();
  }, []);

  // pause + fully unload audio on unmount, regardless of how the page is exited
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // play the selected song's 15s clip on loop — same "loops until added"
  // behavior as Instagram's music sticker preview
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedSong) {
      audio?.pause();
      return;
    }
    audio.currentTime = songStartTime;
    audio.play().catch(() => {
      // autoplay can be blocked before any user gesture — harmless, the
      // trimmer drag itself counts as a gesture and playback resumes then
    });
  }, [selectedSong, songStartTime]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !selectedSong) return;
    const handleTimeUpdate = () => {
      if (audio.currentTime >= songStartTime + CLIP_SECONDS) {
        audio.currentTime = songStartTime;
        audio.play().catch(() => {});
      }
    };
    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
  }, [selectedSong, songStartTime]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    canvas.isDrawingMode = mode === "draw";
    if (mode === "draw") {
      canvas.freeDrawingBrush.color = penColor;
      canvas.freeDrawingBrush.width = 6;
    }
  }, [mode, penColor]);

  useEffect(() => {
    const img = bgImageRef.current;
    if (!img || mediaType !== "image") return;
    img.filters = getImageFilterPreset(activeFilter);
    img.applyFilters();
    fabricRef.current?.renderAll();
  }, [activeFilter, mediaType]);

  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas || mediaType !== "image") return;
    canvas.setBackgroundColor(bgColor, canvas.renderAll.bind(canvas));
  }, [bgColor, mediaType]);

  const addText = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const textbox = new fabric.Textbox("Tap to edit", {
      left: dims.width / 2,
      top: dims.height / 3,
      originX: "center",
      originY: "center",
      fill: textColor,
      fontFamily: textFont,
      fontSize: Math.round(dims.width * 0.09),
      fontWeight: "600",
      textAlign: "center",
      width: dims.width * 0.85,
    });
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    setIsTextSelected(true);
    setMode("select");
  };

  const applyTextColor = (color) => {
    setTextColor(color);
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && obj.type === "textbox") {
      obj.set("fill", color);
      canvas.renderAll();
    }
  };

  const applyFont = (fontName) => {
    setTextFont(fontName);
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj || obj.type !== "textbox") return;
    document.fonts.load(`16px "${fontName}"`).finally(() => {
      obj.set("fontFamily", fontName);
      canvas.renderAll();
    });
  };

  const undoLast = () => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    const last = objects[objects.length - 1];
    if (last && last !== bgImageRef.current) canvas.remove(last);
  };

  const handleDiscard = () => {
    audioRef.current?.pause();
    navigate(-1);
  };

  const togglePanel = (name) => setPanel((p) => (p === name ? null : name));
  const closePanel = () => setPanel(null);

  const removeSong = () => {
    audioRef.current?.pause();
    setSelectedSong(null);
    setSongStartTime(0);
  };

  const exportImage = () => {
    const canvas = fabricRef.current;
    canvas.discardActiveObject();
    canvas.renderAll();
    const multiplier = EXPORT_W / dims.width;
    return new Promise((resolve) => {
      canvas.toCanvasElement(multiplier).toBlob((blob) => resolve(blob), "image/png", 0.92);
    });
  };

  const exportVideo = () => {
    return new Promise((resolve, reject) => {
      const video = videoElRef.current;
      const overlayCanvas = fabricRef.current.getElement();
      const multiplier = EXPORT_W / dims.width;

      // A looping <video> never fires "ended", so MediaRecorder.stop()
      // would never be called and this promise would hang forever.
      // Disable looping just for the export pass, restore it after.
      const wasLooping = video.loop;
      video.loop = false;
      const restoreLoop = () => {
        video.loop = wasLooping;
      };

      const outputCanvas = document.createElement("canvas");
      outputCanvas.width = EXPORT_W;
      outputCanvas.height = EXPORT_H;
      const ctx = outputCanvas.getContext("2d");

      const stream = outputCanvas.captureStream(30);
      try {
        const audioStream = video.captureStream?.();
        audioStream?.getAudioTracks().forEach((t) => stream.addTrack(t));
      } catch (e) {
        // silent fallback — video-only export
      }

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm;codecs=vp9,opus" });
      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.onstop = () => {
        restoreLoop();
        resolve(new Blob(chunks, { type: "video/webm" }));
      };
      recorder.onerror = (e) => {
        restoreLoop();
        reject(e);
      };

      video.currentTime = 0;
      let rafId;
      const drawFrame = () => {
        if (video.paused || video.ended) return;
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);
        ctx.save();
        ctx.filter = VIDEO_FILTER_CSS[activeFilter] || "none";
        ctx.drawImage(
          video,
          videoBox.x * multiplier,
          videoBox.y * multiplier,
          videoBox.width * multiplier,
          videoBox.height * multiplier
        );
        ctx.restore();
        ctx.drawImage(overlayCanvas, 0, 0, EXPORT_W, EXPORT_H);
        rafId = requestAnimationFrame(drawFrame);
      };

      recorder.start();
      video.play().then(drawFrame);
      video.onended = () => {
        cancelAnimationFrame(rafId);
        recorder.stop();
      };
    });
  };

  const handleAddToStory = async () => {
    try {
      audioRef.current?.pause();
      setExporting(true);
      const blob = mediaType === "image" ? await exportImage() : await exportVideo();

      const formData = new FormData();
      formData.append("media", blob, mediaType === "image" ? "story.png" : "story.webm");
      // Not sending mediaType here on purpose — the backend's
      // validateVideoDuration middleware sets req.mediaType itself from the
      // uploaded file's real mimetype, which is more trustworthy than
      // anything the client claims.
      formData.append("filterUsed", activeFilter);
      formData.append("bgColor", bgColor);
      if (selectedSong) {
        formData.append("songId", selectedSong._id);
        formData.append("songStartTime", songStartTime);
      }

      const token = localStorage.getItem("authToken");
      await axios.post("http://localhost:4000/story/create", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      toast.success("Story posted!");
      navigate("/home");
    } catch (err) {
      // Surface the REAL backend error message (from error.message in the
      // controller's catch block), not just the generic Axios wrapper.
      console.error("Story upload failed:", err.response?.data || err.message);
      toast.error(err.response?.data?.message || "Failed to post story");
    } finally {
      setExporting(false);
    }
  };

  if (!file) return null;

  const toolbarBtnBase =
    "w-10 h-10 rounded-full flex items-center justify-center text-white backdrop-blur-md " +
    "bg-black/40 ring-1 ring-white/10 shadow-lg shadow-black/30 transition-all duration-150 " +
    "hover:bg-black/55 hover:ring-white/20 hover:scale-105 active:scale-95";
  const toolbarBtnActive =
    "bg-[#4a5df9] ring-[#4a5df9]/50 shadow-[0_0_14px_rgba(74,93,249,0.55)] hover:bg-[#4a5df9]";

  return (
    <div
      className="userStoryPage fixed inset-0 bg-[#0c1014] z-50 flex items-center justify-center"
      style={{ animation: "storyFadeIn 0.18s ease-out" }}
    >
      <style>{STORY_PAGE_STYLES}</style>

      {selectedSong && (
        <audio ref={audioRef} src={selectedSong.audioUrl} className="hidden" crossOrigin="anonymous" />
      )}

      {dims.width > 0 && (
        <div className="relative flex items-center gap-3">
          <div
            className="relative rounded-2xl overflow-hidden bg-black shadow-2xl shadow-black/60 ring-1 ring-white/10"
            style={{ width: dims.width, height: dims.height }}
          >
            {mediaType === "video" && (
              <Rnd
                size={{ width: videoBox.width, height: videoBox.height }}
                position={{ x: videoBox.x, y: videoBox.y }}
                bounds="parent"
                style={{ zIndex: 10 }}
                className="cursor-move ring-1 ring-white/20 hover:ring-[#4a5df9]/70 focus-within:ring-[#4a5df9] transition-all duration-150"
                resizeHandleStyles={RND_HANDLE_STYLES}
                onDragStop={(e, d) => setVideoBox((b) => ({ ...b, x: d.x, y: d.y }))}
                onResizeStop={(e, dir, ref, delta, position) => {
                  setVideoBox({
                    width: ref.offsetWidth,
                    height: ref.offsetHeight,
                    x: position.x,
                    y: position.y,
                  });
                }}
              >
                <video
                  ref={videoElRef}
                  src={URL.createObjectURL(file)}
                  muted
                  playsInline
                  loop
                  autoPlay
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: VIDEO_FILTER_CSS[activeFilter],
                    pointerEvents: "none",
                  }}
                />
              </Rnd>
            )}

            <div className="absolute inset-0" style={{ zIndex: 20 }}>
              <canvas ref={canvasElRef} />
            </div>

            {selectedSong && (
              <div
                className="absolute top-14 left-4 right-4 z-30 flex items-center gap-2 bg-black/45 rounded-full px-3 py-2 backdrop-blur-md ring-1 ring-white/10 shadow-lg shadow-black/30"
                style={{ animation: "storyPop 0.2s ease-out" }}
              >
                <div
                  className="w-6 h-6 rounded-full shrink-0"
                  style={{ background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }}
                />
                <div className="text-white text-xs truncate flex-1">
                  {selectedSong.title} · {selectedSong.artist}
                </div>
              </div>
            )}

            <div
              className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 z-30 bg-gradient-to-b from-black/60 via-black/25 to-transparent backdrop-blur-[2px]"
              style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))", paddingBottom: "0.75rem" }}
            >
              <button
                onClick={handleDiscard}
                className="text-white/90 hover:text-white p-1.5 -ml-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-all"
                aria-label="Discard"
              >
                <X size={24} />
              </button>
              <button
                onClick={undoLast}
                className="text-white/90 hover:text-white p-1.5 -mr-1.5 rounded-full hover:bg-white/10 active:scale-90 transition-all"
                aria-label="Undo"
              >
                <Undo2 size={20} />
              </button>
            </div>

            <div
              className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-4 z-30 bg-gradient-to-t from-black/70 via-black/30 to-transparent backdrop-blur-[2px]"
              style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))", paddingTop: "1rem" }}
            >
              <button
                onClick={handleDiscard}
                className="text-white/90 hover:text-white text-sm font-medium px-2 py-1 rounded-lg hover:bg-white/10 transition-all"
              >
                Discard
              </button>
              <button
                onClick={handleAddToStory}
                disabled={exporting}
                className="bg-[#4a5df9] hover:bg-[#4150f7] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-2.5 rounded-full shadow-lg shadow-[#4a5df9]/30 transition-all duration-150 hover:scale-[1.03] active:scale-95 flex items-center gap-2"
              >
                {exporting && <Loader2 size={16} className="animate-spin" />}
                {exporting ? "Posting..." : "Add to Story"}
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 z-40">
            <button
              onClick={addText}
              className={toolbarBtnBase}
              aria-label="Add text"
            >
              <Type size={20} />
            </button>

            {isTextSelected && (
              <>
                <button
                  onClick={() => togglePanel("text-color")}
                  className={`${toolbarBtnBase} relative ${panel === "text-color" ? toolbarBtnActive : ""}`}
                  style={{ animation: "storyPop 0.15s ease-out" }}
                  aria-label="Text color"
                >
                  <Baseline size={20} />
                  <span
                    className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white"
                    style={{ backgroundColor: textColor }}
                  />
                </button>
                <button
                  onClick={() => togglePanel("font")}
                  className={`${toolbarBtnBase} ${panel === "font" ? toolbarBtnActive : ""}`}
                  style={{ animation: "storyPop 0.15s ease-out" }}
                  aria-label="Font"
                >
                  <CaseSensitive size={20} />
                </button>
              </>
            )}

            <button
              onClick={() => {
                setMode((m) => (m === "draw" ? "select" : "draw"));
                setPanel(mode === "draw" ? null : "pen-color");
              }}
              className={`${toolbarBtnBase} relative ${mode === "draw" ? toolbarBtnActive : ""}`}
              aria-label="Doodle"
            >
              <Pencil size={20} />
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white"
                style={{ backgroundColor: penColor }}
              />
            </button>

            {mediaType === "image" && (
              <button
                onClick={() => togglePanel("bg-color")}
                className={`${toolbarBtnBase} ${panel === "bg-color" ? toolbarBtnActive : ""}`}
                aria-label="Background color"
              >
                <Palette size={20} />
              </button>
            )}

            <button
              onClick={() => togglePanel("filters")}
              className={`${toolbarBtnBase} ${panel === "filters" ? toolbarBtnActive : ""}`}
              aria-label="Filters"
            >
              <SlidersHorizontal size={20} />
            </button>

            <button
              onClick={() => togglePanel("songs")}
              className={`${toolbarBtnBase} ${
                selectedSong ? "ring-white/20" : ""
              } ${panel === "songs" ? toolbarBtnActive : ""}`}
              style={
                selectedSong && panel !== "songs"
                  ? { background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)" }
                  : undefined
              }
              aria-label="Add music"
            >
              <Music size={20} />
            </button>
          </div>

          {panel && (
            <>
              {/* Tap-outside-to-close backdrop. Sits above the canvas/top/bottom
                  bars but below the toolbar, so toolbar icons stay clickable
                  while a single tap anywhere else dismisses the panel. */}
              <div
                onClick={closePanel}
                className="fixed inset-0 z-[35] bg-black/30 backdrop-blur-[2px]"
                style={{ animation: "storyFadeIn 0.15s ease-out" }}
                aria-hidden="true"
              />

              <div
                className="fixed inset-x-0 bottom-0 z-50 bg-[#161616]/95 backdrop-blur-xl border-t border-white/10 rounded-t-3xl shadow-2xl max-h-[65vh] overflow-hidden flex flex-col md:absolute md:inset-x-auto md:bottom-auto md:right-[84px] md:top-1/2 md:-translate-y-1/2 md:rounded-2xl md:border md:border-white/10 md:border-t-white/10 md:max-h-[70vh] md:w-auto"
                style={{
                  animation: "storyPanelIn 0.2s ease-out",
                  paddingBottom: "env(safe-area-inset-bottom)",
                }}
              >
                {panel !== "songs" && PANEL_TITLES[panel] && (
                  <div className="flex items-center justify-between px-4 pt-3 pb-1 shrink-0">
                    <span className="text-white text-sm font-semibold">{PANEL_TITLES[panel]}</span>
                    <button
                      onClick={closePanel}
                      className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                      aria-label="Close"
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}

                <div className="overflow-y-auto no-scrollbar">
                  {panel === "pen-color" && (
                    <div className="w-full sm:w-[260px]">
                      <ColorPickerRow colors={PEN_SWATCHES} value={penColor} onChange={setPenColor} />
                    </div>
                  )}

                  {panel === "bg-color" && (
                    <div className="w-full sm:w-[260px]">
                      <ColorPickerRow colors={BG_SWATCHES} value={bgColor} onChange={setBgColor} />
                    </div>
                  )}

                  {panel === "text-color" && (
                    <div className="w-full sm:w-[260px]">
                      <ColorPickerRow colors={TEXT_SWATCHES} value={textColor} onChange={applyTextColor} />
                    </div>
                  )}

                  {panel === "font" && (
                    <div className="w-full sm:w-[220px] py-1 max-h-[300px] overflow-y-auto no-scrollbar">
                      {FONT_OPTIONS.map((f) => (
                        <button
                          key={f}
                          onClick={() => applyFont(f)}
                          style={{ fontFamily: f }}
                          className={`w-full flex items-center justify-between px-4 py-2.5 text-base transition-colors ${
                            textFont === f ? "text-white bg-[#4a5df9]/15" : "text-white/90 hover:bg-white/5"
                          }`}
                        >
                          {f}
                          {textFont === f && <Check size={14} className="text-[#4a5df9] shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Filters — a wrapping grid (4 per row, rows grow with the
                      filter count) instead of a horizontal scroller, so mouse
                      users never need to "scroll right" to see every option. */}
                  {panel === "filters" && (
                    <div className="w-full sm:w-[360px] px-4 py-3">
                      <div className="grid grid-cols-4 gap-3">
                        {FILTER_NAMES.map((f) => {
                          const meta = FILTER_META[f] || { label: f };
                          const isActive = activeFilter === f;
                          return (
                            <button
                              key={f}
                              onClick={() => setActiveFilter(f)}
                              className="flex flex-col items-center gap-1.5"
                              aria-label={meta.label}
                            >
                              <div
                                className={`relative w-full aspect-square rounded-xl overflow-hidden bg-black/40 ring-2 transition-all duration-150 ${
                                  isActive
                                    ? "ring-[#4a5df9] scale-[1.04] shadow-[0_0_10px_rgba(74,93,249,0.5)]"
                                    : "ring-white/15 hover:ring-white/40"
                                }`}
                              >
                                {previewUrl && mediaType === "image" && (
                                  <img
                                    src={previewUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                    style={{ filter: VIDEO_FILTER_CSS[f] }}
                                  />
                                )}
                                {previewUrl && mediaType === "video" && (
                                  <video
                                    src={previewUrl}
                                    muted
                                    loop
                                    autoPlay
                                    playsInline
                                    className="w-full h-full object-cover"
                                    style={{ filter: VIDEO_FILTER_CSS[f] }}
                                  />
                                )}
                                {isActive && (
                                  <span className="absolute top-1 right-1 bg-[#4a5df9] rounded-full p-0.5 ring-2 ring-[#161616]">
                                    <Check size={9} className="text-white" />
                                  </span>
                                )}
                              </div>
                              <span
                                className={`text-[11px] w-full text-center truncate ${
                                  isActive ? "text-white font-semibold" : "text-white/70"
                                }`}
                              >
                                {meta.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {panel === "songs" && (
                    <div className="w-full sm:w-[300px] p-4">
                      {!selectedSong ? (
                        <>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white text-sm font-semibold">Choose a song</span>
                            <button
                              onClick={closePanel}
                              className="text-white/50 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
                              aria-label="Close"
                            >
                              <X size={16} />
                            </button>
                          </div>
                          <div className="max-h-[280px] overflow-y-auto no-scrollbar -mx-1">
                            {songs.length === 0 && (
                              <div className="text-[#888] text-xs py-4 text-center">No songs available yet.</div>
                            )}
                            {songs.map((song) => (
                              <div
                                key={song._id}
                                onClick={() => {
                                  setSelectedSong(song);
                                  setSongStartTime(0);
                                }}
                                className="flex items-center gap-3 p-2 mx-1 rounded-xl cursor-pointer hover:bg-white/5 active:bg-white/10 transition-colors"
                              >
                                <img
                                  src={song.thumbnail || "/images/song-placeholder.png"}
                                  alt=""
                                  className="w-10 h-10 rounded-lg object-cover shrink-0 ring-1 ring-white/10"
                                />
                                <div className="text-white text-xs min-w-0">
                                  <div className="truncate font-medium">{song.title}</div>
                                  <div className="text-[#888] truncate">{song.artist}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                          {songs.some((s) => s.source === "jamendo") && (
                            <div className="text-[#666] text-[10px] text-center pt-3 mt-1 border-t border-white/5">
                              Music via Jamendo · Creative Commons
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <button
                              onClick={removeSong}
                              className="text-white/90 hover:text-white text-xs flex items-center gap-1 -ml-1 px-1.5 py-1 rounded-lg hover:bg-white/10 transition-colors"
                            >
                              <ChevronLeft size={14} /> Back
                            </button>
                            <button
                              onClick={closePanel}
                              className="text-[#4a5df9] hover:text-[#6b7bff] text-xs font-semibold px-1.5 py-1 rounded-lg hover:bg-[#4a5df9]/10 transition-colors"
                            >
                              Done
                            </button>
                          </div>
                          <div className="text-white text-xs font-semibold truncate mb-1">
                            {selectedSong.title}
                          </div>
                          <div className="text-[#888] text-[11px] mb-3 truncate">
                            {selectedSong.artist}
                          </div>
                          <SongTrimClipper
                            duration={selectedSong.duration}
                            startTime={songStartTime}
                            onChange={setSongStartTime}
                            trackWidth={220}
                          />
                          <div className="text-[#888] text-[10px] mt-2 text-center">
                            Drag to choose your 15s clip
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default UserStoryPage;
