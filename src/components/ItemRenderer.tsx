import React, { useState, useEffect } from "react";
import { Item } from "../lib/assessment-engine/types";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { Volume2, Mic, FileText, ChevronRight, BrainCircuit } from "lucide-react";
import { cn } from "../lib/utils";
import { SpeakingRecorder } from "./SpeakingRecorder";
import { WritingEditor } from "./WritingEditor";
import { AudioPlayer } from "./AudioPlayer";

interface ItemRendererProps {
  item: Item;
  onResponse: (value: any) => void;
  disabled?: boolean;
  feedback?: any;
  isUploading?: boolean;
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';
}

export const ItemRenderer: React.FC<ItemRendererProps> = ({ 
  item, 
  onResponse, 
  disabled, 
  feedback,
  isUploading = false,
  uploadProgress = 0,
  uploadStatus = 'idle'
}) => {
  const content = (item as any).content ?? item.metadata ?? {};
  const itemCode = (item as any).itemCode as string | null | undefined;
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textValue, setTextValue] = useState<string>("");
  const [fibAnswers, setFibAnswers] = useState<string[]>([]);
  const itemSkill = String(item.skill).toUpperCase();
  const itemId = (item as any).id as string | undefined;

  // Reset all input state when item changes
  useEffect(() => {
    setSelectedOption(null);
    setTextValue("");
    setFibAnswers([]);
  }, [itemId]);

  /**
   * Renders a fill-in-the-blanks scaffold inline.
   * Each `___` in the text is replaced with a real <input> element.
   * Returns [ReactNode, blankCount, allFilled, currentAnswers, setAnswers].
   */
  const renderInlineFIB = (
    scaffold: string,
    answers: string[],
    setAnswers: React.Dispatch<React.SetStateAction<string[]>>,
    dis: boolean
  ): React.ReactNode => {
    const parts = scaffold.split("___");
    const count = parts.length - 1;
    // Ensure answers array is sized
    const ans = answers.length === count ? answers : Array(count).fill("") as string[];
    return (
      <div className="text-lg leading-loose text-slate-800 font-semibold whitespace-pre-wrap">
        {parts.map((part, i) => (
          <React.Fragment key={i}>
            <span>{part}</span>
            {i < count && (
              <input
                type="text"
                value={ans[i] ?? ""}
                onChange={(e) => {
                  const next = [...(answers.length === count ? answers : Array(count).fill(""))];
                  next[i] = e.target.value;
                  setAnswers(next);
                }}
                disabled={dis}
                placeholder={`···`}
                className="inline-block border-b-2 border-indigo-500 focus:border-indigo-700 bg-transparent outline-none text-indigo-700 font-bold px-1 mx-1 text-center transition-all disabled:opacity-50"
                style={{ minWidth: "72px", width: Math.max(72, ((ans[i]?.length || 4) + 2) * 11) }}
                aria-label={`Blank ${i + 1}`}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  };

  /** Renders the item code badge (top-right corner) */
  const renderCodeBadge = () =>
    itemCode ? (
      <div className="flex justify-end mb-3">
        <span
          className="font-mono text-[11px] font-black tracking-widest text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-lg select-all shadow-sm"
          title="Item code"
        >
          {itemCode}
        </span>
      </div>
    ) : null;
  const fallbackImage =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450">
        <rect width="100%" height="100%" fill="#e2e8f0"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#475569" font-family="Arial, sans-serif" font-size="24">
          Image unavailable
        </text>
      </svg>`
    );
  const handleImageError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    const img = e.currentTarget;
    img.onerror = null;
    img.src = fallbackImage;
  };
  
  const renderPassage = (passage: string | undefined) => {
    let elements = [];
    
    if (content?.imageUrl && !(itemSkill === 'LISTENING' && String((item as any).type).toUpperCase() === 'FILL_IN_BLANKS')) {
      elements.push(
        <div key="image" className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-center items-center mb-6">
          <img
            src={content.imageUrl}
            alt="Question Visual"
            className="max-w-full max-h-64 rounded-xl shadow-md"
            onError={handleImageError}
          />
        </div>
      );
    }
    
    if (!passage) return elements.length > 0 ? <>{elements}</> : null;

    if (passage.startsWith('[Audio:') && passage.endsWith(']')) {
      const audioText = passage.slice(7, -1).trim();
      // Use content.audioUrl if available, otherwise show a pending-asset notice
      const audioSrc = content?.audioUrl as string | undefined;
      elements.push(
        audioSrc ? (
          <div key="audio-player" className="mb-6">
            <AudioPlayer
              src={audioSrc}
              maxPlays={2}
              autoPlay={false}
              showWaveform={true}
              aria-label="Listening audio for this question"
            />
          </div>
        ) : (
          <div key="audio-pending" className="p-6 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-4 mb-6" role="region" aria-label="Audio content">
            <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow shadow-indigo-300 flex-shrink-0" aria-hidden="true">
              <Volume2 size={24} />
            </div>
            <div>
              <div className="font-bold text-indigo-900 text-sm">Listening Task</div>
              <div className="text-xs text-indigo-700 mt-1 leading-relaxed">{audioText}</div>
            </div>
          </div>
        )
      );
    } else if (passage.startsWith('[Image of') && passage.endsWith(']')) {
      const imgDescription = passage.slice(1, -1); // strip outer []
      elements.push(
        <div key="img-placeholder" className="p-6 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center gap-3 mb-6" role="img" aria-label={imgDescription}>
          <div className="w-full h-40 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <span className="text-xs font-medium text-slate-500 text-center px-4">{imgDescription}</span>
          </div>
        </div>
      );
    } else {
      elements.push(
        <div 
          key="text"
          className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm leading-relaxed text-slate-700 mb-6"
          aria-label="Reading passage"
          tabIndex={0}
        >
          {passage}
        </div>
      );
    }

    return <>{elements}</>;
  };

  const renderItem = (): React.ReactElement => {
  switch (itemSkill) {
    case "READING":
    case "GRAMMAR":
    case "VOCABULARY": {
      const hasRGVOptions = Array.isArray(content.options) && content.options.length > 0;
      const isRGVFib =
        item.type === "FILL_IN_BLANKS" ||
        (!item.type && !hasRGVOptions);

      if (isRGVFib) {
        // Determine if prompt has inline blanks (___)
        const rgvPrompt = content.prompt as string | undefined;
        const rgvPassageRaw = content.passage as string | undefined;
        const rgvScaffold = (rgvPrompt?.includes("___") ? rgvPrompt : null) ??
                             (rgvPassageRaw?.includes("___") ? rgvPassageRaw : null);
        const rgvBlankCount = rgvScaffold ? (rgvScaffold.match(/___/g) || []).length : 0;

        // Ensure fibAnswers is sized for this item
        const rgvAnswers = fibAnswers.length === rgvBlankCount
          ? fibAnswers
          : Array(Math.max(1, rgvBlankCount)).fill("") as string[];
        const rgvAllFilled = rgvBlankCount > 0
          ? rgvAnswers.every((a) => a.trim() !== "")
          : textValue.trim() !== "";

        return (
          <div className="space-y-6" role="form" aria-labelledby="item-prompt">
            {renderPassage(rgvScaffold ? undefined : rgvPassageRaw)}
            <fieldset className="space-y-4">
              {/* Show prompt as label only when it's not the scaffold */}
              {rgvPrompt && !rgvScaffold && (
                <legend id="item-prompt" className="text-xl font-black text-slate-900 uppercase tracking-tight mb-2">
                  {rgvPrompt}
                </legend>
              )}
              {content.question && (
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl text-lg font-medium text-slate-800 mb-4">
                  {content.question}
                </div>
              )}
              {rgvScaffold && rgvBlankCount > 0 ? (
                // Inline FIB: render ___ as real inputs inside the text
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl">
                  {renderInlineFIB(rgvScaffold, rgvAnswers, setFibAnswers, !!disabled)}
                </div>
              ) : (
                // Single plain input (no scaffold)
                <input
                  type="text"
                  value={textValue}
                  onChange={(e) => setTextValue(e.target.value)}
                  disabled={disabled}
                  placeholder="Type your answer here..."
                  className="w-full text-lg p-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all disabled:opacity-50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && textValue.trim() && !disabled) {
                      onResponse(textValue.trim());
                      setTextValue("");
                    }
                  }}
                />
              )}
              <div className="pt-2">
                <button
                  disabled={!rgvAllFilled || !!disabled}
                  onClick={() => {
                    if (!rgvAllFilled) return;
                    if (rgvScaffold && rgvBlankCount > 0) {
                      onResponse(rgvAnswers.map((a) => a.trim()).join("|"));
                      setFibAnswers([]);
                    } else {
                      onResponse(textValue.trim());
                      setTextValue("");
                    }
                  }}
                  className={cn(
                    "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                    rgvAllFilled && !disabled
                      ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  )}
                >
                  Confirm Answer
                </button>
              </div>
            </fieldset>
          </div>
        );
      }

      // Safety-net: if no separate passage but the prompt contains both a
      // passage body and a question stem, split them on the fly.
      const rawPassage = content.passage as string | undefined;
      const rawPrompt = (content.prompt as string | undefined) ?? "";
      let displayPassage = rawPassage;
      let displayPrompt = rawPrompt;
      if (!rawPassage && rawPrompt.endsWith("?")) {
        const splitMatch = rawPrompt.match(/^([\s\S]{60,}?[.!])\s{0,6}([A-Z][^\n.!?]{8,}\?)\s*$/);
        if (splitMatch && splitMatch[1].trim().split(/\s+/).length >= 8) {
          displayPassage = splitMatch[1].trim();
          displayPrompt = splitMatch[2].trim();
        }
      }

      // READING — sticky question panel: passage scrolls, question stays anchored
      const isReadingWithPassage = itemSkill === "READING" && !!displayPassage;

      const optionButtons = (
        <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-labelledby="item-prompt">
          {content.options?.map((option: any, index: number) => {
            const optionText = typeof option === "string" ? option : option.text;
            return (
              <button
                key={index}
                role="radio"
                aria-checked={selectedOption === index ? "true" : "false"}
                disabled={disabled}
                onClick={() => setSelectedOption(index)}
                className={cn(
                  "w-full text-left p-5 rounded-2xl border-2 transition-all group focus:ring-4 focus:ring-indigo-100 outline-none",
                  selectedOption === index
                    ? "border-indigo-500 bg-indigo-50"
                    : "border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
                aria-label={`Option ${String.fromCharCode(65 + index)}: ${optionText}`}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-colors border",
                    selectedOption === index
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-600 border-slate-100"
                  )}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className="font-bold text-slate-700 uppercase tracking-tight text-sm">{optionText}</span>
                </div>
              </button>
            );
          })}
        </div>
      );

      const confirmBtn = (
        <div className="pt-4">
          <button
            disabled={selectedOption === null || disabled}
            onClick={() => {
              if (selectedOption !== null) {
                const opt = content.options[selectedOption];
                const answer = (opt && typeof opt === "object" && opt.id) ? opt.id : selectedOption;
                onResponse(answer);
                setSelectedOption(null);
              }
            }}
            className={cn(
              "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
              selectedOption !== null && !disabled
                ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                : "bg-slate-100 text-slate-400 cursor-not-allowed"
            )}
          >
            Confirm Answer
          </button>
        </div>
      );

      if (isReadingWithPassage) {
        // Split layout: scrollable passage on top, sticky question panel below
        return (
          <div className="flex flex-col gap-0" role="form" aria-labelledby="item-prompt">
            {/* Scrollable passage */}
            <div
              className="overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-sm"
              style={{ maxHeight: "320px" }}
              aria-label="Reading passage"
              tabIndex={0}
            >
              <div className="p-6 leading-relaxed text-slate-700">
                {displayPassage}
              </div>
            </div>
            {/* Sticky question panel */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-sm border border-t-0 border-slate-200 rounded-b-2xl px-6 py-4 space-y-4 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
              <legend id="item-prompt" className="text-base font-black text-slate-900 uppercase tracking-tight">
                {displayPrompt}
              </legend>
              {optionButtons}
              {confirmBtn}
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-6" role="form" aria-labelledby="item-prompt">
          {renderPassage(displayPassage)}
          <fieldset className="space-y-4">
            <legend id="item-prompt" className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">
              {displayPrompt}
            </legend>
            {optionButtons}
            {confirmBtn}
          </fieldset>
        </div>
      );
    }

    case "LISTENING": {
      // ── Type detection ────────────────────────────────────────────────────
      const hasOptions = Array.isArray(content.options) && content.options.length > 0;
      // FIB scaffold can be in content.prompt (new seed format) or content.passage (legacy)
      const fibScaffold: string | undefined =
        (typeof content.prompt === "string" && content.prompt.includes("___")) ? content.prompt :
        (typeof content.passage === "string" && content.passage.includes("___")) ? content.passage :
        undefined;
      const isListeningFIB =
        item.type === "FILL_IN_BLANKS" ||
        (!item.type && !hasOptions && !!fibScaffold);

      // Count blanks directly from the scaffold text
      const blankCount = isListeningFIB && fibScaffold
        ? (fibScaffold.match(/___/g) || []).length
        : isListeningFIB ? 1 : 0;

      // Ensure fibAnswers state array is sized correctly
      const currentFibAnswers = fibAnswers.length === blankCount
        ? fibAnswers
        : Array(Math.max(1, blankCount)).fill("") as string[];

      const fibAllFilled = isListeningFIB && currentFibAnswers.every((a) => a.trim() !== "");

      return (
        <div className="space-y-6" role="form" aria-labelledby="listening-prompt">
          {/* ── Audio player ─ NEVER show transcript/passage/ttsScript to student ── */}
          {content.audioUrl ? (
            <AudioPlayer
              src={content.audioUrl}
              maxPlays={2}
              autoPlay={true}
              countdownSeconds={3}
              showWaveform={true}
              onAllPlaysUsed={() => {}}
            />
          ) : (
            <div className="p-6 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center shrink-0">
                <Volume2 size={22} />
              </div>
              <div>
                <div className="font-black text-indigo-900 text-sm uppercase tracking-widest">Listening Task</div>
                <div className="text-xs text-indigo-600 mt-1">Audio will be available in the live assessment.</div>
              </div>
            </div>
          )}

          {/* ── Question body ─────────────────────────────────────────── */}
          {isListeningFIB ? (
            <div className="space-y-4">
              {/* Inline FIB: ___ replaced with real input elements */}
              {fibScaffold ? (
                <div
                  id="listening-prompt"
                  className="p-5 bg-slate-50 border border-slate-200 rounded-2xl leading-loose"
                  aria-label="Fill in the blanks task"
                >
                  {renderInlineFIB(fibScaffold, currentFibAnswers, setFibAnswers, !!disabled)}
                </div>
              ) : (
                /* No scaffold — plain single input */
                <input
                  id="listening-prompt"
                  type="text"
                  value={currentFibAnswers[0] ?? ""}
                  onChange={(e) => setFibAnswers([e.target.value])}
                  disabled={disabled}
                  placeholder="Type what you heard…"
                  className="w-full text-lg p-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all disabled:opacity-50"
                  aria-label="Answer"
                />
              )}
              <button
                disabled={!fibAllFilled || disabled}
                onClick={() => {
                  if (fibAllFilled) {
                    onResponse(currentFibAnswers.map((a) => a.trim()).join("|"));
                    setFibAnswers([]);
                  }
                }}
                className={cn(
                  "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                  fibAllFilled && !disabled
                    ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                )}
              >
                Confirm Answer
              </button>
            </div>
          ) : (
            /* Multiple choice */
            <div className="space-y-4">
              <h3 id="listening-prompt" className="text-xl font-bold text-slate-900">{content.prompt}</h3>
              {hasOptions ? (
                <>
                  <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-labelledby="listening-prompt">
                    {content.options.map((option: any, index: number) => {
                      const optionText = typeof option === "string" ? option : option.text;
                      return (
                        <button
                          key={index}
                          role="radio"
                          aria-checked={selectedOption === index ? "true" : "false"}
                          disabled={disabled}
                          onClick={() => setSelectedOption(index)}
                          className={cn(
                            "w-full text-left p-5 rounded-2xl border-2 transition-all group focus:ring-4 focus:ring-indigo-100 outline-none",
                            selectedOption === index
                              ? "border-indigo-500 bg-indigo-50"
                              : "border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                          aria-label={`Option ${String.fromCharCode(65 + index)}: ${optionText}`}
                        >
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs transition-colors border",
                              selectedOption === index
                                ? "bg-indigo-600 text-white border-indigo-600"
                                : "bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-indigo-600 border-slate-100"
                            )}>
                              {String.fromCharCode(65 + index)}
                            </div>
                            <span className="font-bold text-slate-700 uppercase tracking-tight text-sm">{optionText}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <div className="pt-2">
                    <button
                      disabled={selectedOption === null || disabled}
                      onClick={() => {
                        if (selectedOption !== null) {
                          const opt = content.options[selectedOption];
                          // Send option id if available (e.g. "A"), else index
                          const answer = (opt && typeof opt === "object" && opt.id) ? opt.id : selectedOption;
                          onResponse(answer);
                          setSelectedOption(null);
                        }
                      }}
                      className={cn(
                        "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all",
                        selectedOption !== null && !disabled
                          ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100"
                          : "bg-slate-100 text-slate-400 cursor-not-allowed"
                      )}
                    >
                      Confirm Answer
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 font-bold text-sm text-center">
                  Item configuration error: no answer options found.
                </div>
              )}
            </div>
          )}
        </div>
      );
    }

    case "SPEAKING": {
      // Strip [EXAMINER: ...] instructions from prompt — students must not see them
      const rawPrompt: string = content.prompt || "";
      const studentPrompt = rawPrompt.replace(/\[EXAMINER:[^\]]*\]/gi, "").replace(/\n{2,}/g, "\n").trim();
      const maxTime: number = content.responseTime || content.maxTime || 60;
      const prepTime: number = content.prepTime || 0;

      return (
        <div className="space-y-6">
          {/* Image if provided (e.g. "Look at the picture") */}
          {content.imageUrl && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex justify-center">
              <img
                src={content.imageUrl}
                alt="Speaking prompt visual"
                className="max-w-full max-h-64 rounded-xl shadow-md"
                onError={handleImageError}
              />
            </div>
          )}

          {/* Task card */}
          <div className="p-8 bg-rose-50 border border-rose-100 rounded-3xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-200">
              <Mic size={32} />
            </div>
            <h3 className="text-xl font-black text-slate-900 text-center leading-snug whitespace-pre-line">{studentPrompt}</h3>
            <div className="flex items-center gap-3 flex-wrap justify-center">
              {prepTime > 0 && (
                <div className="text-xs text-amber-700 font-black uppercase tracking-widest bg-amber-50 px-4 py-1 rounded-full border border-amber-200">
                  Preparation: {prepTime}s
                </div>
              )}
              <div className="text-xs text-rose-600 font-black uppercase tracking-widest bg-white px-4 py-1 rounded-full border border-rose-100">
                Response time: {maxTime}s
              </div>
            </div>
          </div>

          {/* AI feedback (post-submission) */}
          {feedback && (
            <Card className="border-emerald-100 bg-emerald-50/30 rounded-3xl overflow-hidden shadow-sm">
              <CardHeader className="border-b border-emerald-100/50 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 text-emerald-700 font-black text-[10px] uppercase tracking-widest">
                  <BrainCircuit size={14} />
                  AI Real-time Evaluation
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="text-sm text-slate-700 font-medium leading-relaxed italic">"{feedback.feedback}"</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(feedback.rubricScores || {}).map(([key, val]: [string, any]) => (
                    <div key={key} className="p-3 bg-white rounded-2xl border border-emerald-100 shadow-sm">
                      <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{key}</div>
                      <div className="text-sm font-black text-emerald-600">{val}/10</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <SpeakingRecorder
            maxTime={maxTime}
            onRecordingComplete={onResponse}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadStatus={uploadStatus}
          />
        </div>
      );
    }

    case "WRITING": {
      // Resolve word limits — data uses wordRange.min/max, legacy uses minWords
      const minWords: number = content.wordRange?.min ?? content.minWords ?? 50;
      const maxWords: number | null = content.wordRange?.max ?? content.maxWords ?? null;
      // Writing task prompt — prefer content.prompt (task description) over content.question
      const writingTask: string = content.prompt || content.question || "";
      // Any contextual stimulus (e.g. table, chart, input text) lives in content.passage
      const hasStimulus = !!(content.passage || content.input || content.stimulus);
      const stimulus: string = content.passage || content.input || content.stimulus || "";

      return (
        <div className="space-y-6">
          {/* Stimulus material (reading input, chart description, etc.) */}
          {hasStimulus && (
            <div
              className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm leading-relaxed text-slate-700"
              aria-label="Reading input for writing task"
            >
              {stimulus}
            </div>
          )}

          {/* Task card */}
          <div className="p-7 bg-indigo-50 border border-indigo-100 rounded-3xl">
            <div className="flex items-center gap-2 mb-3 text-indigo-600 font-black uppercase tracking-widest text-[10px]">
              <FileText size={14} />
              Writing Task
            </div>
            <p className="text-lg font-bold text-slate-900 leading-relaxed whitespace-pre-line">{writingTask}</p>
            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Minimum: {minWords} words
              </span>
              {maxWords && (
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  · Maximum: {maxWords} words
                </span>
              )}
            </div>
          </div>

          <WritingEditor
            prompt={writingTask}
            minWords={minWords}
            onWritingComplete={onResponse}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadStatus={uploadStatus}
          />

          {/* AI feedback (post-submission) */}
          {feedback?.corrections && feedback.corrections.length > 0 && (
            <Card className="border-indigo-100 bg-indigo-50/30 rounded-3xl overflow-hidden shadow-sm">
              <CardHeader className="border-b border-indigo-100/50 bg-indigo-50/50 p-4">
                <div className="flex items-center gap-2 text-indigo-700 font-black text-[10px] uppercase tracking-widest">
                  <BrainCircuit size={14} />
                  AI Writing Suggestions
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {feedback.corrections.map((corr: any, i: number) => (
                    <div key={i} className="p-4 bg-white border border-indigo-100 rounded-2xl flex items-start gap-4 shadow-sm">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-black text-xs border border-indigo-100 shrink-0">
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2 flex-wrap">
                          <span className="line-through text-slate-400 text-xs font-bold">{corr.original}</span>
                          <ChevronRight size={14} className="text-slate-300" />
                          <span className="text-indigo-600 text-xs font-black bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">
                            {corr.suggestion}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-auto">
                            {corr.type}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-medium leading-relaxed">{corr.explanation}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );
    }

    default:
      return <div>Unsupported item type</div>;
  }
  }; // end renderItem

  return (
    <>
      {renderCodeBadge()}
      {renderItem()}
    </>
  );
};
