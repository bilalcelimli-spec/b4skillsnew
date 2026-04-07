import React, { useState, useEffect } from "react";
import { Item } from "../../lib/assessment-engine/types";
import { Card, CardContent, CardHeader } from "../ui/Card";
import { Button } from "../ui/Button";
import { ItemRenderer } from "../ItemRenderer";
import { CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Filter, Sparkles, Send } from "lucide-react";

export const ContentReviewDashboard = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState("all"); // 'all', 'flagged', 'ok'
  const [updating, setUpdating] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  
  // AI Edit States
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiEditing, setIsAiEditing] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = items.filter(item => {
    const itemContent = (item as any).content || item.metadata || {};
    const isFlagged = itemContent.reviewStatus === "flagged";
    const isOk = itemContent.reviewStatus === "ok";
    if (filter === "flagged") return isFlagged;
    if (filter === "ok") return isOk;
    return true;
  });

  const currentItem = filteredItems[currentIndex];
  const currentContent = currentItem ? ((currentItem as any).content || currentItem.metadata || {}) : {};

  const handleUpdateStatus = async (status: "ok" | "flagged") => {
    if (!currentItem) return;
    setUpdating(true);
    
    const updatedContent = {
      ...currentContent,
      reviewStatus: status,
      reviewFeedback: status === "flagged" ? feedbackText : ""
    };

    try {
      const res = await fetch(`/api/items/${currentItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: updatedContent
        })
      });
      if (res.ok) {
        setItems(prev => prev.map(it => it.id === currentItem.id ? { ...it, content: updatedContent } : it));
        if (status === "ok") setFeedbackText("");
        if (currentIndex < filteredItems.length - 1) {
          setCurrentIndex(idx => idx + 1);
          setFeedbackText(""); // Clear feedback for next item
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAiEdit = async () => {
    if (!currentItem || !aiPrompt.trim()) return;
    setIsAiEditing(true);

    try {
      // Step 1: Call AI to edit content
      const aiRes = await fetch("/api/ai/edit-item", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentItemContent: currentContent,
          instruction: aiPrompt
        })
      });
      
      const newContent = await aiRes.json();
      if (!aiRes.ok) throw new Error(newContent.error);

      // Preserve status fields if they exist
      const preservedContent = {
        ...newContent,
        reviewStatus: "ok",
        reviewFeedback: "Fixed via AI: " + aiPrompt
      };

      // Step 2: Save to DB
      const saveRes = await fetch(`/api/items/${currentItem.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: preservedContent })
      });
      
      if (saveRes.ok) {
        setItems(prev => prev.map(it => it.id === currentItem.id ? { ...it, content: preservedContent } : it));
        setAiPrompt("");
        setFeedbackText("");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to edit item via AI.");
    } finally {
      setIsAiEditing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (filteredItems.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-slate-100 shadow-sm">
        <h3 className="text-lg font-bold text-slate-800">No items found matching the filter.</h3>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Filter size={16} /> Filter:
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setFilter("all"); setCurrentIndex(0); }} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === "all" ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>All ({items.length})</button>
            <button onClick={() => { setFilter("flagged"); setCurrentIndex(0); }} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === "flagged" ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>Flagged</button>
            <button onClick={() => { setFilter("ok"); setCurrentIndex(0); }} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filter === "ok" ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>Approved</button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button 
            disabled={currentIndex === 0} 
            onClick={() => { setCurrentIndex(idx => idx - 1); setFeedbackText(((filteredItems[currentIndex - 1] as any)?.content || {})?.reviewFeedback || ""); }}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
          >
            <ChevronLeft size={20} />
          </button>
          <span className="text-sm font-black text-slate-400">
            {currentIndex + 1} / {filteredItems.length}
          </span>
          <button 
            disabled={currentIndex === filteredItems.length - 1} 
            onClick={() => { setCurrentIndex(idx => idx + 1); setFeedbackText(((filteredItems[currentIndex + 1] as any)?.content || {})?.reviewFeedback || ""); }}
            className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: DB Specs */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="border-slate-100 shadow-sm rounded-2xl overflow-hidden text-sm relative">
             {currentContent.reviewStatus === "flagged" && <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>}
             {currentContent.reviewStatus === "ok" && <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>}
            <CardHeader className="bg-slate-50 border-b border-slate-100 p-4">
              <h3 className="font-black text-slate-800 uppercase tracking-widest">Metadata</h3>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Item ID</div>
                <div className="font-mono text-xs">{currentItem.id}</div>
              </div>
              <div className="flex justify-between">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Level</div>
                  <div className="font-bold">{(currentItem as any).cefrLevel || "Unknown"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Skill</div>
                  <div className="font-bold">{currentItem.skill}</div>
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mb-2">
                  <AlertTriangle size={12} /> Mark Review
                </div>
                <textarea 
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder="Feedback or issues (only if flagging)..."
                  className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                />
                
                {currentContent.reviewFeedback && (
                   <div className="mt-2 p-2 bg-rose-50 text-rose-700 text-xs rounded-lg border border-rose-100 shrink-0 italic">
                     Previous feedback: {currentContent.reviewFeedback}
                   </div>
                )}

                <div className="flex gap-2 mt-4">
                  <Button 
                    onClick={() => handleUpdateStatus("ok")} 
                    disabled={updating}
                    className="flex-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 hover:text-emerald-700 border-none font-bold shadow-none"
                  >
                    <CheckCircle2 size={16} className="mr-2" /> Approve
                  </Button>
                  <Button 
                    onClick={() => handleUpdateStatus("flagged")} 
                    disabled={updating}
                    variant="outline"
                    className="flex-1 bg-rose-50 text-rose-600 hover:bg-rose-100 hover:text-rose-700 border-none font-bold shadow-none"
                  >
                    <AlertTriangle size={16} className="mr-2" /> Flag Issue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-indigo-100 shadow-sm rounded-2xl overflow-hidden text-sm bg-indigo-50/30">
            <CardHeader className="bg-indigo-50 border-b border-indigo-100 p-4 flex items-center gap-2 text-indigo-700 font-black uppercase tracking-widest">
              <Sparkles size={14} /> AI Assistant
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest leading-relaxed">
                Describe the corrections you want the AI to make (e.g. "make the prompt clearer", "regenerate audio", "change option B").
              </p>
              <textarea 
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Message Gemini..."
                className="w-full text-xs p-3 rounded-xl border border-indigo-200 focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                disabled={isAiEditing}
              />
              <Button 
                onClick={handleAiEdit} 
                disabled={isAiEditing || !aiPrompt.trim()}
                className="w-full bg-indigo-600 text-white hover:bg-indigo-700 border-none font-bold"
              >
                {isAiEditing ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                    Fixing...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Send size={14} /> Apply AI Fix
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Player Render */}
        <div className="lg:col-span-2">
          <Card className="border-slate-100 shadow-xl shadow-slate-200/50 rounded-[40px] overflow-hidden bg-white">
            <CardContent className="p-8">
              <div className="flex items-center gap-2 mb-6">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Candidate Preview</div>
                <div className="flex-1 h-px bg-slate-100"></div>
              </div>
              <ItemRenderer 
                item={currentItem} 
                onResponse={() => console.log("Tested Response selection!")} 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
