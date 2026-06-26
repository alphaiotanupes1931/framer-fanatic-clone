import { useState, useEffect, useCallback } from "react";

export type Theme =
  | "light"
  | "dark"
  | "midnight"
  | "sunset"
  | "forest"
  | "rose"
  | "ocean"
  | "mono";

export const THEMES: Theme[] = ["light", "dark", "midnight", "sunset", "forest", "rose", "ocean", "mono"];

// Themes that should also activate the existing `.dark` overrides.
const DARKISH: Theme[] = ["dark", "midnight", "forest", "ocean", "mono"];

const STORAGE_KEY = "pb-theme";

function isTheme(v: string | null): v is Theme {
  return !!v && (THEMES as string[]).includes(v);
}

function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isTheme(stored)) return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function applyThemeClass(theme: Theme) {
  const root = window.document.documentElement;
  THEMES.forEach((t) => root.classList.remove(`theme-${t}`));
  root.classList.add(`theme-${theme}`);
  if (DARKISH.includes(theme)) root.classList.add("dark");
  else root.classList.remove("dark");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  useEffect(() => {
    applyThemeClass(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => setThemeState(t), []);
  const toggleTheme = useCallback(
    () => setThemeState((prev) => (DARKISH.includes(prev) ? "light" : "dark")),
    [],
  );

  return { theme, setTheme, toggleTheme };
}
