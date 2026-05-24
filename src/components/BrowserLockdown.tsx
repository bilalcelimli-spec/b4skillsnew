import React, { useEffect, useRef, useState, useCallback } from "react";
import { createBrowserLockdown, LockdownViolation, ViolationType } from "../lib/security/browser-lockdown";

interface Props {
  sessionId: string;
  /** Fires on each violation. Parent may relay to server. */
  onViolation?: (v: LockdownViolation) => void;
  /** Fires when violation count hits critical threshold (default 5). */
  onCritical?: (violations: LockdownViolation[]) => void;
  /** Number of fullscreen exits before lockdown stops re-prompting */
  fullscreenExitWarningThreshold?: number;
  criticalThreshold?: number;
  children: React.ReactNode;
}

const VIOLATION_LABELS: Record<ViolationType, string> = {
  FULLSCREEN_EXIT:      "Fullscreen exited",
  TAB_SWITCH:           "Tab / window switched",
  DEVTOOLS_OPEN:        "Developer tools opened",
  KEYBOARD_SHORTCUT:    "Blocked keyboard shortcut",
  RIGHT_CLICK:          "Right-click blocked",
  PASTE_ATTEMPT:        "Paste blocked",
  SCREENSHOT_ATTEMPT:   "Screenshot attempt detected",
  SCREEN_SHARE_ATTEMPT: "Screen sharing detected",
};

export function BrowserLockdown({
  sessionId,
  onViolation,
  onCritical,
  fullscreenExitWarningThreshold = 2,
  criticalThreshold = 5,
  children,
}: Props) {
  const lockdownRef = useRef<ReturnType<typeof createBrowserLockdown> | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [violationCount, setViolationCount] = useState(0);
  const [isCritical, setIsCritical] = useState(false);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleViolation = useCallback((v: LockdownViolation) => {
    setViolationCount((c) => c + 1);
    setWarning(VIOLATION_LABELS[v.type] ?? v.type);
    if (warningTimer.current) clearTimeout(warningTimer.current);
    warningTimer.current = setTimeout(() => setWarning(null), 3500);
    onViolation?.(v);
  }, [onViolation]);

  const handleCritical = useCallback((violations: LockdownViolation[]) => {
    setIsCritical(true);
    onCritical?.(violations);
  }, [onCritical]);

  useEffect(() => {
    lockdownRef.current = createBrowserLockdown(sessionId, {
      fullscreenExitWarningThreshold,
      criticalThreshold,
      onViolation: handleViolation,
      onCritical: handleCritical,
    });

    lockdownRef.current.engage();

    return () => {
      lockdownRef.current?.disengage();
      if (warningTimer.current) clearTimeout(warningTimer.current);
    };
  }, [sessionId, fullscreenExitWarningThreshold, criticalThreshold, handleViolation, handleCritical]);

  return (
    <div className="relative min-h-screen" data-lockdown="true">
      {children}

      {/* Violation toast */}
      {warning && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 rounded-lg bg-amber-900 px-5 py-3 text-white shadow-xl text-sm font-medium"
        >
          <span className="text-amber-300 text-base">⚠</span>
          <span>{warning}</span>
          <span className="text-amber-400 text-xs ml-2">({violationCount} flagged)</span>
        </div>
      )}

      {/* Critical overlay — blocks assessment */}
      {isCritical && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label="Assessment suspended"
          className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-red-950/95 backdrop-blur"
        >
          <div className="max-w-md w-full mx-4 bg-white rounded-2xl p-8 text-center shadow-2xl">
            <div className="text-5xl mb-4">🚫</div>
            <h2 className="text-xl font-bold text-red-700 mb-2">Assessment Suspended</h2>
            <p className="text-gray-600 text-sm mb-4">
              Multiple security violations were detected. This session has been flagged for review.
              Please contact your test administrator.
            </p>
            <p className="text-xs text-gray-400 font-mono">Session: {sessionId}</p>
          </div>
        </div>
      )}
    </div>
  );
}
