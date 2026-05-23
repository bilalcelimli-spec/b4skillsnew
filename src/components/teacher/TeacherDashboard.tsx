import React, { useEffect, useState } from "react";

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

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  organizationId,
  instructorId,
}) => {
  const [summary, setSummary] = useState<CohortSummary | null>(null);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof StudentRow>("overallScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [filterCefr, setFilterCefr] = useState<string>("");

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

        const cohort: CohortSummary = {
          totalStudents: analyticsData.totalCandidates ?? studentsData.candidates?.length ?? 0,
          activeThisWeek: analyticsData.activeThisWeek ?? 0,
          averageCefrLevel: analyticsData.averageCefrLevel ?? "B1",
          averageScore: analyticsData.averageScore ?? 0,
          learningVelocity: analyticsData.learningVelocity ?? 0,
          cefrDistribution: analyticsData.cefrDistribution ?? {},
          skillBreakdown: analyticsData.skillBreakdown ?? {},
        };
        setSummary(cohort);

        const rows: StudentRow[] = (studentsData.candidates ?? []).map((c: any) => ({
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
      <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a", marginBottom: "24px" }}>
        Teacher Dashboard
      </h1>

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
                ].map(({ key, label }) => (
                  <th
                    key={key}
                    scope="col"
                    onClick={() => handleSort(key as keyof StudentRow)}
                    style={{ textAlign: "left", padding: "10px 12px", cursor: "pointer", userSelect: "none", color: "#64748b", fontWeight: 600, fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em" }}
                    aria-sort={sortBy === key ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                  >
                    {label} {sortBy === key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "24px", textAlign: "center", color: "#94a3b8" }}>
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
