// UserStoryPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fabric } from "fabric";
import { Rnd } from "react-rnd";
import axios from "axios";
import { toast } from "react-toastify";
import {
  X, Type, Pencil, Palette, Music, Check, Undo2, SlidersHorizontal,
  CaseSensitive, Baseline,
} from "lucide-react";
import { getImageFilterPreset, VIDEO_FILTER_CSS, FILTER_NAMES } from "../utils/storyFilters";

const EXPORT_W = 1080;
const EXPORT_H = 1920;
const STORY_RATIO = 9 / 16;

const BG_SWATCHES = ["#000000", "#1a1a2e", "#4a5df9", "#ff6b0d", "#eb0089", "#0f9d58", "#ffffff"];
const PEN_SWATCHES = ["#ffffff", "#000000", "#ffc600", "#ff6b0d", "#eb0089", "#4a5df9", "#0f9d58"];
const TEXT_SWATCHES = ["#ffffff", "#000000", "#ffc600", "#ff6b0d", "#eb0089", "#4a5df9", "#0f9d58"];

// free Google Fonts — loaded via stylesheet link, no API key needed
const FONT_OPTIONS = [
  "Poppins", "Roboto", "Montserrat", "Playfair Display",
  "Oswald", "Pacifico", "Dancing Script", "Bebas Neue", "Caveat", "Anton",
];

fabric.Object.prototype.set({
  transparentCorners: false,
  cornerColor: "#4a5df9",
  cornerStrokeColor: "#ffffff",
  cornerStyle: "circle",
  cornerSize: 16,
  borderColor: "#4a5df9",
  padding: 6,
});

