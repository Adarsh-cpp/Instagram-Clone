// utils/storyFilters.js
import { fabric } from "fabric"; // v5 syntax — matches your installed fabric@5.3.0

export const getImageFilterPreset = (name) => {
  const presets = {
    none: [],
    vintage: [
      new fabric.Image.filters.Sepia(),
      new fabric.Image.filters.Contrast({ contrast: 0.1 }),
      new fabric.Image.filters.Brightness({ brightness: 0.05 }),
    ],
    retro: [
      new fabric.Image.filters.Saturation({ saturation: -0.3 }),
      new fabric.Image.filters.HueRotation({ rotation: 0.05 }),
    ],
    modern: [
      new fabric.Image.filters.Contrast({ contrast: 0.15 }),
      new fabric.Image.filters.Saturation({ saturation: 0.1 }),
    ],
    noir: [
      new fabric.Image.filters.Grayscale(),
      new fabric.Image.filters.Contrast({ contrast: 0.2 }),
    ],
    warm: [
      new fabric.Image.filters.HueRotation({ rotation: -0.05 }),
      new fabric.Image.filters.Brightness({ brightness: 0.03 }),
    ],
    cool: [new fabric.Image.filters.HueRotation({ rotation: 0.08 })],
    dramatic: [
      new fabric.Image.filters.Contrast({ contrast: 0.3 }),
      new fabric.Image.filters.Brightness({ brightness: -0.05 }),
    ],
    fade: [
      new fabric.Image.filters.Brightness({ brightness: 0.1 }),
      new fabric.Image.filters.Saturation({ saturation: -0.2 }),
    ],
  };
  return presets[name] || [];
};

export const VIDEO_FILTER_CSS = {
  none: "none",
  vintage: "sepia(0.4) contrast(1.1) brightness(1.05)",
  retro: "saturate(0.7) hue-rotate(15deg)",
  modern: "contrast(1.15) saturate(1.1)",
  noir: "grayscale(1) contrast(1.2)",
  warm: "hue-rotate(-10deg) brightness(1.03)",
  cool: "hue-rotate(15deg)",
  dramatic: "contrast(1.3) brightness(0.95)",
  fade: "brightness(1.1) saturate(0.8)",
};

export const FILTER_NAMES = [
  "none", "vintage", "retro", "modern", "noir", "warm", "cool", "dramatic", "fade",
];