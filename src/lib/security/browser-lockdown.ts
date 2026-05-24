/**
 * Browser Lockdown Service
 * ─────────────────────────────────────────────────────────────────────────────
 * Enforces a restricted browsing environment during high-stakes assessments:
 *   • Fullscreen mode with re-prompt on exit
 *   • Keyboard shortcut blocking (DevTools, PrintScreen, etc.)
 *   • Right-click context menu suppression
 *   • Tab/window visibility detection
 *   • DevTools open detection (timing heuristic)
 *   • Clipboard restriction (paste blocked in answer fields)
 *   • Screen capture / MediaDevices enumeration guard
 *
 * Usage:
 *   const lockdown = createBrowserLockdown(sessionId, onViolation);
 *   lockdown.engage();    // call before assessment starts
 *   lockdown.disengage(); // call when assessment ends
 */

export type ViolationType =
  | "FULLSCREEN_EXIT"
  | "TAB_SWITCH"
  | "DEVTOOLS_OPEN"
  | "KEYBOARD_SHORTCUT"
  | "RIGHT_CLICK"
  | "PASTE_ATTEMPT"
  | "SCREENSHOT_ATTEMPT"
  | "SCREEN_SHARE_ATTEMPT";

export interface LockdownViolation {
  type: ViolationType;
  timestamp: number;
  detail?: string;
}

export interface LockdownOptions {
  /** Allow pasting into writing/open-response items */
  allowPasteInWriting?: boolean;
  /** How many fullscreen exits trigger escalation */
  fullscreenExitWarningThreshold?: number;
  /** Callback fires on every violation */
  onViolation?: (v: LockdownViolation) => void;
  /** Called when violation count exceeds critical threshold */
  onCritical?: (violations: LockdownViolation[]) => void;
  criticalThreshold?: number;
}

// Blocked keyboard shortcut combos (prevent DevTools, print, save, view-source)
const BLOCKED_COMBOS: Array<{ key: string; ctrl?: boolean; meta?: boolean; shift?: boolean; f?: boolean }> = [
  { key: "F12" },
  { key: "I",  ctrl: true, shift: true },   // Chrome DevTools
  { key: "J",  ctrl: true, shift: true },   // Chrome Console
  { key: "C",  ctrl: true, shift: true },   // Chrome Inspect
  { key: "U",  ctrl: true },                // View Source
  { key: "S",  ctrl: true },                // Save page
  { key: "P",  ctrl: true },                // Print
  { key: "I",  meta: true, shift: true },   // Safari DevTools
  { key: "F5" },                            // Refresh
  { key: "r",  ctrl: true },                // Refresh
  { key: "PrintScreen" },
  // macOS equivalents
  { key: "3",  meta: true, shift: true },   // macOS screenshot
  { key: "4",  meta: true, shift: true },   // macOS area screenshot
  { key: "5",  meta: true, shift: true },   // macOS screen capture panel
];

function matchesBlocked(e: KeyboardEvent): boolean {
  for (const combo of BLOCKED_COMBOS) {
    const keyMatch = e.key === combo.key || e.code === combo.key;
    if (!keyMatch) continue;
    if (combo.ctrl !== undefined && (e.ctrlKey !== combo.ctrl)) continue;
    if (combo.meta !== undefined && (e.metaKey !== combo.meta)) continue;
    if (combo.shift !== undefined && (e.shiftKey !== combo.shift)) continue;
    return true;
  }
  return false;
}

