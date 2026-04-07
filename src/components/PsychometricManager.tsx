import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { Save, RefreshCw, Settings, Sliders, Activity } from "lucide-react";
import { motion } from "motion/react";

export const PsychometricManager: React.FC = () => {
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const userEmail = "bilalcelimli@gmail.com"; // Mocked for now, should come from auth

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/config/system", {
        headers: { "x-user-email": userEmail }
      });
      const data = await res.json();
      setConfig(data);
    } catch (err) {
      console.error("Failed to fetch config");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/config/system", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "x-user-email": userEmail
        },
        body: JSON.stringify(config)
      });
      
      if (res.ok) {
        setMessage({ type: "success", text: "Configuration saved successfully!" });
      } else {
        setMessage({ type: "error", text: "Failed to save configuration." });
      }
    } catch (err) {
      setMessage({ type: "error", text: "An error occurred while saving." });
    } finally {
      setSaving(false);
    }
  };

  const updateThreshold = (level: string, value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    setConfig({
      ...config,
      cefrThresholds: {
        ...config.cefrThresholds,
        [level]: numValue
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Psychometric Controls</h1>
          <p className="text-slate-500 mt-1 font-medium">Adjust adaptive engine parameters and CEFR mapping thresholds.</p>
        </div>
        <Button 
          onClick={handleSave}
          disabled={saving}
          className="gap-2 bg-indigo-600 h-11 px-6 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100"
        >
          {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
          Save Changes
        </Button>
      </header>

      {message && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-4 rounded-2xl font-bold text-sm ${
            message.type === "success" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
          }`}
        >
          {message.text}
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CEFR Thresholds */}
        <Card className="border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
          <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <Sliders size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">CEFR Thresholds</h2>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <p className="text-sm text-slate-500 font-medium leading-relaxed">
              Define the ability estimate (theta) cut-off points for each CEFR level. 
              These values are typically derived from standard-setting studies.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              {["A1", "A2", "B1", "B2", "C1", "C2"].map((level) => (
                <div key={level} className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{level} Threshold</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      step="0.1"
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={config.cefrThresholds?.[level] ?? ""}
                      onChange={(e) => updateThreshold(level, e.target.value)}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase">Theta</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Adaptive Settings */}
        <Card className="border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
          <CardHeader className="p-6 border-b border-slate-50 bg-slate-50/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <Activity size={20} />
              </div>
              <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Engine Parameters</h2>
            </div>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pretest Ratio (0.0 - 1.0)</label>
                <input 
                  type="number" 
                  step="0.05"
                  min="0"
                  max="1"
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.pretestRatio ?? 0.1}
                  onChange={(e) => setConfig({ ...config, pretestRatio: parseFloat(e.target.value) })}
                />
                <p className="text-[10px] text-slate-400 font-medium">Percentage of items administered for calibration purposes.</p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min Items</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={config.minItems ?? 5}
                    onChange={(e) => setConfig({ ...config, minItems: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Max Items</label>
                  <input 
                    type="number" 
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                    value={config.maxItems ?? 25}
                    onChange={(e) => setConfig({ ...config, maxItems: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">SEM Stopping Threshold</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.semThreshold ?? 0.3}
                  onChange={(e) => setConfig({ ...config, semThreshold: parseFloat(e.target.value) })}
                />
                <p className="text-[10px] text-slate-400 font-medium">The test stops when measurement precision (SEM) reaches this value.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
