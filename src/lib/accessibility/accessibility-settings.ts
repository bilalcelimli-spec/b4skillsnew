/**
 * b4skills Accessibility Settings Manager
 *
 * Applies user accessibility preferences to the document:
 *  - Font size (small / normal / large / x-large)
 *  - Font family (including dyslexia-friendly fonts)
 *  - High contrast mode
 *  - Reduce motion
 *  - Text/letter spacing
 *  - Line height
 *  - Screen reader mode hints
 */

export type FontSize = "small" | "normal" | "large" | "x-large";
export type FontFamily = "system" | "serif" | "monospace" | "dyslexia" | "opendyslexic";
export type ContrastMode = "normal" | "high" | "dark" | "high-dark";
export type MotionPreference = "full" | "reduced" | "none";

export interface AccessibilityPreferences {
  fontSize: FontSize;
  fontFamily: FontFamily;
  contrastMode: ContrastMode;
  motionPreference: MotionPreference;
  lineHeight: number; // 1.0 – 2.5
  letterSpacing: number; // em units, 0 – 0.3
  wordSpacing: number; // em units, 0 – 0.5
  cursorSize: "normal" | "large" | "x-large";
  screenReaderMode: boolean;
  focusRingAlwaysVisible: boolean;
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: "14px",
  normal: "16px",
  large: "20px",
  "x-large": "24px",
};

const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  system: "system-ui, -apple-system, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  monospace: "'Courier New', Courier, monospace",
  dyslexia: "Comic Sans MS, 'Comic Sans', cursive",
  opendyslexic: "OpenDyslexic, Comic Sans MS, cursive",
};

const CONTRAST_VARS: Record<ContrastMode, Record<string, string>> = {
  normal: {
    "--bg-primary": "#ffffff",
    "--bg-secondary": "#f8fafc",
    "--text-primary": "#0f172a",
    "--text-secondary": "#64748b",
    "--border-color": "#e2e8f0",
    "--link-color": "#2563eb",
    "--focus-ring": "#3b82f6",
  },
  high: {
    "--bg-primary": "#ffffff",
    "--bg-secondary": "#f0f0f0",
    "--text-primary": "#000000",
    "--text-secondary": "#111111",
    "--border-color": "#000000",
    "--link-color": "#0000cc",
    "--focus-ring": "#ff4500",
  },
  dark: {
    "--bg-primary": "#0f172a",
    "--bg-secondary": "#1e293b",
    "--text-primary": "#f1f5f9",
    "--text-secondary": "#94a3b8",
    "--border-color": "#334155",
    "--link-color": "#60a5fa",
    "--focus-ring": "#60a5fa",
  },
  "high-dark": {
    "--bg-primary": "#000000",
    "--bg-secondary": "#111111",
    "--text-primary": "#ffffff",
    "--text-secondary": "#eeeeee",
    "--border-color": "#ffffff",
    "--link-color": "#ffff00",
    "--focus-ring": "#ff0000",
  },
};

// ---------------------------------------------------------------------------
// Settings Manager
// ---------------------------------------------------------------------------

export class AccessibilitySettingsManager {
  private readonly STORAGE_KEY = "b4skills_a11y_prefs";

  getDefaultPreferences(): AccessibilityPreferences {
    return {
      fontSize: "normal",
      fontFamily: "system",
      contrastMode: "normal",
      motionPreference: "full",
      lineHeight: 1.5,
      letterSpacing: 0,
      wordSpacing: 0,
      cursorSize: "normal",
      screenReaderMode: false,
      focusRingAlwaysVisible: false,
    };
  }

