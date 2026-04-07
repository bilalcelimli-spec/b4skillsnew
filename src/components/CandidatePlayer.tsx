import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db, auth, storage } from "@/src/lib/firebase";
import { collection, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, uploadBytesResumable } from "firebase/storage";
import { TestItem } from "@/src/data/mockItems";
import { AdaptiveEngine, AbilityEstimate } from "@/src/services/adaptiveEngine";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader, CardFooter } from "./ui/Card";
import { SpeakingRecorder } from "./SpeakingRecorder";
import { WritingEditor } from "./WritingEditor";
import { CheckCircle2, Clock, AlertCircle, ChevronRight, Mic, FileText, BrainCircuit, Volume2 } from "lucide-react";
import confetti from "canvas-confetti";
import { cn } from "../lib/utils";

interface CandidatePlayerProps {
  organizationId: string;
  sessionId: string;
  onComplete: (finalTheta: number) => void;
}

export const CandidatePlayer: React.FC<CandidatePlayerProps> = ({ organizationId, sessionId, onComplete }) => {
  const [currentEstimate, setCurrentEstimate] = useState<AbilityEstimate>({ theta: 2.5, standardError: 1.0 });
  const [usedItemIds, setUsedItemIds] = useState<Set<string>>(new Set());
  const [currentItem, setCurrentItem] = useState<TestItem | null>(null);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{ score: number; feedback: string } | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'analyzing' | 'success' | 'error'>('idle');

  const MAX_QUESTIONS = 10;

  useEffect(() => {
    loadNextItem();
  }, []);

  const loadNextItem = () => {
    if (questionCount >= MAX_QUESTIONS) {
      finishTest();
      return;
    }

    // Force a mix of types for demo purposes
    let targetType: string | undefined;
    if (questionCount === 4) targetType = 'SPEAKING';
    if (questionCount === 7) targetType = 'WRITING';

    const nextItem = AdaptiveEngine.selectNextItem(currentEstimate.theta, usedItemIds, targetType);
    setCurrentItem(nextItem);
    setSelectedOption(null);
    setAiFeedback(null);
    setUploadStatus('idle');
    setUploadProgress(0);
    setQuestionCount(prev => prev + 1);
  };

  const handleObjectiveSubmit = async () => {
    if (selectedOption === null || !currentItem || isSubmitting) return;

    setIsSubmitting(true);
    const isCorrect = selectedOption === currentItem.content.correctIndex;
    
    const newEstimate = AdaptiveEngine.updateEstimate(currentEstimate, currentItem, isCorrect);
    await saveResponse(currentItem, isCorrect, newEstimate);
    setIsSubmitting(false);
    loadNextItem();
  };

  const handleSpeakingSubmit = async (blob: Blob) => {
    if (!currentItem || isSubmitting) return;
    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadStatus('uploading');

    try {
      // 1. Upload to Storage with progress tracking
      const storageRef = ref(storage, `organizations/${organizationId}/sessions/${sessionId}/speaking/${currentItem.id}_${Date.now()}.webm`);
      const uploadTask = uploadBytesResumable(storageRef, blob);

      const audioUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            setUploadStatus('error');
            reject(error);
          },
          async () => {
            setUploadStatus('analyzing');
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      // 2. Call AI Scoring API (Simulated)
      const aiResponse = await fetch("/api/score/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "SPEAKING", content: audioUrl })
      });
      const aiData = await aiResponse.json();
      setAiFeedback(aiData);
      setUploadStatus('success');

      // 3. Update Estimate and Save
      const newEstimate = AdaptiveEngine.updateEstimate(currentEstimate, currentItem, aiData.score);
      await saveResponse(currentItem, aiData.score, newEstimate, audioUrl, aiData.feedback);
      
      // Delay for UX to show AI analysis
      setTimeout(() => {
        setIsSubmitting(false);
        loadNextItem();
      }, 2000);
    } catch (error) {
      console.error("Speaking submission error:", error);
      setIsSubmitting(false);
    }
  };

  const handleWritingSubmit = async (text: string) => {
    if (!currentItem || isSubmitting) return;
    setIsSubmitting(true);
    setUploadProgress(0);
    setUploadStatus('uploading');

    try {
      // 1. Upload to Storage
      const storageRef = ref(storage, `organizations/${organizationId}/sessions/${sessionId}/writing/${currentItem.id}_${Date.now()}.html`);
      const blob = new Blob([text], { type: 'text/html' });
      
      const uploadTask = uploadBytesResumable(storageRef, blob);

      const artifactUrl = await new Promise<string>((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            setUploadProgress(progress);
          },
          (error) => {
            setUploadStatus('error');
            reject(error);
          },
          async () => {
            setUploadStatus('analyzing');
            const url = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(url);
          }
        );
      });

      // 2. Call AI Scoring API (Simulated)
      const aiResponse = await fetch("/api/score/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "WRITING", content: text })
      });
      const aiData = await aiResponse.json();
      setAiFeedback(aiData);
      setUploadStatus('success');

      // 3. Update Estimate and Save
      const newEstimate = AdaptiveEngine.updateEstimate(currentEstimate, currentItem, aiData.score);
      await saveResponse(currentItem, aiData.score, newEstimate, artifactUrl, aiData.feedback);

      // Delay for UX
      setTimeout(() => {
        setIsSubmitting(false);
        loadNextItem();
      }, 2000);
    } catch (error) {
      console.error("Writing submission error:", error);
      setUploadStatus('error');
      setIsSubmitting(false);
    }
  };

  const saveResponse = async (item: TestItem, scoreOrCorrect: boolean | number, newEstimate: AbilityEstimate, responseArtifact?: string, feedback?: string) => {
    try {
      const responseRef = collection(db, "organizations", organizationId, "sessions", sessionId, "responses");
      await addDoc(responseRef, {
        itemId: item.id,
        type: item.type,
        score: typeof scoreOrCorrect === 'boolean' ? (scoreOrCorrect ? 1 : 0) : scoreOrCorrect,
        ResponseArtifact: responseArtifact || null,
        feedback: feedback || null,
        thetaAfter: newEstimate.theta,
        timestamp: serverTimestamp()
      });

      const sessionRef = doc(db, "organizations", organizationId, "sessions", sessionId);
      await updateDoc(sessionRef, {
        currentStage: questionCount,
        abilityEstimate: newEstimate.theta,
        lastUpdated: serverTimestamp()
      });

      setCurrentEstimate(newEstimate);
      setUsedItemIds(prev => new Set([...prev, item.id]));
    } catch (error) {
      console.error("Error saving response:", error);
    }
  };

  const finishTest = async () => {
    setIsFinished(true);
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
    
    try {
      const sessionRef = doc(db, "organizations", organizationId, "sessions", sessionId);
      await updateDoc(sessionRef, {
        status: "completed",
        completedAt: serverTimestamp()
      });
      onComplete(currentEstimate.theta);
    } catch (error) {
      console.error("Error finalizing session:", error);
    }
  };

  if (isFinished) {
    const cefr = (() => {
      const theta = currentEstimate.theta;
      if (theta < 1.5) return { level: "A1", label: "Beginner", color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" };
      if (theta < 2.5) return { level: "A2", label: "Elementary", color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" };
      if (theta < 3.5) return { level: "B1", label: "Intermediate", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" };
      if (theta < 4.5) return { level: "B2", label: "Upper Intermediate", color: "text-orange-600", bg: "bg-orange-50", border: "border-orange-100" };
      return { level: "C1/C2", label: "Advanced", color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-100" };
    })();

    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <motion.div 
          initial={{ scale: 0.95, opacity: 0 }} 
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="mb-8 inline-flex p-5 bg-green-100 text-green-600 rounded-full shadow-sm">
            <CheckCircle2 size={56} />
          </div>
          
          <h2 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Great job, you've finished!</h2>
          <p className="text-slate-600 text-lg mb-10 max-w-md mx-auto">
            Your adaptive assessment is complete. Our AI has analyzed your performance across all skills.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <Card className={cn("border-2 shadow-sm overflow-hidden", cefr.border)}>
              <div className={cn("py-2 px-4 text-xs font-bold uppercase tracking-widest text-center", cefr.bg, cefr.color)}>
                Estimated CEFR Level
              </div>
              <CardContent className="py-10">
                <div className={cn("text-6xl font-black mb-1", cefr.color)}>{cefr.level}</div>
                <div className="text-slate-500 font-medium">{cefr.label}</div>
              </CardContent>
            </Card>

            <Card className="border-2 border-slate-100 shadow-sm overflow-hidden">
              <div className="py-2 px-4 text-xs font-bold uppercase tracking-widest text-center bg-slate-50 text-slate-500">
                Ability Score (Theta)
              </div>
              <CardContent className="py-10">
                <div className="text-6xl font-black text-slate-900 mb-1">{currentEstimate.theta.toFixed(2)}</div>
                <div className="text-slate-500 font-medium">Scale: 1.0 - 5.0</div>
              </CardContent>
            </Card>
          </div>
          
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 mb-10 text-left flex gap-4">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-600">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="font-bold text-amber-900 mb-1">Provisional Result</h4>
              <p className="text-sm text-amber-800/80 leading-relaxed">
                This score is a preliminary estimate based on your adaptive performance. A final, verified report will be available in your dashboard after a secondary quality audit by our senior examiners.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto px-10 h-14 text-lg shadow-lg shadow-indigo-200" onClick={() => window.location.reload()}>
              Return to Dashboard
            </Button>
            <Button variant="ghost" size="lg" className="w-full sm:w-auto px-10 h-14 text-lg text-slate-500">
              Download Summary
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="h-2 w-48 bg-slate-200 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-indigo-600"
              initial={{ width: 0 }}
              animate={{ width: `${(questionCount / MAX_QUESTIONS) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-slate-500">Task {questionCount} of {MAX_QUESTIONS}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-mono text-sm">
          <Clock size={16} />
          <span>Adaptive Mode Active</span>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {currentItem && (
          <motion.div
            key={currentItem.id}
            initial={{ x: 20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -20, opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="relative overflow-hidden">
              {isSubmitting && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                  <div className="bg-white p-8 rounded-2xl shadow-2xl border border-slate-100 flex flex-col items-center text-center max-w-xs">
                    <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                      <BrainCircuit size={32} className="animate-pulse" />
                    </div>
                    <h4 className="text-lg font-bold text-slate-900 mb-2">AI Analysis in Progress</h4>
                    <p className="text-sm text-slate-500">Our engine is evaluating your response against CEFR rubrics...</p>
                  </div>
                </div>
              )}

              <CardHeader className="bg-slate-50/50">
                <div className="flex items-center gap-2 mb-2">
                  <span className={cn(
                    "px-2 py-0.5 text-xs font-bold rounded uppercase tracking-wider flex items-center gap-1",
                    currentItem.type === 'SPEAKING' ? "bg-red-100 text-red-700" : 
                    currentItem.type === 'WRITING' ? "bg-amber-100 text-amber-700" :
                    currentItem.type === 'LISTENING' ? "bg-blue-100 text-blue-700" :
                    currentItem.type === 'VOCABULARY' ? "bg-purple-100 text-purple-700" :
                    "bg-indigo-100 text-indigo-700"
                  )}>
                    {currentItem.type === 'SPEAKING' && <Mic size={12} />}
                    {currentItem.type === 'WRITING' && <FileText size={12} />}
                    {currentItem.type === 'LISTENING' && <Volume2 size={12} />}
                    {currentItem.type}
                  </span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-slate-500 text-xs font-medium">Difficulty: {currentItem.difficulty}</span>
                </div>
                {currentItem.content.passage && (
                  <div className="p-4 bg-white border border-slate-200 rounded-lg text-slate-800 leading-relaxed mb-4 italic">
                    {currentItem.content.passage}
                  </div>
                )}
                <h3 className="text-xl font-semibold text-slate-900 leading-snug">
                  {currentItem.content.prompt}
                </h3>
                {currentItem.content.audioUrl && (
                  <div className="mt-4 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                      <Volume2 size={20} />
                    </div>
                    <audio 
                      src={currentItem.content.audioUrl} 
                      controls 
                      className="w-full h-10"
                    />
                  </div>
                )}
              </CardHeader>

              <CardContent className="py-6">
                {currentItem.type === 'SPEAKING' ? (
                  <SpeakingRecorder 
                    maxTime={currentItem.content.maxTime || 60} 
                    onRecordingComplete={handleSpeakingSubmit}
                    isUploading={isSubmitting}
                    uploadProgress={uploadProgress}
                    uploadStatus={uploadStatus}
                  />
                ) : currentItem.type === 'WRITING' ? (
                  <WritingEditor 
                    prompt={currentItem.content.prompt}
                    minWords={currentItem.content.minWords || 100}
                    onWritingComplete={handleWritingSubmit}
                    isUploading={isSubmitting}
                    uploadProgress={uploadProgress}
                    uploadStatus={uploadStatus}
                  />
                ) : (
                  <div className="space-y-3">
                    {currentItem.content.options?.map((option, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedOption(index)}
                        className={cn(
                          "w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group",
                          selectedOption === index 
                            ? "border-indigo-600 bg-indigo-50/50 text-indigo-900" 
                            : "border-slate-100 hover:border-slate-300 bg-white text-slate-700"
                        )}
                      >
                        <span className="font-medium">{option}</span>
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
                          selectedOption === index ? "border-indigo-600 bg-indigo-600" : "border-slate-200 group-hover:border-slate-300"
                        )}>
                          {selectedOption === index && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>

              {currentItem.type !== 'SPEAKING' && currentItem.type !== 'WRITING' && (
                <CardFooter className="flex justify-end">
                  <Button 
                    size="lg" 
                    disabled={selectedOption === null || isSubmitting}
                    onClick={handleObjectiveSubmit}
                    className="min-w-[140px]"
                  >
                    {isSubmitting ? "Saving..." : questionCount === MAX_QUESTIONS ? "Finish Test" : "Next Question"}
                    {!isSubmitting && <ChevronRight className="ml-2" size={18} />}
                  </Button>
                </CardFooter>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 p-4 bg-amber-50 border border-amber-100 rounded-lg flex gap-3">
        <AlertCircle className="text-amber-600 shrink-0" size={20} />
        <p className="text-sm text-amber-800">
          <strong>Proctoring Active:</strong> Your camera and focus are being monitored. Do not switch tabs or leave the browser window.
        </p>
      </div>
    </div>
  );
};
