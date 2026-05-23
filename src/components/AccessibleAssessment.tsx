/**
 * AccessibleAssessment — WCAG 2.1 AA compliant assessment question renderer
 * Supports: MCQ, True/False, short-answer; keyboard navigation; ARIA live regions
 */
import React, { useCallback, useEffect, useId, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuestionType = "MCQ" | "TRUE_FALSE" | "SHORT_ANSWER" | "MATCHING" | "FILL_BLANK";

export interface Option {
  id: string;       // A, B, C, D
  text: string;
  isCorrect?: boolean; // only present in review mode
}

export interface QuestionContent {
  prompt: string;
  type: QuestionType;
  options?: Option[];
  imageUrl?: string;
  audioUrl?: string;
  hint?: string;
  maxLength?: number; // for SHORT_ANSWER
}

export interface AccessibleAssessmentProps {
  question: QuestionContent;
  questionNumber: number;
  totalQuestions: number;
  timeRemainingSeconds?: number;
  selectedAnswer?: string;
  isSubmitted?: boolean;
  isReviewMode?: boolean;
  onAnswer: (value: string) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onFlag?: () => void;
  isFlagged?: boolean;
  showExplanation?: string;
  /** aria-describedby IDs to inject on the form (for additional context) */
  extraDescribedBy?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const KEY_LABELS: Record<string, string> = {
  A: "Option A", B: "Option B", C: "Option C", D: "Option D",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface MCQOptionProps {
  option: Option;
  groupName: string;
  isSelected: boolean;
  isSubmitted: boolean;
  isReview: boolean;
  onChange: (id: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const MCQOption: React.FC<MCQOptionProps> = ({
  option, groupName, isSelected, isSubmitted, isReview, onChange, inputRef,
}) => {
  const inputId = `${groupName}-${option.id}`;
  let stateClass = "";
  if (isSubmitted || isReview) {
    if (option.isCorrect) stateClass = "correct";
    else if (isSelected && !option.isCorrect) stateClass = "incorrect";
  } else if (isSelected) {
    stateClass = "selected";
  }

  const colors: Record<string, React.CSSProperties> = {
    correct:   { background: "#f0fdf4", border: "2px solid #22c55e" },
    incorrect: { background: "#fef2f2", border: "2px solid #ef4444" },
    selected:  { background: "#eff6ff", border: "2px solid #3b82f6" },
    "":        { background: "#fff",    border: "2px solid #e2e8f0" },
  };

  return (
    <label
      htmlFor={inputId}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 16px",
        borderRadius: "8px",
        cursor: isSubmitted ? "default" : "pointer",
        transition: "border-color 0.15s, background 0.15s",
        ...colors[stateClass],
      }}
    >
      <input
        ref={inputRef}
        id={inputId}
        type="radio"
        name={groupName}
        value={option.id}
        checked={isSelected}
        disabled={isSubmitted}
        onChange={() => onChange(option.id)}
        style={{ marginTop: "2px", accentColor: "#3b82f6", width: "18px", height: "18px", flexShrink: 0 }}
        aria-describedby={isSubmitted || isReview ? `${inputId}-status` : undefined}
      />
      <span style={{ flex: 1, fontSize: "15px", color: "#0f172a", lineHeight: "1.5" }}>
        <span style={{ fontWeight: 600, marginRight: "8px", color: "#64748b" }}>{option.id}.</span>
        {option.text}
      </span>
      {(isSubmitted || isReview) && (
        <span
          id={`${inputId}-status`}
          aria-hidden="true"
          style={{ fontSize: "18px" }}
        >
          {option.isCorrect ? "✓" : isSelected ? "✗" : ""}
        </span>
      )}
      {/* Screen-reader status */}
      {(isSubmitted || isReview) && (
        <span className="sr-only">
          {option.isCorrect ? "(correct)" : isSelected && !option.isCorrect ? "(your answer, incorrect)" : ""}
        </span>
      )}
    </label>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const AccessibleAssessment: React.FC<AccessibleAssessmentProps> = ({
  question,
  questionNumber,
  totalQuestions,
  timeRemainingSeconds,
  selectedAnswer = "",
  isSubmitted = false,
  isReviewMode = false,
  onAnswer,
  onNext,
  onPrev,
  onFlag,
  isFlagged = false,
  showExplanation,
  extraDescribedBy,
}) => {
  const uid = useId();
  const groupName = `q-${uid}`;
  const fieldsetId = `fieldset-${uid}`;
  const statusId = `status-${uid}`;
  const timerId = `timer-${uid}`;
  const hintId = `hint-${uid}`;

  const [announcement, setAnnouncement] = useState("");
  const shortAnswerRef = useRef<HTMLTextAreaElement>(null);
  const firstOptionRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut: 1-4 for options A-D, N for next, P for prev
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isSubmitted) return;
      const target = e.target as HTMLElement;
      if (target.tagName === "TEXTAREA" || target.tagName === "INPUT" && (target as HTMLInputElement).type === "text") return;

      const optionKeys: Record<string, string> = { "1": "A", "2": "B", "3": "C", "4": "D" };
      if (optionKeys[e.key] && question.options) {
        const optId = optionKeys[e.key];
        const opt = question.options.find((o) => o.id === optId);
        if (opt) {
          onAnswer(optId);
          setAnnouncement(`Selected option ${optId}: ${opt.text}`);
        }
      }
      if (e.key === "n" || e.key === "N") onNext?.();
      if (e.key === "p" || e.key === "P") onPrev?.();
      if (e.key === "f" || e.key === "F") { onFlag?.(); setAnnouncement(isFlagged ? "Question unflagged" : "Question flagged for review"); }
    },
    [isSubmitted, question.options, onAnswer, onNext, onPrev, onFlag, isFlagged],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Announce time warnings
  useEffect(() => {
    if (timeRemainingSeconds === 300) setAnnouncement("5 minutes remaining");
    if (timeRemainingSeconds === 60)  setAnnouncement("1 minute remaining — please finish your answer");
    if (timeRemainingSeconds === 10)  setAnnouncement("10 seconds remaining");
  }, [timeRemainingSeconds]);

  // Announce answer selection
  const handleMCQChange = (id: string) => {
    onAnswer(id);
    const opt = question.options?.find((o) => o.id === id);
    if (opt) setAnnouncement(`Selected: ${id}. ${opt.text}`);
  };

  const isLocked = isSubmitted || isReviewMode;

  const describedByParts = [
    question.hint ? hintId : "",
    extraDescribedBy ?? "",
  ].filter(Boolean).join(" ") || undefined;

  return (
    <div
      style={{ fontFamily: "system-ui, sans-serif", maxWidth: "720px", margin: "0 auto" }}
      role="main"
    >
      {/* Screen-reader only styles */}
      <style>{`.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}`}</style>

      {/* ARIA live region for announcements */}
      <div
        id={statusId}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Progress & Timer header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        {/* Progress */}
        <div>
          <div
            aria-label={`Question ${questionNumber} of ${totalQuestions}`}
            style={{ fontSize: "13px", color: "#64748b", marginBottom: "6px" }}
          >
            Question <strong>{questionNumber}</strong> of {totalQuestions}
          </div>
          <div
            role="progressbar"
            aria-valuenow={questionNumber}
            aria-valuemin={1}
            aria-valuemax={totalQuestions}
            aria-label="Assessment progress"
            style={{
              width: "200px",
              height: "6px",
              background: "#e2e8f0",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${(questionNumber / totalQuestions) * 100}%`,
                height: "100%",
                background: "#3b82f6",
                borderRadius: "999px",
                transition: "width 0.3s",
              }}
            />
          </div>
        </div>

        {/* Timer */}
        {timeRemainingSeconds !== undefined && (
          <div
            id={timerId}
            aria-live="off"
            aria-label={`Time remaining: ${formatTime(timeRemainingSeconds)}`}
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: timeRemainingSeconds < 60 ? "#ef4444" : "#0f172a",
              fontVariantNumeric: "tabular-nums",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" />
            </svg>
            <span>{formatTime(timeRemainingSeconds)}</span>
          </div>
        )}
      </div>

      {/* Optional image */}
      {question.imageUrl && (
        <figure style={{ margin: "0 0 20px 0" }}>
          <img
            src={question.imageUrl}
            alt="Question context image"
            style={{ maxWidth: "100%", borderRadius: "8px", border: "1px solid #e2e8f0" }}
          />
        </figure>
      )}

      {/* Optional audio */}
      {question.audioUrl && (
        <div style={{ marginBottom: "20px" }}>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio
            controls
            src={question.audioUrl}
            aria-label="Listening passage"
            style={{ width: "100%" }}
          >
            <track kind="captions" src="" label="English captions" />
            Your browser does not support audio playback.
          </audio>
        </div>
      )}

      {/* Question fieldset */}
      <fieldset
        id={fieldsetId}
        aria-describedby={describedByParts}
        style={{
          border: "none",
          margin: 0,
          padding: 0,
        }}
      >
        <legend
          style={{
            fontSize: "18px",
            fontWeight: 600,
            color: "#0f172a",
            lineHeight: "1.6",
            marginBottom: "20px",
            display: "block",
            width: "100%",
          }}
        >
          {question.prompt}
        </legend>

        {/* Hint */}
        {question.hint && (
          <div
            id={hintId}
            role="note"
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: "6px",
              padding: "10px 14px",
              fontSize: "13px",
              color: "#92400e",
              marginBottom: "16px",
            }}
          >
            <strong>Hint: </strong>{question.hint}
          </div>
        )}

        {/* MCQ / True-False */}
        {(question.type === "MCQ" || question.type === "TRUE_FALSE") && question.options && (
          <div
            role="radiogroup"
            aria-labelledby={fieldsetId}
            aria-required="true"
            style={{ display: "flex", flexDirection: "column", gap: "10px" }}
          >
            {question.options.map((opt, idx) => (
              <MCQOption
                key={opt.id}
                option={opt}
                groupName={groupName}
                isSelected={selectedAnswer === opt.id}
                isSubmitted={isLocked}
                isReview={isReviewMode}
                onChange={handleMCQChange}
                inputRef={idx === 0 ? firstOptionRef : undefined}
              />
            ))}
          </div>
        )}

        {/* Short Answer */}
        {question.type === "SHORT_ANSWER" && (
          <div>
            <label
              htmlFor={`${groupName}-short`}
              className="sr-only"
            >
              Your answer
            </label>
            <textarea
              id={`${groupName}-short`}
              ref={shortAnswerRef}
              value={selectedAnswer}
              onChange={(e) => onAnswer(e.target.value)}
              disabled={isLocked}
              rows={5}
              maxLength={question.maxLength ?? 500}
              aria-required="true"
              aria-describedby={describedByParts}
              placeholder="Type your answer here…"
              style={{
                width: "100%",
                padding: "12px",
                fontSize: "15px",
                border: "2px solid #e2e8f0",
                borderRadius: "8px",
                resize: "vertical",
                fontFamily: "inherit",
                color: "#0f172a",
                outline: "none",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            />
            <div
              aria-live="polite"
              style={{ fontSize: "12px", color: "#94a3b8", textAlign: "right", marginTop: "4px" }}
            >
              {selectedAnswer.length} / {question.maxLength ?? 500} characters
            </div>
          </div>
        )}

        {/* Fill-in-the-blank */}
        {question.type === "FILL_BLANK" && (
          <div>
            <label htmlFor={`${groupName}-fill`} className="sr-only">Fill in the blank</label>
            <input
              id={`${groupName}-fill`}
              type="text"
              value={selectedAnswer}
              onChange={(e) => onAnswer(e.target.value)}
              disabled={isLocked}
              aria-required="true"
              placeholder="Type the missing word or phrase…"
              style={{
                width: "100%",
                padding: "12px 16px",
                fontSize: "16px",
                border: "2px solid #e2e8f0",
                borderRadius: "8px",
                fontFamily: "inherit",
                color: "#0f172a",
                boxSizing: "border-box",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#3b82f6"; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = "#e2e8f0"; }}
            />
          </div>
        )}
      </fieldset>

      {/* Explanation (review mode) */}
      {showExplanation && (
        <div
          role="region"
          aria-label="Explanation"
          style={{
            marginTop: "20px",
            padding: "14px 16px",
            background: "#f0f9ff",
            border: "1px solid #bae6fd",
            borderRadius: "8px",
            fontSize: "14px",
            color: "#0c4a6e",
          }}
        >
          <strong>Explanation: </strong>{showExplanation}
        </div>
      )}

      {/* Navigation & Flag */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "28px",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {onPrev && (
            <button
              onClick={onPrev}
              aria-label="Previous question"
              style={navButtonStyle("secondary")}
            >
              ← Previous
            </button>
          )}
          {onFlag && (
            <button
              onClick={() => { onFlag(); setAnnouncement(isFlagged ? "Question unflagged" : "Question flagged for review"); }}
              aria-pressed={isFlagged}
              aria-label={isFlagged ? "Unflag this question" : "Flag this question for review"}
              style={navButtonStyle(isFlagged ? "flagged" : "outline")}
            >
              {isFlagged ? "🚩 Flagged" : "⚑ Flag"}
            </button>
          )}
        </div>

        {onNext && (
          <button
            onClick={onNext}
            aria-label={questionNumber === totalQuestions ? "Submit assessment" : "Next question"}
            style={navButtonStyle("primary")}
          >
            {questionNumber === totalQuestions ? "Submit" : "Next →"}
          </button>
        )}
      </div>

      {/* Keyboard shortcut legend */}
      {!isLocked && question.type === "MCQ" && (
        <details style={{ marginTop: "20px" }}>
          <summary style={{ fontSize: "12px", color: "#94a3b8", cursor: "pointer", userSelect: "none" }}>
            Keyboard shortcuts
          </summary>
          <div
            role="table"
            aria-label="Keyboard shortcuts"
            style={{ marginTop: "8px", fontSize: "12px", color: "#64748b", display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 16px" }}
          >
            <span role="cell"><kbd style={kbdStyle}>1</kbd>–<kbd style={kbdStyle}>4</kbd></span><span role="cell">Select option A–D</span>
            <span role="cell"><kbd style={kbdStyle}>N</kbd></span><span role="cell">Next question</span>
            <span role="cell"><kbd style={kbdStyle}>P</kbd></span><span role="cell">Previous question</span>
            <span role="cell"><kbd style={kbdStyle}>F</kbd></span><span role="cell">Flag / unflag question</span>
          </div>
        </details>
      )}
    </div>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

function navButtonStyle(variant: "primary" | "secondary" | "outline" | "flagged"): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "10px 20px",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
    border: "2px solid transparent",
    transition: "background 0.15s, border-color 0.15s",
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
  };
  if (variant === "primary")   return { ...base, background: "#3b82f6", color: "#fff", borderColor: "#3b82f6" };
  if (variant === "secondary") return { ...base, background: "#f8fafc", color: "#334155", borderColor: "#e2e8f0" };
  if (variant === "outline")   return { ...base, background: "#fff", color: "#64748b", borderColor: "#e2e8f0" };
  if (variant === "flagged")   return { ...base, background: "#fef3c7", color: "#92400e", borderColor: "#fcd34d" };
  return base;
}

const kbdStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "1px 6px",
  border: "1px solid #d1d5db",
  borderRadius: "4px",
  background: "#f9fafb",
  fontFamily: "monospace",
  fontSize: "11px",
};

export default AccessibleAssessment;
