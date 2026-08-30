// utils/videoTools.js

export const getVideoDuration = (file) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      resolve(video.duration);
    };
    video.onerror = () => reject(new Error("Could not read video metadata"));
    video.src = URL.createObjectURL(file);
  });
};

// Re-encodes video at a lower resolution/bitrate using canvas + MediaRecorder.
// Note: relies on HTMLVideoElement.captureStream(), which works reliably in
// Chrome/Edge but has patchy support in Safari — server-side validation in
// storyUpload.middleware.js is still the real safety net for duration.
export const compressVideo = (file, { maxWidth = 720, bitrate = 1_500_000 } = {}) => {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.src = URL.createObjectURL(file);

    video.onloadedmetadata = () => {
      const scale = Math.min(1, maxWidth / video.videoWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");

      const canvasStream = canvas.captureStream(30);

      try {
        const sourceStream = video.captureStream?.();
        sourceStream?.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
      } catch (e) {
        // no audio track available — continue silently, video-only compression still works
      }

      const recorder = new MediaRecorder(canvasStream, {
        mimeType: "video/webm;codecs=vp9,opus",
        videoBitsPerSecond: bitrate,
      });

      const chunks = [];
      recorder.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
      recorder.onstop = () => {
        URL.revokeObjectURL(video.src);
        resolve(new Blob(chunks, { type: "video/webm" }));
      };
      recorder.onerror = (e) => reject(e.error);

      let rafId;
      const drawFrame = () => {
        if (video.paused || video.ended) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        rafId = requestAnimationFrame(drawFrame);
      };

      recorder.start();
      video.play().then(drawFrame);

      video.onended = () => {
        cancelAnimationFrame(rafId);
        recorder.stop();
      };
    };

    video.onerror = () => reject(new Error("Could not process video"));
  });
};