// StoryViewerPage.jsx
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  X, ChevronLeft, ChevronRight, Volume2, VolumeX,
  Heart, Send, MoreHorizontal, Eye, Trash2, Layers,
} from "lucide-react";
import { toast } from "react-toastify";
import axiosInstance from "../utils/axiosInstance";
import { useAuth } from "../context/AuthContext";
import ShareOverlay from "../components/ShareOverlay"; // adjust path if your folder layout differs
import HighlightPickerSheet from "../components/HighlightPickerSheet";

// Matches the backend's DEFAULT_IMAGE_DURATION in story.controller.js —
// only used as a fallback if a story somehow has no `duration` at all.
const DEFAULT_IMAGE_SECONDS = 6;
const HOLD_THRESHOLD_MS = 200;
const DOUBLE_TAP_MS = 300;
const DEFAULT_AVATAR = "/images/default-profile-pic.jpg";
// Fallback only — used if a story's `duration` field is somehow missing
// (e.g. a legacy story created before duration was made song-aware). Every
// story created going forward carries its own correct duration: the chosen
// song-clip length when a song is attached, or the media's own length
// otherwise. Previously this was a fixed 15s ALWAYS used for the audio
// loop, regardless of what the story's actual duration was — that's the
// bug that made the song keep playing after a short image's progress bar
// had already finished.
const FALLBACK_CLIP_SECONDS = 15;

// ---- carousel geometry ----
const CARD_WIDTH = 300;   // px, base width before scale is applied
const CARD_HEIGHT = "80vh";
const SLOT_GAP = 190;     // px between adjacent slot centers
const VISIBLE_RADIUS = 2; // how many slots each side are actually visible
const MOUNT_RADIUS = 3;   // how many slots each side are mounted (extra ring for smooth entry)

const CARD_SCALE_BY_DIST = { 0: 1, 1: 0.82, 2: 0.6, 3: 0.45 };
const CARD_OPACITY_BY_DIST = { 0: 1, 1: 0.85, 2: 0.45, 3: 0 };
const CARD_Z_BY_DIST = { 0: 20, 1: 15, 2: 10, 3: 5 };

