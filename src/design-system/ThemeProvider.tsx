/**
 * ThemeProvider — Dark mode + RTL + reduced-motion
 * Persists to localStorage, respects system preference as default.
 */
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

export type Theme = "light" | "dark" | "system";
export type Direction = "ltr" | "rtl";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (t: Theme) => void;
  dir: Direction;
  setDir: (d: Direction) => void;
  reducedMotion: boolean;
  highContrast: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState]   = useState<Theme>(() => (localStorage.getItem("la-theme") as Theme) ?? "system");
  const [dir, setDirState]       = useState<Direction>(() => (document.documentElement.getAttribute("dir") as Direction) ?? "ltr");
  const [reducedMotion, setRM]   = useState(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [highContrast, setHC]    = useState(() => window.matchMedia("(prefers-contrast: more)").matches);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);

  const resolvedTheme: "light" | "dark" = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  // System preference listeners
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const h = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const h = (e: MediaQueryListEvent) => setRM(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-contrast: more)");
    const h = (e: MediaQueryListEvent) => setHC(e.matches);
    mq.addEventListener("change", h);
    return () => mq.removeEventListener("change", h);
  }, []);

  // Apply to DOM
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme", resolvedTheme);
    root.classList.toggle("dark", resolvedTheme === "dark");
  }, [resolvedTheme]);

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
  }, [dir]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    localStorage.setItem("la-theme", t);
  }, []);

  const setDir = useCallback((d: Direction) => {
    setDirState(d);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, dir, setDir, reducedMotion, highContrast }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Quick theme toggle button (place in header) */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme, theme } = useTheme();
  const next = resolvedTheme === "dark" ? "light" : "dark";
  return (
    <button
      className={className}
      onClick={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      style={{ display: "inline-flex", alignItems: "center", gap: 8,
        padding: "6px 12px", borderRadius: "var(--radius-md)",
        background: "var(--bg-subtle)", border: "1px solid var(--border)",
        color: "var(--text-primary)", cursor: "pointer", fontSize: "0.875rem",
        transition: "background var(--duration-sm) var(--ease-standard)" }}
    >
      {resolvedTheme === "dark" ? "☀️" : "🌙"}
      <span>{resolvedTheme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
