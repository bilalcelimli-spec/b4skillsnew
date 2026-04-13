import { useEffect, useState } from 'react';

export const useProctoring = (enabled: boolean = true) => {
  const [violations, setViolations] = useState<number>(0);
  const [showWarning, setShowWarning] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>('');

  const dismissWarning = () => {
    // Attempt to return to fullscreen on dismiss
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
    setShowWarning(false);
  };

  useEffect(() => {
    if (!enabled) return;

    // 1. Tab Focus Loss Detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setViolations(v => v + 1);
        setWarningMessage("Warning: You left the exam tab. This strict violation is recorded.");
        setShowWarning(true);
      }
    };

    // 2. Clipboard Prevention
    const handleCopyPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      setViolations(v => v + 1);
      setWarningMessage("Copy/Paste is strictly disabled during the exam.");
      setShowWarning(true);
    };

    // 3. Right Click Prevention
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 4. Fullscreen enforcement Check
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setViolations(v => v + 1);
        setWarningMessage("Fullscreen exited. You must remain in fullscreen during the exam.");
        setShowWarning(true);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopyPaste);
    document.addEventListener("paste", handleCopyPaste);
    document.addEventListener("cut", handleCopyPaste);
    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopyPaste);
      document.removeEventListener("paste", handleCopyPaste);
      document.removeEventListener("cut", handleCopyPaste);
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [enabled]);

  return { violations, showWarning, warningMessage, dismissWarning };
};
