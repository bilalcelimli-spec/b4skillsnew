/**
 * Anti-Cheat UX Layer
 * 
 * Browser-level security measures to maintain test integrity:
 * - Fullscreen enforcement
 * - Tab switch / visibility change detection
 * - Right-click and copy/paste prevention
 * - Screenshot prevention (CSS-based)
 * - DevTools detection
 */

export interface SecurityViolation {
  type: "TAB_SWITCH" | "FULLSCREEN_EXIT" | "COPY_PASTE" | "RIGHT_CLICK" | "DEVTOOLS" | "SCREEN_CAPTURE";
  timestamp: number;
  count: number;
}

export class TestSecurityManager {
  private violations: SecurityViolation[] = [];
  private tabSwitchCount = 0;
  private fullscreenExitCount = 0;
  private handlers: (() => void)[] = [];
  private onViolation: (v: SecurityViolation) => void;
  private maxTabSwitches: number;

  constructor(
    onViolation: (v: SecurityViolation) => void,
    maxTabSwitches = 3
  ) {
    this.onViolation = onViolation;
    this.maxTabSwitches = maxTabSwitches;
  }

  /** Activate all security measures */
  activate(): void {
    this.setupVisibilityDetection();
    this.setupFullscreenEnforcement();
    this.setupCopyPasteBlocking();
    this.setupRightClickBlocking();
    this.setupDevToolsDetection();
    this.setupScreenshotPrevention();
  }

  /** Deactivate all security measures and clean up */
  deactivate(): void {
    for (const cleanup of this.handlers) {
      cleanup();
    }
    this.handlers = [];
    // Remove screenshot prevention
    document.body.style.removeProperty("-webkit-user-select");
    document.body.style.removeProperty("user-select");
    document.body.classList.remove("test-security-active");
  }

  /** Get all recorded violations */
  getViolations(): SecurityViolation[] {
    return [...this.violations];
  }

  /** Check if test should be terminated due to violations */
  shouldTerminate(): boolean {
    return this.tabSwitchCount >= this.maxTabSwitches;
  }

  private recordViolation(type: SecurityViolation["type"]): void {
    const existing = this.violations.find(v => v.type === type);
    if (existing) {
      existing.count++;
      existing.timestamp = Date.now();
    } else {
      this.violations.push({ type, timestamp: Date.now(), count: 1 });
    }
    this.onViolation(this.violations.find(v => v.type === type)!);
  }

  private setupVisibilityDetection(): void {
    const handler = () => {
      if (document.hidden) {
        this.tabSwitchCount++;
        this.recordViolation("TAB_SWITCH");
      }
    };
    document.addEventListener("visibilitychange", handler);
    this.handlers.push(() => document.removeEventListener("visibilitychange", handler));
  }

  private setupFullscreenEnforcement(): void {
    const handler = () => {
      if (!document.fullscreenElement) {
        this.fullscreenExitCount++;
        this.recordViolation("FULLSCREEN_EXIT");
      }
    };
    document.addEventListener("fullscreenchange", handler);
    this.handlers.push(() => document.removeEventListener("fullscreenchange", handler));
  }

  private setupCopyPasteBlocking(): void {
    const onCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      this.recordViolation("COPY_PASTE");
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      this.recordViolation("COPY_PASTE");
    };
    const onCut = (e: ClipboardEvent) => {
      e.preventDefault();
      this.recordViolation("COPY_PASTE");
    };

    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("cut", onCut);
    this.handlers.push(() => {
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("cut", onCut);
    });
  }

  private setupRightClickBlocking(): void {
    const handler = (e: MouseEvent) => {
      e.preventDefault();
      this.recordViolation("RIGHT_CLICK");
    };
    document.addEventListener("contextmenu", handler);
    this.handlers.push(() => document.removeEventListener("contextmenu", handler));
  }

  private setupDevToolsDetection(): void {
    // Detect based on window size discrepancy (common heuristic)
    const threshold = 160;
    const handler = () => {
      const widthDiff = window.outerWidth - window.innerWidth;
      const heightDiff = window.outerHeight - window.innerHeight;
      if (widthDiff > threshold || heightDiff > threshold) {
        this.recordViolation("DEVTOOLS");
      }
    };
    const interval = setInterval(handler, 2000);
    this.handlers.push(() => clearInterval(interval));
  }

  private setupScreenshotPrevention(): void {
    // CSS-based prevention (not foolproof but raises the bar)
    document.body.style.setProperty("-webkit-user-select", "none");
    document.body.style.setProperty("user-select", "none");
    document.body.classList.add("test-security-active");
  }

  /** Request fullscreen mode */
  async requestFullscreen(): Promise<boolean> {
    try {
      await document.documentElement.requestFullscreen();
      return true;
    } catch {
      return false;
    }
  }

  /** Exit fullscreen mode */
  async exitFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }
  }
}

/**
 * CSS to inject for screenshot prevention
 * Add to your global styles or inject via JS
 */
export const SECURITY_CSS = `
.test-security-active {
  -webkit-user-select: none;
  user-select: none;
}

.test-security-active * {
  -webkit-print-color-adjust: exact;
}

@media print {
  .test-security-active {
    display: none !important;
  }
}
`;
