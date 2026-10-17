import { Component, Suspense, lazy, useEffect, useRef, useState } from "react";
import { useTheme } from "../../context/ThemeContext";

// three.js only downloads when the full 3D scene is actually going to render
const DevsScene = lazy(() => import("./DevsScene"));

const hasWebGL = () => {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
};

/* If the 3D scene ever crashes, quietly fall back to the CSS background */
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.warn("Devs Mode 3D scene disabled:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const DevsBackground = () => {
  const { lite, reducedMotion } = useTheme();
  const [webgl] = useState(hasWebGL);
  const [tabVisible, setTabVisible] = useState(() => !document.hidden);
  const glowRef = useRef(null);

  const show3D = !lite && !reducedMotion && webgl;

  // Pause the 3D render loop when the tab is hidden (saves battery / GPU)
  useEffect(() => {
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Soft cursor-following glow (desktop only)
  useEffect(() => {
    if (lite) return;
    const el = glowRef.current;
    if (!el) return;

    let raf = 0;
    let x = -9999;
    let y = -9999;

    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(() => {
          el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
          raf = 0;
        });
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [lite]);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      <div className="devs-blob devs-blob-1" />
      <div className="devs-blob devs-blob-2" />
      <div className="devs-blob devs-blob-3" />

      {show3D && (
        <SceneBoundary>
          <Suspense fallback={null}>
            <DevsScene paused={!tabVisible} />
          </Suspense>
        </SceneBoundary>
      )}

      <div className="devs-grid" />
      <div className="devs-noise" />
      <div className="devs-vignette" />
      {!lite && <div ref={glowRef} className="devs-cursor-glow" />}
    </div>
  );
};

export default DevsBackground;