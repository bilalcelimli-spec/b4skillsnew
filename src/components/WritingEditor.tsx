import React, { useState, useEffect } from "react";
import { Button } from "./ui/Button";
import { Loader2, FileText, CheckCircle2, AlertCircle, Info, Clock, Save } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";

interface WritingEditorProps {
  prompt: string;
  minWords: number;
  onWritingComplete: (text: string) => void;
  isUploading: boolean;
  uploadProgress?: number;
  uploadStatus?: 'idle' | 'uploading' | 'analyzing' | 'success' | 'error';
}

export const WritingEditor: React.FC<WritingEditorProps> = ({ 
  prompt, 
  minWords, 
  onWritingComplete, 
  isUploading,
  uploadProgress = 0,
  uploadStatus = 'idle'
}) => {
  const [text, setText] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!text || isUploading) return;
    const interval = setInterval(() => {
      setLastSaved(new Date());
      // Auto-save to sessionStorage for recovery
      try {
        sessionStorage.setItem(`writing-draft-${prompt.slice(0, 20)}`, text);
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [text, isUploading, prompt]);

  // Time tracking
  useEffect(() => {
    const timer = setInterval(() => setTimeSpent(prev => prev + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  // Recover draft on mount
  useEffect(() => {
    try {
      const draft = sessionStorage.getItem(`writing-draft-${prompt.slice(0, 20)}`);
      if (draft) setText(draft);
    } catch {}
  }, [prompt]);

  const handleChange = (value: string) => {
    setText(value);
    const plain = value.trim();
    const words = plain ? plain.split(/\s+/).filter((w: string) => w.length > 0) : [];
    setWordCount(words.length);
    setCharCount(plain.length);
  };

  const formatTimeSpent = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const handleSubmit = () => {
    if (wordCount >= minWords) {
      onWritingComplete(text);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-4 flex gap-3 mb-4">
        <Info className="text-indigo-600 shrink-0" size={20} />
        <p className="text-sm text-indigo-900">
          <strong>Instructions:</strong> Structure your response with clear paragraphs. Ensure your work is original and addresses all parts of the prompt.
        </p>
      </div>

      <div className="relative group">
        <div className={cn(
          "rounded-2xl border-2 transition-all overflow-hidden bg-white",
          wordCount >= minWords ? "border-green-200" : "border-slate-200 focus-within:border-indigo-500"
        )}>
          <textarea
            data-testid="writing-response"
            value={text}
            onChange={(event) => handleChange(event.target.value)}
            placeholder="Start writing your response here..."
            className="block h-80 w-full resize-none bg-white p-6 text-lg leading-8 text-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50"
            disabled={isUploading}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            aria-label="Writing response"
          />
        </div>
        
        <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500 border border-slate-200">
              <Clock size={14} />
              {formatTimeSpent(timeSpent)}
            </div>
            {lastSaved && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-green-50 text-green-600 border border-green-200">
                <Save size={12} />
                Saved {lastSaved.toLocaleTimeString()}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{charCount} chars</span>
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              aria-label={`Word count: ${wordCount} of ${minWords} minimum`}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all shadow-sm",
                wordCount >= minWords ? "bg-green-100 text-green-700 border border-green-200" : "bg-slate-100 text-slate-500 border border-slate-200"
              )}
            >
              <FileText size={16} />
              {wordCount} / {minWords} words
              {wordCount >= minWords && <CheckCircle2 size={14} className="ml-1" />}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100">
        <div className="flex items-center gap-3 text-slate-500 text-sm">
          <AlertCircle size={18} className="text-indigo-400" />
          <span>Autosave active. Your work is being saved every 30 seconds.</span>
        </div>
        
        <Button 
          size="lg" 
          disabled={wordCount < minWords || isUploading}
          onClick={handleSubmit}
          className="min-w-[200px] h-12 text-lg shadow-md"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 animate-spin" size={20} />
              {uploadStatus === 'uploading' ? `Uploading (${Math.round(uploadProgress)}%)...` : 
               uploadStatus === 'analyzing' ? "AI Scoring..." : 
               "Processing..."}
            </>
          ) : (
            "Submit Essay"
          )}
        </Button>
      </div>

      {isUploading && (
        <div className="mt-4">
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <motion.div 
              className={cn(
                "h-full transition-all duration-300",
                uploadStatus === 'error' ? "bg-red-500" : 
                uploadStatus === 'analyzing' ? "bg-amber-500" : "bg-indigo-600"
              )}
              initial={{ width: 0 }}
              animate={{ width: uploadStatus === 'analyzing' || uploadStatus === 'success' ? '100%' : `${uploadProgress}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-400 mt-1 text-right uppercase tracking-wider font-bold">
            {uploadStatus}
          </p>
        </div>
      )}

      {wordCount < minWords && text.length > 0 && (
        <motion.p 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm text-amber-600 font-semibold bg-amber-50 p-3 rounded-lg border border-amber-100 inline-block"
        >
          You need at least {minWords - wordCount} more words to submit your response.
        </motion.p>
      )}
    </div>
  );
};