const ColorPickerRow = ({ colors, value, onChange }) => {
  const nativeRef = useRef(null);
  return (
    <div className="flex items-center gap-2 flex-wrap p-3">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          style={{ backgroundColor: c }}
          className={`w-8 h-8 rounded-full border-2 shrink-0 transition-transform ${
            value === c ? "border-[#4a5df9] scale-110" : "border-white/40"
          }`}
          aria-label={`Choose ${c}`}
        />
      ))}
      <button
        type="button"
        onClick={() => nativeRef.current?.click()}
        className="w-8 h-8 rounded-full border-2 border-white/60 shrink-0 relative"
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

  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [mode, setMode] = useState("select");
  const [penColor, setPenColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textFont, setTextFont] = useState("Poppins");
  const [bgColor, setBgColor] = useState("#000000");
  const [activeFilter, setActiveFilter] = useState("none");
  const [panel, setPanel] = useState(null); // filters | pen-color | bg-color | text-color | font | songs | null
  const [songs, setSongs] = useState([]);
  const [selectedSong, setSelectedSong] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [isTextSelected, setIsTextSelected] = useState(false);

  // video position/size — drives BOTH the on-screen Rnd box and the final export crop
  const [videoBox, setVideoBox] = useState({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (!file) {
      toast.error("No media selected");
      navigate(-1);
    }
  }, [file, navigate]);

  // inject Google Fonts stylesheet once — free, no key required
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
    setVideoBox({ x: 0, y: 0, width: w, height: h }); // default: video covers full frame
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

    // track selection so the toolbar can show text-only controls (color/font)
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
        console.error("Failed to load songs:", err);
      }
    };
    fetchSongs();
  }, []);

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

  // applies a color to whichever textbox is currently selected — this is
  // the fix for "text color can also be changed [after creation]"
  const applyTextColor = (color) => {
    setTextColor(color);
    const canvas = fabricRef.current;
    const obj = canvas?.getActiveObject();
    if (obj && obj.type === "textbox") {
      obj.set("fill", color);
      canvas.renderAll();
    }
  };

  // applies a font to the selected textbox, loading the webfont first so it
  // doesn't silently fall back to a system font on first use
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

  const handleDiscard = () => navigate(-1);

  const togglePanel = (name) => setPanel((p) => (p === name ? null : name));

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
      recorder.onstop = () => resolve(new Blob(chunks, { type: "video/webm" }));
      recorder.onerror = reject;

      video.currentTime = 0;
      let rafId;
      const drawFrame = () => {
        if (video.paused || video.ended) return;

        // fill any area the (possibly resized/moved) video doesn't cover
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, EXPORT_W, EXPORT_H);

        ctx.save();
        ctx.filter = VIDEO_FILTER_CSS[activeFilter] || "none";
        // draw the video at whatever position/size the user dragged it to via
        // react-rnd, scaled up from on-screen pixels to the export resolution
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
      setExporting(true);
      const blob = mediaType === "image" ? await exportImage() : await exportVideo();

      const formData = new FormData();
      formData.append("media", blob, mediaType === "image" ? "story.png" : "story.webm");
      formData.append("filterUsed", activeFilter);
      formData.append("bgColor", bgColor);
      if (selectedSong) {
        formData.append("songId", selectedSong._id);
        formData.append("songStartTime", 0);
      }

      const token = localStorage.getItem("authToken");
      await axios.post("http://localhost:4000/story/create", formData, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
      });

      toast.success("Story posted!");
      navigate("/home");
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to post story");
    } finally {
      setExporting(false);
    }
  };

  if (!file) return null;

  return (
    <div className="userStoryPage fixed inset-0 bg-[#0c1014] z-50 flex items-center justify-center">
      {dims.width > 0 && (
        <div className="relative flex items-center gap-3">
          <div
            className="relative rounded-2xl overflow-hidden bg-black shadow-2xl"
            style={{ width: dims.width, height: dims.height }}
          >
            {mediaType === "video" && (
              <Rnd
                size={{ width: videoBox.width, height: videoBox.height }}
                position={{ x: videoBox.x, y: videoBox.y }}
                bounds="parent"
                style={{ zIndex: 10 }}
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
                    pointerEvents: "none", // drag/resize handled by Rnd's own handles, not the video itself
                  }}
                />
              </Rnd>
            )}

            <div className="absolute inset-0" style={{ zIndex: 20 }}>
              <canvas ref={canvasElRef} />
            </div>

            <div className="absolute top-0 left-0 right-0 flex justify-between items-center px-4 py-3 z-30 bg-gradient-to-b from-black/50 to-transparent">
              <button onClick={handleDiscard} className="text-white" aria-label="Discard">
                <X size={24} />
              </button>
              <button onClick={undoLast} className="text-white" aria-label="Undo">
                <Undo2 size={20} />
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 flex justify-between items-center px-4 py-4 z-30 bg-gradient-to-t from-black/60 to-transparent">
              <button onClick={handleDiscard} className="text-white text-sm font-medium">
                Discard
              </button>
              <button
                onClick={handleAddToStory}
                disabled={exporting}
                className="bg-[#4a5df9] hover:bg-[#4150f7] disabled:opacity-50 text-white text-sm font-bold px-6 py-2 rounded-full"
              >
                {exporting ? "Posting..." : "Add to Story"}
              </button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 z-20">
            <button
              onClick={addText}
              className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white"
              aria-label="Add text"
            >
              <Type size={20} />
            </button>

            {/* text-only controls — appear only while a textbox is selected */}
            {isTextSelected && (
              <>
                <button
                  onClick={() => togglePanel("text-color")}
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white relative ${
                    panel === "text-color" ? "bg-[#4a5df9]" : "bg-black/50"
                  }`}
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
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                    panel === "font" ? "bg-[#4a5df9]" : "bg-black/50"
                  }`}
                  aria-label="Font"
                >
                  <CaseSensitive size={20} />
                </button>
              </>
            )}

            <div className="relative">
              <button
                onClick={() => {
                  setMode((m) => (m === "draw" ? "select" : "draw"));
                  setPanel(mode === "draw" ? null : "pen-color");
                }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white relative ${
                  mode === "draw" ? "bg-[#4a5df9]" : "bg-black/50"
                }`}
                aria-label="Doodle"
              >
                <Pencil size={20} />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-white"
                  style={{ backgroundColor: penColor }}
                />
              </button>
            </div>

            {mediaType === "image" && (
              <button
                onClick={() => togglePanel("bg-color")}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                  panel === "bg-color" ? "bg-[#4a5df9]" : "bg-black/50"
                }`}
                aria-label="Background color"
              >
                <Palette size={20} />
              </button>
            )}

            <button
              onClick={() => togglePanel("filters")}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                panel === "filters" ? "bg-[#4a5df9]" : "bg-black/50"
              }`}
              aria-label="Filters"
            >
              <SlidersHorizontal size={20} />
            </button>

            <button
              onClick={() => togglePanel("songs")}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                selectedSong ? "bg-[#4a5df9]" : "bg-black/50"
              }`}
              aria-label="Add music"
            >
              <Music size={20} />
            </button>
          </div>

          {panel && (
            <div className="absolute right-[64px] top-1/2 -translate-y-1/2 z-30 bg-[#161616] rounded-xl shadow-2xl border border-white/10 max-h-[70vh] overflow-y-auto">
              {panel === "pen-color" && (
                <div className="w-[220px]">
                  <div className="text-white text-xs font-semibold px-3 pt-3">Pen color</div>
                  <ColorPickerRow colors={PEN_SWATCHES} value={penColor} onChange={setPenColor} />
                </div>
              )}

              {panel === "bg-color" && (
                <div className="w-[220px]">
                  <div className="text-white text-xs font-semibold px-3 pt-3">Background color</div>
                  <ColorPickerRow colors={BG_SWATCHES} value={bgColor} onChange={setBgColor} />
                </div>
              )}

              {panel === "text-color" && (
                <div className="w-[220px]">
                  <div className="text-white text-xs font-semibold px-3 pt-3">Text color</div>
                  <ColorPickerRow colors={TEXT_SWATCHES} value={textColor} onChange={applyTextColor} />
                </div>
              )}

              {panel === "font" && (
                <div className="w-[180px] py-2 max-h-[300px] overflow-y-auto">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f}
                      onClick={() => applyFont(f)}
                      style={{ fontFamily: f }}
                      className="w-full flex items-center justify-between px-4 py-2 text-sm text-white hover:bg-white/5"
                    >
                      {f}
                      {textFont === f && <Check size={14} className="text-[#4a5df9] shrink-0" />}
                    </button>
                  ))}
                </div>
              )}

              {panel === "filters" && (
                <div className="w-[160px] py-2">
                  {FILTER_NAMES.map((f) => (
                    <button
                      key={f}
                      onClick={() => setActiveFilter(f)}
                      className="w-full flex items-center justify-between px-4 py-2 text-sm capitalize text-white hover:bg-white/5"
                    >
                      {f}
                      {activeFilter === f && <Check size={14} className="text-[#4a5df9]" />}
                    </button>
                  ))}
                </div>
              )}

              {panel === "songs" && (
                <div className="w-[240px] p-3">
                  <div className="text-white text-xs font-semibold mb-2">Choose a song</div>
                  {songs.length === 0 && (
                    <div className="text-[#888] text-xs py-2">No songs available yet.</div>
                  )}
                  {songs.map((song) => (
                    <div
                      key={song._id}
                      onClick={() => {
                        setSelectedSong(song);
                        setPanel(null);
                      }}
                      className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                        selectedSong?._id === song._id ? "bg-[#4a5df9]/30" : "hover:bg-white/5"
                      }`}
                    >
                      <img
                        src={song.thumbnail || "/images/song-placeholder.png"}
                        alt=""
                        className="w-9 h-9 rounded object-cover shrink-0"
                      />
                      <div className="text-white text-xs min-w-0">
                        <div className="truncate">{song.title}</div>
                        <div className="text-[#888] truncate">{song.artist}</div>
                      </div>
                      {selectedSong?._id === song._id && (
                        <Check size={14} className="text-[#4a5df9] ml-auto shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserStoryPage;