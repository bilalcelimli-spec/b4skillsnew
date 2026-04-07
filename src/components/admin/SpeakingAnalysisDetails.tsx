import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { 
  Mic, 
  Clock, 
  Zap, 
  BarChart3, 
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Activity
} from "lucide-react";
import { cn } from "@/src/lib/utils";
import { AIScore } from "@/src/lib/scoring/gemini-scoring-service";

interface SpeakingAnalysisDetailsProps {
  score: AIScore;
}

export const SpeakingAnalysisDetails: React.FC<SpeakingAnalysisDetailsProps> = ({ score }) => {
  const features = score.speakingFeatures;
  if (!features) return null;

  return (
    <div className="space-y-8">
      {/* Transcription Section */}
      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
          <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
            <Mic className="text-indigo-600" size={18} />
            AI Transcription
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-sm text-slate-700 leading-relaxed font-medium italic">
            "{score.transcript}"
          </div>
        </CardContent>
      </Card>

      {/* Acoustic Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard 
          icon={<Activity className="text-blue-600" size={20} />}
          label="Speech Rate"
          value={`${features.speechRate} wpm`}
          description="Words per minute"
        />
        <FeatureCard 
          icon={<Clock className="text-amber-600" size={20} />}
          label="Pause Duration"
          value={`${features.pauseDuration}s`}
          description="Total silence detected"
        />
        <FeatureCard 
          icon={<Zap className="text-emerald-600" size={20} />}
          label="Pronunciation"
          value={`${features.pronunciationClarity}/10`}
          description="Clarity and articulation"
        />
      </div>

      {/* Linguistic Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FeatureCard 
          icon={<TrendingUp className="text-purple-600" size={20} />}
          label="Lexical Diversity"
          value={`${features.lexicalDiversity}/10`}
          description="Vocabulary variety"
        />
        <FeatureCard 
          icon={<CheckCircle2 className="text-indigo-600" size={20} />}
          label="Grammar Accuracy"
          value={`${features.grammaticalAccuracy}/10`}
          description="Syntactic correctness"
        />
        <FeatureCard 
          icon={<BarChart3 className="text-rose-600" size={20} />}
          label="Discourse Structure"
          value={`${features.discourseStructure}/10`}
          description="Flow and organization"
        />
      </div>

      {/* Corrections Section */}
      {score.corrections.length > 0 && (
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-6">
            <CardTitle className="text-sm font-black uppercase tracking-tight flex items-center gap-2">
              <AlertCircle className="text-rose-600" size={18} />
              Linguistic Corrections
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {score.corrections.map((correction, i) => (
                <div key={i} className="p-6 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      "px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest",
                      correction.type === "pronunciation" ? "bg-amber-100 text-amber-600" : "bg-rose-100 text-rose-600"
                    )}>
                      {correction.type}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400 line-through">{correction.original}</span>
                        <span className="text-xs font-black text-emerald-600">→ {correction.suggestion}</span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">{correction.explanation}</p>
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
};

const FeatureCard: React.FC<{ icon: React.ReactNode; label: string; value: string; description: string }> = ({ icon, label, value, description }) => (
  <Card className="border-slate-200 shadow-sm rounded-3xl hover:border-indigo-200 transition-colors">
    <CardContent className="p-6 flex items-center gap-4">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
        {icon}
      </div>
      <div>
        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</div>
        <div className="text-lg font-black text-slate-900">{value}</div>
        <div className="text-[10px] text-slate-400 font-medium">{description}</div>
      </div>
    </CardContent>
  </Card>
);
