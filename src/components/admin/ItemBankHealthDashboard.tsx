/**
 * Item Bank Health Dashboard
 *
 * Surfaces calibration pipeline health at a glance:
 *  - Status distribution funnel (DRAFT → REVIEW → PILOT → CALIBRATION → ACTIVE → RETIRED)
 *  - Skill × CEFR coverage heatmap (red = gap, amber = thin, green = healthy)
 *  - Key KPIs: total active, PILOT+CALIBRATION in pipeline, retirement candidates
 */

import { useEffect, useState } from "react";
import { RefreshCw, Activity, AlertTriangle, CheckCircle, Database } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CellData {
  counts: Record<string, number>;
  total: number;
  avgDiscrimination: number | null;
  avgDifficulty: number | null;
}

interface InventoryResponse {
  matrix: Record<string, Record<string, CellData>>;
  skillTotals: Record<string, { total: number; active: number; pretest: number }>;
  grandTotal: number;
}

const CEFR_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
const STATUS_ORDER = ["DRAFT", "REVIEW", "PILOT", "CALIBRATION", "ACTIVE", "WATCHLIST", "RETIRED"] as const;

const STATUS_COLOR: Record<string, string> = {
  DRAFT:       "#94a3b8",
  REVIEW:      "#f59e0b",
  PILOT:       "#3b82f6",
  CALIBRATION: "#8b5cf6",
  ACTIVE:      "#10b981",
  WATCHLIST:   "#f97316",
  RETIRED:     "#6b7280",
};

const MIN_ACTIVE_HEALTHY = 10;  // cells with < 10 active items flagged amber
const MIN_ACTIVE_CRITICAL = 3;  // cells with < 3 active items flagged red

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cellColor(active: number): string {
  if (active === 0)                     return "#fef2f2";   // red-50
  if (active < MIN_ACTIVE_CRITICAL)     return "#fca5a5";   // red-300
  if (active < MIN_ACTIVE_HEALTHY)      return "#fde68a";   // amber-200
  return "#d1fae5";                                         // green-100
}

