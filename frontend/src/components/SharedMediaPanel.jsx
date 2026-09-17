// components/SharedMediaPanel.jsx
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import { X, Download, ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

const BASE_URL = import.meta.env.VITE_SERVER_URL

const MEDIA_PAGE_SIZE = 24;
// start fetching the next page while the sentinel is still this far below
// the visible area, so scrolling never actually hits an empty patch
const PREFETCH_MARGIN_PX = 300;

// Rewrites a Cloudinary delivery URL to request a small, auto-format,
// auto-quality square thumbnail instead of the full-size original. A grid of
// 1000 originals would be hundreds of MB; the same grid in thumbnails is a
// few MB. Any URL that isn't a Cloudinary /upload/ URL is left untouched.
const toThumbUrl = (url) => {
  if (typeof url !== "string" || !url.includes("/upload/")) return url;
  return url.replace("/upload/", "/upload/c_fill,g_auto,w_300,h_300,q_auto,f_auto/");
};

export default function SharedMediaPanel({ conversationId }) {
  const [media, setMedia] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasError, setHasError] = useState(false);

  // index into `media` of the image currently open full-screen, or null
  const [viewerIndex, setViewerIndex] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // refs mirror state so the fetch + observer callbacks don't need to be
  // rebuilt (and the observer re-attached) on every single render
  const cursorRef = useRef(null);
  const hasMoreRef = useRef(true);
  const isFetchingRef = useRef(false);

  const scrollRef = useRef(null);
  const sentinelRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMoreRef.current || !conversationId) return;

    isFetchingRef.current = true;
    setIsLoadingMore(true);

    try {
      const token = localStorage.getItem("authToken");
      const params = { limit: MEDIA_PAGE_SIZE };
      if (cursorRef.current) params.cursor = cursorRef.current;

      const response = await axios.get(
        `${BASE_URL}/message/${conversationId}/media`,
        { headers: { Authorization: `Bearer ${token}` }, params }
      );

      const { media: page = [], nextCursor, hasMore } = response.data;

      cursorRef.current = nextCursor;
      hasMoreRef.current = !!hasMore;

      if (page.length > 0) {
        // guard against a duplicate page landing twice (double observer
        // fire, StrictMode double-invoke in dev, etc.)
        setMedia((prev) => {
          const seen = new Set(prev.map((item) => item.id));
          const fresh = page.filter((item) => !seen.has(item.id));
          return fresh.length ? [...prev, ...fresh] : prev;
        });
      }

      setHasError(false);
    } catch (error) {
      hasMoreRef.current = false; // stop the observer from retrying in a loop
      setHasError(true);
    } finally {
      isFetchingRef.current = false;
      setIsLoadingMore(false);
      setInitialLoading(false);
    }
  }, [conversationId]);

  // first page
  useEffect(() => {
    cursorRef.current = null;
    hasMoreRef.current = true;
    isFetchingRef.current = false;
    setMedia([]);
    setInitialLoading(true);
    setHasError(false);
    setViewerIndex(null);

    loadMore();
  }, [conversationId, loadMore]);

  // infinite scroll — an IntersectionObserver on a sentinel at the bottom of
  // the grid, scoped to the grid's own scroll container (not the viewport)
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { root, rootMargin: `0px 0px ${PREFETCH_MARGIN_PX}px 0px`, threshold: 0 }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, initialLoading]);

  // ---- full-screen viewer ----

  const closeViewer = useCallback(() => setViewerIndex(null), []);

  const showPrev = useCallback(() => {
    setViewerIndex((prev) => {
      if (prev === null) return prev;
      return (prev - 1 + media.length) % media.length;
    });
  }, [media.length]);

  const showNext = useCallback(() => {
    setViewerIndex((prev) => {
      if (prev === null) return prev;
      return (prev + 1) % media.length;
    });
  }, [media.length]);

  // paging forward through the viewer should keep pulling pages too, so you
  // can walk the whole history with the arrows without touching the grid
  useEffect(() => {
    if (viewerIndex === null) return;
    if (viewerIndex >= media.length - 4) loadMore();
  }, [viewerIndex, media.length, loadMore]);

  // keyboard: Esc closes, arrows navigate
  useEffect(() => {
    if (viewerIndex === null) return;

    const handleKey = (e) => {
      if (e.key === "Escape") closeViewer();
      else if (e.key === "ArrowLeft") showPrev();
      else if (e.key === "ArrowRight") showNext();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [viewerIndex, closeViewer, showPrev, showNext]);

  const handleDownload = async (e) => {
    e.stopPropagation();

    const currentUrl = viewerIndex !== null ? media[viewerIndex]?.url : null;
    if (isDownloading || !currentUrl) return;

    setIsDownloading(true);

    try {
      const response = await fetch(currentUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `image-${media[viewerIndex]?.id || Date.now()}.jpg`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      window.open(currentUrl, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const activeImage = viewerIndex !== null ? media[viewerIndex] : null;

  return (
    <>
      <div
        ref={scrollRef}
        className="max-h-[46vh] overflow-y-auto px-4 py-4 sm:max-h-[52vh]"
      >
        {initialLoading ? (
          // skeleton grid — same shape as the real one, so the sheet doesn't
          // jump in height once the first page lands
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 9 }).map((_, i) => (
              <div
                key={i}
                className="aspect-square animate-pulse rounded-lg"
                style={{ background: "var(--bg-elevated)" }}
              />
            ))}
          </div>
        ) : media.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <ImageOff size={28} style={{ color: "var(--text-muted)" }} />
            <span className="text-sm" style={{ color: "var(--text-muted)" }}>
              {hasError ? "Couldn't load shared media" : "No photos shared yet"}
            </span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              {media.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setViewerIndex(index)}
                  className="group relative aspect-square overflow-hidden rounded-lg"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <img
                    src={toThumbUrl(item.url)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  />
                </button>
              ))}
            </div>

            {/* sentinel — crossing into view triggers the next page */}
            <div ref={sentinelRef} className="h-px w-full" />

            {isLoadingMore && (
              <div className="py-4 text-center text-xs" style={{ color: "var(--text-muted)" }}>
                Loading more...
              </div>
            )}

            {hasError && (
              <div className="py-4 text-center">
                <button
                  type="button"
                  onClick={() => {
                    hasMoreRef.current = true;
                    setHasError(false);
                    loadMore();
                  }}
                  className="text-xs underline"
                  style={{ color: "var(--text-muted)" }}
                >
                  Retry
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {activeImage &&
        createPortal(
          <div
            onClick={closeViewer}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 p-4 sm:p-8"
          >
            <button
              onClick={closeViewer}
              aria-label="Close"
              className="absolute right-4 top-4 z-[121] cursor-pointer text-white transition hover:opacity-70 sm:right-6 sm:top-6"
            >
              <X size={32} />
            </button>

            <button
              onClick={handleDownload}
              disabled={isDownloading}
              aria-label="Download image"
              className="absolute right-16 top-4 z-[121] cursor-pointer text-white transition hover:opacity-70 disabled:cursor-not-allowed disabled:opacity-40 sm:right-20 sm:top-6"
            >
              {isDownloading ? (
                <div className="h-[28px] w-[28px] animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Download size={28} />
              )}
            </button>

            {media.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    showPrev();
                  }}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 z-[121] -translate-y-1/2 cursor-pointer text-white transition hover:opacity-70 sm:left-6"
                >
                  <ChevronLeft size={36} />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    showNext();
                  }}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 z-[121] -translate-y-1/2 cursor-pointer text-white transition hover:opacity-70 sm:right-6"
                >
                  <ChevronRight size={36} />
                </button>

                <div className="absolute bottom-6 left-1/2 z-[121] -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm text-white">
                  {viewerIndex + 1} / {media.length}
                  {hasMoreRef.current ? "+" : ""}
                </div>
              </>
            )}

            {/* full-size original here, not the thumbnail transform */}
            <img
              src={activeImage.url}
              alt="shared media full view"
              onClick={(e) => e.stopPropagation()}
              className="h-auto max-h-full w-auto max-w-full rounded-md object-contain"
            />
          </div>,
          document.body
        )}
    </>
  );
}