const StoryViewerPage = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const { userId } = useParams();
  const [accounts, setAccounts] = useState(location.state?.feed || []);
  const [accountIndex, setAccountIndex] = useState(location.state?.startIndex || 0);
  const [storyIndex, setStoryIndex] = useState(0);
  // Always start in a loading state, even though `feed` is usually already
  // passed via location.state. We still need to resolve the CORRECT
  // accountIndex for the clicked profile before anything is allowed to
  // render or re-sync the URL — see the guard in the effect below for why.
  const [loading, setLoading] = useState(true);

  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  // Whether the CURRENT story's own media (the image or video the user is
  // actually looking at) has finished loading enough to display. The
  // progress timer and the story's song are both gated on this — without
  // it, the timer/song used to start counting the instant the story
  // became "current", even while the image/video was still downloading,
  // so a slow-loading story would silently burn through its duration (and
  // its song) before the user ever saw it.
  const [mediaReady, setMediaReady] = useState(false);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [likedMap, setLikedMap] = useState({});
  const [likesCountMap, setLikesCountMap] = useState({});
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetLoading, setSheetLoading] = useState(false);
  const [sheetData, setSheetData] = useState({ viewers: [], likes: [] });
  const [sheetTab, setSheetTab] = useState("viewers");
  const [moreOpen, setMoreOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [highlightSheetOpen, setHighlightSheetOpen] = useState(false);
  const [burst, setBurst] = useState(null); // { x, y, key }

  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const playingRef = useRef(true);
  const mediaReadyRef = useRef(false);
  const holdTimerRef = useRef(null);
  const wasHeldRef = useRef(false);
  const markedViewedRef = useRef(new Set());
  const advanceRef = useRef(() => {});
  const retreatRef = useRef(() => {});
  const replyInputRef = useRef(null);
  const lastTapRef = useRef({ time: 0, side: null });
  const singleTapTimerRef = useRef(null);

  playingRef.current = playing;
  mediaReadyRef.current = mediaReady;

  useEffect(() => {
    const resolveAccounts = async () => {
      let combined = accounts;

      if (combined.length === 0) {
        try {
          const res = await axiosInstance.get("/story/feed");
          const groups = res.data.feed || [];
          const mine = groups.find((g) => g.author._id === user?._id);
          const others = groups.filter((g) => g.author._id !== user?._id);
          combined = mine && mine.stories.length > 0 ? [mine, ...others] : others;
          setAccounts(combined);
        } catch (err) {
          toast.error("Failed to load stories");
          navigate(-1);
          return;
        }
      }

      const idx = combined.findIndex((g) => g.author._id === userId);
      if (idx === -1) {
        toast.error("This story is no longer available");
        navigate(-1);
        return;
      }
      setAccountIndex(idx);
      setLoading(false);
    };
    resolveAccounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    // Don't try to resync the URL to accountIndex while we're still
    // resolving which index the clicked profile actually lives at.
    // Without this guard, this effect fires on mount with the stale
    // default accountIndex (0 — your own story) BEFORE the resolveAccounts
    // effect above has a chance to correct it, forcing a redirect back to
    // your own profile every time regardless of which story was clicked.
    if (loading) return;
    if (currentAccount && currentAccount.author._id !== userId) {
      navigate(`/story/view/${currentAccount.author._id}`, { replace: true, state: { feed: accounts } });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex]);


  const currentAccount = accounts[accountIndex];
  const currentStory = currentAccount?.stories?.[storyIndex];
  const isOwnAccount = currentAccount?.author?._id === user?._id;
  const currentSong = currentStory?.song?.songId || null;

  // init liked/likesCount maps once we have data
  useEffect(() => {
    if (accounts.length === 0) return;
    const lm = {};
    const lc = {};
    accounts.forEach((acc) =>
      acc.stories.forEach((s) => {
        lm[s._id] = (s.likes || []).some((l) => l.user === user?._id);
        lc[s._id] = (s.likes || []).length;
      })
    );
    setLikedMap(lm);
    setLikesCountMap(lc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accounts.length]);

  // clear any in-progress reply draft whenever the active story changes,
  // so text typed for one story never accidentally gets sent to the next
  useEffect(() => {
    setReply("");
    return () => clearTimeout(singleTapTimerRef.current);
  }, [accountIndex, storyIndex]);

  // Reset the "is this story's media ready?" flag every time the active
  // story changes, so the timer/song gate below starts closed again for
  // the new image/video. Guarded on `loading` (and re-run once it flips
  // to false) for the same reason as every other story-lifecycle effect
  // in this file — see the big comment on the song-loading effect further
  // down for the full explanation of that race.
  useEffect(() => {
    if (loading) return;
    setMediaReady(false);
  }, [accountIndex, storyIndex, loading]);

  // ---- within-account story navigation ----
  // NOTE: these no longer fall through to the adjacent account. Per spec,
  // only the chevrons (handleNextAccount/handlePrevAccount) cross accounts.
  const handleNextStory = () => {
    const acc = accounts[accountIndex];
    if (!acc) return;
    if (storyIndex < acc.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    }
    // else: last story of this account — freeze here, wait for chevron
  };

  const handlePrevStory = () => {
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    }
    // else: first story of this account — do nothing, wait for chevron
  };

  // chevrons — the ONLY way to move between accounts. Always lands on
  // that account's first story.
  const handleNextAccount = () => {
    if (accountIndex < accounts.length - 1) {
      setAccountIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      navigate(-1); // ran out of accounts
    }
  };

  const handlePrevAccount = () => {
    if (accountIndex > 0) {
      setAccountIndex((i) => i - 1);
      setStoryIndex(0);
    }
  };

  // direct jump — used when clicking a side-preview card in the carousel
  const jumpToAccount = (idx) => {
    if (idx < 0 || idx >= accounts.length || idx === accountIndex) return;
    setAccountIndex(idx);
    setStoryIndex(0);
  };

  advanceRef.current = handleNextStory;
  retreatRef.current = handlePrevStory;

  // ---- mark as viewed (skip for own stories) ----
  useEffect(() => {
    if (loading) return;
    if (!currentStory || isOwnAccount) return;
    if (markedViewedRef.current.has(currentStory._id)) return;
    markedViewedRef.current.add(currentStory._id);
    axiosInstance.post(`/story/${currentStory._id}/view`).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStory?._id, loading]);

  // ---- progress: image timer ----
  // `elapsed` only accumulates once BOTH the story is "playing" and its
  // media has actually finished loading (mediaReadyRef) — otherwise a
  // slow-loading image would burn through its whole duration (and the
  // attached song, further down) before it was even visible.
  useEffect(() => {
    if (loading) return;
    if (!currentStory || currentStory.mediaType === "video") return;
    setProgress(0);
    const durationMs = (currentStory.duration || DEFAULT_IMAGE_SECONDS) * 1000;
    let raf;
    let elapsed = 0;
    let last = performance.now();

    const tick = (now) => {
      if (playingRef.current && mediaReadyRef.current) elapsed += now - last;
      last = now;
      const pct = Math.min(100, (elapsed / durationMs) * 100);
      setProgress(pct);
      if (pct >= 100) {
        advanceRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [accountIndex, storyIndex, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- progress: video ----
  // Playback itself is kicked off from the video's onCanPlay handler (see
  // JSX + handleVideoCanPlay below) rather than immediately here, so the
  // video only actually starts once it's buffered enough to play smoothly.
  useEffect(() => {
    if (loading) return;
    if (!currentStory || currentStory.mediaType !== "video") return;
    setProgress(0);
    const video = videoRef.current;
    if (!video) return;

    const onTimeUpdate = () => {
      if (!video.duration) return;
      setProgress((video.currentTime / video.duration) * 100);
    };
    const onEnded = () => advanceRef.current();

    video.addEventListener("timeupdate", onTimeUpdate);
    video.addEventListener("ended", onEnded);
    video.currentTime = 0;

    return () => {
      video.removeEventListener("timeupdate", onTimeUpdate);
      video.removeEventListener("ended", onEnded);
    };
  }, [accountIndex, storyIndex, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const video = videoRef.current;
    if (!video || currentStory?.mediaType !== "video") return;
    if (playing && mediaReady) video.play().catch(() => {});
    else video.pause();
  }, [playing, mediaReady, currentStory?.mediaType]);

  // Fired once the video has buffered enough to actually play. This is
  // what starts video playback for a freshly-opened story, and it's also
  // what flips mediaReady — which in turn is what allows the progress
  // timer (video uses its own timeupdate, so this mostly matters for the
  // song below) and the story's song to start.
  const handleVideoCanPlay = () => {
    setMediaReady(true);
    const video = videoRef.current;
    if (video && playingRef.current) {
      video.play().catch(() => {});
    }
  };

  // Fired once the story's image has fully loaded (or failed to — we
  // still flip mediaReady on error so a broken image doesn't leave the
  // story stuck on a spinner forever).
  const handleImageLoad = () => setMediaReady(true);
  const handleImageError = () => setMediaReady(true);

  // ---- story song: load the selected track, seek to the saved clip start,
  // and attempt playback. The loadedmetadata listener matters for remote
  // Jamendo/Cloudinary audio because duration/seek state may not be ready
  // when the effect first runs.
  //
  // Guarded on `loading`, and with `loading` in the dependency array,
  // because of a real race: on the very first story a user opens, this
  // component renders once with `loading` still true (it returns `null`
  // near the bottom while resolving which account index to land on), so
  // the <audio> element hasn't actually mounted yet and audioRef.current
  // is null. That render still runs this effect (hooks always run,
  // return value or not) — it just does nothing because of the `!audio`
  // check. Once resolving finishes and `loading` flips to false, the real
  // <audio> element mounts — but if accountIndex/storyIndex/currentSong
  // happened to be identical across both renders (typical when opening
  // the very first story in the list), this effect's dependency array
  // hadn't changed and it would never fire again — which is exactly why
  // the song used to stay silent until navigating to another story and
  // back (a dependency change that forced a re-run against the
  // now-mounted audio element). Including `loading` fixes that directly.
  useEffect(() => {
    if (loading) return;
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    const start = Math.max(0, Number(currentStory?.song?.startTime) || 0);

    const startPlayback = () => {
      audio.muted = muted;
      try {
        audio.currentTime = start;
      } catch (_) {
        // The media may not be seekable yet; loadedmetadata can run again.
      }

      // Only actually start playback if the story's own image/video is
      // also ready — otherwise this just cues the track up (seeks it to
      // the right spot) and leaves it paused; the mediaReady-triggered
      // effect below picks up playback once the visible media catches up.
      if (playingRef.current && mediaReadyRef.current) {
        audio.play().catch(() => {
          // Browsers can block unmuted autoplay. A user interaction inside
          // the story viewer retries playback through ensureAudioPlayback().
        });
      }
    };

    if (audio.readyState >= 1) {
      startPlayback();
    } else {
      audio.addEventListener("loadedmetadata", startPlayback, { once: true });
      audio.load();
    }

    return () => {
      audio.removeEventListener("loadedmetadata", startPlayback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex, storyIndex, currentSong?._id, loading]);

  // ---- story song: start it once the visible media becomes ready ----
  // Covers the case where the song finished loading/cueing (above) before
  // the image/video did — startPlayback deliberately skipped the actual
  // .play() call in that case, so this picks it back up the moment
  // mediaReady flips true.
  useEffect(() => {
    if (loading || !mediaReady) return;
    const audio = audioRef.current;
    if (!audio || !currentSong) return;
    if (playingRef.current && audio.paused) {
      audio.muted = muted;
      audio.play().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaReady, loading, currentSong?._id]);

  // ---- story song: mirror play/pause with the rest of the story ----
  useEffect(() => {
    if (loading) return;
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    audio.muted = muted;

    if (playing && mediaReady) {
      audio.play().catch(() => {
        // If unmuted autoplay was blocked, the next user interaction retries it.
      });
    } else {
      audio.pause();
    }
  }, [playing, muted, mediaReady, currentSong?._id, loading]);

  // ---- story song: loop just the saved clip window (songStartTime to
  // songStartTime + clip length). The clip length now comes straight from
  // the story's own `duration` field — which, for any story with a song
  // attached, IS the chosen clip length (see story.controller.js). This
  // replaces the old fixed 15s, which is why the song used to keep
  // playing well past a short image's progress bar finishing. ----
  useEffect(() => {
    if (loading) return;
    const audio = audioRef.current;
    if (!audio || !currentSong) return;

    const start = Math.max(0, Number(currentStory?.song?.startTime) || 0);
    const clipSeconds = currentStory?.duration || FALLBACK_CLIP_SECONDS;

    const handleTimeUpdate = () => {
      if (audio.currentTime >= start + clipSeconds) {
        try {
          audio.currentTime = start;
        } catch (_) {}

        if (playingRef.current) {
          audio.play().catch(() => {});
        }
      }
    };

    audio.addEventListener("timeupdate", handleTimeUpdate);
    return () => audio.removeEventListener("timeupdate", handleTimeUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIndex, storyIndex, currentSong?._id, currentStory?.duration, loading]);

  // ---- story song: keep muted state in sync ----
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.muted = muted;
  }, [muted]);

  // A real user gesture is allowed to start unmuted media in browsers.
  // Story navigation/tapping is therefore also used as a safe retry point
  // when the browser rejected the initial autoplay attempt.
  const ensureAudioPlayback = () => {
    const audio = audioRef.current;
    if (!audio || !currentSong || !playingRef.current || !mediaReadyRef.current) return;

    audio.muted = muted;
    audio.play().catch(() => {});
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // ---- like ----
  const handleLikeToggle = async () => {
    if (!currentStory) return;
    try {
      const res = await axiosInstance.post(`/story/${currentStory._id}/like`);
      setLikedMap((m) => ({ ...m, [currentStory._id]: res.data.liked }));
      setLikesCountMap((m) => ({ ...m, [currentStory._id]: res.data.likesCount }));
    } catch (err) {
      toast.error("Couldn't update like");
    }
  };

  // ---- double-tap to like (mirrors the small heart button, but always
  // "likes" rather than toggling — matches standard double-tap UX) ----
  const triggerDoubleTapLike = (e) => {
    if (isOwnAccount || !currentStory) return;

    const rect = e.currentTarget.parentElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const key = Date.now();
    setBurst({ x, y, key });
    setTimeout(() => {
      setBurst((b) => (b?.key === key ? null : b));
    }, 800);

    if (!likedMap[currentStory._id]) {
      handleLikeToggle();
    }
  };

  // ---- viewers/likes sheet (owner only) ----
  const openSheet = async () => {
    if (!currentStory) return;
    setSheetOpen(true);
    setSheetTab("viewers");
    setSheetLoading(true);
    setPlaying(false);
    try {
      const [vRes, lRes] = await Promise.all([
        axiosInstance.get(`/story/${currentStory._id}/viewers`),
        axiosInstance.get(`/story/${currentStory._id}/likes`),
      ]);
      setSheetData({ viewers: vRes.data.viewers, likes: lRes.data.likes });
    } catch (err) {
      toast.error("Could not load story stats");
    } finally {
      setSheetLoading(false);
    }
  };
  const closeSheet = () => {
    setSheetOpen(false);
    setPlaying(true);
  };

  // ---- share (non-owner only) ----
  const openShare = () => {
    if (!currentStory) return;
    setShareOpen(true);
    setPlaying(false);
  };
  const closeShare = () => {
    setShareOpen(false);
    setPlaying(true);
  };

  // ---- add to highlight (owner only) ----
  const openHighlightSheet = () => {
    if (!currentStory) return;
    setHighlightSheetOpen(true);
    setPlaying(false);
  };
  const closeHighlightSheet = () => {
    setHighlightSheetOpen(false);
    setPlaying(true);
  };

  // ---- reply to story (non-owner only) ----
  // Sends a chat message to the story author with a `repliedStory` snapshot
  // attached, so it renders in the DM thread as "Replied to your story"
  // followed by the text, with the story's cover pic as a thumbnail.
  const handleReplySend = async () => {
    const text = reply.trim();
    if (!text || !currentStory || isOwnAccount || sendingReply) return;

    setSendingReply(true);
    try {
      await axiosInstance.post(`/story/${currentStory._id}/reply`, { message: text });
      setReply("");
      toast.success("Reply sent");
    } catch (err) {
      toast.error("Couldn't send reply");
    } finally {
      setSendingReply(false);
      setPlaying(true);
      replyInputRef.current?.blur();
    }
  };

  // ---- delete (owner only) ----
  const handleDelete = async () => {
    if (!currentStory) return;
    try {
      await axiosInstance.delete(`/story/${currentStory._id}`);
      toast.success("Story deleted");
      setMoreOpen(false);
      // remove locally and move on
      setAccounts((prev) => {
        const copy = [...prev];
        const acc = { ...copy[accountIndex] };
        acc.stories = acc.stories.filter((s) => s._id !== currentStory._id);
        copy[accountIndex] = acc;
        if (acc.stories.length === 0) {
          copy.splice(accountIndex, 1);
          if (copy.length === 0) {
            navigate(-1);
          } else if (accountIndex >= copy.length) {
            setAccountIndex(copy.length - 1);
            setStoryIndex(0);
          }
        } else if (storyIndex >= acc.stories.length) {
          setStoryIndex(acc.stories.length - 1);
        }
        return copy;
      });
    } catch (err) {
      toast.error("Failed to delete story");
    }
  };

  // ---- tap-to-navigate (within account only) / hold-to-pause / double-tap-to-like ----
  const onPointerDown = () => {
    // Retry unmuted story audio from a genuine user interaction if the
    // browser blocked the initial autoplay attempt.
    ensureAudioPlayback();

    wasHeldRef.current = false;
    holdTimerRef.current = setTimeout(() => {
      wasHeldRef.current = true;
      setPlaying(false);
    }, HOLD_THRESHOLD_MS);
  };
  const onPointerUp = (side, e) => {
    clearTimeout(holdTimerRef.current);
    if (wasHeldRef.current) {
      setPlaying(true);
      return;
    }

    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current.time < DOUBLE_TAP_MS;

    if (isDoubleTap) {
      clearTimeout(singleTapTimerRef.current);
      lastTapRef.current = { time: 0, side: null };
      triggerDoubleTapLike(e);
      return;
    }

    lastTapRef.current = { time: now, side };
    singleTapTimerRef.current = setTimeout(() => {
      if (side === "left") retreatRef.current();
      else advanceRef.current();
    }, DOUBLE_TAP_MS);
  };

  if (loading || !currentAccount || !currentStory) return null;

  const liked = likedMap[currentStory._id];
  const likesCount = likesCountMap[currentStory._id] || 0;
  const viewsCount = currentStory.viewers?.length || 0;
  const hasReplyDraft = reply.trim().length > 0;

  // ---- build the carousel slot list ----
  const slots = [];
  for (let d = -MOUNT_RADIUS; d <= MOUNT_RADIUS; d++) {
    const idx = accountIndex + d;
    if (idx < 0 || idx >= accounts.length) continue;
    slots.push({ dist: Math.abs(d), idx, isCenter: d === 0 });
  }

  const cardStyle = (dist, d) => {
    const clampedDist = Math.min(dist, 3);
    const scale = CARD_SCALE_BY_DIST[clampedDist];
    const opacity = CARD_OPACITY_BY_DIST[clampedDist];
    return {
      position: "absolute",
      top: "50%",
      left: "50%",
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      transform: `translate(-50%, -50%) translateX(${d * SLOT_GAP}px) scale(${scale})`,
      opacity,
      zIndex: CARD_Z_BY_DIST[clampedDist],
      transition: "transform 0.45s ease, opacity 0.45s ease",
      pointerEvents: dist === 0 ? "auto" : opacity > 0 ? "auto" : "none",
    };
  };

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden flex items-center justify-center">
      <style>{`
        @keyframes heartBurstAnim {
          0% { transform: scale(0); opacity: 0; }
          15% { transform: scale(1.2); opacity: 1; }
          30% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        .heartBurst { animation: heartBurstAnim 0.8s ease forwards; }
      `}</style>

      {/* story song — hidden audio element, driven entirely by the effects
          above; nothing else in the tree needs to know it's here.
          Keyed by song id so a fresh story with a different song always
          gets a brand-new <audio> node instead of reusing one whose
          in-flight loadedmetadata listener belongs to the previous song. */}
      {currentSong && (
        <audio
          key={currentSong._id}
          ref={audioRef}
          src={currentSong.audioUrl}
          muted={muted}
          preload="auto"
          className="hidden"
        />
      )}

      {/* desktop chevrons — the only way to cross accounts */}
      <button
        onClick={handlePrevAccount}
        disabled={accountIndex === 0}
        className="hidden md:flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 text-white/70 hover:text-white disabled:opacity-0 z-30"
      >
        <ChevronLeft size={30} />
      </button>
      <button
        onClick={handleNextAccount}
        className="hidden md:flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 text-white/70 hover:text-white z-30"
      >
        <ChevronRight size={30} />
      </button>

      {/* carousel track */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
        {slots.map(({ dist, idx, isCenter }) => {
          const d = idx - accountIndex;
          const acc = accounts[idx];

          if (!isCenter) {
            // ---- side preview card (bonus: click to jump straight to that account) ----
            const previewStory = acc.stories[0];
            return (
              <div
                key={acc.author._id}
                style={cardStyle(dist, d)}
                onClick={() => jumpToAccount(idx)}
                className="rounded-2xl overflow-hidden bg-neutral-900 cursor-pointer hidden md:block"
              >
                <div className="relative w-full h-full">
                  {previewStory?.mediaType === "video" ? (
                    <video
                      src={previewStory.mediaUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  ) : (
                    <img
                      src={previewStory?.mediaUrl}
                      alt=""
                      className="w-full h-full object-cover"
                      style={{ backgroundColor: previewStory?.bgColor || "#000" }}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/25" />
                  <div className="absolute top-3 left-0 right-0 flex items-center justify-center gap-2 px-2">
                    <img
                      src={acc.author.profilePic || DEFAULT_AVATAR}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover ring-1 ring-white/30"
                    />
                    <span className="text-white text-xs font-medium truncate max-w-[120px]">
                      {acc.author.username}
                    </span>
                  </div>
                </div>
              </div>
            );
          }

          // ---- center (active, fully interactive) card ----
          return (
            <div
              key={acc.author._id}
              style={cardStyle(dist, d)}
              className="rounded-2xl overflow-hidden bg-neutral-900"
            >
              {/* progress segments — one per story this account has */}
              <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
                {currentAccount.stories.map((s, i) => (
                  <div key={s._id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white rounded-full"
                      style={{
                        width:
                          i < storyIndex ? "100%" : i === storyIndex ? `${progress}%` : "0%",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* header */}
              <div className="absolute top-5 left-0 right-0 flex items-center justify-between px-3 pt-2 z-20">
                <div className="flex items-center gap-2 min-w-0">
                  <img
                    src={currentAccount.author.profilePic ? currentAccount.author.profilePic : DEFAULT_AVATAR}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover ring-1 ring-white/30"
                  />
                  <div className="min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {currentAccount.author.username}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-white/90">
                  {currentSong && (
                    <div
                      className="w-7 h-7 rounded-md overflow-hidden shrink-0 ring-1 ring-white/20 bg-neutral-800"
                      title={`${currentSong.title} · ${currentSong.artist || "Unknown"}`}
                    >
                      {currentSong.thumbnail ? (
                        <img
                          src={currentSong.thumbnail}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/70 text-[10px]">
                          ♪
                        </div>
                      )}
                    </div>
                  )}

                  {(currentStory.mediaType === "video" || currentSong) && (
                    <button
                      onClick={() => {
                        const nextMuted = !muted;
                        setMuted(nextMuted);

                        const audio = audioRef.current;
                        if (audio) {
                          audio.muted = nextMuted;
                          if (!nextMuted && playingRef.current && mediaReadyRef.current) {
                            audio.play().catch(() => {});
                          }
                        }
                      }}
                      aria-label={muted ? "Unmute" : "Mute"}
                    >
                      {muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
                    </button>
                  )}
                  {isOwnAccount && (
                    <button onClick={openHighlightSheet} aria-label="Add to highlights">
                      <Layers size={19} />
                    </button>
                  )}
                  {isOwnAccount && (
                    <button onClick={() => setMoreOpen((v) => !v)}>
                      <MoreHorizontal size={19} />
                    </button>
                  )}
                  <button onClick={() => navigate(-1)}>
                    <X size={22} />
                  </button>
                </div>
              </div>

              {moreOpen && isOwnAccount && (
                <div className="absolute top-14 right-3 z-30 bg-[#161616] rounded-lg shadow-xl border border-white/10 overflow-hidden">
                  <button
                    onClick={handleDelete}
                    className="flex items-center gap-2 px-4 py-2 text-red-400 text-sm hover:bg-white/5 w-full"
                  >
                    <Trash2 size={14} /> Delete story
                  </button>
                </div>
              )}

              {/* media — keyed by story id so React remounts a fresh
                  <img>/<video> per story instead of reusing one whose
                  onLoad/onCanPlay from the PREVIOUS story could otherwise
                  fire late and falsely mark the new story as ready. Kept
                  invisible (opacity 0) until mediaReady flips true so a
                  half-loaded image never flashes on screen. */}
              {currentStory.mediaType === "video" ? (
                <video
                  key={currentStory._id}
                  ref={videoRef}
                  src={currentStory.mediaUrl}
                  muted={muted}
                  playsInline
                  onCanPlay={handleVideoCanPlay}
                  className="w-full h-full object-cover"
                  style={{ opacity: mediaReady ? 1 : 0, transition: "opacity 0.15s ease" }}
                />
              ) : (
                <img
                  key={currentStory._id}
                  src={currentStory.mediaUrl}
                  alt=""
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                  className="w-full h-full object-cover"
                  style={{
                    backgroundColor: currentStory.bgColor || "#000",
                    opacity: mediaReady ? 1 : 0,
                    transition: "opacity 0.15s ease",
                  }}
                />
              )}

              {/* loading spinner — shown behind nothing but the media
                  itself while it buffers; the timer and song both stay
                  gated on mediaReady until this disappears */}
              {!mediaReady && (
                <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                  <div className="w-10 h-10 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
                </div>
              )}

              {/* The song is represented only by its small cover square in
                  the header, next to the sound control. */}


              {/* tap zones — within-account story nav / double-tap like */}
              <button
                onPointerDown={onPointerDown}
                onPointerUp={(e) => onPointerUp("left", e)}
                className="absolute inset-y-0 left-0 w-1/3 z-10"
                aria-label="Previous story"
              />
              <button
                onPointerDown={onPointerDown}
                onPointerUp={(e) => onPointerUp("right", e)}
                className="absolute inset-y-0 right-0 w-1/3 z-10"
                aria-label="Next story"
              />

              {/* double-tap gradient heart burst */}
              {burst && (
                <img
                  key={burst.key}
                  src="/images/gradient-like-icon.png"
                  alt=""
                  className="absolute w-40 h-30 pointer-events-none z-20 heartBurst"
                  style={{ left: burst.x - 40, top: burst.y - 40 }}
                />
              )}

              {/* footer */}
              <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 z-20">
                {isOwnAccount ? (
                  <button
                    onClick={openSheet}
                    className="flex items-center gap-1 text-white/90 text-xs mb-2"
                  >
                    <Eye size={16} /> {viewsCount} view{viewsCount !== 1 ? "s" : ""}
                  </button>
                ) : null}
                <div className="flex items-center gap-3">
                  {!isOwnAccount && (
                    <input
                      ref={replyInputRef}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      onFocus={() => setPlaying(false)}
                      onBlur={() => {
                        // only resume autoplay if the draft was cleared/sent;
                        // otherwise keep it paused so the user can keep typing
                        if (!reply.trim()) setPlaying(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleReplySend();
                        }
                      }}
                      disabled={sendingReply}
                      placeholder={`Reply to ${currentAccount.author.username}...`}
                      className="flex-1 min-w-0 bg-transparent border border-white/40 text-white placeholder-white/60 text-sm rounded-full px-4 py-2 focus:outline-none focus:border-white disabled:opacity-60"
                    />
                  )}
                  {!isOwnAccount && (
                    <button onClick={handleLikeToggle} className="text-white/90">
                      <Heart size={22} fill={liked ? "#ff3040" : "none"} color={liked ? "#ff3040" : "currentColor"} />
                    </button>
                  )}
                  {!isOwnAccount && (
                    <button
                      onClick={() => (hasReplyDraft ? handleReplySend() : openShare())}
                      disabled={sendingReply}
                      className="text-white/90 disabled:opacity-50"
                      aria-label={hasReplyDraft ? "Send reply" : "Share story"}
                    >
                      {sendingReply ? (
                        <div className="w-[18px] h-[18px] border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Send size={20} />
                      )}
                    </button>
                  )}
                  {isOwnAccount && likesCount > 0 && (
                    <div className="flex items-center gap-1 text-white/90 text-xs">
                      <Heart size={16} fill="#ff3040" color="#ff3040" /> {likesCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* viewers/likes bottom sheet — owner only */}
      {sheetOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50" onClick={closeSheet}>
          <div
            className="bg-[#161616] w-full max-w-md rounded-t-2xl max-h-[60vh] overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 mb-3 border-b border-white/10 pb-2">
              <button
                onClick={() => setSheetTab("viewers")}
                className={`text-sm font-semibold pb-1 ${
                  sheetTab === "viewers" ? "text-white border-b-2 border-white" : "text-white/50"
                }`}
              >
                Viewers {sheetData.viewers.length > 0 && `(${sheetData.viewers.length})`}
              </button>
              <button
                onClick={() => setSheetTab("likes")}
                className={`text-sm font-semibold pb-1 ${
                  sheetTab === "likes" ? "text-white border-b-2 border-white" : "text-white/50"
                }`}
              >
                Likes {sheetData.likes.length > 0 && `(${sheetData.likes.length})`}
              </button>
            </div>

            {sheetLoading ? (
              <div className="text-white/60 text-sm">Loading...</div>
            ) : sheetTab === "viewers" ? (
              sheetData.viewers.length === 0 ? (
                <div className="text-white/60 text-sm">No views yet</div>
              ) : (
                sheetData.viewers.map((v) => {
                  const hasLiked = sheetData.likes.some((l) => l.user._id === v.user._id);
                  return (
                    <div key={v.user._id} className="flex items-center gap-2 py-2">
                      <img
                        src={v.user.profilePic || DEFAULT_AVATAR}
                        alt=""
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <span className="text-white text-sm flex-1 truncate">
                        {v.user.username}
                      </span>
                      {hasLiked && <Heart size={16} fill="#ff3040" color="#ff3040" />}
                    </div>
                  );
                })
              )
            ) : sheetData.likes.length === 0 ? (
              <div className="text-white/60 text-sm">No likes yet</div>
            ) : (
              sheetData.likes.map((l) => (
                <div key={l.user._id} className="flex items-center gap-2 py-2">
                  <img
                    src={l.user.profilePic || DEFAULT_AVATAR}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <span className="text-white text-sm flex-1 truncate">{l.user.username}</span>
                  <Heart size={16} fill="#ff3040" color="#ff3040" />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* add-to-highlight sheet — owner only */}
      {highlightSheetOpen && currentStory && (
        <HighlightPickerSheet
          ownerId={user._id}
          storyId={currentStory._id}
          onClose={closeHighlightSheet}
          onAdded={() => {}}
        />
      )}

      {/* share overlay — non-owner only */}
      {shareOpen && currentStory && (
        <ShareOverlay
          story={{
            _id: currentStory._id,
            mediaType: currentStory.mediaType,
            mediaUrl: currentStory.mediaUrl,
            bgColor: currentStory.bgColor,
            author: currentAccount.author,
          }}
          onClose={closeShare}
        />
      )}
    </div>
  );
};

export default StoryViewerPage;
