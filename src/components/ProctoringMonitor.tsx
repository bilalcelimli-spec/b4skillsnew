import React, { useState, useEffect, useRef } from "react";
import { ProctoringEventType } from "../lib/proctoring/proctoring-service";
import { ShieldAlert, Video, Mic, Eye, MonitorOff, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface ProctoringMonitorProps {
  sessionId: string;
  onEvent: (type: ProctoringEventType, severity: "LOW" | "MEDIUM" | "HIGH", metadata?: any) => void;
}

export const ProctoringMonitor: React.FC<ProctoringMonitorProps> = ({ sessionId, onEvent }) => {
  const [isFocused, setIsFocused] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // 1. Browser Focus & Tab Switching
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        setIsFocused(false);
        setTabSwitchCount(prev => prev + 1);
        onEvent(ProctoringEventType.TAB_SWITCH, "MEDIUM", { count: tabSwitchCount + 1 });
        setWarning("Tab switching detected. This event has been logged.");
        captureScreenshot("TAB_SWITCH");
      } else {
        setIsFocused(true);
      }
    };

    const handleBlur = () => {
      setIsFocused(false);
      onEvent(ProctoringEventType.WINDOW_BLUR, "LOW");
      setWarning("Window focus lost. Please stay on the test screen.");
    };

    const handleFocus = () => setIsFocused(true);

    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setIsFullscreen(isFull);
      if (!isFull && sessionId) {
        onEvent(ProctoringEventType.FULLSCREEN_EXIT, "MEDIUM");
        setWarning("Fullscreen mode exited. This is a proctoring violation.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [sessionId, tabSwitchCount]);

  // 1.5 Screenshot Simulation
  const captureScreenshot = (reason: string) => {
    if (!videoRef.current) return;
    // In a real app, we'd draw the video frame to a canvas and upload it
    console.log(`[Proctoring] Screenshot captured for: ${reason}`);
    onEvent(ProctoringEventType.SCREENSHOT, "LOW", { reason, timestamp: new Date().toISOString() });
  };

  // 2. Camera Monitoring (Mock Face Detection)
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error("Camera access denied");
        onEvent(ProctoringEventType.NO_FACE, "HIGH", { error: "Camera access denied" });
      }
    };

    startCamera();

    // Mock Face Detection Interval
    const interval = setInterval(() => {
      // Simulate random face detection events for demo
      if (Math.random() < 0.01) {
        onEvent(ProctoringEventType.MULTIPLE_FACES, "HIGH");
        setWarning("Multiple faces detected. Please ensure you are alone.");
        captureScreenshot("MULTIPLE_FACES");
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [sessionId]);

  // 3. Copy-Paste Prevention
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      onEvent(ProctoringEventType.COPY_PASTE, "LOW", { action: "copy" });
      setWarning("Copying text is disabled during the assessment.");
    };

    const handlePaste = (e: ClipboardEvent) => {
      e.preventDefault();
      onEvent(ProctoringEventType.COPY_PASTE, "MEDIUM", { action: "paste" });
      setWarning("Pasting text is disabled during the assessment.");
    };

    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);

    return () => {
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
    };
  }, [sessionId]);

  // Auto-clear warnings
  useEffect(() => {
    if (warning) {
      const timer = setTimeout(() => setWarning(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [warning]);

  return (
    <>
      {/* Warning Overlay */}
      <AnimatePresence>
        {warning && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4"
          >
            <div className="bg-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center gap-4 border-2 border-red-400">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <div className="font-bold text-sm">Proctoring Warning</div>
                <div className="text-xs opacity-90">{warning}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini Monitor View (Draggable in a real app) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        <div className="relative w-48 h-32 bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl group">
          <video 
            ref={videoRef} 
            autoPlay 
            muted 
            playsInline 
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent pointer-events-none" />
          
          <div className="absolute bottom-2 left-2 flex items-center gap-2">
            <div className={cn(
              "w-2 h-2 rounded-full animate-pulse",
              cameraActive ? "bg-emerald-500" : "bg-red-500"
            )} />
            <span className="text-[10px] font-bold text-white uppercase tracking-widest">Live Proctoring</span>
          </div>

          <div className="absolute top-2 right-2 flex gap-1">
            <div className="p-1 bg-slate-800/80 rounded backdrop-blur-sm text-white">
              <Video size={10} />
            </div>
            <div className="p-1 bg-slate-800/80 rounded backdrop-blur-sm text-white">
              <Mic size={10} />
            </div>
          </div>
        </div>

        <div className="bg-white/90 backdrop-blur-md border border-slate-200 p-3 rounded-xl shadow-xl flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-lg",
            isFocused ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}>
            {isFocused ? <ShieldAlert size={16} /> : <MonitorOff size={16} />}
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Status</div>
            <div className="text-xs font-bold text-slate-900">
              {isFocused ? "Environment Secure" : "Focus Lost"}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
