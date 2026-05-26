/**
 * Voice UI Hook + VoiceButton component
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps the Web Speech API (SpeechRecognition) with:
 *   • Typed state machine: idle | listening | processing | error
 *   • useVoiceNavigation — "next question", "submit answer", "help", "read question"
 *   • Multi-language recognition (passes `lang` to SpeechRecognition)
 *   • React hook + standalone VoiceButton component
 *   • WCAG 2.2 AAA accessible
 *   • Graceful degradation when API is unavailable
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion as m, AnimatePresence } from "../design-system/motion.js";

// ── Types ─────────────────────────────────────────────────────────────────────

export type VoiceState = "idle" | "listening" | "processing" | "error";

export interface VoiceResult {
  transcript: string;
  confidence: number;
  isFinal:    boolean;
  lang:       string;
}

export interface UseVoiceUIOptions {
  lang?:             string;          // BCP47, default "en-US"
  continuous?:       boolean;
  interimResults?:   boolean;
  maxAlternatives?:  number;
  onResult?:         (result: VoiceResult) => void;
  onError?:          (error: string) => void;
}

export interface UseVoiceUIReturn {
  state:           VoiceState;
  transcript:      string;
  confidence:      number;
  isSupported:     boolean;
  start:           () => void;
  stop:            () => void;
  abort:           () => void;
  toggle:          () => void;
  reset:           () => void;
  lastError:       string | null;
}

// ── Browser API shim ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpeechRecognitionCtor = new () => any;

function getSpeechRecognition(): AnySpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  return (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition ?? null;
}

// ── useVoiceUI ────────────────────────────────────────────────────────────────

export function useVoiceUI(options: UseVoiceUIOptions = {}): UseVoiceUIReturn {
  const {
    lang            = "en-US",
    continuous      = false,
    interimResults  = true,
    maxAlternatives = 1,
    onResult,
    onError,
  } = options;

  const SpeechRecognition = getSpeechRecognition();
  const isSupported = SpeechRecognition !== null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [state,      setState]      = useState<VoiceState>("idle");
  const [transcript, setTranscript] = useState("");
  const [confidence, setConfidence] = useState(0);
  const [lastError,  setLastError]  = useState<string | null>(null);

  // Initialise recognition instance
  const getRecognition = useCallback(() => {
    if (!SpeechRecognition) return null;
    if (recognitionRef.current) return recognitionRef.current;

    const rec = new SpeechRecognition();
    rec.lang             = lang;
    rec.continuous       = continuous;
    rec.interimResults   = interimResults;
    rec.maxAlternatives  = maxAlternatives;

    rec.onstart = () => setState("listening");
    rec.onend   = () => setState((prev) => prev === "listening" ? "idle" : prev);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      const alt    = result[0];
      setTranscript(alt.transcript);
      setConfidence(alt.confidence ?? 1);
      onResult?.({ transcript: alt.transcript, confidence: alt.confidence ?? 1, isFinal: result.isFinal, lang });
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onerror = (event: any) => {
      const msg = event.error;
      setLastError(msg);
      setState("error");
      onError?.(msg);
    };

    recognitionRef.current = rec;
    return rec;
  }, [SpeechRecognition, lang, continuous, interimResults, maxAlternatives, onResult, onError]);

  // Restart when lang changes
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
    }
  }, [lang]);

  // Cleanup
  useEffect(() => () => { recognitionRef.current?.abort(); }, []);

  const start = useCallback(() => {
    if (!isSupported) { setLastError("SpeechRecognition not supported"); setState("error"); return; }
    setLastError(null);
    setTranscript("");
    try { getRecognition()?.start(); } catch { /* already started */ }
  }, [isSupported, getRecognition]);

  const stop   = useCallback(() => { recognitionRef.current?.stop(); setState("idle"); }, []);
  const abort  = useCallback(() => { recognitionRef.current?.abort(); setState("idle"); }, []);
  const toggle = useCallback(() => { state === "listening" ? stop() : start(); }, [state, stop, start]);
  const reset  = useCallback(() => { abort(); setTranscript(""); setConfidence(0); setLastError(null); }, [abort]);

  return { state, transcript, confidence, isSupported, start, stop, abort, toggle, reset, lastError };
}

// ── useVoiceNavigation ────────────────────────────────────────────────────────

