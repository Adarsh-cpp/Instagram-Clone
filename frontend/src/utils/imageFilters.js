// utils/imageFilters.js
//
// Single source of truth for the post-image "Filters" + "Adjust" step.
//
// An edit is { filter: "<preset key>", adjust: { brightness, contrast, ... } }.
// It is converted to a list of simple "ops" which are then used in TWO places:
//   1. the live preview  -> turned into a CSS `filter` string
//   2. the final export  -> drawn to a canvas with ctx.filter (same CSS string),
//      or, on browsers without ctx.filter (older Safari), applied per-pixel
//      with an equivalent maths pipeline.
// Because both paths come from the same ops, what you see is what gets posted.
//
// Preset recipes mirror VIDEO_FILTER_CSS in utils/storyFilters.js, so the same
// filter names look the same on posts and stories.

export const IMAGE_FILTERS = [
  { key: "none", label: "Original", ops: [] },
  {
    key: "vintage",
    label: "Vintage",
    ops: [
      { t: "sepia", v: 0.4 },
      { t: "contrast", v: 1.1 },
      { t: "brightness", v: 1.05 },
    ],
  },
  {
    key: "retro",
    label: "Retro",
    ops: [
      { t: "saturate", v: 0.7 },
      { t: "hue", v: 15 },
    ],
  },
  {
    key: "modern",
    label: "Modern",
    ops: [
      { t: "contrast", v: 1.15 },
      { t: "saturate", v: 1.1 },
    ],
  },
  {
    key: "noir",
    label: "Noir",
    ops: [
      { t: "grayscale", v: 1 },
      { t: "contrast", v: 1.2 },
    ],
  },
  {
    key: "warm",
    label: "Warm",
    ops: [
      { t: "hue", v: -10 },
      { t: "brightness", v: 1.03 },
    ],
  },
  { key: "cool", label: "Cool", ops: [{ t: "hue", v: 15 }] },
  {
    key: "dramatic",
    label: "Dramatic",
    ops: [
      { t: "contrast", v: 1.3 },
      { t: "brightness", v: 0.95 },
    ],
  },
  {
    key: "fade",
    label: "Fade",
    ops: [
      { t: "brightness", v: 1.1 },
      { t: "saturate", v: 0.8 },
    ],
  },
];

export const DEFAULT_ADJUST = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  warmth: 0,
  hue: 0,
  vignette: 0,
};

// Slider definitions for the "Adjust" tab.
export const ADJUST_CONTROLS = [
  { key: "brightness", label: "Brightness", min: -100, max: 100, unit: "" },
  { key: "contrast", label: "Contrast", min: -100, max: 100, unit: "" },
  { key: "saturation", label: "Saturation", min: -100, max: 100, unit: "" },
  { key: "warmth", label: "Warmth", min: 0, max: 100, unit: "" },
  { key: "hue", label: "Hue", min: -180, max: 180, unit: "°" },
  { key: "vignette", label: "Vignette", min: 0, max: 100, unit: "" },
];

export const defaultEdit = () => ({ filter: "none", adjust: { ...DEFAULT_ADJUST } });

export const isIdentityEdit = (edit) =>
  !edit ||
  (edit.filter === "none" &&
    Object.keys(DEFAULT_ADJUST).every((k) => (edit.adjust?.[k] ?? 0) === 0));

// Preset ops first, then the manual adjustments on top.
export const buildOps = (edit) => {
  if (!edit) return [];
  const preset = IMAGE_FILTERS.find((f) => f.key === edit.filter);
  const ops = preset ? [...preset.ops] : [];
  const a = { ...DEFAULT_ADJUST, ...(edit.adjust || {}) };

  if (a.brightness !== 0) ops.push({ t: "brightness", v: 1 + a.brightness / 200 }); // 0.5 .. 1.5
  if (a.contrast !== 0) ops.push({ t: "contrast", v: 1 + a.contrast / 200 }); // 0.5 .. 1.5
  if (a.saturation !== 0) ops.push({ t: "saturate", v: 1 + a.saturation / 100 }); // 0 .. 2
  if (a.warmth !== 0) ops.push({ t: "sepia", v: (a.warmth / 100) * 0.6 }); // 0 .. 0.6
  if (a.hue !== 0) ops.push({ t: "hue", v: a.hue });
  return ops;
};

const CSS_NAME = {
  brightness: "brightness",
  contrast: "contrast",
  saturate: "saturate",
  sepia: "sepia",
  grayscale: "grayscale",
  hue: "hue-rotate",
};

export const opsToCss = (ops) =>
  ops
    .map((op) =>
      op.t === "hue"
        ? `hue-rotate(${op.v.toFixed(2)}deg)`
        : `${CSS_NAME[op.t]}(${op.v.toFixed(3)})`
    )
    .join(" ");

