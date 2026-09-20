import React, { useEffect, useState } from "react";
import { Building2, Plus, Users, Activity, ChevronRight, Check, X, RefreshCw } from "lucide-react";

interface Org {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { users: number; sessions: number };
}

const ORG_TYPES = ["corporate", "university", "language_school", "k12", "government", "other"];

const INPUT = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const LABEL = "block text-xs font-semibold text-slate-600 mb-1";

export const OrganizationManagement: React.FC = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<{ org: Org; adminPassword?: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [type, setType] = useState("corporate");
  const [credits, setCredits] = useState(100);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName]   = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/organizations", { credentials: "include" });
      if (r.ok) setOrgs(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrgs(); }, []);

  // Auto-derive slug from name
  useEffect(() => {
    if (!slugManual) {
      setSlug(name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
    }
  }, [name, slugManual]);

  const reset = () => {
    setName(""); setSlug(""); setSlugManual(false);
    setType("corporate"); setCredits(100);
    setAdminEmail(""); setAdminName(""); setAdminPassword("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;
    setSubmitting(true); setError(null);
    try {
      const r = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, slug, type, credits, adminEmail: adminEmail || undefined, adminName: adminName || undefined, adminPassword: adminPassword || undefined }),
      });
      const data = await r.json();
      if (!r.ok) { setError(data.error ?? "Failed"); return; }
      setCreated(data);
      setShowForm(false);
      reset();
      fetchOrgs();
    } catch {
      setError("Network error — please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">Organizations</h2>
          <p className="text-xs text-slate-500 mt-0.5">{orgs.length} tenants registered on the platform</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchOrgs} className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => { setShowForm(true); setCreated(null); setError(null); }}
            className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-2 transition-colors"
          >
            <Plus size={14} /> New Organisation
          </button>
        </div>
      </div>

      {/* Success banner */}
      {created && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <Check size={16} className="text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-emerald-800">"{created.org.name}" created successfully!</p>
            {created.adminPassword && (
              <p className="text-emerald-700 mt-1">
                Admin account created. Temporary password:{" "}
                <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono text-xs">{created.adminPassword}</code>
                <span className="text-emerald-600 text-xs ml-2">— share securely and ask admin to change on first login.</span>
              </p>
            )}
          </div>
          <button onClick={() => setCreated(null)} className="text-emerald-500 hover:text-emerald-700">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
              <Building2 size={14} className="text-indigo-600" /> Create New Organisation
            </h3>
            <button onClick={() => { setShowForm(false); reset(); }} className="text-slate-400 hover:text-slate-600">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Organisation name */}
            <div className="md:col-span-2">
              <label className={LABEL}>Organisation Name *</label>
              <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Acme University" required />
            </div>

            {/* Slug */}
            <div>
              <label className={LABEL}>Slug (URL-safe ID) *</label>
              <input className={INPUT} value={slug}
                onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"-")); setSlugManual(true); }}
                placeholder="acme-university" required />
              <p className="text-[10px] text-slate-400 mt-1">Used in API and URLs. Auto-generated from name.</p>
            </div>

            {/* Type */}
            <div>
              <label className={LABEL}>Organisation Type</label>
              <select className={INPUT} value={type} onChange={e => setType(e.target.value)}>
                {ORG_TYPES.map(t => <option key={t} value={t}>{t.replace("_"," ").replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
              </select>
            </div>

            {/* Credits */}
            <div>
              <label className={LABEL}>Initial Test Credits</label>
              <input type="number" className={INPUT} value={credits} min={0} max={100000}
                onChange={e => setCredits(parseInt(e.target.value) || 0)} />
            </div>

            <div className="md:col-span-2 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Admin Account (optional)</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className={LABEL}>Admin Email</label>
                  <input type="email" className={INPUT} value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@acme.edu" />
                </div>
                <div>
                  <label className={LABEL}>Admin Name</label>
                  <input className={INPUT} value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Jane Smith" />
                </div>
                <div>
                  <label className={LABEL}>Password (blank = auto-generate)</label>
                  <input type="password" className={INPUT} value={adminPassword} onChange={e => setAdminPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
                </div>
              </div>
            </div>

            {error && (
              <div className="md:col-span-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-700">{error}</div>
            )}

            <div className="md:col-span-2 flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => { setShowForm(false); reset(); }}
                className="text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={submitting || !name.trim() || !slug.trim()}
                className="flex items-center gap-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-5 py-2 transition-colors">
                {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                {submitting ? "Creating…" : "Create Organisation"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Org list */}
      {loading && orgs.length === 0 ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Building2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No organisations yet — create the first one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map(org => (
            <div key={org.id} className="rounded-xl border border-slate-100 bg-white px-5 py-4 flex items-center gap-4 hover:shadow-sm transition-shadow">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                <Building2 size={16} className="text-indigo-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">{org.name}</p>
                <p className="text-xs text-slate-400 font-mono">{org.slug}</p>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                <span className="flex items-center gap-1"><Users size={12} /> {org._count.users}</span>
                <span className="flex items-center gap-1"><Activity size={12} /> {org._count.sessions}</span>
                <span className="text-slate-400">{new Date(org.createdAt).toLocaleDateString("en-GB", { day:"2-digit", month:"short", year:"numeric" })}</span>
              </div>
              <code className="text-[10px] font-mono text-slate-300 hidden lg:block truncate max-w-[120px]">{org.id}</code>
              <ChevronRight size={14} className="text-slate-300 shrink-0" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
