import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { Label } from "./ui/Label";
import { Star, Send, CheckCircle2, MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

interface FeedbackProps {
  sessionId: string;
  orgId: string;
  onComplete?: () => void;
}

export const CandidateFeedback: React.FC<FeedbackProps> = ({ sessionId, orgId, onComplete }) => {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const [category, setCategory] = useState("CONTENT");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setLoading(true);
    try {
      await fetch(`/api/sessions/${sessionId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, comment, category, organizationId: orgId })
      });
      setSubmitted(true);
      setTimeout(() => onComplete?.(), 2000);
    } catch (err) {
      console.error("Failed to submit feedback");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-md mx-auto border-slate-200 shadow-xl rounded-3xl overflow-hidden">
      <CardHeader className="bg-indigo-600 text-white p-8 text-center">
        <CardTitle className="text-2xl font-black uppercase tracking-tight">How was your experience?</CardTitle>
        <p className="text-indigo-100 text-xs mt-2 font-medium uppercase tracking-widest">Your feedback helps us improve b4skills</p>
      </CardHeader>
      <CardContent className="p-8">
        <AnimatePresence mode="wait">
          {!submitted ? (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-6"
            >
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    onClick={() => setRating(star)}
                    className="transition-transform active:scale-90"
                  >
                    <Star
                      size={32}
                      className={cn(
                        "transition-colors",
                        (hoveredRating || rating) >= star 
                          ? "fill-amber-400 text-amber-400" 
                          : "text-slate-200"
                      )}
                    />
                  </button>
                ))}
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {["CONTENT", "UI", "TECHNICAL"].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        "py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all",
                        category === cat 
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200" 
                          : "bg-slate-50 text-slate-400 border-slate-100 hover:border-slate-200"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Additional Comments</Label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Tell us what you liked or what we could improve..."
                    className="w-full h-24 p-4 rounded-2xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm resize-none"
                  />
                </div>
              </div>

              <Button 
                onClick={handleSubmit} 
                disabled={rating === 0 || loading}
                className="w-full rounded-2xl h-12 font-black uppercase tracking-widest text-xs"
              >
                {loading ? "Submitting..." : (
                  <>
                    <Send size={16} className="mr-2" /> Submit Feedback
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center space-y-4"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Thank You!</h3>
                <p className="text-slate-500 text-sm font-medium">Your feedback has been recorded.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};
