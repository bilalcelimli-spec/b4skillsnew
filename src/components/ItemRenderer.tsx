import React, { useState } from "react";
import { Item } from "../lib/assessment-engine/types";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { Volume2, Mic, FileText, ChevronRight, BrainCircuit } from "lucide-react";
import { cn } from "../lib/utils";
import { SpeakingRecorder } from "./SpeakingRecorder";
import { WritingEditor } from "./WritingEditor";

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
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const itemSkill = String(item.skill).toUpperCase();
  
  const renderPassage = (passage: string | undefined) => {
    let elements = [];
    
    if (content?.imageUrl) {
      elements.push(
        <div key="image" className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col justify-center items-center mb-6">
          <img src={content.imageUrl} alt="Question Visual" className="max-w-full max-h-64 rounded-xl shadow-md" />
        </div>
      );
    }
    
    if (!passage) return elements.length > 0 ? <>{elements}</> : null;

    if (passage.startsWith('[Audio:') && passage.endsWith(']')) {
      const audioText = passage.slice(7, -1).trim();
      elements.push(
        <div key="mock-audio" className="p-8 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-indigo-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-200">
            <Volume2 size={32} />
          </div>
          <div className="text-center">
            <div className="font-bold text-indigo-900">Listening Task</div>
            <div className="text-sm text-indigo-600 mt-2 italic">{audioText}</div>
          </div>
        </div>
      );
    } else if (passage.startsWith('[Image of') && passage.endsWith(']')) {
      elements.push(
        <div key="mock-img" className="p-8 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col items-center gap-4 mb-6">
          <div className="w-full h-48 bg-slate-200 rounded flex items-center justify-center text-slate-500 italic">
            {passage}
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

  switch (itemSkill) {
    case "READING":
    case "GRAMMAR":
    case "VOCABULARY":
      return (
        <div className="space-y-6" role="form" aria-labelledby="item-prompt">
          {renderPassage(content.passage)}
          <fieldset className="space-y-4">
            <legend id="item-prompt" className="text-xl font-black text-slate-900 uppercase tracking-tight mb-4">
              {content.prompt}
            </legend>
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
              )})}
            </div>
            <div className="pt-4">
              <button
                disabled={selectedOption === null || disabled}
                onClick={() => { if (selectedOption !== null) { onResponse(selectedOption); setSelectedOption(null); } }}
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
          </fieldset>
        </div>
      );

    case "LISTENING":
      return (
        <div className="space-y-6">
          {renderPassage(content.passage)}
          {content.audioUrl && (
            <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col items-center gap-4">
              <audio controls src={content.audioUrl} className="w-full max-w-md mt-4" />
            </div>
          )}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900">{content.prompt}</h3>
            <div className="grid grid-cols-1 gap-3">
              {content.options?.map((option: any, index: number) => {
                const optionText = typeof option === "string" ? option : option.text;
                return (
                <button
                  key={index}
                  disabled={disabled}
                  onClick={() => onResponse(index)}
                  className="w-full text-left p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-sm">
                      {String.fromCharCode(65 + index)}
                    </div>
                    <span className="font-medium text-slate-700">{optionText}</span>
                  </div>
                </button>
              )})}
            </div>
          </div>
        </div>
      );

    case "SPEAKING":
      return (
        <div className="space-y-8">
          {renderPassage(content.passage)}
          <div className="p-8 bg-rose-50 border border-rose-100 rounded-3xl flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-rose-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-rose-200">
              <Mic size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight text-center">{content.prompt}</h3>
            <div className="text-xs text-rose-600 font-black uppercase tracking-widest bg-white px-4 py-1 rounded-full border border-rose-100">
              Max Time: {content.maxTime || 60}s
            </div>
          </div>
          
          {feedback && (
            <Card className="border-emerald-100 bg-emerald-50/30 rounded-3xl overflow-hidden shadow-sm">
              <CardHeader className="border-b border-emerald-100/50 bg-emerald-50/50 p-4">
                <div className="flex items-center gap-2 text-emerald-700 font-black text-[10px] uppercase tracking-widest">
                  <BrainCircuit size={14} />
                  AI Real-time Evaluation
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="text-sm text-slate-700 font-medium leading-relaxed italic">
                  "{feedback.feedback}"
                </div>
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
            maxTime={content.maxTime || 60}
            onRecordingComplete={onResponse}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadStatus={uploadStatus}
          />
        </div>
      );

    case "WRITING":
      return (
        <div className="space-y-8">
          <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-3xl">
            <div className="flex items-center gap-2 mb-4 text-indigo-600 font-black uppercase tracking-widest text-[10px]">
              <FileText size={14} />
              Writing Task
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-2">{content.prompt}</h3>
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Minimum requirement: {content.minWords || 50} words</div>
          </div>

          <WritingEditor 
            prompt={content.prompt}
            minWords={content.minWords || 50}
            onWritingComplete={onResponse}
            isUploading={isUploading}
            uploadProgress={uploadProgress}
            uploadStatus={uploadStatus}
          />
          
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
                        <div className="text-[10px] text-slate-500 font-medium leading-relaxed">
                          {corr.explanation}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      );

    default:
      return <div>Unsupported item type</div>;
  }
};
