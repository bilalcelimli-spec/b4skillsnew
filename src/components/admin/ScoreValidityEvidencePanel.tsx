import React, { useEffect, useState } from 'react';
import type { summarizeScoreValidity } from '../../lib/analytics/score-validity';

type Evidence = ReturnType<typeof summarizeScoreValidity>;
const number = (value: number | null, digits = 3) => value === null ? 'Not available' : value.toFixed(digits);
const percent = (value: number | null) => value === null ? 'Not available' : `${(value * 100).toFixed(1)}%`;

export function ScoreValidityEvidencePanel() {
  const [data, setData] = useState<Evidence | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const load = async () => {
    setLoading(true); setError(null);
    try {
      const response = await fetch('/api/psychometrics/score-validity', { credentials: 'include' });
      if (!response.ok) throw new Error('Could not load score evidence');
      setData(await response.json());
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load score evidence'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  if (loading) return <p role="status">Loading score evidence…</p>;
  if (error) return <div role="alert">{error} <button onClick={load}>Retry</button></div>;
  if (!data) return null;
  return <div className="space-y-6 text-slate-700">
    <div className="flex justify-between"><h2 className="text-xl font-bold">Score Evidence</h2><button onClick={load}>Refresh</button></div>
    <p className="text-sm text-slate-500">{data.validityStatement}</p>
    <dl className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[
        ['Scored sessions in sample', data.nSessions.toLocaleString()],
        ['Excluded incomplete evidence', data.excludedSessions.toLocaleString()],
        ['IRT marginal reliability', number(data.marginalReliability)],
        ['Mean SEM (θ)', number(data.meanSEM)],
      ].map(([label, value]) => <div key={label} className="rounded-lg bg-slate-100 p-4"><dt className="text-xs text-slate-500">{label}</dt><dd className="text-xl mt-2">{value}</dd></div>)}
    </dl>
    <p className="text-sm text-slate-500">Cronbach α and McDonald ω: not available. Common-item covariance and an appropriate model are required. Marginal reliability requires at least 10 scored sessions with nonzero theta variance.</p>
    <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="text-left mb-3">Measurement precision by reported CEFR</caption>
      <thead><tr>{['Level', 'N', 'Mean θ', 'SD θ', 'Mean SEM', 'SD SEM', 'Marginal reliability'].map(label => <th key={label} className="text-left p-2">{label}</th>)}</tr></thead>
      <tbody>{data.reliability.map(row => <tr key={row.cefrLevel}>{[row.cefrLevel, row.nSessions, number(row.meanTheta), number(row.sdTheta), number(row.meanSEM), number(row.sdSEM), number(row.marginalReliability)].map((value, i) => <td key={i} className="p-2">{value}</td>)}</tr>)}</tbody>
    </table>{!data.reliability.length && <p>No scored evidence available.</p>}</div>
    <div><h3 className="font-semibold">Observed repeat agreement</h3><p className="text-sm text-slate-500">First and last scored assessments within {data.repeatAgreement.maxDays} days, grouped by candidate and known product. This is agreement between attempts, not accuracy against an independent CEFR criterion.</p>
      <p className="mt-2">Pairs: {data.repeatAgreement.nPairs} · Exact: {percent(data.repeatAgreement.exact)} · Within one level: {percent(data.repeatAgreement.adjacent)} · Cohen κ: {number(data.repeatAgreement.kappa)}</p>
    </div>
    <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="text-left mb-3">Observed skill score correlations</caption><thead><tr><th className="text-left p-2">Skills</th><th className="text-left p-2">Pearson r</th><th className="text-left p-2">Pairs</th></tr></thead>
      <tbody>{data.correlations.map(row => <tr key={`${row.skillA}-${row.skillB}`}><td className="p-2">{row.skillA} / {row.skillB}</td><td className="p-2">{number(row.pearsonR)}</td><td className="p-2">{row.nPairs}</td></tr>)}</tbody>
    </table>{!data.correlations.length && <p>Insufficient paired scores or no score variation.</p>}</div>
  </div>;
}
