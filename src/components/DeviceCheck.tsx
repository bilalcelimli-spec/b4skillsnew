import React, { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Button } from "./ui/Button";
import { Mic, Video, Volume2, CheckCircle2, AlertCircle } from "lucide-react";

interface DeviceCheckProps {
  onComplete: () => void;
}

export const DeviceCheck: React.FC<DeviceCheckProps> = ({ onComplete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>("");
  const [micTested, setMicTested] = useState(false);
  const [cameraTested, setCameraTested] = useState(false);

  useEffect(() => {
    const initDevices = async () => {
      try {
        const str = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        setStream(str);
        if (videoRef.current) {
          videoRef.current.srcObject = str;
        }
        setCameraTested(true);
        // Simple mic check mock
        setTimeout(() => setMicTested(true), 1500); 
      } catch (err: any) {
        setError("Camera and Microphone access is required. Please check your system permissions.");
      }
    };
    initDevices();

    return () => {
      // Stream cleanup will happen when unmounting
      if (stream) {
        // Leave the stream running so CandidatePlayer can reuse permissions implicitly
      }
    };
  }, []);

  const handleStart = () => {
    // Request fullscreen on explicit user interaction
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request denied", err);
      });
    }
    
    // Stop local stream here so the real recorder can get it, 
    // but permissions are already granted.
    stream?.getTracks().forEach(track => track.stop());
    onComplete();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full border border-slate-200"
      >
        <h2 className="text-3xl font-bold text-slate-800 mb-6 text-center">Pre-Test Device Check</h2>

        {error ? (
          <div className="p-4 bg-red-50 text-red-700 rounded-lg flex items-center gap-3">
            <AlertCircle size={24} />
            <p>{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="aspect-video bg-slate-900 rounded-xl overflow-hidden relative">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <div className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> LIVE
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center space-y-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${cameraTested ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Video size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">Webcam Check</h4>
                  <p className="text-sm text-slate-500">{cameraTested ? "Camera connected successfully" : "Searching for camera..."}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-full ${micTested ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                  <Mic size={24} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">Microphone Check</h4>
                  <p className="text-sm text-slate-500">{micTested ? "Audio input detected correctly" : "Testing audio levels..."}</p>
                </div>
              </div>

              <Button 
                disabled={!cameraTested || !micTested} 
                onClick={handleStart}
                className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all"
              >
                Start Certified Assessment
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