  loadPreferences(): AccessibilityPreferences {
    if (typeof window === "undefined") return this.getDefaultPreferences();
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return { ...this.getDefaultPreferences(), ...JSON.parse(stored) };
      }
    } catch { /* noop */ }
    return this.getDefaultPreferences();
  }

  savePreferences(prefs: AccessibilityPreferences): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(prefs));
    } catch { /* noop */ }
  }

  applySettings(prefs: AccessibilityPreferences): void {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Font size
    root.style.setProperty("--a11y-font-size", FONT_SIZE_MAP[prefs.fontSize]);
    root.style.fontSize = FONT_SIZE_MAP[prefs.fontSize];

    // Font family
    root.style.setProperty("--a11y-font-family", FONT_FAMILY_MAP[prefs.fontFamily]);
    document.body.style.fontFamily = FONT_FAMILY_MAP[prefs.fontFamily];

    // OpenDyslexic — inject @font-face if needed
    if (prefs.fontFamily === "opendyslexic") {
      this.injectOpenDyslexicFont();
    }

    // Contrast mode
    const contrastVars = CONTRAST_VARS[prefs.contrastMode];
    for (const [prop, val] of Object.entries(contrastVars)) {
      root.style.setProperty(prop, val);
    }

    // Data attribute for CSS targeting
    root.setAttribute("data-contrast", prefs.contrastMode);
    root.setAttribute("data-font-size", prefs.fontSize);

    // Motion preference
    if (prefs.motionPreference === "none" || prefs.motionPreference === "reduced") {
      this.injectStyle("a11y-motion", `
        *, *::before, *::after {
          animation-duration: ${prefs.motionPreference === "none" ? "0s" : "0.01s"} !important;
          transition-duration: ${prefs.motionPreference === "none" ? "0s" : "0.1s"} !important;
        }
      `);
    } else {
      this.removeStyle("a11y-motion");
    }

    // Line height
    root.style.setProperty("--a11y-line-height", String(prefs.lineHeight));
    document.body.style.lineHeight = String(prefs.lineHeight);

    // Letter spacing
    if (prefs.letterSpacing > 0) {
      root.style.setProperty("--a11y-letter-spacing", `${prefs.letterSpacing}em`);
      document.body.style.letterSpacing = `${prefs.letterSpacing}em`;
    } else {
      document.body.style.letterSpacing = "";
    }

    // Word spacing
    if (prefs.wordSpacing > 0) {
      document.body.style.wordSpacing = `${prefs.wordSpacing}em`;
    } else {
      document.body.style.wordSpacing = "";
    }

    // Cursor
    const cursorMap = { normal: "", large: "url(/cursors/large.cur), auto", "x-large": "url(/cursors/xl.cur), auto" };
    document.body.style.cursor = cursorMap[prefs.cursorSize] ?? "";

    // Focus ring
    if (prefs.focusRingAlwaysVisible) {
      this.injectStyle("a11y-focus", `
        *:focus {
          outline: 3px solid var(--focus-ring, #3b82f6) !important;
          outline-offset: 2px !important;
        }
      `);
    } else {
      this.removeStyle("a11y-focus");
    }

    // Screen reader hints
    if (prefs.screenReaderMode) {
      root.setAttribute("data-sr-mode", "true");
    } else {
      root.removeAttribute("data-sr-mode");
    }
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private injectStyle(id: string, css: string): void {
    let el = document.getElementById(`a11y-style-${id}`);
    if (!el) {
      el = document.createElement("style");
      el.id = `a11y-style-${id}`;
      document.head.appendChild(el);
    }
    el.textContent = css;
  }

  private removeStyle(id: string): void {
    document.getElementById(`a11y-style-${id}`)?.remove();
  }

  private injectOpenDyslexicFont(): void {
    if (document.getElementById("a11y-opendyslexic")) return;
    const link = document.createElement("link");
    link.id = "a11y-opendyslexic";
    link.rel = "stylesheet";
    link.href = "https://cdn.jsdelivr.net/npm/open-dyslexic@1.0.3/open-dyslexic-regular.css";
    document.head.appendChild(link);
  }

  /**
   * Apply system preferences as defaults (respects prefers-reduced-motion, prefers-color-scheme).
   */
  applySystemPreferences(): AccessibilityPreferences {
    const prefs = this.loadPreferences();
    if (typeof window !== "undefined") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        prefs.motionPreference = "reduced";
      }
      if (window.matchMedia("(prefers-color-scheme: dark)").matches && prefs.contrastMode === "normal") {
        prefs.contrastMode = "dark";
      }
      if (window.matchMedia("(prefers-contrast: more)").matches) {
        prefs.contrastMode = prefs.contrastMode === "dark" ? "high-dark" : "high";
      }
    }
    return prefs;
  }
}

export const accessibilitySettings = new AccessibilitySettingsManager();
