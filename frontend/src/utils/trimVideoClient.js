export const trimVideoClientSide = (file, start, duration) => {
  return new Promise((resolve, reject) => {
    if (typeof MediaRecorder === "undefined") {
      return reject(new Error("UNSUPPORTED"));
    }

    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;

    const cleanup = () => URL.revokeObjectURL(objectUrl);

    let started = false;

    const startRecording = () => {
      if (started) return;
      started = true;

      let stream;
      try {
        stream = video.captureStream
          ? video.captureStream()
          : video.mozCaptureStream?.();
        if (!stream) throw new Error("no captureStream");
      } catch {
        cleanup();
        return reject(new Error("UNSUPPORTED"));
      }

      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];
      const mimeType = mimeCandidates.find((t) => MediaRecorder.isTypeSupported(t)) || "";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType, videoBitsPerSecond: 2_500_000 } : { videoBitsPerSecond: 2_500_000 }
      );

      const chunks = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        cleanup();
        const blob = new Blob(chunks, { type: mimeType || "video/webm" });
        const trimmedFile = new File([blob], "trimmed-reel.webm", { type: blob.type });
        resolve(trimmedFile);
      };

      recorder.onerror = (e) => {
        cleanup();
        reject(e.error || new Error("Recording failed"));
      };

      video.ontimeupdate = () => {
        if (video.currentTime >= start + duration) {
          video.pause();
          if (recorder.state !== "inactive") recorder.stop();
        }
      };

      recorder.start();
      video.play().catch((err) => {
        cleanup();
        reject(err);
      });
    };

    video.onloadedmetadata = () => {
      video.currentTime = start;
    };

    video.onseeked = startRecording;

    video.onerror = () => {
      cleanup();
      reject(new Error("Failed to load video for trimming"));
    };
  });
};