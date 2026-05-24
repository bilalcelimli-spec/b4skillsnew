/**
 * AI Tutor Overlay
 * ─────────────────────────────────────────────────────────────────────────────
 * Floating chat bubble that provides context-aware English learning guidance.
 *
 * Features:
 *   • Collapsible floating button (bottom-right)
 *   • Context-aware: receives current skill/question/CEFR band
 *   • Keyboard shortcut: ⌘/ or Ctrl+/
 *   • WCAG 2.2 AAA: role=dialog, focus trap, aria-live region
 *   • Motion: spring slide-in from bottom-right
 *   • Streaming response (SSE)
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { motion as m, AnimatePresence } from "../design-system/motion.js";
import { useTranslation } from "react-i18next";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TutorContext {
  skill?:     string;   // READING | WRITING | …
  cefrBand?:  string;   // A1–C2
  question?:  string;   // current item stem (truncated)
  module?:    string;   // business / academic / healthcare
}

interface Message {
  id:   string;
  role: "user" | "assistant";
  text: string;
  ts:   Date;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useAITutor(context?: TutorContext) {
  const [open,      setOpen]     = useState(false);
  const [messages,  setMessages] = useState<Message[]>([]);
  const [input,     setInput]    = useState("");
  const [loading,   setLoading]  = useState(false);
  const [error,     setError]    = useState<string | null>(null);

  // Global keyboard shortcut ⌘/ or Ctrl+/
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    setError(null);

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", text: text.trim(), ts: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", text: "", ts: new Date() }]);

    try {
      const resp = await fetch("/api/ai-tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.slice(-6).map((m) => ({ role: m.role, content: m.text })),
          context,
        }),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      // Stream response
      const reader = resp.body?.getReader();
      const decoder = new TextDecoder();
      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          // Parse SSE: "data: ...\n\n"
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ")) {
              const payload = line.slice(6).trim();
              if (payload === "[DONE]") break;
              try {
                const { delta } = JSON.parse(payload) as { delta: string };
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, text: m.text + delta } : m
                  )
                );
              } catch { /* non-JSON line — skip */ }
            }
          }
        }
      }
    } catch (err) {
      setError((err as Error).message);
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
    } finally {
      setLoading(false);
    }
  }, [messages, loading, context]);

  const clearChat = useCallback(() => setMessages([]), []);

  return { open, setOpen, messages, input, setInput, loading, error, sendMessage, clearChat };
}

// ── Components ────────────────────────────────────────────────────────────────

interface AITutorOverlayProps {
  context?: TutorContext;
}

