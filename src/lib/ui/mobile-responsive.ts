/**
 * Mobile-Responsive Test Utilities
 * 
 * Provides touch-friendly helpers and viewport detection
 * for the assessment interface on mobile devices.
 */

/** Detect if running on a mobile/touch device */
export function isMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth < 768
  );
}

/** Detect if running on a tablet */
export function isTabletDevice(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth >= 768 && window.innerWidth < 1024 && navigator.maxTouchPoints > 0;
}

/** Get safe area insets for notched devices */
export function getSafeAreaInsets(): {
  top: number; bottom: number; left: number; right: number;
} {
  if (typeof window === "undefined") return { top: 0, bottom: 0, left: 0, right: 0 };
  const style = getComputedStyle(document.documentElement);
  return {
    top: parseInt(style.getPropertyValue("env(safe-area-inset-top)") || "0", 10),
    bottom: parseInt(style.getPropertyValue("env(safe-area-inset-bottom)") || "0", 10),
    left: parseInt(style.getPropertyValue("env(safe-area-inset-left)") || "0", 10),
    right: parseInt(style.getPropertyValue("env(safe-area-inset-right)") || "0", 10),
  };
}

/** Prevent double-tap zoom on iOS */
export function preventDoubleTapZoom(element: HTMLElement): () => void {
  let lastTap = 0;
  const handler = (e: TouchEvent) => {
    const now = Date.now();
    if (now - lastTap < 300) {
      e.preventDefault();
    }
    lastTap = now;
  };
  element.addEventListener("touchend", handler, { passive: false });
  return () => element.removeEventListener("touchend", handler);
}

/** Lock viewport to prevent scroll bounce during test */
export function lockViewport(): () => void {
  const meta = document.querySelector('meta[name="viewport"]');
  const original = meta?.getAttribute("content") || "";
  meta?.setAttribute("content",
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
  );
  document.body.style.overflow = "hidden";
  document.body.style.position = "fixed";
  document.body.style.width = "100%";
  document.body.style.height = "100%";

  return () => {
    meta?.setAttribute("content", original);
    document.body.style.overflow = "";
    document.body.style.position = "";
    document.body.style.width = "";
    document.body.style.height = "";
  };
}

/**
 * CSS class names for responsive test layout.
 * Use with Tailwind or inject as inline styles.
 */
export const RESPONSIVE_CLASSES = {
  /** Main test container */
  container: "w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6",
  /** Passage display: side-by-side on desktop, stacked on mobile */
  splitLayout: "flex flex-col lg:flex-row gap-4",
  /** Passage panel */
  passagePanel: "w-full lg:w-1/2 max-h-[40vh] lg:max-h-[70vh] overflow-y-auto p-4 bg-gray-50 rounded-lg text-sm sm:text-base leading-relaxed",
  /** Question panel */
  questionPanel: "w-full lg:w-1/2 p-4",
  /** Touch-friendly option buttons */
  optionButton: "w-full text-left p-4 sm:p-3 mb-3 rounded-lg border-2 transition-all active:scale-[0.98] touch-manipulation text-base sm:text-sm min-h-[48px]",
  /** Selected option */
  optionSelected: "border-blue-500 bg-blue-50",
  /** Unselected option */
  optionDefault: "border-gray-200 bg-white hover:border-gray-300",
  /** Navigation bar */
  navBar: "fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-3 sm:p-4 flex justify-between items-center z-50 safe-area-bottom",
  /** Timer display */
  timer: "text-lg sm:text-xl font-mono font-bold",
  /** Progress indicator */
  progress: "text-sm text-gray-500",
} as const;
