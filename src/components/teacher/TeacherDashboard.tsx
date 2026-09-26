import React, { useCallback, useEffect, useState } from "react";
import { useToast } from "../../hooks/useToast.js";

async function downloadClassCsv(classId: string, className: string, onError: (msg: string) => void) {
  const res = await fetch(`/api/teacher/classes/${classId}/export.csv`, { credentials: "include" });
  if (!res.ok) { onError("Export failed. Please try again."); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${className.replace(/[^a-z0-9]/gi, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

interface StudentRow {
  id: string;
  name: string;
  email: string;
  cefrLevel: string;
  overallScore: number;
  trend: "improving" | "stable" | "declining";
  lastActivity: string;
  sessionsCompleted: number;
}

interface CohortSummary {
  totalStudents: number;
  activeThisWeek: number;
  averageCefrLevel: string;
  averageScore: number;
  learningVelocity: number; // theta gain/week
  cefrDistribution: Record<string, number>;
  skillBreakdown: Record<string, number>;
}

interface TeacherDashboardProps {
  organizationId: string;
  instructorId: string;
}

const CEFR_COLOR: Record<string, string> = {
  A1: "#ef4444", A2: "#f97316", B1: "#eab308",
  B2: "#22c55e", C1: "#3b82f6", C2: "#8b5cf6",
};

const TREND_ICON: Record<string, string> = {
  improving: "↑",
  stable: "→",
  declining: "↓",
};

const TREND_COLOR: Record<string, string> = {
  improving: "#22c55e",
  stable: "#64748b",
  declining: "#ef4444",
};

interface ClassRow {
  id: string;
  name: string;
  description?: string | null;
  status: string;
  targetCefr?: string | null;
  teacherId?: string | null;
  teacher?: { id: string; name?: string | null; email: string } | null;
  _count?: { members: number; assignments: number };
  createdAt: string;
}

interface ClassReportData {
  classId: string;
  className: string;
  targetCefr: string | null;
  members: Array<{
    userId: string; name: string; email: string;
    cefrLevel: string | null; scoreReportId: string | null;
    completed: boolean; isOnTrack: boolean | null;
  }>;
  cefrDistribution: Record<string, number>;
  skillHeatmap: Record<string, Record<string, number>>;
  completedCount: number;
  totalCount: number;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  organizationId,
  instructorId,
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"students" | "classes" | "assignments">("students");
  const [summary, setSummary] = useState<CohortSummary | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof StudentRow>("overallScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterCefr, setFilterCefr] = useState<string>("");
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [classLoading, setClassLoading] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [creatingClass, setCreatingClass] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [classSkills, setClassSkills] = useState<Record<string, {
    cefrDistribution: Record<string, number>;
    averageTheta: number;
    memberCount: number;
    assessedCount: number;
  }>>({});
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignLoading, setAssignLoading] = useState(false);
  const [newAssign, setNewAssign] = useState({ classId: "", productLine: "General English", openAt: "", dueAt: "" });
  const [creatingAssign, setCreatingAssign] = useState(false);
  const [sendingReport, setSendingReport] = useState<string | null>(null);
  const [reportSent, setReportSent] = useState<string | null>(null);
  const [classTrends, setClassTrends] = useState<Record<string, { period: string; avgTheta: number | null; avgCefr: string | null; count: number }[]>>({});
  const [loadingTrends, setLoadingTrends] = useState<string | null>(null);
  const [classReports, setClassReports] = useState<Record<string, ClassReportData>>({});
  const [loadingReport, setLoadingReport] = useState<string | null>(null);
  const [viewingReport, setViewingReport] = useState<string | null>(null);
  const [settingTarget, setSettingTarget] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [analyticsRes, studentsRes] = await Promise.all([
          fetch(`/api/organizations/${organizationId}/analytics`, { credentials: "include" }),
          fetch(`/api/organizations/${organizationId}/candidates`, { credentials: "include" }),
        ]);

        if (!analyticsRes.ok || !studentsRes.ok) throw new Error("Failed to load dashboard data");

        const analyticsData = await analyticsRes.json();
        const studentsData = await studentsRes.json();

        // Analytics returns cefrDistribution as [{name, value}] and skillBreakdown as [{skill, avg, count}]
        const cefrDist: Record<string, number> = {};
        if (Array.isArray(analyticsData.cefrDistribution)) {
          analyticsData.cefrDistribution.forEach((d: { name: string; value: number }) => { cefrDist[d.name] = d.value; });
        }
        const skillBreak: Record<string, number> = {};
        if (Array.isArray(analyticsData.skillBreakdown)) {
          analyticsData.skillBreakdown.forEach((d: { skill: string; avg: number }) => { skillBreak[d.skill] = d.avg; });
        }
        const totalStudentsCount = Array.isArray(studentsData) ? studentsData.length : (studentsData.candidates?.length ?? 0);
        const totalCefr = Object.values(cefrDist).reduce((a, b) => a + b, 0);
        const avgCefrIdx = totalCefr > 0
          ? Math.round(["A1","A2","B1","B2","C1","C2"].reduce((acc, lvl, i) => acc + i * (cefrDist[lvl] ?? 0), 0) / totalCefr)
          : 2;
        const cohort: CohortSummary = {
          totalStudents: analyticsData.totalCandidates ?? totalStudentsCount,
          activeThisWeek: analyticsData.activeThisWeek ?? 0,
          averageCefrLevel: analyticsData.averageCefrLevel ?? (["A1","A2","B1","B2","C1","C2"][avgCefrIdx] ?? "B1"),
          averageScore: analyticsData.averageScore ?? 0,
          learningVelocity: analyticsData.learningVelocity ?? 0,
          cefrDistribution: cefrDist,
          skillBreakdown: skillBreak,
        };
        setSummary(cohort);

        const rows: StudentRow[] = (Array.isArray(studentsData) ? studentsData : (studentsData.candidates ?? [])).map((c: any) => ({
          id: c.id,
          name: c.name ?? "Unknown",
          email: c.email ?? "",
          cefrLevel: c.cefrLevel ?? "A1",
          overallScore: c.overallScore ?? 0,
          trend: c.trend ?? "stable",
          lastActivity: c.lastActivity ? new Date(c.lastActivity).toLocaleDateString() : "—",
          sessionsCompleted: c.sessionsCompleted ?? 0,
        }));
        setStudents(rows);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 60_000);
    return () => clearInterval(interval);
  }, [organizationId]);

  const filtered = students
    .filter((s) => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q);
      const matchCefr = !filterCefr || s.cefrLevel === filterCefr;
      return matchSearch && matchCefr;
    })
    .sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      const cmp = typeof aVal === "number" && typeof bVal === "number"
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const handleSort = (col: keyof StudentRow) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("desc"); }
  };

  const fetchClasses = useCallback(async () => {
    setClassLoading(true);
    try {
      const res = await fetch("/api/teacher/classes", { credentials: "include" });
      if (res.ok) setClasses(await res.json());
    } finally {
      setClassLoading(false);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    setAssignLoading(true);
    try {
      const res = await fetch("/api/teacher/assignments", { credentials: "include" });
      if (res.ok) setAssignments(await res.json());
    } finally {
      setAssignLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === "classes") fetchClasses();
    else if (activeTab === "assignments") { fetchClasses(); fetchAssignments(); }
  }, [activeTab, fetchClasses, fetchAssignments]);

  const handleCreateAssignment = async () => {
    if (!newAssign.productLine) return;
    setCreatingAssign(true);
    try {
      const res = await fetch("/api/teacher/assignments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: newAssign.classId || undefined,
          productLine: newAssign.productLine,
          openAt: newAssign.openAt || undefined,
          dueAt: newAssign.dueAt || undefined,
        }),
      });
      if (res.ok) { setNewAssign({ classId: "", productLine: "General English", openAt: "", dueAt: "" }); fetchAssignments(); }
    } finally {
      setCreatingAssign(false);
    }
  };

  const handleCreateClass = async () => {
    if (!newClassName.trim()) return;
    setCreatingClass(true);
    try {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newClassName.trim() }),
      });
      if (res.ok) {
        setNewClassName("");
        fetchClasses();
      }
    } finally {
      setCreatingClass(false);
    }
  };

  const handleSendReport = async (studentId: string) => {
    setSendingReport(studentId);
    setReportSent(null);
    try {
      const r = await fetch(`/api/teacher/students/${studentId}/send-report`, { method: "POST", credentials: "include" });
      if (r.ok) {
        setReportSent(studentId);
        setTimeout(() => setReportSent(null), 4000);
      } else {
        const d = await r.json();
        toast({ title: "Report send failed", description: d.error ?? "Failed to send report", variant: "error" });
      }
    } finally {
      setSendingReport(null);
    }
  };

  const handleSetTargetCefr = async (classId: string, targetCefr: string) => {
    setSettingTarget(classId);
    try {
      const r = await fetch(`/api/teacher/classes/${classId}/target`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetCefr: targetCefr || null }),
      });
      if (r.ok) {
        setClasses(prev => prev.map(c => c.id === classId ? { ...c, targetCefr: targetCefr || null } : c));
      }
    } finally {
      setSettingTarget(null);
    }
  };

  const handleLoadClassReport = async (classId: string) => {
    if (classReports[classId]) { setViewingReport(classId); return; }
    setLoadingReport(classId);
    try {
      const r = await fetch(`/api/teacher/classes/${classId}/report`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        setClassReports(prev => ({ ...prev, [classId]: d }));
        setViewingReport(classId);
      }
    } finally {
      setLoadingReport(null);
    }
  };

  const handleLoadTrends = async (classId: string) => {
    if (classTrends[classId]) return;
    setLoadingTrends(classId);
    try {
      const r = await fetch(`/api/teacher/classes/${classId}/trends?periods=6`, { credentials: "include" });
      if (r.ok) {
        const d = await r.json();
        setClassTrends(prev => ({ ...prev, [classId]: d.trend ?? [] }));
      }
    } finally {
      setLoadingTrends(null);
    }
  };

  if (loading) return (
    <div role="status" aria-live="polite" style={{ display: "flex", justifyContent: "center", padding: "48px" }}>
      <div style={{ color: "#64748b" }}>Loading dashboard…</div>
    </div>
  );

  if (error) return (
    <div role="alert" style={{ padding: "16px", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#dc2626" }}>
      Error: {error}
    </div>
  );

  const cefrLevels = ["A1", "A2", "B1", "B2", "C1", "C2"];

  return (
    <div style={{ padding: "24px", maxWidth: "1400px", margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", margin: 0 }}>
          Teacher Dashboard
        </h1>
        <div role="tablist" style={{ display: "flex", gap: "4px", background: "#f1f5f9", borderRadius: "8px", padding: "4px" }}>
          {(["students", "classes", "assignments"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 16px", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: 500,
                background: activeTab === tab ? "#fff" : "transparent",
                color: activeTab === tab ? "#0f172a" : "#64748b",
                boxShadow: activeTab === tab ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {tab === "students" ? "Students" : tab === "classes" ? "Classes" : "Assignments"}
            </button>
          ))}
        </div>
      </div>

      {/* Classes Tab */}
      {activeTab === "classes" && (
        <div>
          {/* Create class */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 12px" }}>Create New Class</h2>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                type="text"
                placeholder="Class name…"
                aria-label="New class name"
                value={newClassName}
                onChange={(e) => setNewClassName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreateClass()}
                style={{ flex: 1, padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "14px" }}
              />
              <button
                onClick={handleCreateClass}
                disabled={!newClassName.trim() || creatingClass}
                style={{ padding: "8px 20px", background: "#3b82f6", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer", opacity: creatingClass ? 0.6 : 1 }}
              >
                {creatingClass ? "Creating…" : "Create"}
              </button>
            </div>
          </div>

          {/* Class list */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px" }}>Your Classes ({classes.length})</h2>
            {classLoading ? (
              <div style={{ color: "#64748b", padding: "24px", textAlign: "center" }}>Loading classes…</div>
            ) : classes.length === 0 ? (
              <div style={{ color: "#94a3b8", padding: "24px", textAlign: "center" }}>No classes yet. Create one above.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "12px" }}>
                {classes.map((cls) => (
                  <div key={cls.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                    <div
                      style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", cursor: "pointer" }}
                      onClick={async () => {
                        const next = expandedClassId === cls.id ? null : cls.id;
                        setExpandedClassId(next);
                        if (next) {
                          if (!classSkills[next]) {
                            const r = await fetch(`/api/teacher/classes/${next}/skills`, { credentials: "include" });
                            if (r.ok) {
                              const d = await r.json();
                              setClassSkills(prev => ({ ...prev, [next]: d }));
                            }
                          }
                          handleLoadTrends(next);
                        }
                      }}
                    >
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "15px" }}>{cls.name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "999px", background: cls.status === "ACTIVE" ? "#dcfce7" : "#f1f5f9", color: cls.status === "ACTIVE" ? "#16a34a" : "#64748b" }}>
                          {cls.status}
                        </span>
                        <span style={{ fontSize: "12px", color: "#94a3b8" }}>{expandedClassId === cls.id ? "▲" : "▼"}</span>
                      </div>
                    </div>
                    {cls.description && <div style={{ fontSize: "13px", color: "#64748b", marginTop: "4px" }}>{cls.description}</div>}
                    <div style={{ display: "flex", gap: "16px", marginTop: "12px", fontSize: "13px", color: "#64748b" }}>
                      <span>{cls._count?.members ?? 0} students</span>
                      <span>{cls._count?.assignments ?? 0} assignments</span>
                    </div>
                    {expandedClassId === cls.id && classSkills[cls.id] && (() => {
                      const s = classSkills[cls.id];
                      const dist = s.cefrDistribution ?? {};
                      const levels = ["A1","A2","B1","B2","C1","C2"];
                      const maxCount = Math.max(...Object.values(dist), 1);
                      return (
                        <div style={{ marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                          <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "8px" }}>
                            Assessed: {s.assessedCount}/{s.memberCount} · Avg θ: {s.averageTheta?.toFixed(2) ?? "—"}
                          </div>
                          <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "60px" }}>
                            {levels.map(lvl => {
                              const n = dist[lvl] ?? 0;
                              return (
                                <div key={lvl} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }}>
                                  <div style={{ fontSize: "10px", color: "#64748b" }}>{n > 0 ? n : ""}</div>
                                  <div style={{ width: "100%", height: `${Math.round((n / maxCount) * 44) + 4}px`, background: CEFR_COLOR[lvl] ?? "#e2e8f0", borderRadius: "3px 3px 0 0", minHeight: "4px" }} />
                                  <div style={{ fontSize: "10px", color: "#64748b" }}>{lvl}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                    {expandedClassId === cls.id && (() => {
                      const trend = classTrends[cls.id];
                      if (loadingTrends === cls.id) return (
                        <div style={{ marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "10px", fontSize: "12px", color: "#94a3b8" }}>Loading trends…</div>
                      );
                      if (!trend || trend.length === 0) return null;
                      const maxCount = Math.max(...trend.map(t => t.count), 1);
                      return (
                        <div style={{ marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>Progress Over Time</div>
                          <div style={{ display: "flex", gap: "4px", alignItems: "flex-end", height: "56px" }}>
                            {trend.map((t, i) => {
                              const h = Math.round((t.count / maxCount) * 44) + 4;
                              const cefrColor = CEFR_COLOR[t.avgCefr ?? "B1"] ?? "#e2e8f0";
                              return (
                                <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" }} title={`${t.period}: ${t.count} sessions, avg ${t.avgCefr ?? "—"}`}>
                                  <div style={{ fontSize: "9px", color: "#64748b" }}>{t.avgCefr ?? "—"}</div>
                                  <div style={{ width: "100%", height: `${h}px`, background: cefrColor, borderRadius: "2px 2px 0 0", opacity: 0.8 }} />
                                  <div style={{ fontSize: "9px", color: "#94a3b8", whiteSpace: "nowrap", overflow: "hidden", maxWidth: "100%", textOverflow: "ellipsis" }}>{t.period.split(" ")[0]}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                    <div style={{ marginTop: "12px", borderTop: "1px solid #f1f5f9", paddingTop: "12px" }}>
                      {/* Target CEFR */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                        <span style={{ fontSize: "11px", color: "#64748b", fontWeight: 600 }}>Target:</span>
                        <select
                          value={cls.targetCefr ?? ""}
                          onChange={(e) => { e.stopPropagation(); handleSetTargetCefr(cls.id, e.target.value); }}
                          disabled={settingTarget === cls.id}
                          onClick={(e) => e.stopPropagation()}
                          style={{ fontSize: "11px", border: "1px solid #e2e8f0", borderRadius: "4px", padding: "2px 6px", background: "#fff", color: "#0f172a" }}
                        >
                          <option value="">No target</option>
                          {["A1","A2","B1","B2","C1","C2"].map(l => <option key={l} value={l}>{l}</option>)}
                        </select>
                        {settingTarget === cls.id && <span style={{ fontSize: "10px", color: "#94a3b8" }}>Saving…</span>}
                      </div>
                      {/* Actions */}
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleLoadClassReport(cls.id); }}
                          style={{ fontSize: "12px", color: "#0f172a", border: "1px solid #e2e8f0", background: "#fff", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}
                        >
                          {loadingReport === cls.id ? "Loading…" : "📊 Class Report"}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); downloadClassCsv(cls.id, cls.name, (msg) => toast({ title: "Export failed", description: msg, variant: "error" })); }}
                          style={{ fontSize: "12px", color: "#4f46e5", border: "1px solid #e0e7ff", background: "#fff", borderRadius: "6px", padding: "4px 10px", cursor: "pointer", fontWeight: 600 }}
                        >
                          ↓ Export CSV
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assignments Tab */}
      {activeTab === "assignments" && (
        <div>
          {/* Create assignment */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <h2 style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 12px" }}>New Assignment</h2>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <select
                value={newAssign.classId}
                onChange={e => setNewAssign(a => ({ ...a, classId: e.target.value }))}
                style={{ flex: "1 1 160px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", fontSize: "14px" }}
              >
                <option value="">All classes (org-wide)</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select
                value={newAssign.productLine}
                onChange={e => setNewAssign(a => ({ ...a, productLine: e.target.value }))}
                style={{ flex: "1 1 180px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", fontSize: "14px" }}
              >
                {["General English","15-Min Diagnostic","Academia","Corporate","Primary","Junior"].map(pl => (
                  <option key={pl} value={pl}>{pl}</option>
                ))}
              </select>
              <input
                type="datetime-local"
                value={newAssign.openAt}
                onChange={e => setNewAssign(a => ({ ...a, openAt: e.target.value }))}
                style={{ flex: "1 1 160px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", fontSize: "14px" }}
                title="Opens at (optional)"
              />
              <input
                type="datetime-local"
                value={newAssign.dueAt}
                onChange={e => setNewAssign(a => ({ ...a, dueAt: e.target.value }))}
                style={{ flex: "1 1 160px", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "8px 12px", fontSize: "14px" }}
                title="Due date (optional)"
              />
              <button
                onClick={handleCreateAssignment}
                disabled={creatingAssign}
                style={{ background: "#4f46e5", color: "#fff", border: "none", borderRadius: "8px", padding: "8px 20px", fontWeight: 600, fontSize: "14px", cursor: "pointer", opacity: creatingAssign ? 0.6 : 1 }}
              >
                {creatingAssign ? "Creating…" : "Create"}
              </button>
            </div>
          </div>
          {/* Assignment list */}
          <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
            <h2 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 16px" }}>Assignments ({assignments.length})</h2>
            {assignLoading ? (
              <div style={{ color: "#64748b", padding: "24px", textAlign: "center" }}>Loading…</div>
            ) : assignments.length === 0 ? (
              <div style={{ color: "#94a3b8", padding: "24px", textAlign: "center" }}>No assignments yet.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "12px" }}>
                {assignments.map(a => (
                  <div key={a.id} style={{ border: "1px solid #e2e8f0", borderRadius: "10px", padding: "14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ fontWeight: 600, fontSize: "14px", color: "#0f172a", marginBottom: "4px" }}>{a.productLine}</div>
                      <span style={{
                        fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "999px",
                        background: a.windowStatus === "OPEN" ? "#dcfce7" : a.windowStatus === "PENDING" ? "#fef9c3" : "#f1f5f9",
                        color: a.windowStatus === "OPEN" ? "#16a34a" : a.windowStatus === "PENDING" ? "#a16207" : "#64748b",
                      }}>
                        {a.windowStatus ?? "OPEN"}
                      </span>
                    </div>
                    {a.class && <div style={{ fontSize: "12px", color: "#4f46e5" }}>{a.class.name}</div>}
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "6px" }}>
                      {a.openAt ? `Opens: ${new Date(a.openAt).toLocaleString()}` : ""}
                      {a.openAt && a.dueAt ? " · " : ""}
                      {a.dueAt ? `Due: ${new Date(a.dueAt).toLocaleString()}` : "No due date"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                      {a._count?.sessions ?? 0} started
                      {a.notStarted > 0 && <span style={{ color: "#f97316", marginLeft: "6px" }}>{a.notStarted} not started</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === "students" && <>

      {/* KPI Cards */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {[
            { label: "Total Students", value: summary.totalStudents, unit: "" },
            { label: "Active This Week", value: summary.activeThisWeek, unit: "" },
            { label: "Average Score", value: summary.averageScore, unit: "/100" },
            { label: "Avg CEFR Level", value: summary.averageCefrLevel, unit: "" },
            { label: "Learning Velocity", value: `+${summary.learningVelocity.toFixed(2)}`, unit: " θ/wk" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
              <div style={{ fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>{kpi.label}</div>
              <div style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
                {kpi.value}{kpi.unit}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CEFR Distribution */}
      {summary && Object.keys(summary.cefrDistribution).length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px", marginBottom: "24px" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, marginBottom: "16px" }}>CEFR Distribution</h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "80px" }}>
            {cefrLevels.map((level) => {
              const count = summary.cefrDistribution[level] ?? 0;
              const max = Math.max(...Object.values(summary.cefrDistribution), 1);
              const height = Math.round((count / max) * 70);
              return (
                <div key={level} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                  <div style={{ fontSize: "11px", color: "#64748b" }}>{count}</div>
                  <div
                    title={`${level}: ${count} students`}
                    style={{ width: "100%", height: `${height}px`, background: CEFR_COLOR[level], borderRadius: "4px 4px 0 0", minHeight: "4px" }}
                  />
                  <div style={{ fontSize: "11px", fontWeight: 600, color: CEFR_COLOR[level] }}>{level}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Student Roster */}
      <div style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", padding: "20px" }}>
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, margin: 0, alignSelf: "center" }}>Students ({filtered.length})</h2>
          <input
            type="search"
            placeholder="Search by name or email…"
            aria-label="Search students"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ flex: 1, minWidth: "200px", padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "14px" }}
          />
          <select
            aria-label="Filter by CEFR level"
            value={filterCefr}
            onChange={(e) => setFilterCefr(e.target.value)}
            style={{ padding: "8px 12px", border: "1px solid #e2e8f0", borderRadius: "6px", fontSize: "14px" }}
          >
            <option value="">All Levels</option>
            {cefrLevels.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }} role="table" aria-label="Student roster">
            <thead>
              <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
                {[
                  { key: "name", label: "Name" },
                  { key: "cefrLevel", label: "CEFR" },
                  { key: "overallScore", label: "Score" },
                  { key: "trend", label: "Trend" },
                  { key: "sessionsCompleted", label: "Sessions" },
                  { key: "lastActivity", label: "Last Active" },
                  { key: "actions", label: "" },
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    scope="col"
                    onClick={() => key !== "actions" && handleSort(key as keyof StudentRow)}
                    style={{ textAlign: "left", padding: "10px 12px", cursor: key !== "actions" ? "pointer" : "default", userSelect: "none", color: "#64748b", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}
                    aria-sort={sortBy === key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    {label} {key !== "actions" && sortBy === key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>
                    No students match your filters.
                  </td>
                </tr>
              ) : filtered.map((s, i) => (
                <tr
                  key={s.id}
                  style={{ borderBottom: "1px solid #f1f5f9", background: i % 2 === 0 ? "#fff" : "#fafafa" }}
                >
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ fontWeight: 500, color: "#0f172a" }}>{s.name}</div>
                    <div style={{ fontSize: "12px", color: "#94a3b8" }}>{s.email}</div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ background: CEFR_COLOR[s.cefrLevel] + "20", color: CEFR_COLOR[s.cefrLevel], padding: "2px 8px", borderRadius: "999px", fontWeight: 600, fontSize: "12px" }}>
                      {s.cefrLevel}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", fontWeight: 600 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ flex: 1, background: "#e2e8f0", borderRadius: "999px", height: "6px", maxWidth: "80px" }}>
                        <div style={{ width: `${s.overallScore}%`, background: "#3b82f6", height: "100%", borderRadius: "999px" }} />
                      </div>
                      {s.overallScore}
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ color: TREND_COLOR[s.trend], fontWeight: 700, fontSize: "16px" }} title={s.trend}>
                      {TREND_ICON[s.trend]}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "#334155" }}>{s.sessionsCompleted}</td>
                  <td style={{ padding: "10px 12px", color: "#64748b" }}>{s.lastActivity}</td>
                  <td style={{ padding: "10px 12px" }}>
                    {s.sessionsCompleted > 0 && (
                      <button
                        onClick={() => handleSendReport(s.id)}
                        disabled={sendingReport === s.id}
                        title="Email this student their latest report link"
                        style={{
                          fontSize: "12px", padding: "4px 10px", border: "1px solid",
                          borderColor: reportSent === s.id ? "#bbf7d0" : "#e0e7ff",
                          background: reportSent === s.id ? "#f0fdf4" : "#fff",
                          color: reportSent === s.id ? "#16a34a" : "#4f46e5",
                          borderRadius: "6px", cursor: "pointer", fontWeight: 600,
                          opacity: sendingReport === s.id ? 0.6 : 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {reportSent === s.id ? "✓ Sent" : sendingReport === s.id ? "Sending…" : "✉ Send Report"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>}

      {/* Class Report Modal */}
      {viewingReport && classReports[viewingReport] && (() => {
        const rpt = classReports[viewingReport];
        const SKILLS = ["READING","LISTENING","WRITING","SPEAKING","GRAMMAR","VOCABULARY"];
        const CEFR_LEVELS = ["A1","A2","B1","B2","C1","C2"];
        const maxHeat = Math.max(...SKILLS.flatMap(sk => CEFR_LEVELS.map(lv => rpt.skillHeatmap[sk]?.[lv] ?? 0)), 1);
        const onTrackCount = rpt.members.filter(m => m.isOnTrack === true).length;
        const needsSupportCount = rpt.members.filter(m => m.isOnTrack === false).length;
        return (
          <div
            style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 1000, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "32px 16px" }}
            onClick={() => setViewingReport(null)}
          >
            <div
              style={{ background: "#fff", borderRadius: "16px", maxWidth: "900px", width: "100%", padding: "32px", position: "relative" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                  <h2 style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", margin: 0 }}>{rpt.className}</h2>
                  <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0 0" }}>
                    {rpt.completedCount}/{rpt.totalCount} students completed
                    {rpt.targetCefr ? ` · Target: ${rpt.targetCefr}` : ""}
                  </p>
                </div>
                <button onClick={() => setViewingReport(null)} style={{ border: "none", background: "none", fontSize: "20px", cursor: "pointer", color: "#64748b" }}>✕</button>
              </div>

              {/* On-track summary */}
              {rpt.targetCefr && (
                <div style={{ display: "flex", gap: "12px", marginBottom: "24px" }}>
                  <div style={{ flex: 1, background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "#16a34a" }}>{onTrackCount}</div>
                    <div style={{ fontSize: "12px", color: "#15803d", fontWeight: 600 }}>On Track ✓</div>
                  </div>
                  <div style={{ flex: 1, background: "#fef9c3", border: "1px solid #fde047", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "#a16207" }}>{rpt.completedCount - onTrackCount - needsSupportCount}</div>
                    <div style={{ fontSize: "12px", color: "#854d0e", fontWeight: 600 }}>Not Assessed</div>
                  </div>
                  <div style={{ flex: 1, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "10px", padding: "16px", textAlign: "center" }}>
                    <div style={{ fontSize: "28px", fontWeight: 700, color: "#dc2626" }}>{needsSupportCount}</div>
                    <div style={{ fontSize: "12px", color: "#b91c1c", fontWeight: 600 }}>Needs Support</div>
                  </div>
                </div>
              )}

              {/* CEFR distribution */}
              <div style={{ marginBottom: "24px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", margin: "0 0 12px" }}>CEFR Distribution</h3>
                <div style={{ display: "flex", gap: "8px", alignItems: "flex-end", height: "80px" }}>
                  {CEFR_LEVELS.map(lv => {
                    const n = rpt.cefrDistribution[lv] ?? 0;
                    const max = Math.max(...Object.values(rpt.cefrDistribution), 1);
                    return (
                      <div key={lv} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "3px" }}>
                        <div style={{ fontSize: "11px", color: "#64748b" }}>{n || ""}</div>
                        <div style={{ width: "100%", height: `${Math.round((n / max) * 60) + 4}px`, background: CEFR_COLOR[lv] ?? "#e2e8f0", borderRadius: "3px 3px 0 0", minHeight: "4px", opacity: lv === rpt.targetCefr ? 1 : 0.7, boxShadow: lv === rpt.targetCefr ? `0 0 0 2px ${CEFR_COLOR[lv]}` : "none" }} />
                        <div style={{ fontSize: "11px", fontWeight: 600, color: CEFR_COLOR[lv] ?? "#64748b" }}>{lv}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Skill × CEFR Heatmap */}
              <div style={{ marginBottom: "24px", overflowX: "auto" }}>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", margin: "0 0 12px" }}>Skill × CEFR Heatmap</h3>
                <table style={{ borderCollapse: "collapse", fontSize: "12px", width: "100%" }}>
                  <thead>
                    <tr>
                      <th style={{ padding: "6px 10px", textAlign: "left", color: "#64748b", fontWeight: 600 }}>Skill</th>
                      {CEFR_LEVELS.map(lv => (
                        <th key={lv} style={{ padding: "6px 8px", textAlign: "center", color: CEFR_COLOR[lv], fontWeight: 700 }}>{lv}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {SKILLS.map(sk => (
                      <tr key={sk}>
                        <td style={{ padding: "6px 10px", fontWeight: 600, color: "#334155", textTransform: "capitalize" }}>{sk.charAt(0) + sk.slice(1).toLowerCase()}</td>
                        {CEFR_LEVELS.map(lv => {
                          const n = rpt.skillHeatmap[sk]?.[lv] ?? 0;
                          const intensity = n / maxHeat;
                          return (
                            <td key={lv} style={{ padding: "6px 8px", textAlign: "center", borderRadius: "4px", background: n > 0 ? `rgba(99,102,241,${0.1 + intensity * 0.7})` : "#f8fafc", color: n > 0 ? "#1e1b4b" : "#cbd5e1", fontWeight: n > 0 ? 700 : 400 }}>
                              {n > 0 ? n : "·"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Student list */}
              <div>
                <h3 style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a", margin: "0 0 12px" }}>Students</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                        {["Name", "CEFR", "Status", "Report"].map(h => (
                          <th key={h} style={{ padding: "8px 10px", textAlign: "left", color: "#64748b", fontWeight: 600, fontSize: "11px", textTransform: "uppercase" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rpt.members.map(m => (
                        <tr key={m.userId} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "8px 10px" }}>
                            <div style={{ fontWeight: 500, color: "#0f172a" }}>{m.name}</div>
                            <div style={{ fontSize: "11px", color: "#94a3b8" }}>{m.email}</div>
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            {m.cefrLevel ? (
                              <span style={{ background: (CEFR_COLOR[m.cefrLevel.replace("_", "")] ?? "#e2e8f0") + "22", color: CEFR_COLOR[m.cefrLevel.replace("_", "")] ?? "#64748b", padding: "2px 8px", borderRadius: "999px", fontWeight: 700, fontSize: "12px" }}>
                                {m.cefrLevel.replace("_", " ")}
                              </span>
                            ) : <span style={{ color: "#94a3b8", fontSize: "12px" }}>—</span>}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            {!m.completed ? (
                              <span style={{ fontSize: "11px", color: "#94a3b8" }}>Not started</span>
                            ) : m.isOnTrack === true ? (
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#16a34a", background: "#f0fdf4", padding: "2px 8px", borderRadius: "999px" }}>✓ On Track</span>
                            ) : m.isOnTrack === false ? (
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "#dc2626", background: "#fef2f2", padding: "2px 8px", borderRadius: "999px" }}>⚠ Needs Support</span>
                            ) : (
                              <span style={{ fontSize: "11px", color: "#22c55e" }}>Completed</span>
                            )}
                          </td>
                          <td style={{ padding: "8px 10px" }}>
                            {m.scoreReportId ? (
                              <a href={`/results/${m.scoreReportId}`} target="_blank" rel="noreferrer" style={{ fontSize: "12px", color: "#4f46e5", fontWeight: 600, textDecoration: "none" }}>
                                View →
                              </a>
                            ) : <span style={{ fontSize: "12px", color: "#94a3b8" }}>—</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default TeacherDashboard;
