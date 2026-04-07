import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { 
  Settings, 
  Shield, 
  Clock, 
  Target, 
  Save, 
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

export const GlobalSettings: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [settings, setSettings] = useState({
    timeLimit: 30,
    passingScore: 500,
    securityLevel: "HIGH",
    allowedDomains: "",
    sessionTimeout: 60
  });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      // API call to save settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8">
      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
          <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <Settings className="text-indigo-600" size={20} />
            Assessment Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Clock size={12} /> Time Limit (Minutes)
              </Label>
              <Input 
                type="number" 
                value={settings.timeLimit}
                onChange={(e) => setSettings({...settings, timeLimit: parseInt(e.target.value)})}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Target size={12} /> Passing Score (Theta Scale)
              </Label>
              <Input 
                type="number" 
                value={settings.passingScore}
                onChange={(e) => setSettings({...settings, passingScore: parseInt(e.target.value)})}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Shield size={12} /> Security Level
              </Label>
              <select 
                className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                value={settings.securityLevel}
                onChange={(e) => setSettings({...settings, securityLevel: e.target.value})}
              >
                <option value="LOW">Low (Minimal Proctoring)</option>
                <option value="MEDIUM">Medium (Standard)</option>
                <option value="HIGH">High (Full AI Monitoring)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <Globe size={12} /> Allowed Domains
              </Label>
              <Input 
                placeholder="e.g. company.com, school.edu" 
                value={settings.allowedDomains}
                onChange={(e) => setSettings({...settings, allowedDomains: e.target.value})}
                className="rounded-xl"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              <Lock size={12} /> Changes are logged in audit trail
            </div>
            <Button 
              onClick={handleSave} 
              disabled={loading}
              className={cn(
                "rounded-xl h-10 px-8 font-black uppercase tracking-widest text-[10px] transition-all",
                saved ? "bg-emerald-500 hover:bg-emerald-600" : ""
              )}
            >
              {loading ? "Saving..." : saved ? (
                <>
                  <CheckCircle2 size={14} className="mr-2" /> Saved
                </>
              ) : (
                <>
                  <Save size={14} className="mr-2" /> Save Settings
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-red-100 bg-red-50/30 rounded-3xl overflow-hidden">
        <CardContent className="p-8 flex items-start gap-4">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center text-red-600 shrink-0">
            <AlertCircle size={20} />
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-black text-red-900 uppercase tracking-tight">Danger Zone</h4>
            <p className="text-xs text-red-700 font-medium leading-relaxed">
              Modifying psychometric parameters or security levels during an active assessment window may impact candidate results and proctoring accuracy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
