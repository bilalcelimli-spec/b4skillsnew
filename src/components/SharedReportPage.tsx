import { useEffect, useState } from "react";

interface SharedReport {
  candidateName: string;
  cefr: string;
  score: number | null;
  skills: {
    reading: number | null;
    listening: number | null;
    writing: number | null;
    speaking: number | null;
  };
  completedAt: string;
}

const CEFR_COLORS: Record<string, string> = {
  A1: "#94a3b8", A2: "#64748b",
  B1: "#3b82f6", B2: "#6366f1",
  C1: "#8b5cf6", C2: "#7c3aed",
  PRE_A1: "#cbd5e1",
};

const SKILL_LABELS: Record<string, string> = {
  reading: "Reading", listening: "Listening", writing: "Writing", speaking: "Speaking",
};

interface Props {
  token: string;
}

export function SharedReportPage({ token }: Props) {
  const [report, setReport] = useState<SharedReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((r) => r.ok ? r.json() : r.json().then((e: any) => Promise.reject(e.error ?? "Not found")))
      .then((d) => setReport(d))
      .catch((e) => setError(typeof e === "string" ? e : "This share link is invalid or has expired."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">🔗</div>
          <h1 className="text-xl font-semibold text-slate-800 mb-2">Link not found</h1>
          <p className="text-slate-500 text-sm">{error ?? "This share link is invalid or has expired."}</p>
        </div>
      </div>
    );
  }

  const cefrColor = CEFR_COLORS[report.cefr] ?? "#6366f1";
  const completedDate = new Date(report.completedAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        {/* Header band */}
        <div className="px-8 py-6 text-white" style={{ backgroundColor: cefrColor }}>
          <p className="text-xs font-semibold uppercase tracking-widest opacity-80 mb-1">B4Skills Assessment</p>
          <h1 className="text-3xl font-bold mb-0.5">{report.cefr.replace("_", " ")}</h1>
          <p className="text-sm opacity-90">CEFR English Level</p>
        </div>

        <div className="px-8 py-6">
          <p className="text-lg font-semibold text-slate-800">{report.candidateName}</p>
          <p className="text-sm text-slate-400 mb-5">Completed {completedDate}</p>

          {report.score !== null && (
            <div className="flex items-center gap-3 mb-5 p-3 bg-slate-50 rounded-xl">
              <span className="text-2xl font-bold text-indigo-600">{report.score}</span>
              <span className="text-sm text-slate-500">Overall Score</span>
            </div>
          )}

          {/* Skill breakdown */}
          <div className="space-y-2">
            {(Object.entries(report.skills) as [string, number | null][])
              .filter(([, v]) => v !== null)
              .map(([skill, score]) => (
                <div key={skill} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 w-20 shrink-0 font-medium">{SKILL_LABELS[skill] ?? skill}</span>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((score! + 4) / 8) * 100)}%`, backgroundColor: cefrColor }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-slate-600 w-8 text-right">{score!.toFixed(1)}</span>
                </div>
              ))}
          </div>
        </div>

        <div className="px-8 pb-6 text-center">
          <p className="text-xs text-slate-400">
            Verified by{" "}
            <a href="/" className="text-indigo-500 hover:underline font-medium">B4Skills</a>
            {" "}· Adaptive English Assessment Platform
          </p>
        </div>
      </div>
    </div>
  );
}
