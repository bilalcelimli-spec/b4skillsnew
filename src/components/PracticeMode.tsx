import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Monitor, Mic, Camera, Wifi, CheckCircle2, XCircle, 
  ChevronRight, Volume2, FileText, GripVertical, 
  ArrowRight, Info, Keyboard
} from "lucide-react";
import { Button } from "./ui/Button";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { cn } from "../lib/utils";
import { AudioPlayer } from "./AudioPlayer";

interface PracticeModeProps {
  onComplete: () => void;
  onSkip?: () => void;
}

type Step = "device-check" | "mc-practice" | "fill-practice" | "listening-practice" | "speaking-practice" | "writing-practice" | "ready";

interface DeviceStatus {
  microphone: "checking" | "ok" | "error";
  camera: "checking" | "ok" | "error" | "skipped";
  speakers: "checking" | "ok" | "error";
  internet: "checking" | "ok" | "error";
}

/**
 * Pre-test tutorial & practice mode.
 * - Device compatibility check (mic, camera, speakers, internet)
 * - One practice question per item type
 * - Keyboard navigation tutorial
 */
export const PracticeMode: React.FC<PracticeModeProps> = ({ onComplete, onSkip }) => {
  const [currentStep, setCurrentStep] = useState<Step>("device-check");
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>({
    microphone: "checking",
    camera: "checking",
    speakers: "checking",
    internet: "checking",
  });
  const [practiceAnswer, setPracticeAnswer] = useState<number | null>(null);
  const [practiceText, setPracticeText] = useState("");
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  // Device checks
  useEffect(() => {
    if (currentStep !== "device-check") return;

    // Check internet
    setDeviceStatus(prev => ({ ...prev, internet: navigator.onLine ? "ok" : "error" }));

    // Check microphone
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        stream.getTracks().forEach(t => t.stop());
        setDeviceStatus(prev => ({ ...prev, microphone: "ok" }));
      })
      .catch(() => setDeviceStatus(prev => ({ ...prev, microphone: "error" })));

    // Check camera (optional)
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        stream.getTracks().forEach(t => t.stop());
        setDeviceStatus(prev => ({ ...prev, camera: "ok" }));
      })
      .catch(() => setDeviceStatus(prev => ({ ...prev, camera: "skipped" })));

    // Check speakers (test AudioContext)
    try {
      const ctx = new AudioContext();
      ctx.close();
      setDeviceStatus(prev => ({ ...prev, speakers: "ok" }));
    } catch {
      setDeviceStatus(prev => ({ ...prev, speakers: "error" }));
    }
  }, [currentStep]);

  const allDevicesReady = deviceStatus.microphone === "ok" && 
    deviceStatus.speakers === "ok" && 
    deviceStatus.internet === "ok";

  const nextStep = useCallback(() => {
    setPracticeAnswer(null);
    setPracticeText("");
    setPracticeSubmitted(false);
    const steps: Step[] = ["device-check", "mc-practice", "fill-practice", "listening-practice", "speaking-practice", "writing-practice", "ready"];
    const idx = steps.indexOf(currentStep);
    if (idx < steps.length - 1) setCurrentStep(steps[idx + 1]);
  }, [currentStep]);

  const renderDeviceCheck = () => (
    <div className="space-y-8">
      <div className="text-center">
        <Monitor className="mx-auto mb-4 text-indigo-600" size={48} />
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Device Compatibility Check</h2>
        <p className="text-slate-500 mt-2">We'll verify your device is ready for the assessment</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {([
          { key: "microphone", icon: Mic, label: "Microphone", required: true },
          { key: "camera", icon: Camera, label: "Camera", required: false },
          { key: "speakers", icon: Volume2, label: "Speakers/Headphones", required: true },
          { key: "internet", icon: Wifi, label: "Internet Connection", required: true },
        ] as const).map(({ key, icon: Icon, label, required }) => {
          const status = deviceStatus[key];
          return (
            <Card key={key} className={cn(
              "rounded-2xl border-2 transition-all",
              status === "ok" ? "border-green-200 bg-green-50/30" :
              status === "error" ? "border-red-200 bg-red-50/30" :
              status === "skipped" ? "border-amber-200 bg-amber-50/30" :
              "border-slate-200"
            )}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  status === "ok" ? "bg-green-100 text-green-600" :
                  status === "error" ? "bg-red-100 text-red-600" :
                  "bg-slate-100 text-slate-400"
                )}>
                  <Icon size={24} />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-slate-900">{label}</div>
                  <div className="text-xs text-slate-500">
                    {required ? "Required" : "Optional"}
                  </div>
                </div>
                {status === "ok" && <CheckCircle2 className="text-green-500" size={24} />}
                {status === "error" && <XCircle className="text-red-500" size={24} />}
                {status === "skipped" && <span className="text-xs text-amber-600 font-bold">Skipped</span>}
                {status === "checking" && (
                  <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!allDevicesReady && deviceStatus.microphone !== "checking" && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
          <Info className="text-amber-600 shrink-0" size={20} />
          <div className="text-sm text-amber-800">
            <strong>Some devices are not available.</strong> A microphone and speakers are required for Speaking and Listening tasks. 
            Please check your browser permissions and try again.
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <Button onClick={nextStep} disabled={!allDevicesReady} size="lg">
          Continue to Practice <ChevronRight size={18} className="ml-1" />
        </Button>
        {onSkip && (
          <Button variant="ghost" onClick={onSkip} size="lg">
            Skip Tutorial
          </Button>
        )}
      </div>
    </div>
  );

  const renderMCPractice = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
        <span className="px-3 py-1 bg-indigo-100 rounded-lg">Practice 1/4</span>
        Multiple Choice
      </div>
      
      <h3 className="text-xl font-black text-slate-900">
        Choose the word that best completes the sentence:
      </h3>
      <div className="p-6 bg-white border border-slate-200 rounded-xl text-lg text-slate-700">
        "The weather was so nice that we decided to _____ a picnic in the park."
      </div>

      <div className="grid grid-cols-1 gap-3" role="radiogroup" aria-label="Practice options">
        {["make", "have", "do", "take"].map((option, i) => (
          <button
            key={i}
            role="radio"
            aria-checked={practiceAnswer === i}
            onClick={() => setPracticeAnswer(i)}
            className={cn(
              "w-full text-left p-5 rounded-2xl border-2 transition-all focus:ring-4 focus:ring-indigo-100 outline-none",
              practiceAnswer === i ? "border-indigo-500 bg-indigo-50" : "border-slate-100 hover:border-indigo-200",
              practiceSubmitted && i === 1 ? "border-green-500 bg-green-50" : "",
              practiceSubmitted && practiceAnswer === i && i !== 1 ? "border-red-300 bg-red-50" : ""
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs border",
                practiceAnswer === i ? "bg-indigo-600 text-white border-indigo-600" : "bg-slate-50 text-slate-400 border-slate-100"
              )}>
                {String.fromCharCode(65 + i)}
              </div>
              <span className="font-bold text-slate-700">{option}</span>
            </div>
          </button>
        ))}
      </div>

      {!practiceSubmitted ? (
        <Button onClick={() => setPracticeSubmitted(true)} disabled={practiceAnswer === null} className="w-full">
          Check Answer
        </Button>
      ) : (
        <div className="space-y-4">
          <div className={cn(
            "p-4 rounded-xl border",
            practiceAnswer === 1 ? "bg-green-50 border-green-200 text-green-800" : "bg-amber-50 border-amber-200 text-amber-800"
          )}>
            {practiceAnswer === 1
              ? "✓ Correct! 'Have a picnic' is the correct collocation."
              : "The correct answer is B) have. 'Have a picnic' is a common English collocation."}
          </div>
          <p className="text-sm text-slate-500">
            <Keyboard size={14} className="inline mr-1" />
            <strong>Tip:</strong> Use keyboard shortcuts: A/B/C/D to select, Enter to confirm.
          </p>
          <Button onClick={nextStep} className="w-full">
            Next Practice <ChevronRight size={18} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderFillPractice = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
        <span className="px-3 py-1 bg-indigo-100 rounded-lg">Practice 2/4</span>
        Fill in the Blank
      </div>

      <h3 className="text-xl font-black text-slate-900">
        Complete the sentence with the correct word:
      </h3>
      <div className="p-6 bg-white border border-slate-200 rounded-xl text-lg text-slate-700">
        "She is the _____ person I have ever met." (kind → superlative form)
      </div>

      <input
        type="text"
        value={practiceText}
        onChange={(e) => setPracticeText(e.target.value)}
        placeholder="Type your answer..."
        className="w-full text-lg p-4 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all"
        aria-label="Type your answer"
        onKeyDown={(e) => {
          if (e.key === "Enter" && practiceText.trim()) setPracticeSubmitted(true);
        }}
      />

      {!practiceSubmitted ? (
        <Button onClick={() => setPracticeSubmitted(true)} disabled={!practiceText.trim()} className="w-full">
          Check Answer
        </Button>
      ) : (
        <div className="space-y-4">
          <div className={cn(
            "p-4 rounded-xl border",
            practiceText.trim().toLowerCase() === "kindest"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          )}>
            {practiceText.trim().toLowerCase() === "kindest"
              ? "✓ Correct! 'Kindest' is the superlative form of 'kind'."
              : `The correct answer is 'kindest'. You wrote: '${practiceText.trim()}'`}
          </div>
          <Button onClick={nextStep} className="w-full">
            Next Practice <ChevronRight size={18} className="ml-1" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderListeningPractice = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
        <span className="px-3 py-1 bg-indigo-100 rounded-lg">Practice 3/4</span>
        Listening
      </div>

      <h3 className="text-xl font-black text-slate-900">
        This is how the audio player works:
      </h3>

      <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-4">
        <div className="flex items-center gap-3">
          <Volume2 className="text-indigo-600" size={24} />
          <div>
            <div className="font-bold text-slate-900">Audio Player Demo</div>
            <div className="text-sm text-slate-500">In the real test, audio auto-plays with a 3-second countdown. You get 2 plays maximum.</div>
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-indigo-100">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">▶</div>
            <div className="flex-1">
              <div className="h-2 bg-indigo-100 rounded-full w-full" />
              <div className="flex justify-between mt-1 text-xs text-slate-400">
                <span>0:00</span>
                <span>2 plays left</span>
                <span>1:30</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3">
        <Info className="text-amber-600 shrink-0" size={20} />
        <div className="text-sm text-amber-800">
          <strong>Important:</strong> In the actual test, you can only listen to each audio <strong>twice</strong>. 
          Make sure your speakers or headphones are working properly.
        </div>
      </div>

      <Button onClick={nextStep} className="w-full">
        Next Practice <ChevronRight size={18} className="ml-1" />
      </Button>
    </div>
  );

  const renderSpeakingPractice = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest">
        <span className="px-3 py-1 bg-indigo-100 rounded-lg">Practice 4/4</span>
        Speaking & Writing
      </div>

      <h3 className="text-xl font-black text-slate-900">Speaking Tasks</h3>
      <div className="p-6 bg-rose-50 border border-rose-100 rounded-2xl space-y-3">
        <div className="flex items-center gap-3">
          <Mic className="text-rose-600" size={24} />
          <div className="font-bold text-slate-900">How Speaking Works</div>
        </div>
        <ul className="text-sm text-slate-700 space-y-2 ml-9">
          <li>• Click the <strong>Record</strong> button to start</li>
          <li>• Speak clearly into your microphone</li>
          <li>• Click <strong>Stop</strong> when finished</li>
          <li>• You can <strong>replay</strong> and <strong>re-record</strong> before submitting</li>
          <li>• AI will evaluate: grammar, vocabulary, fluency, coherence</li>
        </ul>
      </div>

      <h3 className="text-xl font-black text-slate-900">Writing Tasks</h3>
      <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-2xl space-y-3">
        <div className="flex items-center gap-3">
          <FileText className="text-indigo-600" size={24} />
          <div className="font-bold text-slate-900">How Writing Works</div>
        </div>
        <ul className="text-sm text-slate-700 space-y-2 ml-9">
          <li>• Use the text editor with basic formatting</li>
          <li>• A <strong>word counter</strong> shows your progress</li>
          <li>• Meet the <strong>minimum word count</strong> to submit</li>
          <li>• Your work is <strong>auto-saved</strong> every 30 seconds</li>
          <li>• AI will evaluate: grammar, vocabulary, coherence, task achievement</li>
        </ul>
      </div>

      <Button onClick={nextStep} className="w-full">
        I'm Ready <ChevronRight size={18} className="ml-1" />
      </Button>
    </div>
  );

  const renderReady = () => (
    <div className="text-center space-y-8 py-8">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
      >
        <CheckCircle2 className="mx-auto text-green-500" size={80} />
      </motion.div>
      
      <div>
        <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">You're All Set!</h2>
        <p className="text-slate-500 mt-3 max-w-md mx-auto">
          Your device is ready and you've completed the practice tasks. 
          The real assessment will begin when you click Start.
        </p>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 max-w-md mx-auto text-left space-y-3">
        <div className="font-bold text-slate-900 text-sm uppercase tracking-wider">Remember:</div>
        <ul className="text-sm text-slate-600 space-y-2">
          <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" /> The test adapts to your level — it's okay if questions get harder</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" /> You have 30 minutes total</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" /> Stay in fullscreen — tab switches are monitored</li>
          <li className="flex items-start gap-2"><CheckCircle2 size={16} className="text-green-500 shrink-0 mt-0.5" /> Answer honestly — guessing is detected</li>
        </ul>
      </div>

      <Button onClick={onComplete} size="lg" className="px-12 py-4 text-lg">
        Start Assessment <ArrowRight size={20} className="ml-2" />
      </Button>
    </div>
  );

  const stepRenderers: Record<Step, () => React.ReactNode> = {
    "device-check": renderDeviceCheck,
    "mc-practice": renderMCPractice,
    "fill-practice": renderFillPractice,
    "listening-practice": renderListeningPractice,
    "speaking-practice": renderSpeakingPractice,
    "writing-practice": renderSpeakingPractice,
    "ready": renderReady,
  };

  const steps: Step[] = ["device-check", "mc-practice", "fill-practice", "listening-practice", "speaking-practice", "ready"];
  const stepIndex = steps.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#9b276c] text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight flex items-center">
            <span style={{ textShadow: '0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)' }}>b4skills</span>
          </div>
          <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Tutorial & Practice</span>
        </div>
        {onSkip && (
          <Button variant="ghost" size="sm" onClick={onSkip}>
            Skip Tutorial
          </Button>
        )}
      </header>

      {/* Progress */}
      <div className="h-1.5 w-full bg-slate-100">
        <motion.div
          className="h-full bg-indigo-600"
          animate={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Content */}
      <main className="flex-1 flex items-start justify-center p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {stepRenderers[currentStep]()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};
