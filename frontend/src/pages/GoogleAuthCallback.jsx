import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { DevsLogo } from "../components/devs/DevsAuthKit";

const GoogleAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isDevs, lite } = useTheme();

  useEffect(() => {
    const token = searchParams.get("token");
    const newUser = searchParams.get("newUser") === "true";

    if (token) {
      localStorage.setItem("authToken", token);
      navigate(newUser ? "/user/complete-profile" : "/home", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  }, []);

  /* ---------------- Devs Mode ---------------- */
  if (isDevs) {
    return (
      <div className="h-[100vh] w-[100vw] flex flex-col gap-8 justify-center items-center text-[var(--text-primary)]">
        <DevsLogo />

        <div
          className={`w-14 h-14 rounded-full ${lite ? "" : "animate-spin"}`}
          style={{
            background:
              "conic-gradient(from 90deg, #22f0ff, #8b5cf6, #ff2bd6, #22f0ff)",
            WebkitMask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            mask:
              "radial-gradient(farthest-side, transparent calc(100% - 4px), #000 calc(100% - 4px))",
            filter: "drop-shadow(0 0 12px rgba(34,240,255,0.7))",
          }}
        />

        <p className="font-mono text-[13px] tracking-wide text-[var(--text-secondary)] flex items-center gap-2">
          <span className="text-[var(--devs-cyan)]">&gt;</span>
          Signing you in...
          <span className="inline-block w-[7px] h-[14px] bg-[var(--devs-cyan)] animate-pulse" />
        </p>
      </div>
    );
  }

  /* ---------------- Classic (light / dark) ---------------- */
  return (
    <div className="h-[100vh] w-[100vw] flex justify-center items-center bg-[var(--bg-app)] text-[var(--text-primary)]">
      Signing you in...
    </div>
  );
};

export default GoogleAuthCallback;