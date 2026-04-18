import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw } from "lucide-react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface AudioPlayerProps {
  src: string;
  maxPlays?: number;          // Max replays allowed (0 = unlimited)
  autoPlay?: boolean;         // Auto-play on mount
  countdownSeconds?: number;  // Countdown before auto-play (e.g. 3)
  showWaveform?: boolean;     // Show waveform visualization
  disabled?: boolean;
  onPlayComplete?: () => void;
  onAllPlaysUsed?: () => void;
  className?: string;
}

/**
 * World-class audio player for listening assessment tasks.
 * - Waveform visualization via Canvas + Web Audio API
 * - Replay limits (configurable, default 2)
 * - Auto-play with countdown
 * - Accessible keyboard controls
 */
export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  src,
  maxPlays = 2,
  autoPlay = false,
  countdownSeconds = 3,
  showWaveform = true,
  disabled = false,
  onPlayComplete,
  onAllPlaysUsed,
  className,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceCreatedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playCount, setPlayCount] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(autoPlay ? countdownSeconds : null);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);

  const playsRemaining = maxPlays > 0 ? maxPlays - playCount : Infinity;
  const canPlay = !disabled && playsRemaining > 0;

  // Countdown before auto-play
  useEffect(() => {
    if (countdown === null || countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (countdown === 0 && autoPlay && canPlay) {
      handlePlay();
      setCountdown(null);
    }
  }, [countdown, autoPlay, canPlay]);

  // Setup Web Audio API for waveform
  const setupAudioContext = useCallback(() => {
    if (!audioRef.current || audioCtxRef.current || sourceCreatedRef.current) return;
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      const source = ctx.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(ctx.destination);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      sourceCreatedRef.current = true;
    } catch (e) {
      console.warn("Web Audio API not supported for waveform", e);
    }
  }, []);

  // Waveform rendering
  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw waveform
    ctx.lineWidth = 2;
    ctx.strokeStyle = isPlaying ? "#6366f1" : "#94a3b8";
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * canvas.height) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Progress overlay
    if (duration > 0) {
      const progress = currentTime / duration;
      ctx.fillStyle = "rgba(99, 102, 241, 0.1)";
      ctx.fillRect(0, 0, canvas.width * progress, canvas.height);
    }

    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(drawWaveform);
    }
  }, [isPlaying, currentTime, duration]);

  useEffect(() => {
    if (isPlaying && showWaveform) {
      drawWaveform();
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, showWaveform, drawWaveform]);

  const handlePlay = () => {
    if (!canPlay || !audioRef.current) return;
    setupAudioContext();
    if (audioCtxRef.current?.state === "suspended") {
      audioCtxRef.current.resume();
    }
    audioRef.current.play();
    setIsPlaying(true);
  };

  const handlePause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const handleEnded = () => {
    setIsPlaying(false);
    const newCount = playCount + 1;
    setPlayCount(newCount);
    onPlayComplete?.();
    if (maxPlays > 0 && newCount >= maxPlays) {
      onAllPlaysUsed?.();
    }
  };

  const handleReplay = () => {
    if (!canPlay || !audioRef.current) return;
    audioRef.current.currentTime = 0;
    handlePlay();
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Countdown overlay
  if (countdown !== null && countdown > 0) {
    return (
      <div className={cn("p-8 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col items-center gap-4", className)}>
        <div className="w-20 h-20 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
          <Volume2 size={36} />
        </div>
        <p className="text-sm font-bold text-indigo-700 uppercase tracking-widest">Audio will play in</p>
        <motion.div
          key={countdown}
          initial={{ scale: 1.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl font-black text-indigo-600"
        >
          {countdown}
        </motion.div>
        <p className="text-xs text-slate-500">
          {maxPlays > 0 ? `You may listen up to ${maxPlays} times` : "Unlimited plays"}
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4",
        className
      )}
      role="region"
      aria-label="Audio player"
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={handleEnded}
      />

      {/* Waveform Canvas */}
      {showWaveform && (
        <canvas
          ref={canvasRef}
          width={600}
          height={60}
          className="w-full h-[60px] rounded-lg bg-white/50"
          aria-hidden="true"
        />
      )}

      {/* Progress bar */}
      <div className="relative h-2 bg-white/80 rounded-full overflow-hidden cursor-pointer"
        onClick={(e) => {
          if (!audioRef.current || !canPlay) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          audioRef.current.currentTime = pct * duration;
        }}
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(currentTime)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!audioRef.current) return;
          if (e.key === "ArrowRight") audioRef.current.currentTime = Math.min(duration, currentTime + 5);
          if (e.key === "ArrowLeft") audioRef.current.currentTime = Math.max(0, currentTime - 5);
        }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full"
          style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={isPlaying ? handlePause : handlePlay}
            disabled={!canPlay && !isPlaying}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all focus:ring-4 focus:ring-indigo-200 outline-none",
              canPlay || isPlaying
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
            aria-label={isPlaying ? "Pause audio" : "Play audio"}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
          </button>

          {/* Replay */}
          <button
            onClick={handleReplay}
            disabled={!canPlay}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all focus:ring-4 focus:ring-indigo-200 outline-none",
              canPlay
                ? "bg-white text-indigo-600 hover:bg-indigo-100 border border-indigo-200"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            )}
            aria-label="Replay audio"
          >
            <RotateCcw size={16} />
          </button>

          {/* Mute */}
          <button
            onClick={toggleMute}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-slate-500 hover:text-indigo-600 border border-slate-200 transition-all focus:ring-4 focus:ring-indigo-200 outline-none"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* Time + plays remaining */}
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-slate-600">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          {maxPlays > 0 && (
            <span className={cn(
              "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider",
              playsRemaining > 0
                ? "bg-indigo-100 text-indigo-700"
                : "bg-red-100 text-red-600"
            )}>
              {playsRemaining > 0 ? `${playsRemaining} play${playsRemaining > 1 ? 's' : ''} left` : "No plays left"}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
