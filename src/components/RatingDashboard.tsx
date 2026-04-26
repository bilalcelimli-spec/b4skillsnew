import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { 
  ClipboardList, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Play, 
  MessageSquare,
  Star,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

interface RatingTask {
  id: string;
  sessionId: string;
  itemId: string;
  type: "WRITING" | "SPEAKING";
  content: string;
  aiResult?: any;
  status: string;
  createdAt: string;
}

export const RatingDashboard: React.FC<{ raterId?: string }> = ({ raterId }) => {
  const [tasks, setTasks] = useState<RatingTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<RatingTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(5);
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/rating/tasks?status=PENDING", { credentials: "include" });
      const data = await res.json();
      setTasks(data);
    } catch (err) {
      console.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async (task: RatingTask) => {
    if (!raterId) return;
    try {
      const res = await fetch(`/api/rating/tasks/${task.id}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ raterId })
      });
      if (res.ok) {
        setSelectedTask(task);
      }
    } catch (err) {
      console.error("Failed to claim task");
    }
  };

  const handleSubmit = async () => {
    if (!selectedTask || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rating/tasks/${selectedTask.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ score: score / 10, feedback })
      });
      if (res.ok) {
        setSelectedTask(null);
        setScore(5);
        setFeedback("");
        fetchTasks();
      }
    } catch (err) {
      console.error("Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">Rating Queue</h1>
        <p className="text-slate-500 mt-1">Manual evaluation for Speaking and Writing responses.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Task List */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="font-bold">Pending Tasks</div>
              <div className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-[10px] font-black">
                {tasks.length}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-slate-400">
                  <Clock className="animate-spin mx-auto mb-2" size={24} />
                  Loading queue...
                </div>
              ) : tasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <CheckCircle2 className="mx-auto mb-2 text-emerald-500" size={24} />
                  Queue is empty
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {tasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleClaim(task)}
                      className={cn(
                        "w-full text-left p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group",
                        selectedTask?.id === task.id && "bg-indigo-50/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          task.type === "WRITING" ? "bg-blue-50 text-blue-600" : "bg-red-50 text-red-600"
                        )}>
                          {task.type === "WRITING" ? <MessageSquare size={20} /> : <Play size={20} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{task.type} Task</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {task.id.split('_')[1]}</div>
                        </div>
                      </div>
                      <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Rating Interface */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedTask ? (
              <motion.div
                key={selectedTask.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <Card className="border-indigo-200 shadow-xl shadow-indigo-100/50">
                  <CardHeader className="border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black uppercase tracking-widest">
                          {selectedTask.type}
                        </div>
                        <div className="text-sm font-medium text-slate-500">
                          Session: {selectedTask.sessionId}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>
                        Cancel
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                    {/* Response Content */}
                    <section>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Candidate Response</h3>
                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {selectedTask.content}
                      </div>
                    </section>

                    {/* AI Insight */}
                    {selectedTask.aiResult && (
                      <section className="p-4 bg-amber-50 border border-amber-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-2 text-amber-700 font-bold text-xs uppercase tracking-widest">
                          <AlertCircle size={14} />
                          AI Provisional Score: {selectedTask.aiResult.cefrLevel}
                        </div>
                        <p className="text-sm text-amber-600 italic">
                          "{selectedTask.aiResult.feedback}"
                        </p>
                      </section>
                    )}

                    {/* Scoring Form */}
                    <section className="space-y-6 pt-6 border-t border-slate-100">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <label className="text-sm font-bold text-slate-900">Overall Proficiency Score (0-10)</label>
                          <span className="text-2xl font-black text-indigo-600">{score}</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="10"
                          step="1"
                          value={score}
                          onChange={(e) => setScore(parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                        />
                        <div className="flex justify-between mt-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          <span>Pre-A1</span>
                          <span>B1</span>
                          <span>C2</span>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-bold text-slate-900 mb-2">Qualitative Feedback</label>
                        <textarea
                          value={feedback}
                          onChange={(e) => setFeedback(e.target.value)}
                          className="w-full h-32 p-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-0 transition-all resize-none"
                          placeholder="Provide constructive feedback for the candidate..."
                        />
                      </div>

                      <Button 
                        className="w-full h-12 text-lg font-bold" 
                        onClick={handleSubmit}
                        disabled={submitting || !feedback}
                      >
                        {submitting ? "Submitting..." : "Finalize Rating"}
                      </Button>
                    </section>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <div className="h-[600px] flex flex-col items-center justify-center text-center p-12 bg-white border-2 border-dashed border-slate-200 rounded-3xl">
                <div className="w-20 h-20 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mb-6">
                  <ClipboardList size={40} />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">No Task Selected</h3>
                <p className="text-slate-500 max-w-xs">
                  Select a task from the queue on the left to begin manual evaluation.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
