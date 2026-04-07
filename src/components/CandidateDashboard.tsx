import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/Card";
import { Button } from "./ui/Button";
import { 
  History, 
  Award, 
  Download, 
  ArrowRight, 
  User as UserIcon, 
  Activity,
  Calendar,
  CheckCircle2,
  Clock,
  ExternalLink,
  LayoutDashboard
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "../lib/utils";

export const CandidateDashboard: React.FC<{ candidateId: string }> = ({ candidateId }) => {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [candidateId]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/candidates/${candidateId}/history`);
      setSessions(await res.json());
    } catch (err) {
      console.error("Failed to fetch candidate history");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-emerald-100 text-emerald-600";
      case "IN_PROGRESS": return "bg-amber-100 text-amber-600";
      case "SCHEDULED": return "bg-indigo-100 text-indigo-600";
      default: return "bg-slate-100 text-slate-400";
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-8 space-y-8 bg-slate-50/50 min-h-screen">
      <header className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter">My Progress</h1>
          <p className="text-slate-500 font-medium uppercase tracking-widest text-[10px]">Candidate Portal • b4skills</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-sm font-black text-slate-900">John Doe</div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Candidate ID: {candidateId.slice(0, 8)}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <UserIcon size={24} />
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
              <Activity size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{sessions.length}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Assessments</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
              <Award size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">{sessions.filter(s => s.status === "COMPLETED").length}</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Certificates Earned</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
              <Clock size={24} />
            </div>
            <div>
              <div className="text-2xl font-black text-slate-900">B2</div>
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">Highest CEFR Level</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-white p-8">
          <CardTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <History className="text-indigo-600" size={24} />
            Assessment History
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[8px] uppercase tracking-widest font-black">
                  <th className="px-8 py-4 border-b border-slate-100">Date</th>
                  <th className="px-8 py-4 border-b border-slate-100">Status</th>
                  <th className="px-8 py-4 border-b border-slate-100">Score</th>
                  <th className="px-8 py-4 border-b border-slate-100">CEFR</th>
                  <th className="px-8 py-4 border-b border-slate-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-8 py-6 h-16 bg-slate-50/30" />
                    </tr>
                  ))
                ) : sessions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-8 py-12 text-center text-slate-400 font-medium italic">
                      No assessment history found.
                    </td>
                  </tr>
                ) : (
                  sessions.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="text-xs font-bold text-slate-900">{new Date(session.createdAt).toLocaleDateString()}</div>
                        <div className="text-[8px] text-slate-400 font-medium uppercase tracking-widest">{new Date(session.createdAt).toLocaleTimeString()}</div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                          getStatusColor(session.status)
                        )}>
                          {session.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-slate-900">{session.theta?.toFixed(1) || "N/A"}</div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-sm font-black text-indigo-600">B2</div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {session.status === "COMPLETED" ? (
                            <Button variant="outline" size="sm" className="rounded-xl h-8 text-[9px] font-black uppercase tracking-widest">
                              <Download size={14} className="mr-1" /> Certificate
                            </Button>
                          ) : (
                            <Button variant="primary" size="sm" className="rounded-xl h-8 text-[9px] font-black uppercase tracking-widest">
                              Resume <ArrowRight size={14} className="ml-1" />
                            </Button>
                          )}
                        </div>
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
  );
};
