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

  // CSS env() safe-area values via computed style trick
  const el = document.documentElement;
  const cs = getComputedStyle(el);
  const safeTop    = parseInt(cs.getPropertyValue("--sat")  || "0", 10);
  const safeBottom = parseInt(cs.getPropertyValue("--sab")  || "0", 10);
  const safeLeft   = parseInt(cs.getPropertyValue("--sal")  || "0", 10);
  const safeRight  = parseInt(cs.getPropertyValue("--sar")  || "0", 10);

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
    // Inject CSS vars for safe-area once
    const style = document.createElement("style");
    style.textContent = `
      :root {
        --sat: env(safe-area-inset-top, 0px);
        --sab: env(safe-area-inset-bottom, 0px);
        --sal: env(safe-area-inset-left, 0px);
        --sar: env(safe-area-inset-right, 0px);
      }
    `;
    document.head.appendChild(style);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return info;
}