export const editToCss = (edit) => opsToCss(buildOps(edit)) || "none";

// 0 .. 0.85 darkness at the corners
export const vignetteAlpha = (edit) => ((edit?.adjust?.vignette ?? 0) / 100) * 0.85;

// CSS background used for the preview overlay (matches what the canvas draws)
export const vignetteCss = (edit) => {
  const a = vignetteAlpha(edit);
  return a > 0
    ? `radial-gradient(ellipse farthest-corner at center, rgba(0,0,0,0) 45%, rgba(0,0,0,${a.toFixed(3)}) 100%)`
    : "none";
};

/* ------------------------------------------------------------------ */
/*  Export                                                             */
/* ------------------------------------------------------------------ */

const SUPPORTS_CTX_FILTER = (() => {
  try {
    const ctx = document.createElement("canvas").getContext("2d");
    return typeof ctx.filter === "string";
  } catch (e) {
    return false;
  }
})();

const loadImage = (url) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = url;
  });

// 3x3 colour matrices from the CSS Filter Effects spec
const matrixFor = (op) => {
  if (op.t === "saturate") {
    const s = op.v;
    return [
      0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s,
      0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s,
    ];
  }
  if (op.t === "grayscale") {
    const a = 1 - Math.min(1, Math.max(0, op.v));
    return [
      0.2126 + 0.7874 * a, 0.7152 - 0.7152 * a, 0.0722 - 0.0722 * a,
      0.2126 - 0.2126 * a, 0.7152 + 0.2848 * a, 0.0722 - 0.0722 * a,
      0.2126 - 0.2126 * a, 0.7152 - 0.7152 * a, 0.0722 + 0.9278 * a,
    ];
  }
  if (op.t === "sepia") {
    const a = 1 - Math.min(1, Math.max(0, op.v));
    return [
      0.393 + 0.607 * a, 0.769 - 0.769 * a, 0.189 - 0.189 * a,
      0.349 - 0.349 * a, 0.686 + 0.314 * a, 0.168 - 0.168 * a,
      0.272 - 0.272 * a, 0.534 - 0.534 * a, 0.131 + 0.869 * a,
    ];
  }
  if (op.t === "hue") {
    const r = (op.v * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    return [
      0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
    ];
  }
  return null;
};

const clamp255 = (n) => (n < 0 ? 0 : n > 255 ? 255 : n);

// Fallback for browsers without CanvasRenderingContext2D.filter
const applyOpsToImageData = (imageData, ops) => {
  const compiled = ops.map((op) =>
    op.t === "brightness" || op.t === "contrast"
      ? { k: op.t, v: op.v }
      : { k: "m", m: matrixFor(op) }
  );
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i];
    let g = d[i + 1];
    let b = d[i + 2];
    for (let j = 0; j < compiled.length; j++) {
      const c = compiled[j];
      if (c.k === "brightness") {
        r *= c.v; g *= c.v; b *= c.v;
      } else if (c.k === "contrast") {
        r = (r - 128) * c.v + 128;
        g = (g - 128) * c.v + 128;
        b = (b - 128) * c.v + 128;
      } else if (c.m) {
        const m = c.m;
        const nr = m[0] * r + m[1] * g + m[2] * b;
        const ng = m[3] * r + m[4] * g + m[5] * b;
        const nb = m[6] * r + m[7] * g + m[8] * b;
        r = nr; g = ng; b = nb;
      }
      r = clamp255(r); g = clamp255(g); b = clamp255(b);
    }
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
  return imageData;
};

/**
 * Renders `url` with `edit` baked in and resolves with a JPEG Blob.
 * The image keeps its own pixel size (capped at maxSide on the longest edge).
 */
export const renderEditedBlob = async (url, edit, { quality = 0.92, maxSide = 4096 } = {}) => {
  const img = await loadImage(url);
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  const scale = Math.min(1, maxSide / Math.max(nw, nh));
  const w = Math.max(1, Math.round(nw * scale));
  const h = Math.max(1, Math.round(nh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");

  const ops = buildOps(edit);

  if (ops.length && SUPPORTS_CTX_FILTER) {
    ctx.filter = opsToCss(ops);
    ctx.drawImage(img, 0, 0, w, h);
    ctx.filter = "none";
  } else {
    ctx.drawImage(img, 0, 0, w, h);
    if (ops.length) {
      const data = ctx.getImageData(0, 0, w, h);
      ctx.putImageData(applyOpsToImageData(data, ops), 0, 0);
    }
  }

  const va = vignetteAlpha(edit);
  if (va > 0) {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    // farthest-corner ellipse, same shape as the CSS preview overlay
    ctx.scale((w / 2) * Math.SQRT2, (h / 2) * Math.SQRT2);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.45, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${va})`);
    ctx.fillStyle = grad;
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))),
      "image/jpeg",
      quality
    );
  });
};
