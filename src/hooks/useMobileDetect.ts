/**
 * Mobile Detection Hook
 * Provides viewport, touch capability, and orientation info.
 */
import { useState, useEffect } from "react";

export interface MobileInfo {
  isMobile: boolean;
  isTablet: boolean;
  isTouch: boolean;
  isSmallScreen: boolean; // < 640px
  orientation: "portrait" | "landscape";
  viewportWidth: number;
  viewportHeight: number;
  safeAreaInsets: { top: number; bottom: number; left: number; right: number };
}

// Inject the CSS custom-property bridge exactly once, synchronously, before
// any getInfo() call reads the computed values. Without this the first read
// always returns 0 because the vars don't exist yet.
if (typeof document !== "undefined" && !document.getElementById("__mbl-safe-area")) {
  const style = document.createElement("style");
  style.id = "__mbl-safe-area";
  style.textContent = `:root{--sat:env(safe-area-inset-top,0px);--sab:env(safe-area-inset-bottom,0px);--sal:env(safe-area-inset-left,0px);--sar:env(safe-area-inset-right,0px)}`;
  document.head.appendChild(style);
}

function parsePx(value: string): number {
  const n = parseFloat(value);
  return isNaN(n) ? 0 : n;
}

function getInfo(): MobileInfo {
  if (typeof window === "undefined") {
    return {
      isMobile: false, isTablet: false, isTouch: false, isSmallScreen: false,
      orientation: "portrait", viewportWidth: 1280, viewportHeight: 800,
      safeAreaInsets: { top: 0, bottom: 0, left: 0, right: 0 },
    };
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const isMobile = isTouch && w < 768;
  const isTablet = isTouch && w >= 768 && w < 1024;

  const cs = getComputedStyle(document.documentElement);
  const safeTop    = parsePx(cs.getPropertyValue("--sat"));
  const safeBottom = parsePx(cs.getPropertyValue("--sab"));
  const safeLeft   = parsePx(cs.getPropertyValue("--sal"));
  const safeRight  = parsePx(cs.getPropertyValue("--sar"));

  return {
    isMobile,
    isTablet,
    isTouch,
    isSmallScreen: w < 640,
    orientation: w >= h ? "landscape" : "portrait",
    viewportWidth: w,
    viewportHeight: h,
    safeAreaInsets: { top: safeTop, bottom: safeBottom, left: safeLeft, right: safeRight },
  };
}

export function useMobileDetect(): MobileInfo {
  const [info, setInfo] = useState<MobileInfo>(getInfo);

  useEffect(() => {
    function update() { setInfo(getInfo()); }
    window.addEventListener("resize", update, { passive: true });
    window.addEventListener("orientationchange", update, { passive: true });
    // Re-read after first paint — env() values may settle after layout
    const t = requestAnimationFrame(() => setInfo(getInfo()));
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
      cancelAnimationFrame(t);
    };
  }, []);

  return info;
}
