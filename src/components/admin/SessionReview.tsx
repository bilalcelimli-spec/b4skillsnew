import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { 
  ArrowLeft, 
  Mic, 
  FileText,
  ChevronRight,
  BarChart3
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";
import { SpeakingAnalysisDetails } from "./SpeakingAnalysisDetails";

interface SessionReviewProps {
  sessionId: string;
  onBack: () => void;
}

export const SessionReview: React.FC<SessionReviewProps> = ({ sessionId, onBack }) => {
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResponse, setSelectedResponse] = useState<any>(null);

  useEffect(() => {
    fetchResponses();
  }, [sessionId]);

  const fetchResponses = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/responses`);
      const data = await res.json();
      setResponses(data);
      if (data.length > 0) setSelectedResponse(data[0]);
    } catch (err) {
      console.error("Failed to fetch responses");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
          <ArrowLeft size={20} />
        </Button>
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Session Review</h2>
          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">ID: {sessionId}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Response List */}
        <div className="xl:col-span-1 space-y-4">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight px-2">Responses</h3>
          <div className="space-y-2">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 bg-slate-100 animate-pulse rounded-2xl" />
              ))
            ) : (
              responses.map((resp, i) => (
                <button
                  key={resp.id}
                  onClick={() => setSelectedResponse(resp)}
                  className={cn(
                    "w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-4 group",
                    selectedResponse?.id === resp.id 
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100" 
                      : "bg-white border-slate-100 hover:border-indigo-200 text-slate-600"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black",
                    selectedResponse?.id === resp.id ? "bg-white/20" : "bg-slate-50"
                  )}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">
                      {resp.item.skill}
                    </div>
                    <div className="text-xs font-bold truncate">
                      {resp.item.content?.prompt || "Response Content"}
                    </div>
                  </div>
                  <ChevronRight size={16} className={cn(
                    "transition-transform",
                    selectedResponse?.id === resp.id ? "translate-x-1" : "opacity-0 group-hover:opacity-100"
                  )} />
                </button>
              ))
            )}
          </div>
        </div>

        {/* Detailed Analysis */}
        <div className="xl:col-span-2">
          <AnimatePresence mode="wait">
            {selectedResponse ? (
              <motion.div
                key={selectedResponse.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Response Header */}
                <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                          {selectedResponse.item.skill === "SPEAKING" ? <Mic size={24} /> : <FileText size={24} />}
                        </div>
                        <div>
                          <CardTitle className="text-lg font-black uppercase tracking-tight">
                            {selectedResponse.item.skill} Analysis
                          </CardTitle>
                          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Score: {(selectedResponse.score * 100).toFixed(0)}% • Confidence: {(selectedResponse.metadata?.confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-indigo-600">{selectedResponse.metadata?.cefrLevel || "N/A"}</div>
                        <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CEFR Level</div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="space-y-6">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Prompt</div>
                        <p className="text-sm text-slate-900 font-bold leading-relaxed">
                          {selectedResponse.item.content?.prompt}
                        </p>
                      </div>
                      
                      {selectedResponse.item.skill === "SPEAKING" ? (
                        <SpeakingAnalysisDetails score={selectedResponse.metadata} />
                      ) : (
                        <div className="space-y-6">
                           <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed font-medium">
                            {selectedResponse.value}
                          </div>
                          {/* Writing specific feedback could go here */}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="h-full flex items-center justify-center py-20">
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <BarChart3 size={40} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium italic">Select a response to view detailed analysis</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