function cellTextColor(active: number): string {
  if (active < MIN_ACTIVE_CRITICAL) return "#b91c1c";
  if (active < MIN_ACTIVE_HEALTHY)  return "#92400e";
  return "#065f46";
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, color }: {
  label: string; value: number | string; sub?: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <div style={{
      padding: "14px 16px", borderRadius: 10,
      background: "var(--bg-surface)", border: "1px solid var(--border)",
      display: "flex", alignItems: "flex-start", gap: 12,
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        background: color + "22", color, display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>{label}</p>
        <p style={{ fontSize: "1.375rem", fontWeight: 700, color: "var(--text-primary)", margin: "2px 0 0", fontVariantNumeric: "tabular-nums", lineHeight: 1 }}>{value}</p>
        {sub && <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", margin: "3px 0 0" }}>{sub}</p>}
      </div>
    </div>
  );
}

// ─── Status Funnel ────────────────────────────────────────────────────────────

function StatusFunnel({ counts }: { counts: Record<string, number> }) {
  const total = Math.max(1, Object.values(counts).reduce((a, b) => a + b, 0));
  return (
    <div>
      <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>
        Calibration Pipeline
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {STATUS_ORDER.map((s) => {
          const n = counts[s] ?? 0;
          const pct = (n / total) * 100;
          return (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                width: 80, fontSize: "0.6875rem", fontWeight: 600,
                color: "var(--text-secondary)", textAlign: "right", flexShrink: 0,
              }}>
                {s}
              </span>
              <div style={{ flex: 1, height: 18, background: "var(--bg-subtle)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{
                  height: "100%", width: `${pct}%`,
                  background: STATUS_COLOR[s] ?? "#94a3b8",
                  borderRadius: 4, transition: "width 0.5s ease-out",
                  minWidth: n > 0 ? 4 : 0,
                }} />
              </div>
              <span style={{
                width: 36, fontSize: "0.75rem", fontWeight: 700,
                color: "var(--text-primary)", fontVariantNumeric: "tabular-nums",
                textAlign: "right", flexShrink: 0,
              }}>
                {n}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Coverage Heatmap ─────────────────────────────────────────────────────────

function CoverageHeatmap({ matrix, skills }: {
  matrix: Record<string, Record<string, CellData>>;
  skills: string[];
}) {
  return (
    <div>
      <h3 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", margin: "0 0 12px" }}>
        Active Item Coverage (Skill × CEFR)
      </h3>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "0.75rem" }}>
          <thead>
            <tr>
              <th style={{ padding: "4px 8px", textAlign: "left", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.6875rem" }}>
                Skill
              </th>
              {CEFR_LEVELS.map((c) => (
                <th key={c} style={{ padding: "4px 10px", textAlign: "center", color: "var(--text-muted)", fontWeight: 700, fontSize: "0.6875rem", letterSpacing: "0.04em" }}>
                  {c}
                </th>
              ))}
              <th style={{ padding: "4px 10px", textAlign: "center", color: "var(--text-muted)", fontWeight: 600, fontSize: "0.6875rem" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {skills.map((skill) => {
              const rowTotal = CEFR_LEVELS.reduce((sum, c) => sum + (matrix[skill]?.[c]?.counts?.ACTIVE ?? 0), 0);
              return (
                <tr key={skill}>
                  <td style={{ padding: "4px 8px", fontWeight: 600, color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {skill}
                  </td>
                  {CEFR_LEVELS.map((c) => {
                    const cell = matrix[skill]?.[c];
                    const active = cell?.counts?.ACTIVE ?? 0;
                    const pilot = (cell?.counts?.PILOT ?? 0) + (cell?.counts?.CALIBRATION ?? 0);
                    const bg = cellColor(active);
                    const tc = cellTextColor(active);
                    return (
                      <td key={c} style={{ padding: "3px 6px", textAlign: "center" }}>
                        <div style={{
                          background: bg, color: tc,
                          borderRadius: 6, padding: "4px 6px",
                          fontWeight: 700, minWidth: 36, display: "inline-block",
                        }}
                          title={`Active: ${active}  |  In pipeline: ${pilot}  |  Total: ${cell?.total ?? 0}`}
                        >
                          {active}
                          {pilot > 0 && (
                            <span style={{ fontSize: "0.6rem", color: "#7c3aed", display: "block", fontWeight: 600, lineHeight: 1 }}>
                              +{pilot}
                            </span>
                          )}
                        </div>
                      </td>
                    );
                  })}
                  <td style={{ padding: "4px 10px", textAlign: "center", fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums" }}>
                    {rowTotal}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{ display: "flex", gap: 16, marginTop: 10, flexWrap: "wrap" }}>
        {[
          { label: "≥10 active", bg: "#d1fae5", tc: "#065f46" },
          { label: "3–9 active", bg: "#fde68a", tc: "#92400e" },
          { label: "<3 active",  bg: "#fca5a5", tc: "#b91c1c" },
          { label: "0 active",   bg: "#fef2f2", tc: "#b91c1c" },
        ].map(({ label, bg, tc }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: "0.6875rem", color: "var(--text-muted)" }}>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: bg, border: `1px solid ${tc}44` }} />
            {label}
          </div>
        ))}
        <div style={{ fontSize: "0.6875rem", color: "#7c3aed", display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ fontWeight: 700 }}>+N</span> = items in PILOT/CALIBRATION
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ItemBankHealthDashboard() {
  const [data, setData]       = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/items/inventory");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData(await r.json());
      setLastFetch(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const skills = data ? Object.keys(data.matrix).sort() : [];

  // Aggregate status counts across all items in the matrix
  const statusCounts: Record<string, number> = {};
  if (data) {
    for (const skill of skills) {
      for (const cefr of CEFR_LEVELS) {
        const cell = data.matrix[skill]?.[cefr];
        if (!cell) continue;
        for (const [st, n] of Object.entries(cell.counts)) {
          statusCounts[st] = (statusCounts[st] ?? 0) + n;
        }
      }
    }
  }

  const totalActive      = statusCounts["ACTIVE"]      ?? 0;
  const inPipeline       = (statusCounts["PILOT"] ?? 0) + (statusCounts["CALIBRATION"] ?? 0);
  const totalRetired     = statusCounts["RETIRED"]     ?? 0;
  const gapCells         = skills.reduce((acc, skill) =>
    acc + CEFR_LEVELS.filter((c) => (data?.matrix[skill]?.[c]?.counts?.ACTIVE ?? 0) < MIN_ACTIVE_CRITICAL).length, 0
  );

  return (
    <div style={{ padding: "20px 24px", maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
            Item Bank Health
          </h2>
          {lastFetch && (
            <p style={{ fontSize: "0.6875rem", color: "var(--text-muted)", margin: "2px 0 0" }}>
              Last updated {lastFetch.toLocaleTimeString()}
            </p>
          )}
        </div>
        <button
          onClick={load}
          disabled={loading}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "6px 12px", borderRadius: 8,
            border: "1px solid var(--border)", background: "var(--bg-subtle)",
            cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1,
            fontSize: "0.8125rem", color: "var(--text-primary)", fontWeight: 500,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          Refresh
        </button>
      </div>

      {error && (
        <div style={{
          padding: "10px 14px", borderRadius: 8, marginBottom: 16,
          background: "#fef2f2", border: "1px solid #fca5a5", color: "#b91c1c",
          fontSize: "0.8125rem",
        }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
        <KpiCard label="Active Items" value={totalActive} sub="Served in live sessions"
          icon={<CheckCircle size={16} />} color="#10b981" />
        <KpiCard label="In Pipeline" value={inPipeline} sub="PILOT + CALIBRATION"
          icon={<Activity size={16} />} color="#8b5cf6" />
        <KpiCard label="Gap Cells" value={gapCells} sub="Skill×CEFR with <3 active"
          icon={<AlertTriangle size={16} />} color={gapCells > 0 ? "#ef4444" : "#10b981"} />
        <KpiCard label="Retired" value={totalRetired} sub="Removed from bank"
          icon={<Database size={16} />} color="#94a3b8" />
      </div>

      {data && skills.length > 0 ? (
        <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", gap: 24, alignItems: "start" }}>
          {/* Left — pipeline funnel */}
          <div style={{
            padding: "16px", borderRadius: 10,
            background: "var(--bg-surface)", border: "1px solid var(--border)",
          }}>
            <StatusFunnel counts={statusCounts} />
          </div>

          {/* Right — coverage heatmap */}
          <div style={{
            padding: "16px", borderRadius: 10,
            background: "var(--bg-surface)", border: "1px solid var(--border)",
          }}>
            <CoverageHeatmap matrix={data.matrix} skills={skills} />
          </div>
        </div>
      ) : !loading && (
        <div style={{ padding: "40px 0", textAlign: "center", color: "var(--text-muted)", fontSize: "0.875rem" }}>
          {data ? "No item data available." : "Loading…"}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