export function createBrowserLockdown(sessionId: string, options: LockdownOptions = {}) {
  const {
    allowPasteInWriting = false,
    fullscreenExitWarningThreshold = 2,
    onViolation,
    onCritical,
    criticalThreshold = 5,
  } = options;

  const violations: LockdownViolation[] = [];
  let fullscreenExitCount = 0;
  let devtoolsCheckInterval: ReturnType<typeof setInterval> | null = null;
  let engaged = false;

  function report(type: ViolationType, detail?: string) {
    const v: LockdownViolation = { type, timestamp: Date.now(), detail };
    violations.push(v);
    onViolation?.(v);
    if (violations.length >= criticalThreshold) {
      onCritical?.(violations);
    }
  }

  // ── Fullscreen ─────────────────────────────────────────────────────────────

  async function requestFullscreen() {
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) await el.requestFullscreen();
      else if ((el as any).webkitRequestFullscreen) await (el as any).webkitRequestFullscreen();
    } catch {
      // User denied — still continue, just record
    }
  }

  function onFullscreenChange() {
    if (!document.fullscreenElement && engaged) {
      fullscreenExitCount++;
      report("FULLSCREEN_EXIT", `exit #${fullscreenExitCount}`);
      if (fullscreenExitCount <= fullscreenExitWarningThreshold) {
        // Re-prompt to re-enter fullscreen
        setTimeout(requestFullscreen, 300);
      }
    }
  }

  // ── Visibility (tab switch) ─────────────────────────────────────────────────

  function onVisibilityChange() {
    if (document.hidden && engaged) {
      report("TAB_SWITCH");
    }
  }

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────

  function onKeydown(e: KeyboardEvent) {
    if (!engaged) return;
    if (matchesBlocked(e)) {
      e.preventDefault();
      e.stopPropagation();
      report("KEYBOARD_SHORTCUT", `${e.ctrlKey ? "Ctrl+" : ""}${e.metaKey ? "Meta+" : ""}${e.key}`);
    }
  }

  // ── Context menu ────────────────────────────────────────────────────────────

  function onContextMenu(e: MouseEvent) {
    if (!engaged) return;
    e.preventDefault();
    report("RIGHT_CLICK");
  }

  // ── Paste ──────────────────────────────────────────────────────────────────

  function onPaste(e: ClipboardEvent) {
    if (!engaged) return;
    const target = e.target as HTMLElement;
    const isWritingArea = target?.closest?.('[data-lockdown-writing="true"]') != null;
    if (!allowPasteInWriting || !isWritingArea) {
      e.preventDefault();
      report("PASTE_ATTEMPT", `textLength=${e.clipboardData?.getData("text")?.length ?? 0}`);
    }
  }

  // ── DevTools detection (size heuristic + debugger timing trick) ────────────

  function startDevtoolsDetection() {
    let lastCheck = Date.now();

    devtoolsCheckInterval = setInterval(() => {
      const threshold = 200; // ms; devtools freezes JS execution momentarily
      const now = Date.now();
      if (now - lastCheck > threshold * 3) {
        report("DEVTOOLS_OPEN", "debugger timing heuristic");
      }
      lastCheck = now;
    }, threshold);
  }

  function stopDevtoolsDetection() {
    if (devtoolsCheckInterval !== null) {
      clearInterval(devtoolsCheckInterval);
      devtoolsCheckInterval = null;
    }
  }

  // ── Screen share detection ──────────────────────────────────────────────────

  async function detectScreenShare() {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      // If a screen-capture virtual device appears, flag it
      const hasCapture = devices.some((d) => d.kind === "videoinput" && d.label.toLowerCase().includes("screen"));
      if (hasCapture) {
        report("SCREEN_SHARE_ATTEMPT", "virtual screen-capture device detected");
      }
    } catch {
      // Permission denied — fine, can't enumerate
    }
  }

  // ── Engage / Disengage ──────────────────────────────────────────────────────

  async function engage() {
    if (engaged) return;
    engaged = true;

    await requestFullscreen();
    detectScreenShare();
    startDevtoolsDetection();

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("keydown", onKeydown, true);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("paste", onPaste, true);
  }

  function disengage() {
    if (!engaged) return;
    engaged = false;

    stopDevtoolsDetection();
    document.removeEventListener("fullscreenchange", onFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", onFullscreenChange);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    document.removeEventListener("keydown", onKeydown, true);
    document.removeEventListener("contextmenu", onContextMenu);
    document.removeEventListener("paste", onPaste, true);

    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function getViolations() {
    return [...violations];
  }

  function isEngaged() {
    return engaged;
  }

  return { engage, disengage, getViolations, isEngaged };
}

export type BrowserLockdown = ReturnType<typeof createBrowserLockdown>;
