import React, { useState, useRef, useEffect } from "react";
import { Button } from "./ui/Button";
import { Mic, Square, Play, RotateCcw, Loader2, Volume2, CheckCircle2, AlertCircle, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface SpeakingRecorderProps {
  maxTime: number;
  onRecordingComplete: (blob: Blob) => void;
  isUploading: boolean;
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';
}

export const SpeakingRecorder: React.FC<SpeakingRecorderProps> = ({ 
  maxTime, 
  onRecordingComplete, 
  isUploading,
  uploadProgress = 0,
  uploadStatus = 'idle'
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [timeLeft, setTimeLeft] = useState(maxTime);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorderRef.current?.mimeType || "audio/mp4";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start(1000); // Collect 1-second chunks for better cross-browser compatibility
      setIsRecording(true);
      setTimeLeft(maxTime);
      setAudioBlob(null);
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            stopRecording();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Please allow microphone access to record your response.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setTimeLeft(maxTime);
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
        <AnimatePresence mode="wait">
          {!audioUrl ? (
            <motion.div 
              key="recording"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="text-center"
            >
              <div className={cn(
                "w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-500",
                isRecording ? "bg-red-100 text-red-600 animate-pulse" : "bg-indigo-100 text-indigo-600"
              )}>
                {isRecording ? <Square size={32} /> : <Mic size={32} />}
              </div>
              
              <div className="text-4xl font-mono font-bold text-slate-900 mb-2">
                {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
              </div>
              <p className="text-slate-500 mb-6">
                {isRecording ? "Recording in progress..." : `Maximum time: ${maxTime} seconds`}
              </p>

              {!isRecording ? (
                <Button size="lg" onClick={startRecording} className="rounded-full px-8">
                  <Mic className="mr-2" size={20} /> Start Recording
                </Button>
              ) : (
                <Button size="lg" variant="danger" onClick={stopRecording} className="rounded-full px-8">
                  <Square className="mr-2" size={20} /> Stop Recording
                </Button>
              )}
            </motion.div>
          ) : (
            <motion.div 
              key="preview"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-center w-full"
            >
              <div className="w-24 h-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-6 mx-auto">
                <Volume2 size={32} />
              </div>
              <h4 className="text-xl font-bold text-slate-900 mb-2">Recording Captured</h4>
              <p className="text-slate-500 mb-8">Review your response before submitting.</p>
              
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" onClick={togglePlayback}>
                  {isPlaying ? <Square className="mr-2" size={18} /> : <Play className="mr-2" size={18} />}
                  {isPlaying ? "Pause" : "Play Back"}
                </Button>
                <Button variant="ghost" onClick={resetRecording} disabled={isUploading}>
                  <RotateCcw className="mr-2" size={18} /> Retake
                </Button>
              </div>

              <audio 
                ref={audioRef} 
                src={audioUrl} 
                onEnded={() => setIsPlaying(false)}
                className="hidden" 
              />

              <div className="mt-8 pt-8 border-t border-slate-200 w-full">
                {isUploading ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between text-sm font-medium mb-1">
                      <div className="flex flex-col">
                        <motion.span 
                          key={uploadStatus}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={cn(
                            "flex items-center gap-2",
                            uploadStatus === 'error' ? "text-red-600" : 
                            uploadStatus === 'success' ? "text-green-600" : "text-slate-600"
                          )}
                        >
                          {(uploadStatus === 'uploading' || uploadStatus === 'analyzing') && <Loader2 size={16} className="animate-spin text-indigo-600" />}
                          {uploadStatus === 'success' && <CheckCircle2 size={16} className="text-green-600" />}
                          {uploadStatus === 'error' && <AlertCircle size={16} className="text-red-600" />}
                          
                          {uploadStatus === 'uploading' ? (
                            <span className="animate-pulse">Uploading...</span>
                          ) : 
                           uploadStatus === 'analyzing' ? (
                            <span className="animate-pulse">Analyzing...</span>
                           ) :
                           uploadStatus === 'success' ? "Upload complete." : 
                           "Upload failed."}
                        </motion.span>
                        {uploadStatus === 'uploading' && audioBlob && (
                          <span className="text-[10px] text-slate-400 mt-1 ml-6">
                            {(audioBlob.size / 1024).toFixed(1)} KB total payload
                          </span>
                        )}
                      </div>
                      <span className="text-indigo-600 font-mono">{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden relative shadow-inner">
                      <motion.div 
                        className={cn(
                          "h-full transition-all duration-300 relative",
                          uploadStatus === 'error' ? "bg-red-500" : 
                          uploadStatus === 'analyzing' ? "bg-amber-500" : 
                          uploadStatus === 'success' ? "bg-green-500" : "bg-indigo-600"
                        )}
                        initial={{ width: 0 }}
                        animate={{ 
                          width: uploadStatus === 'analyzing' || uploadStatus === 'success' ? '100%' : `${uploadProgress}%`,
                        }}
                      >
                        {uploadStatus === 'uploading' && (
                          <motion.div 
                            className="absolute inset-0 bg-white/20"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                          />
                        )}
                      </motion.div>
                    </div>
                    
                    {uploadStatus === 'analyzing' && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100"
                      >
                        <BrainCircuit size={14} className="animate-pulse" />
                        <span>AI Engine: Evaluating response against CEFR rubrics...</span>
                      </motion.div>
                    )}

                    {uploadStatus === 'error' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-red-600 hover:bg-red-50"
                        onClick={() => audioBlob && onRecordingComplete(audioBlob)}
                      >
                        <RotateCcw className="mr-2" size={14} /> Retry Upload
                      </Button>
                    )}
                  </div>
                ) : (
                  <Button 
                    size="lg" 
                    className="w-full" 
                    disabled={isUploading}
                    onClick={() => audioBlob && onRecordingComplete(audioBlob)}
                  >
                    Submit Response
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
