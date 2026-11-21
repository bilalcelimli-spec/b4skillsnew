import React, { useState, useRef, useEffect, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, RotateCcw, Gauge } from "lucide-react";
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
  /**
   * Exam delivery. Every candidate hears the recording under the same
   * conditions: normal speed, no seeking, no pausing, and each start is counted
   * by the server (`onPlayStart`) so a reload cannot restore plays.
   */
  exam?: ExamPlayback;
}

export interface ExamPlayback {
  /** Plays the server has already counted for this recording. */
  playsUsed?: number;
  /** Ask the server to count one play. Reject or return `allowed: false` to stop playback. */
  onPlayStart: () => Promise<{ allowed: boolean; playsUsed?: number | null }>;
}

/**
 * World-class audio player for listening assessment tasks.
 * - Waveform visualization via Canvas + Web Audio API
 * - Replay limits (configurable, default 2)
 * - Exam mode (`exam`): fixed speed, no seek/pause, server-counted plays
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
  exam,
}) => {
  const isExam = !!exam;
  const initialPlays = Math.max(0, exam?.playsUsed ?? 0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceCreatedRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playCount, setPlayCount] = useState(initialPlays);
  // Exam mode: a play that has started and not yet reached the end.
  const [midPlay, setMidPlay] = useState(false);
  const [playRejected, setPlayRejected] = useState(false);
  const lastTimeRef = useRef(0);
  const [countdown, setCountdown] = useState<number | null>(autoPlay ? countdownSeconds : null);
  const [isMuted, setIsMuted] = useState(false);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const playPendingRef = useRef(false);
  const playbackGeneration = useRef(0);
  const [audioLoadError, setAudioLoadError] = useState(false);
  const [speed, setSpeed] = useState<number>(() => {
    if (isExam) return 1;
    try {
      const saved = Number(localStorage.getItem("linguadapt_audio_speed"));
      return [0.75, 1, 1.25].includes(saved) ? saved : 1;
    } catch { return 1; }
  });

  const playsRemaining = maxPlays > 0 ? maxPlays - playCount : Infinity;
  const canPlay = !disabled && playsRemaining > 0;

  useEffect(() => {
    setPlayCount(initialPlays);
    setMidPlay(false);
    setPlayRejected(false);
    lastTimeRef.current = 0;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setAudioLoadError(false);
    setAutoplayBlocked(false);
    setCountdown(autoPlay ? countdownSeconds : null);
    playPendingRef.current = false;
    return () => { playbackGeneration.current++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, autoPlay, countdownSeconds]);

  useEffect(() => () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    void audioCtxRef.current?.close().catch(() => {});
  }, []);

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
      // Autoplay attempt — browser may block it; failure is handled silently so
      // the user can still click play manually.
      handlePlay().catch(() => {});
      setCountdown(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handlePlay = async () => {
    // Exam mode: an interrupted play may always be resumed; a new one needs a play left.
    const resuming = isExam && midPlay;
    if ((!canPlay && !resuming) || !audioRef.current || playPendingRef.current) return;
    playPendingRef.current = true;
    const generation = playbackGeneration.current;
    const audio = audioRef.current;
    setAudioLoadError(false);
    setPlayRejected(false);
    if (isExam && !resuming) {
      lastTimeRef.current = 0;
      audio.currentTime = 0;
    }
    if (showWaveform) setupAudioContext();
    try {
      // IMPORTANT: resume() must be awaited before play().
      // Once createMediaElementSource() is called, the audio element is routed
      // exclusively through the AudioContext graph. If the context remains in
      // "suspended" state when play() is invoked, the audio is silenced even
      // though the play() promise resolves successfully.
      if (audioCtxRef.current?.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      if (generation !== playbackGeneration.current) return;
      await audio.play();
      if (generation !== playbackGeneration.current) return;
      setAutoplayBlocked(false);
      setIsPlaying(true);
      if (exam && !resuming) {
        // The recording is audible, so this start counts. The server decides.
        setMidPlay(true);
        setPlayCount((count) => count + 1);
        let grant: { allowed: boolean; playsUsed?: number | null } | null = null;
        try { grant = await exam.onPlayStart(); } catch { grant = null; }
        if (generation !== playbackGeneration.current) return;
        if (!grant || !grant.allowed) {
          audio.pause();
          lastTimeRef.current = 0;
          audio.currentTime = 0;
          setIsPlaying(false);
          setMidPlay(false);
          // Not counted (connection problem) → give the play back; refused → none left.
          setPlayCount((count) => grant ? (typeof grant.playsUsed === "number" ? grant.playsUsed : maxPlays) : Math.max(0, count - 1));
          setPlayRejected(!grant);
        } else if (typeof grant.playsUsed === "number") {
          setPlayCount(grant.playsUsed);
        }
      }
    } catch (err) {
      if (generation !== playbackGeneration.current) return;
      console.warn("Audio playback failed:", err);
      setIsPlaying(false);
      const name = (err as DOMException)?.name;
      if (name === "NotAllowedError") setAutoplayBlocked(true);
      // NotAllowedError  = browser autoplay policy — user can still press play manually.
      // AbortError       = play() was interrupted by a subsequent pause/src-change — not a real error.
      // NotSupportedError = can happen transiently before the audio element is ready; not a load failure.
      if (name !== "NotAllowedError" && name !== "AbortError" && name !== "NotSupportedError") {
        setAudioLoadError(true);
      }
    } finally {
      if (generation === playbackGeneration.current) playPendingRef.current = false;
    }
  };

  const handlePause = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    setIsPlaying(false);
  };

  const handleSpeedChange = (newSpeed: number) => {
    if (isExam) return;
    setSpeed(newSpeed);
    try { localStorage.setItem("linguadapt_audio_speed", String(newSpeed)); } catch { /* private browsing */ }
    if (audioRef.current) audioRef.current.playbackRate = newSpeed;
  };

  // Reapply playbackRate after src changes (e.g. new item)
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  const handleEnded = () => {
    setIsPlaying(false);
    // Exam plays are counted when they start, not when they finish.
    const newCount = isExam ? playCount : playCount + 1;
    setMidPlay(false);
    lastTimeRef.current = 0;
    if (!isExam) setPlayCount(newCount);
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
  const countdownOverlay = countdown !== null && countdown > 0 ? (
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
    ) : null;

  return (
    <div
      className={cn(
        "p-4 sm:p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4",
        className
      )}
      role="region"
      aria-label="Audio player"
    >
      <audio
        ref={audioRef}
        crossOrigin="anonymous"
        src={src}
        preload="metadata"
        onTimeUpdate={() => {
          const audio = audioRef.current;
          if (audio && !audio.seeking) lastTimeRef.current = audio.currentTime;
          setCurrentTime(audio?.currentTime || 0);
        }}
        onSeeking={() => {
          // Exam mode: undo any jump (media keys, devtools) back to where playback was.
          const audio = audioRef.current;
          if (isExam && audio && Math.abs(audio.currentTime - lastTimeRef.current) > 0.75) audio.currentTime = lastTimeRef.current;
        }}
        onRateChange={() => {
          if (isExam && audioRef.current && audioRef.current.playbackRate !== 1) audioRef.current.playbackRate = 1;
        }}
        onLoadedMetadata={() => {
          const value = audioRef.current?.duration ?? 0;
          setDuration(Number.isFinite(value) && value > 0 ? value : 0);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={handleEnded}
        onError={() => {
          setIsPlaying(false);
          setAudioLoadError(true);
          console.warn("Audio failed to load:", src);
        }}
      />

      {/* Audio load error banner */}
      {countdownOverlay}
      {autoplayBlocked && <p role="status" className="text-sm text-indigo-700">Press Play audio to start listening. Automatic playback was blocked by your browser.</p>}
      {playRejected && <p role="alert" className="text-sm text-red-700">The recording could not be started. Check your connection and press Play again — no play was used.</p>}
      {audioLoadError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          <span className="shrink-0">⚠</span>
          <span>Audio file could not be loaded. Please check your connection or try again.</span>
          <button
            onClick={() => {
              setAudioLoadError(false);
              if (audioRef.current) {
                audioRef.current.load();
              }
            }}
            className="ml-auto shrink-0 text-xs font-bold underline underline-offset-2 hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

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
      {isExam ? (
        <div className="relative h-2 bg-white/80 rounded-full overflow-hidden"
          role="progressbar"
          aria-label="Audio progress"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration)}
          aria-valuenow={Math.floor(currentTime)}
        >
          <div className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full" style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }} />
        </div>
      ) : (
      <div className="relative h-2 bg-white/80 rounded-full overflow-hidden cursor-pointer"
        onClick={(e) => {
          if (!audioRef.current || !canPlay || !Number.isFinite(duration) || duration <= 0) return;
          const rect = e.currentTarget.getBoundingClientRect();
          if (rect.width <= 0) return;
          const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          audioRef.current.currentTime = pct * duration;
        }}
        role="slider"
        aria-label="Audio progress"
        aria-valuemin={0}
        aria-valuemax={Math.floor(duration)}
        aria-valuenow={Math.floor(currentTime)}
        tabIndex={0}
        onKeyDown={(e) => {
          if (!audioRef.current || !canPlay || !Number.isFinite(duration) || duration <= 0) return;
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + (e.key === "ArrowRight" ? 5 : -5)));
          }
        }}
      >
        <motion.div
          className="absolute inset-y-0 left-0 bg-indigo-500 rounded-full"
          style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : "0%" }}
        />
      </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Play/Pause */}
          <button
            onClick={isPlaying ? (isExam ? undefined : handlePause) : handlePlay}
            disabled={countdown !== null || (isExam ? isPlaying || (!canPlay && !midPlay) : (!canPlay && !isPlaying))}
            className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center transition-all focus:ring-4 focus:ring-indigo-200 outline-none",
              canPlay || isPlaying || midPlay
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            )}
            aria-label={isPlaying ? (isExam ? "Audio is playing" : "Pause audio") : "Play audio"}
          >
            {isPlaying ? (isExam ? <Volume2 size={20} /> : <Pause size={20} />) : <Play size={20} className="ml-0.5" />}
          </button>

          {/* Replay (exam mode: Play starts the next listen from the beginning) */}
          {!isExam && <button
            onClick={handleReplay}
            disabled={countdown !== null || !canPlay}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center transition-all focus:ring-4 focus:ring-indigo-200 outline-none",
              canPlay
                ? "bg-white text-indigo-600 hover:bg-indigo-100 border border-indigo-200"
                : "bg-slate-100 text-slate-300 cursor-not-allowed"
            )}
            aria-label="Replay audio"
          >
            <RotateCcw size={16} />
          </button>}

          {/* Mute */}
          <button
            onClick={toggleMute}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white text-slate-500 hover:text-indigo-600 border border-slate-200 transition-all focus:ring-4 focus:ring-indigo-200 outline-none"
            aria-label={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        {/* Time + plays remaining + speed */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:justify-end">
          <span className="text-sm font-mono text-slate-600">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          {/* Speed selector — never in an exam: speech rate is part of what is measured */}
          {!isExam && <div className="flex items-center gap-1" aria-label="Playback speed">
            <Gauge size={12} className="text-slate-400" aria-hidden="true" />
            {([0.75, 1, 1.25] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={cn(
                  "px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors",
                  speed === s
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-500 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                )}
                aria-label={`Speed ${s}x`}
                aria-pressed={speed === s}
              >
                {s}×
              </button>
            ))}
          </div>}
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
