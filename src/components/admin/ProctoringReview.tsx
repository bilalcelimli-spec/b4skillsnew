import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { 
  ShieldAlert, 
  AlertTriangle, 
  User,
  Users,
  Clock, 
  ExternalLink, 
  CheckCircle2, 
  XCircle,
  Eye,
  Camera,
  MonitorOff,
  Maximize
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

export const ProctoringReview: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  useEffect(() => {
    fetchAlerts();
  }, [orgId]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/proctoring-alerts`, {
        headers: { "x-user-email": "bilalcelimli@gmail.com" } // Mock admin auth
      });
      setAlerts(await res.json());
    } catch (err) {
      console.error("Failed to fetch proctoring alerts");
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: number) => {
    if (severity >= 4) return "bg-red-100 text-red-600 border-red-200";
    if (severity >= 2) return "bg-amber-100 text-amber-600 border-amber-200";
    return "bg-blue-100 text-blue-600 border-blue-200";
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "TAB_SWITCH": return <MonitorOff size={16} />;
      case "MULTIPLE_FACES": return <Users size={16} />;
      case "NO_FACE": return <Camera size={16} />;
      case "COPY_PASTE": return <ShieldAlert size={16} />;
      case "FULLSCREEN_EXIT": return <Maximize size={16} />;
      default: return <AlertTriangle size={16} />;
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
      <div className="xl:col-span-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
            <ShieldAlert className="text-red-600" size={28} />
            Proctoring Alerts
          </h2>
          <Button variant="outline" size="sm" onClick={fetchAlerts} className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest">
            Refresh Feed
          </Button>
        </div>

        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 text-slate-400 text-[8px] uppercase tracking-widest font-black">
                    <th className="px-8 py-4 border-b border-slate-100">Candidate</th>
                    <th className="px-8 py-4 border-b border-slate-100">Violation</th>
                    <th className="px-8 py-4 border-b border-slate-100">Severity</th>
                    <th className="px-8 py-4 border-b border-slate-100">Time</th>
                    <th className="px-8 py-4 border-b border-slate-100 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={5} className="px-8 py-6 h-16 bg-slate-50/30" />
                      </tr>
                    ))
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium italic">
                        No critical proctoring alerts detected.
                      </td>
                    </tr>
                  ) : (
                    alerts.map((alert) => (
                      <tr 
                        key={alert.id} 
                        className={cn(
                          "hover:bg-slate-50/50 transition-colors group cursor-pointer",
                          selectedAlert?.id === alert.id ? "bg-indigo-50/50" : ""
                        )}
                        onClick={() => setSelectedAlert(alert)}
                      >
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                              {alert.session.candidate.name[0]}
                            </div>
                            <div>
                              <div className="text-sm font-bold text-slate-900">{alert.session.candidate.name}</div>
                              <div className="text-[10px] text-slate-400 font-medium">{alert.session.candidate.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            {getEventIcon(alert.type)}
                            {alert.type.replace(/_/g, " ")}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border",
                            getSeverityColor(alert.severity)
                          )}>
                            {alert.severity >= 4 ? "Critical" : alert.severity >= 2 ? "Moderate" : "Low"}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                            {new Date(alert.timestamp).toLocaleTimeString()}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 group-hover:text-indigo-600">
                            <Eye size={16} />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden sticky top-8">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-8">
            <CardTitle className="text-sm font-black uppercase tracking-tight">Violation Details</CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <AnimatePresence mode="wait">
              {selectedAlert ? (
                <motion.div
                  key={selectedAlert.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  <div className="aspect-video bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 relative overflow-hidden group">
                    <Camera size={32} className="opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="outline" size="sm" className="bg-white/10 text-white border-white/20 rounded-xl">
                        View Screenshot
                      </Button>
                    </div>
                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[8px] text-white font-black uppercase tracking-widest">
                      Simulated Capture
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Description</div>
                      <p className="text-sm text-slate-700 font-medium leading-relaxed">
                        Candidate exited the secure browser environment or switched tabs during the assessment.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Trust Score</div>
                        <div className="text-lg font-black text-red-600">0.42</div>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</div>
                        <div className="text-lg font-black text-amber-600">Flagged</div>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 rounded-xl h-12 text-[10px] font-black uppercase tracking-widest border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                      <CheckCircle2 size={16} className="mr-2" /> Dismiss
                    </Button>
                    <Button variant="outline" className="flex-1 rounded-xl h-12 text-[10px] font-black uppercase tracking-widest border-red-200 text-red-600 hover:bg-red-50">
                      <XCircle size={16} className="mr-2" /> Invalidate
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                    <ShieldAlert size={32} />
                  </div>
                  <p className="text-slate-400 text-sm font-medium italic">Select an alert to view details</p>
                </div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

