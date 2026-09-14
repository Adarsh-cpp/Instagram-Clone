import React, { useState, useEffect } from "react";
import Cropper from "react-easy-crop";
import { ChevronLeft, ChevronRight, ArrowLeft, Crop, ZoomIn } from "lucide-react";
import getCroppedImg, { getDefaultCroppedArea } from "../utils/cropImage";

const ASPECT_OPTIONS = [
  { label: "1 : 1", value: 1, key: "1:1" },
  { label: "16 : 9", value: 16 / 9, key: "16:9" },
  { label: "4 : 5", value: 4 / 5, key: "4:5" },
];

const CropImagePage = ({
  images,
  setEditedImages,
  setAspectRatio,
  next,
  back,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [aspect, setAspect] = useState(1);
  const [imageUrls, setImageUrls] = useState([]);
  const [slides, setSlides] = useState(() =>
    images.map(() => ({ crop: { x: 0, y: 0 }, zoom: 1, croppedAreaPixels: null }))
  );
  const [showAspectMenu, setShowAspectMenu] = useState(false);
  const [showZoomSlider, setShowZoomSlider] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const urls = images.map((file) => URL.createObjectURL(file));
    setImageUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [images]);

  const hasMultiple = images.length > 1;
  const activeSlide = slides[activeIndex];

  const updateActiveSlide = (patch) => {
    setSlides((prev) => {
      const updated = [...prev];
      updated[activeIndex] = { ...updated[activeIndex], ...patch };
      return updated;
    });
  };

  const onCropChange = (crop) => updateActiveSlide({ crop });
  const onZoomChange = (zoom) => updateActiveSlide({ zoom });
  const onCropComplete = (_, croppedAreaPixels) => updateActiveSlide({ croppedAreaPixels });

  const selectAspect = (opt) => {
    setAspect(opt.value);
    setAspectRatio(opt.key);
    setShowAspectMenu(false);
  };

  const handleNext = async () => {
    try {
      setIsSaving(true);

      const cropped = await Promise.all(
        images.map(async (_, i) => {
          const area = slides[i]?.croppedAreaPixels
            ?? (await getDefaultCroppedArea(imageUrls[i], aspect));
          return getCroppedImg(imageUrls[i], area);
        })
      );

      setEditedImages(cropped);
      next();
    } catch (err) {
      console.log(err);
    } finally {
      setIsSaving(false);
    }
  };

  const menuBottom = hasMultiple ? "bottom-[111px]" : "bottom-[55px]";

  return (
    <div className="w-[100vw] h-[100vh] flex justify-center items-center bg-[var(--bg-app)]">
      <div className="cropContainerOverlay w-full h-full flex justify-center items-center bg-[rgba(0,0,0,0)] px-2 sm:px-4">
        <div className="cropContainer relative w-full max-w-[500px] md:w-[70%] lg:w-[50%] xl:w-[30%] h-[70%] rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-container)] shadow-xl overflow-hidden">
          {/* Header */}
          <div className="header w-full h-[40px] px-3 sm:px-4 flex justify-between items-center bg-[var(--bg-app)] border-b border-[var(--border-soft)]">
            <div onClick={back} className="back cursor-pointer">
              <ArrowLeft size={24} color="var(--text-primary)" />
            </div>

            <div className="heading text-[var(--text-primary)] text-[16px] sm:text-[18px] font-semibold">
              {hasMultiple ? `Crop  ${activeIndex + 1}/${images?.length}` : "Crop"}
            </div>

            <div
              onClick={isSaving ? undefined : handleNext}
              className={`next text-[var(--accent-blue)] hover:text-[var(--accent-blue-hover)] hover:underline cursor-pointer text-sm sm:text-base ${
                isSaving ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              Next
            </div>
          </div>

          {/* Crop Area */}
          <div className="relative w-full h-[calc(100%-40px)] overflow-hidden bg-[var(--bg-elevated)]">
            {imageUrls[activeIndex] && (
              <Cropper
                image={imageUrls[activeIndex]}
                crop={activeSlide.crop}
                zoom={activeSlide.zoom}
                aspect={aspect}
                onCropChange={onCropChange}
                onZoomChange={onZoomChange}
                onCropComplete={onCropComplete}
              />
            )}

            {hasMultiple && activeIndex > 0 && (
              <div
                onClick={() => setActiveIndex((i) => i - 1)}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10"
              >
                <ChevronLeft size={18} color="white" />
              </div>
            )}
            {hasMultiple && activeIndex < images?.length - 1 && (
              <div
                onClick={() => setActiveIndex((i) => i + 1)}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center cursor-pointer z-10"
              >
                <ChevronRight size={18} color="white" />
              </div>
            )}

            {/* Aspect Ratio Menu */}
            {showAspectMenu && (
              <div className={`absolute ${menuBottom} left-3 bg-[var(--bg-menu)] rounded-lg overflow-hidden z-50 min-w-[100px]`}>
                {ASPECT_OPTIONS.map((opt) => (
                  <div
                    key={opt.key}
                    onClick={() => selectAspect(opt)}
                    className="px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--bg-menu-hover)] cursor-pointer text-sm"
                  >
                    {opt?.label}
                  </div>
                ))}
              </div>
            )}

            {/* Zoom Slider */}
            {showZoomSlider && (
              <div
                className={`instagram-slider absolute ${menuBottom} left-[60px] sm:left-[70px] bg-[var(--bg-menu)] rounded-lg p-3 z-50 max-w-[calc(100%-80px)]`}
              >
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={activeSlide.zoom}
                  onChange={(e) => onZoomChange(Number(e.target.value))}
                />
              </div>
            )}
          </div>

          {/* Filmstrip */}
          {hasMultiple && (
            <div className="absolute bottom-[40px] w-full h-[56px] bg-[var(--bg-app)] flex items-center gap-2 px-2 overflow-x-auto z-20">
              {imageUrls.map((url, i) => (
                <div
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`flex-shrink-0 w-[40px] h-[40px] rounded-md overflow-hidden cursor-pointer border-2 ${
                    i === activeIndex ? "border-[var(--accent-blue)]" : "border-transparent"
                  }`}
                >
                  <img src={url} className="w-full h-full object-cover" alt="" />
                </div>
              ))}
            </div>
          )}

          {/* Bottom Toolbar */}
          <div className="absolute bottom-0 w-full h-[40px] flex z-20">
            <div className="left w-[50%] h-full px-2 flex gap-2 items-center">
              <div
                onClick={() => setShowAspectMenu(!showAspectMenu)}
                className="crop w-[34px] h-[34px] rounded-full flex justify-center items-center bg-[rgba(0,0,0,0.6)] cursor-pointer flex-shrink-0"
              >
                <Crop size={18} color="white" />
              </div>

              <div
                onClick={() => setShowZoomSlider(!showZoomSlider)}
                className="magnify w-[34px] h-[34px] rounded-full flex justify-center items-center bg-[rgba(0,0,0,0.6)] cursor-pointer flex-shrink-0"
              >
                <ZoomIn size={18} color="white" />
              </div>
            </div>

            <div className="right w-[50%] h-full px-2 flex justify-end items-center" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CropImagePage;