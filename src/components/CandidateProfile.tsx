import React, { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { Mail, Globe, Calendar, Award, FileText, Shield, LogOut, ChevronRight, Clock, RefreshCw, Zap } from "lucide-react";
import { assessmentDisplayName } from "../lib/fixed-forms/ozgun-kids";
import { historyResultLabel, historyStatus, isReportableSession } from "../lib/reporting/candidate-history";

interface ProfileUser {
  uid: string;
  email?: string;
  displayName?: string | null;
  role?: string;
  organizationId?: string | null;
  organizationName?: string | null;
  createdAt?: string | null;
}

interface Props {
  user: ProfileUser;
  onLogout: () => void;
  /** Opens the detailed report for a session. */
  onOpenReport?: (sessionId: string) => void;
  /** Returns to the dashboard where an assessment can be started. */
  onStartAssessment?: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  CANDIDATE: "Candidate", SUPER_ADMIN: "Administrator", ASSESSMENT_DIRECTOR: "Assessment Director",
  INST_ADMIN: "Institution Admin", PROCTOR: "Proctor", RATER: "Rater", TEACHER: "Teacher",
};

const formatDate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

export const CandidateProfile: React.FC<Props> = ({ user, onLogout, onOpenReport, onStartAssessment }) => {
  const [sessions, setSessions] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback((signal?: AbortSignal) => {
    setError(null);
    setSessions(null);
    return fetch(`/api/candidates/${encodeURIComponent(user.uid)}/history`, { credentials: "include", signal })
      .then(async r => {
        if (!r.ok) throw new Error("history");
        const data = await r.json();
        setSessions(Array.isArray(data) ? data : []);
      })
      .catch(err => { if ((err as Error).name !== "AbortError") setError("Your assessment history could not be loaded."); });
  }, [user.uid]);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const name = user.displayName?.trim() || user.email || "Candidate";
  const history = (sessions ?? []).filter(isReportableSession);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="relative bg-gradient-to-br from-indigo-600 to-indigo-900 rounded-[40px] overflow-hidden shadow-2xl shadow-indigo-100 p-6 md:p-10">
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-5 min-w-0">
            <div className="w-20 h-20 shrink-0 bg-white rounded-3xl flex items-center justify-center text-indigo-600 font-black text-3xl shadow-xl">
              {name[0]?.toUpperCase()}
            </div>
            <div className="text-white min-w-0">
              <h1 className="text-2xl md:text-3xl font-black tracking-tighter uppercase break-words">{name}</h1>
              {user.email && (
                <p className="text-indigo-100 font-bold opacity-80 flex items-center gap-2 break-all">
                  <Mail size={16} className="shrink-0" /> {user.email}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            {!user.organizationId && (
              <Button
                className="bg-white text-indigo-600 hover:bg-indigo-50 h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl"
                onClick={() => { window.location.href = "/checkout?plan=full-assessment"; }}
              >
                <Zap size={16} className="mr-2" /> Purchase information
              </Button>
            )}
            <Button onClick={onLogout} variant="ghost" className="bg-white/10 text-white hover:bg-white/20 h-12 rounded-xl font-bold gap-2">
              <LogOut size={18} /> Logout
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card className="rounded-[32px] border-slate-100 shadow-sm">
            <CardHeader className="font-black uppercase tracking-widest text-xs text-slate-400">Account Details</CardHeader>
            <CardContent className="space-y-4">
              <InfoItem icon={<Shield className="text-indigo-600" size={18} />} label="Role" value={ROLE_LABELS[user.role ?? ""] ?? user.role ?? "Candidate"} />
              <InfoItem icon={<Globe className="text-amber-600" size={18} />} label="Organization"
                value={user.organizationName || (user.organizationId ? "Organization member" : "Independent")} />
              <InfoItem icon={<Calendar className="text-emerald-600" size={18} />} label="Member since" value={formatDate(user.createdAt)} />
            </CardContent>
          </Card>

          {onStartAssessment && (
            <Card className="rounded-[32px] border-slate-100 shadow-sm bg-indigo-600 text-white">
              <CardContent className="p-8 text-center">
                <Award size={48} className="mx-auto mb-4 opacity-40" />
                <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Ready for your next test?</h3>
                <p className="text-indigo-100 text-sm font-bold opacity-80 mb-6">
                  Choose an assessment from your dashboard to measure your progress.
                </p>
                <Button onClick={onStartAssessment} className="w-full bg-white text-indigo-600 hover:bg-indigo-50 h-12 rounded-xl font-black uppercase tracking-widest text-xs">
                  Go to assessments
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Assessment History</h2>
          {error ? (
            <div role="alert" className="rounded-[32px] border border-red-200 bg-red-50 p-6 text-center">
              <p className="text-sm font-bold text-red-700">{error}</p>
              <Button variant="outline" className="mt-4 gap-2 rounded-xl" onClick={() => void load()}>
                <RefreshCw size={16} /> Try again
              </Button>
            </div>
          ) : sessions === null ? (
            <div className="space-y-4" aria-busy="true" aria-label="Loading assessment history">
              {[0, 1].map(i => <div key={i} className="h-24 rounded-[32px] bg-slate-100 animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <div data-testid="profile-history-empty" className="rounded-[32px] border-2 border-dashed border-slate-200 p-10 text-center">
              <FileText size={32} className="mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-medium text-slate-500">You have not completed an assessment yet.</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {history.map(s => {
                const result = historyResultLabel(s);
                const status = historyStatus(s);
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      data-testid="profile-history-row"
                      onClick={() => onOpenReport?.(s.id)}
                      disabled={!onOpenReport}
                      className="w-full text-left group bg-white border border-slate-100 rounded-[32px] p-6 flex items-center justify-between gap-4 hover:shadow-xl transition-all duration-300 disabled:cursor-default"
                    >
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-14 h-14 shrink-0 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                          <FileText size={24} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-black text-slate-900 tracking-tight truncate">
                            {assessmentDisplayName(s.metadata?.productLine ?? "Assessment")}
                          </div>
                          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-400">
                            <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(s.completedAt ?? s.createdAt)}</span>
                            <span className={status === "Completed" ? "text-emerald-600" : "text-amber-600"}>{status}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <div className="text-right">
                          <div className="text-2xl font-black text-slate-900">{result ?? "—"}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {s.metadata?.sessionType === "FIXED_FORM" ? "Raw score" : "Proficiency"}
                          </div>
                        </div>
                        {onOpenReport && <ChevronRight size={20} className="text-slate-300 group-hover:text-indigo-500" />}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 shrink-0 bg-slate-50 rounded-xl flex items-center justify-center">{icon}</div>
    <div className="min-w-0">
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="text-sm font-black text-slate-900 break-words">{value}</div>
    </div>
  </div>
);
