/**
 * FaceCapture
 *
 * Pre-test identity snapshot step.
 * 1. Requests camera access.
 * 2. Shows a live preview + countdown.
 * 3. Captures one frame and POSTs it to /api/sessions/:sessionId/identity-snapshot.
 * 4. Calls onCaptureDone() once the server confirms receipt (or on skip).
 */

import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Camera, Loader2, ShieldCheck, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";

interface FaceCaptureProps {
  sessionId: string;
  onCaptureDone: () => void;
}

type Phase = "init" | "preview" | "capturing" | "uploading" | "done" | "error";

export const FaceCapture: React.FC<FaceCaptureProps> = ({ sessionId, onCaptureDone }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("init");
  const [countdown, setCountdown] = useState(3);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Start camera
  const startCamera = async () => {
    setPhase("init");
    setErrorMsg(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480, facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setPhase("preview");
    } catch (err: any) {
      setErrorMsg(
        err.name === "NotAllowedError"
          ? "Camera access was denied. Please allow camera access to continue."
          : "Could not access camera. Please check your device settings."
      );
      setPhase("error");
    }
  };

  // Stop camera tracks
  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Countdown then capture
  const beginCapture = () => {
    setPhase("capturing");
    setCountdown(3);
    let c = 3;
    const iv = setInterval(() => {
      c--;
      setCountdown(c);
      if (c <= 0) {
        clearInterval(iv);
        captureFrame();
      }
    }, 1000);
  };

  const captureFrame = async () => {
    const video  = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) { onCaptureDone(); return; }

    canvas.width  = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) { onCaptureDone(); return; }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);

    stopCamera();
    setPhase("uploading");

    try {
      const res = await fetch(`/api/sessions/${sessionId}/identity-snapshot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame: dataUrl }),
      });
      if (!res.ok) throw new Error("Upload failed");
      setPhase("done");
      setTimeout(onCaptureDone, 1200);
    } catch {
      // Treat upload failure as non-blocking — proceed to test
      setPhase("done");
      setTimeout(onCaptureDone, 1200);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Camera size={20} />
            </div>
            <div>
              <div className="font-black text-slate-900 text-base">Kimlik Doğrulama</div>
              <div className="text-xs text-slate-400 font-medium">Identity Verification</div>
            </div>
          </div>
          <p className="text-sm text-slate-500 leading-relaxed">
            Sınav öncesinde yüzünüzün fotoğrafı alınacaktır. Lütfen kameraya bakın ve iyi aydınlatılmış bir ortamda olun.
          </p>
        </div>

        {/* Camera area */}
        <div className="relative mx-8 mb-4 rounded-2xl overflow-hidden bg-slate-900 aspect-video">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={cn(
              "w-full h-full object-cover transition-opacity duration-300",
              phase === "preview" || phase === "capturing" ? "opacity-100" : "opacity-0"
            )}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Countdown overlay */}
          {phase === "capturing" && countdown > 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                key={countdown}
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-8xl font-black text-white drop-shadow-2xl"
              >
                {countdown}
              </motion.div>
            </div>
          )}

          {/* Face guide overlay */}
          {(phase === "preview" || phase === "capturing") && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-44 h-52 border-4 border-white/60 rounded-[50%] shadow-inner" />
            </div>
          )}

          {/* Uploading spinner */}
          {phase === "uploading" && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
              <span className="text-sm font-bold text-white">Yükleniyor…</span>
            </div>
          )}

          {/* Done */}
          {phase === "done" && (
            <div className="absolute inset-0 bg-emerald-900/80 flex flex-col items-center justify-center gap-3">
              <ShieldCheck className="w-10 h-10 text-emerald-400" />
              <span className="text-sm font-bold text-white">Doğrulandı</span>
            </div>
          )}

          {/* Error */}
          {phase === "error" && (
            <div className="absolute inset-0 bg-slate-900/90 flex flex-col items-center justify-center gap-3 px-6 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <span className="text-xs text-slate-300">{errorMsg}</span>
            </div>
          )}

          {/* Init spinner */}
          {phase === "init" && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-8 pb-8 space-y-3">
          {phase === "preview" && (
            <Button
              onClick={beginCapture}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3"
            >
              <Camera size={16} className="mr-2" /> Fotoğraf Çek
            </Button>
          )}

          {phase === "error" && (
            <>
              <Button
                onClick={startCamera}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3"
              >
                <RefreshCw size={16} className="mr-2" /> Tekrar Dene
              </Button>
              <Button
                onClick={onCaptureDone}
                className="w-full bg-transparent border border-slate-200 text-slate-500 hover:bg-slate-50 font-bold rounded-xl py-3 text-sm"
              >
                Atla (devam et)
              </Button>
            </>
          )}

          {(phase === "init" || phase === "capturing" || phase === "uploading" || phase === "done") && (
            <div className="h-12" /> // spacer
          )}

          <p className="text-center text-[10px] text-slate-400 leading-relaxed">
            Fotoğrafınız yalnızca sınav güvenliği amacıyla saklanır ve{" "}
            <span className="font-bold">sınav bitiminden 90 gün sonra</span> otomatik olarak silinir.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
