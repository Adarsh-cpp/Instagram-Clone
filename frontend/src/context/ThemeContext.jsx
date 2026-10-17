import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const ThemeContext = createContext();

const THEMES = ["light", "dark", "devs"];
const CLASSIC_THEMES = ["light", "dark"];

/* ---------- safe localStorage helpers ---------- */
const readStored = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStored = (key, value) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable (private mode etc.) - ignore */
  }
};

const systemTheme = () =>
  window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const getInitialTheme = () => {
  const saved = readStored("theme");
  if (THEMES.includes(saved)) return saved;
  return systemTheme();
};

const getInitialClassic = (initialTheme) => {
  if (CLASSIC_THEMES.includes(initialTheme)) return initialTheme;
  const saved = readStored("theme:classic");
  if (CLASSIC_THEMES.includes(saved)) return saved;
  return systemTheme();
};

/* ---------- media query hook ---------- */
const useMedia = (query) => {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = (e) => setMatches(e.matches);
    setMatches(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
};

/* Low-end hardware check (computed once) */
const detectLowEnd = () => {
  const cores = navigator.hardwareConcurrency;
  const memory = navigator.deviceMemory;
  return (cores && cores <= 2) || (memory && memory <= 2) || false;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(getInitialTheme);
  const lastClassicRef = useRef(getInitialClassic(theme));
  const isFirstRun = useRef(true);
  const prevThemeRef = useRef(theme);

  /* Environment flags used by Devs Mode to decide how heavy the visuals are */
  const isNarrow = useMedia("(max-width: 768px)");
  const isCoarse = useMedia("(pointer: coarse)");
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const [lowEnd] = useState(detectLowEnd);

  const lite = isNarrow || isCoarse || reducedMotion || lowEnd;

  const setTheme = useCallback((next) => {
    setThemeState((prev) => {
      const value = typeof next === "function" ? next(prev) : next;
      return THEMES.includes(value) ? value : prev;
    });
  }, []);

  /* useLayoutEffect = theme is applied before paint, so no flash on reload */
  useLayoutEffect(() => {
    const root = document.documentElement;

    root.classList.remove("dark", "light", "devs");
    // Devs Mode is built on top of the dark palette, so existing
    // `dark:` Tailwind variants keep working there. `devs:` overrides them.
    if (theme === "devs") {
      root.classList.add("dark", "devs");
    } else {
      root.classList.add(theme);
    }
    root.setAttribute("data-theme", theme);

    if (CLASSIC_THEMES.includes(theme)) {
      lastClassicRef.current = theme;
      writeStored("theme:classic", theme);
    }
    writeStored("theme", theme);

    // Transition effects (skipped on the very first render)
    let t1;
    let t2;
    if (!isFirstRun.current && prevThemeRef.current !== theme) {
      root.classList.add("theme-switching");
      t1 = setTimeout(() => root.classList.remove("theme-switching"), 650);

      if (theme === "devs") {
        root.classList.add("devs-entering");
        t2 = setTimeout(() => root.classList.remove("devs-entering"), 1000);
      }
    }
    isFirstRun.current = false;
    prevThemeRef.current = theme;

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [theme]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-lite", lite ? "true" : "false");
    root.setAttribute("data-reduced-motion", reducedMotion ? "true" : "false");
  }, [lite, reducedMotion]);

  /* Classic toggle: dark <-> light. If we are in Devs Mode, leave it and
     return to whichever classic theme the user had before. */
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      if (prev === "devs") return lastClassicRef.current;
      return prev === "dark" ? "light" : "dark";
    });
  }, []);

  const enableDevs = useCallback(() => setThemeState("devs"), []);
  const disableDevs = useCallback(
    () => setThemeState(lastClassicRef.current),
    []
  );
  const toggleDevs = useCallback(
    () =>
      setThemeState((prev) =>
        prev === "devs" ? lastClassicRef.current : "devs"
      ),
    []
  );

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      isDevs: theme === "devs",
      isDark: theme !== "light", // devs is a dark-based theme
      enableDevs,
      disableDevs,
      toggleDevs,
      lite, // true on phones / touch / low-end / reduced-motion
      reducedMotion,
    }),
    [
      theme,
      setTheme,
      toggleTheme,
      enableDevs,
      disableDevs,
      toggleDevs,
      lite,
      reducedMotion,
    ]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  return useContext(ThemeContext);
};