export function AITutorOverlay({ context }: AITutorOverlayProps) {
  const { t } = useTranslation();
  const { open, setOpen, messages, input, setInput, loading, error, sendMessage, clearChat } = useAITutor(context);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const panelRef   = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  // Focus trap
  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last  = focusable[focusable.length - 1];
    const trap  = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    panel.addEventListener("keydown", trap);
    return () => panel.removeEventListener("keydown", trap);
  }, [open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
    if (e.key === "Escape") setOpen(false);
  };

  return (
    <>
      {/* Floating trigger button */}
      <AnimatePresence>
        {!open && (
          <m.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            onClick={() => setOpen(true)}
            aria-label="Open AI Tutor (Ctrl+/)"
            style={{
              position: "fixed",
              bottom: 24,
              insetInlineEnd: 24,
              zIndex: "var(--z-modal)",
              width: 56,
              height: 56,
              borderRadius: "var(--radius-full)",
              background: "var(--brand)",
              color: "white",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              boxShadow: "var(--shadow-lg)",
            }}
          >
            🤖
          </m.button>
        )}
      </AnimatePresence>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <m.div
            key="panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="AI Tutor"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            style={{
              position: "fixed",
              bottom: 24,
              insetInlineEnd: 24,
              zIndex: "var(--z-modal)",
              width: "min(420px, calc(100vw - 32px))",
              height: "min(560px, calc(100svh - 80px))",
              borderRadius: "var(--radius-2xl)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-2xl)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              fontFamily: "var(--font-sans)",
            }}
          >
            {/* Header */}
            <div style={{
              padding: "14px 16px",
              borderBottom: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "var(--bg-subtle)",
            }}>
              <span aria-hidden="true" style={{ fontSize: 22 }}>🤖</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                  AI Tutor
                </p>
                {context?.cefrBand && (
                  <p style={{ margin: 0, fontSize: "0.6875rem", color: "var(--text-muted)" }}>
                    {context.skill ?? "General"} · {context.cefrBand}
                    {context.module ? ` · ${context.module}` : ""}
                  </p>
                )}
              </div>
              <button
                onClick={clearChat}
                aria-label="Clear chat"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 13, padding: "4px 8px", borderRadius: "var(--radius-sm)" }}
              >
                {t("aiTutor.clear")}
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close AI Tutor"
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20, lineHeight: 1, padding: 4, borderRadius: "var(--radius-sm)" }}
              >
                ×
              </button>
            </div>

            {/* Messages */}
            <div
              role="log"
              aria-live="polite"
              aria-label="Chat messages"
              style={{ flex: 1, overflowY: "auto", padding: "12px 16px", display: "flex", flexDirection: "column", gap: 10 }}
            >
              {messages.length === 0 && (
                <p style={{ color: "var(--text-muted)", fontSize: "0.875rem", textAlign: "center", marginTop: 40 }}>
                  {t("aiTutor.greeting")}
                </p>
              )}
              {messages.map((msg) => (
                <m.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    alignSelf:    msg.role === "user" ? "flex-end" : "flex-start",
                    maxWidth:     "80%",
                    padding:      "9px 13px",
                    borderRadius: msg.role === "user"
                      ? "var(--radius-lg) var(--radius-sm) var(--radius-lg) var(--radius-lg)"
                      : "var(--radius-sm) var(--radius-lg) var(--radius-lg) var(--radius-lg)",
                    background: msg.role === "user" ? "var(--brand)" : "var(--bg-subtle)",
                    color:      msg.role === "user" ? "white" : "var(--text-primary)",
                    fontSize:   "0.875rem",
                    lineHeight: 1.55,
                    border:     msg.role === "assistant" ? "1px solid var(--border)" : "none",
                    whiteSpace: "pre-wrap",
                    wordBreak:  "break-word",
                  }}
                >
                  {msg.text || (loading && msg.role === "assistant"
                    ? <span aria-label={t("aiTutor.thinking")} style={{ opacity: 0.5 }}>…</span>
                    : null
                  )}
                </m.div>
              ))}
              {error && (
                <p style={{ color: "var(--error)", fontSize: "0.8125rem", textAlign: "center" }}>
                  ⚠ {error}
                </p>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: "10px 12px",
              borderTop: "1px solid var(--border)",
              display: "flex",
              gap: 8,
              alignItems: "flex-end",
              background: "var(--bg-subtle)",
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder={t("aiTutor.placeholder")}
                aria-label={t("aiTutor.placeholder")}
                disabled={loading}
                style={{
                  flex: 1,
                  resize: "none",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 12px",
                  fontSize: "0.875rem",
                  background: "var(--bg-app)",
                  color: "var(--text-primary)",
                  outline: "none",
                  fontFamily: "var(--font-sans)",
                  lineHeight: 1.5,
                  minHeight: 38,
                  maxHeight: 120,
                  overflowY: "auto",
                  fieldSizing: "content" as any,
                }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                aria-label="Send message"
                style={{
                  flexShrink: 0,
                  width: 38,
                  height: 38,
                  borderRadius: "var(--radius-md)",
                  background: input.trim() && !loading ? "var(--brand)" : "var(--bg-overlay)",
                  color:  input.trim() && !loading ? "white" : "var(--text-muted)",
                  border: "none",
                  cursor: input.trim() && !loading ? "pointer" : "not-allowed",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s",
                }}
              >
                ↑
              </button>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