export interface VoiceNavigationHandlers {
  onNext?:         () => void;
  onSubmit?:       () => void;
  onHelp?:         () => void;
  onReadQuestion?: () => void;
  onBack?:         () => void;
}

/** Voice command definitions per language: lang → handler → trigger phrases */
const COMMANDS: Record<string, Partial<Record<keyof VoiceNavigationHandlers, string[]>>> = {
  "en": {
    onNext:         ["next question", "next", "go next"],
    onSubmit:       ["submit answer", "submit", "confirm answer"],
    onHelp:         ["help", "help me", "i need help"],
    onReadQuestion: ["read question", "repeat question", "read again"],
    onBack:         ["go back", "back", "previous"],
  },
  "tr": {
    onNext:         ["sonraki soru", "sonraki", "devam et"],
    onSubmit:       ["cevabı gönder", "gönder", "onayla"],
    onHelp:         ["yardım", "yardım et", "yardıma ihtiyacım var"],
    onReadQuestion: ["soruyu oku", "tekrar oku", "tekrarla"],
    onBack:         ["geri git", "geri", "önceki"],
  },
  "ar": {
    onNext:         ["السؤال التالي", "التالي"],
    onSubmit:       ["إرسال الإجابة", "إرسال", "تأكيد"],
    onHelp:         ["مساعدة", "ساعدني"],
    onReadQuestion: ["اقرأ السؤال", "كرر السؤال"],
    onBack:         ["رجوع", "السابق"],
  },
};

function matchCommand(
  transcript: string,
  lang: string,
  handlers: VoiceNavigationHandlers
): void {
  const lower   = transcript.toLowerCase().trim();
  const langKey = lang.split("-")[0].toLowerCase();
  const cmds    = COMMANDS[langKey] ?? COMMANDS["en"];

  for (const [handler, phrases] of Object.entries(cmds)) {
    if (phrases.some((p) => lower.includes(p))) {
      const fn = handlers[handler as keyof VoiceNavigationHandlers];
      fn?.();
      return;
    }
  }
}

export function useVoiceNavigation(handlers: VoiceNavigationHandlers, lang = "en-US") {
  return useVoiceUI({
    lang,
    continuous: true,
    interimResults: false,
    onResult: (result) => {
      if (result.isFinal) matchCommand(result.transcript, lang, handlers);
    },
  });
}

// ── VoiceButton component ─────────────────────────────────────────────────────

export interface VoiceButtonProps {
  state:       VoiceState;
  onToggle:    () => void;
  isSupported: boolean;
  size?:       "sm" | "md" | "lg";
  label?:      string;
}

export function VoiceButton({ state, onToggle, isSupported, size = "md", label }: VoiceButtonProps) {
  if (!isSupported) return null;

  const sizes = { sm: 32, md: 40, lg: 52 };
  const px    = sizes[size];

  const colors: Record<VoiceState, { bg: string; text: string }> = {
    idle:       { bg: "var(--bg-subtle)",    text: "var(--text-secondary)" },
    listening:  { bg: "var(--error)",        text: "white" },
    processing: { bg: "var(--brand-subtle)", text: "var(--brand)" },
    error:      { bg: "var(--error-subtle)", text: "var(--error)" },
  };

  const icons: Record<VoiceState, string> = {
    idle: "🎙️", listening: "⏹", processing: "⏳", error: "⚠️",
  };

  const ariaLabel = label
    ?? (state === "listening" ? "Stop listening" : "Start voice input");

  return (
    <m.button
      onClick={onToggle}
      aria-label={ariaLabel}
      aria-pressed={state === "listening"}
      whileTap={{ scale: 0.92 }}
      style={{
        width:        px,
        height:       px,
        borderRadius: "var(--radius-full)",
        border:       state === "listening" ? "2px solid var(--error)" : "1px solid var(--border)",
        background:   colors[state].bg,
        color:        colors[state].text,
        cursor:       "pointer",
        display:      "flex",
        alignItems:   "center",
        justifyContent: "center",
        fontSize:     px * 0.4,
        position:     "relative",
        flexShrink:   0,
      }}
    >
      {icons[state]}
      {/* Pulse ring when listening */}
      <AnimatePresence>
        {state === "listening" && (
          <m.span
            aria-hidden="true"
            key="ring"
            initial={{ scale: 1, opacity: 0.6 }}
            animate={{ scale: 1.9, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeOut" }}
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "var(--radius-full)",
              border: "2px solid var(--error)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>
    </m.button>
  );
}
