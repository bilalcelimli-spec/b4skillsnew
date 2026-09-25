import React, { useEffect, useState, useCallback } from "react";
import { Building2, Plus, Users, Activity, ChevronRight, Check, X, RefreshCw, ArrowLeft, UserPlus, Pencil, Trash2, ShieldAlert, GraduationCap, User, KeyRound, CreditCard } from "lucide-react";

interface Org {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  _count: { users: number; sessions: number };
}

interface OrgUser {
  id: string;
  name: string | null;
  email: string;
  role: string;
  createdAt: string;
  emailVerified: boolean;
  lastLoginAt?: string | null;
}

const ORG_TYPES = ["corporate", "university", "language_school", "k12", "government", "other"];
const ALLOWED_ROLES = ["CANDIDATE", "TEACHER", "INST_ADMIN"] as const;
type AllowedRole = typeof ALLOWED_ROLES[number];

const INPUT = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";
const LABEL = "block text-xs font-semibold text-slate-600 mb-1";

const ROLE_META: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  INST_ADMIN:  { label: "Org Admin",  icon: <ShieldAlert size={12} />, color: "bg-violet-100 text-violet-700" },
  TEACHER:     { label: "Teacher",    icon: <GraduationCap size={12} />, color: "bg-blue-100 text-blue-700" },
  CANDIDATE:   { label: "Candidate",  icon: <User size={12} />, color: "bg-slate-100 text-slate-600" },
};

const RoleBadge = ({ role }: { role: string }) => {
  const m = ROLE_META[role] ?? { label: role, icon: null, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${m.color}`}>
      {m.icon}{m.label}
    </span>
  );
};

// ─── Create Org Form ──────────────────────────────────────────────────────────

interface CreateOrgFormProps {
  onCreated: (result: { org: Org; adminPassword?: string }) => void;
  onCancel: () => void;
}

const CreateOrgForm: React.FC<CreateOrgFormProps> = ({ onCreated, onCancel }) => {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManual, setSlugManual] = useState(false);
  const [type, setType] = useState("corporate");
  const [credits, setCredits] = useState(100);
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slugManual) setSlug(name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }, [name, slugManual]);

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
      onCreated(data);
    } catch { setError("Network error — please try again."); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="rounded-2xl border border-indigo-100 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
          <Building2 size={14} className="text-indigo-600" /> Create New Organisation
        </h3>
        <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="md:col-span-2">
          <label className={LABEL}>Organisation Name *</label>
          <input className={INPUT} value={name} onChange={e => setName(e.target.value)} placeholder="Acme University" required />
        </div>
        <div>
          <label className={LABEL}>Slug (URL-safe ID) *</label>
          <input className={INPUT} value={slug}
            onChange={e => { setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-")); setSlugManual(true); }}
            placeholder="acme-university" required />
          <p className="text-[10px] text-slate-400 mt-1">Auto-generated from name.</p>
        </div>
        <div>
          <label className={LABEL}>Organisation Type</label>
          <select className={INPUT} value={type} onChange={e => setType(e.target.value)}>
            {ORG_TYPES.map(t => <option key={t} value={t}>{t.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase())}</option>)}
          </select>
        </div>
        <div>
          <label className={LABEL}>Initial Test Credits</label>
          <input type="number" className={INPUT} value={credits} min={0} max={100000} onChange={e => setCredits(parseInt(e.target.value) || 0)} />
        </div>
        <div className="md:col-span-2 border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Admin Account (optional)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><label className={LABEL}>Admin Email</label><input type="email" className={INPUT} value={adminEmail} onChange={e => setAdminEmail(e.target.value)} placeholder="admin@acme.edu" /></div>
            <div><label className={LABEL}>Admin Name</label><input className={INPUT} value={adminName} onChange={e => setAdminName(e.target.value)} placeholder="Jane Smith" /></div>
            <div><label className={LABEL}>Password (blank = auto-generate)</label><input type="password" className={INPUT} value={adminPassword} onChange={e => setAdminPassword(e.target.value)} /></div>
          </div>
        </div>
        {error && <div className="md:col-span-2 rounded-lg bg-rose-50 border border-rose-200 px-4 py-2.5 text-sm text-rose-700">{error}</div>}
        <div className="md:col-span-2 flex justify-end gap-3 pt-2">
          <button type="button" onClick={onCancel} className="text-sm font-medium text-slate-500 hover:text-slate-700 px-4 py-2 rounded-lg border border-slate-200 transition-colors">Cancel</button>
          <button type="submit" disabled={submitting || !name.trim() || !slug.trim()}
            className="flex items-center gap-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-5 py-2 transition-colors">
            {submitting ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
            {submitting ? "Creating…" : "Create Organisation"}
          </button>
        </div>
      </form>
    </div>
  );
};

// ─── Org Detail (users) ───────────────────────────────────────────────────────

interface OrgDetailProps {
  org: Org;
  onBack: () => void;
}

const OrgDetail: React.FC<OrgDetailProps> = ({ org, onBack }) => {
  const [users, setUsers] = useState<OrgUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addName, setAddName] = useState("");
  const [addRole, setAddRole] = useState<AllowedRole>("CANDIDATE");
  const [addPw, setAddPw] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [addedPw, setAddedPw] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<AllowedRole>("CANDIDATE");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [resetting, setResetting] = useState<string | null>(null);
  const [resetPw, setResetPw] = useState<{ userId: string; pw: string } | null>(null);
  const [credits, setCredits] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/organizations/${org.id}/users`, { credentials: "include" });
      if (r.ok) setUsers(await r.json());
    } finally { setLoading(false); }
  }, [org.id]);

  useEffect(() => {
    fetchUsers();
    fetch(`/api/organizations/${org.id}/credits`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCredits(d.credits); })
      .catch(() => {});
  }, [fetchUsers, org.id]);

  const handleResetPassword = async (userId: string) => {
    if (!window.confirm("Reset this user's password? They will be emailed a temporary password and logged out of all sessions.")) return;
    setResetting(userId);
    try {
      const r = await fetch(`/api/organizations/${org.id}/users/${userId}/reset-password`, { method: "POST", credentials: "include" });
      const data = await r.json();
      if (r.ok) setResetPw({ userId, pw: data.newPassword });
    } finally { setResetting(null); }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAdding(true); setAddError(null); setAddedPw(null);
    try {
      const r = await fetch(`/api/organizations/${org.id}/users`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: addEmail, name: addName || undefined, role: addRole, password: addPw || undefined }),
      });
      const data = await r.json();
      if (!r.ok) { setAddError(data.error ?? "Failed"); return; }
      if (data.generatedPassword) setAddedPw(data.generatedPassword);
      setAddEmail(""); setAddName(""); setAddPw(""); setAddRole("CANDIDATE");
      setShowAddForm(false);
      fetchUsers();
    } catch { setAddError("Network error"); }
    finally { setAdding(false); }
  };

  const handleRoleChange = async (userId: string) => {
    setSaving(true);
    try {
      await fetch(`/api/organizations/${org.id}/users/${userId}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: editRole }),
      });
      setEditingId(null);
      fetchUsers();
    } finally { setSaving(false); }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm("Remove this user from the organisation? Their account will remain but they will lose access.")) return;
    setDeleting(userId);
    try {
      await fetch(`/api/organizations/${org.id}/users/${userId}`, { method: "DELETE", credentials: "include" });
      fetchUsers();
    } finally { setDeleting(null); }
  };

  const filtered = users.filter(u => {
    const q = search.toLowerCase();
    return !q || (u.name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 transition-colors">
          <ArrowLeft size={14} />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight truncate">{org.name}</h2>
          <p className="text-xs text-slate-400 font-mono">{org.slug} · {users.length} members
            {credits !== null && <span className="ml-3 inline-flex items-center gap-1 text-indigo-500"><CreditCard size={10} />{credits.toLocaleString()} credits</span>}
          </p>
        </div>
        <button onClick={() => { setShowAddForm(true); setAddedPw(null); setAddError(null); }}
          className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-2 transition-colors">
          <UserPlus size={13} /> Add User
        </button>
      </div>

      {/* Reset password result */}
      {resetPw && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
          <KeyRound size={15} className="text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-800">Password reset successfully.</p>
            <p className="text-amber-700 mt-1">
              New temporary password: <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono text-xs">{resetPw.pw}</code>
              <span className="text-amber-600 text-xs ml-2">— a notification email has been sent to the user.</span>
            </p>
          </div>
          <button onClick={() => setResetPw(null)} className="text-amber-500 hover:text-amber-700"><X size={13} /></button>
        </div>
      )}

      {/* Generated password notice */}
      {addedPw && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
          <Check size={15} className="text-emerald-600 mt-0.5 shrink-0" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-emerald-800">User added successfully.</p>
            <p className="text-emerald-700 mt-1">
              Temporary password: <code className="bg-emerald-100 px-1.5 py-0.5 rounded font-mono text-xs">{addedPw}</code>
              <span className="text-emerald-600 text-xs ml-2">— share securely.</span>
            </p>
          </div>
          <button onClick={() => setAddedPw(null)} className="text-emerald-500 hover:text-emerald-700"><X size={13} /></button>
        </div>
      )}

      {/* Add user form */}
      {showAddForm && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="text-sm font-bold text-slate-800 mb-4">Add User to Organisation</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>Email *</label>
              <input type="email" className={INPUT} value={addEmail} onChange={e => setAddEmail(e.target.value)} placeholder="user@example.com" required />
            </div>
            <div>
              <label className={LABEL}>Name</label>
              <input className={INPUT} value={addName} onChange={e => setAddName(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className={LABEL}>Role</label>
              <select className={INPUT} value={addRole} onChange={e => setAddRole(e.target.value as AllowedRole)}>
                {ALLOWED_ROLES.map(r => <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>)}
              </select>
            </div>
            <div>
              <label className={LABEL}>Password (blank = auto-generate)</label>
              <input type="password" className={INPUT} value={addPw} onChange={e => setAddPw(e.target.value)} />
            </div>
            {addError && <div className="md:col-span-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">{addError}</div>}
            <div className="md:col-span-2 flex justify-end gap-3">
              <button type="button" onClick={() => { setShowAddForm(false); setAddError(null); }}
                className="text-sm text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors">Cancel</button>
              <button type="submit" disabled={adding || !addEmail.trim()}
                className="flex items-center gap-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg px-4 py-1.5 transition-colors">
                {adding ? <RefreshCw size={12} className="animate-spin" /> : <UserPlus size={12} />}
                {adding ? "Adding…" : "Add User"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <input type="search" className={INPUT} placeholder="Search by name or email…" value={search} onChange={e => setSearch(e.target.value)} />

      {/* User list */}
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <Users size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">{users.length === 0 ? "No users yet — add the first one above." : "No users match your search."}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(u => (
            <div key={u.id} className="rounded-xl border border-slate-100 bg-white px-4 py-3 flex items-center gap-3 hover:border-slate-200 transition-colors">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                {(u.name ?? u.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{u.name ?? u.email}</p>
                <p className="text-xs text-slate-400 truncate">{u.email}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {editingId === u.id ? (
                  <div className="flex items-center gap-1.5">
                    <select className="text-xs border border-slate-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      value={editRole} onChange={e => setEditRole(e.target.value as AllowedRole)}>
                      {ALLOWED_ROLES.map(r => <option key={r} value={r}>{ROLE_META[r]?.label ?? r}</option>)}
                    </select>
                    <button onClick={() => handleRoleChange(u.id)} disabled={saving}
                      className="p-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors">
                      {saving ? <RefreshCw size={11} className="animate-spin" /> : <Check size={11} />}
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-700 transition-colors"><X size={11} /></button>
                  </div>
                ) : (
                  <>
                    <RoleBadge role={u.role} />
                    <button onClick={() => { setEditingId(u.id); setEditRole(u.role as AllowedRole); }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-200 transition-colors">
                      <Pencil size={11} />
                    </button>
                  </>
                )}
                <button onClick={() => handleResetPassword(u.id)} disabled={resetting === u.id}
                  title="Reset password"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-colors disabled:opacity-50">
                  {resetting === u.id ? <RefreshCw size={11} className="animate-spin" /> : <KeyRound size={11} />}
                </button>
                <button onClick={() => handleRemove(u.id)} disabled={deleting === u.id}
                  title="Remove from org"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 transition-colors disabled:opacity-50">
                  {deleting === u.id ? <RefreshCw size={11} className="animate-spin" /> : <Trash2 size={11} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const OrganizationManagement: React.FC = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [created, setCreated] = useState<{ org: Org; adminPassword?: string } | null>(null);
  const [selectedOrg, setSelectedOrg] = useState<Org | null>(null);

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/organizations", { credentials: "include" });
      if (r.ok) setOrgs(await r.json());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchOrgs(); }, []);

  if (selectedOrg) {
    return (
      <div className="p-6">
        <OrgDetail org={selectedOrg} onBack={() => { setSelectedOrg(null); fetchOrgs(); }} />
      </div>
    );
  }

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
          <button onClick={() => { setShowForm(true); setCreated(null); }}
            className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-3 py-2 transition-colors">
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
                <span className="text-emerald-600 text-xs ml-2">— share securely.</span>
              </p>
            )}
          </div>
          <button onClick={() => setCreated(null)} className="text-emerald-500 hover:text-emerald-700"><X size={14} /></button>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <CreateOrgForm
          onCreated={(result) => { setCreated(result); setShowForm(false); fetchOrgs(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Org list */}
      {loading && orgs.length === 0 ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-slate-100 animate-pulse" />)}</div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <Building2 size={32} className="mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No organisations yet — create the first one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orgs.map(org => (
            <button key={org.id} onClick={() => setSelectedOrg(org)}
              className="w-full text-left rounded-xl border border-slate-100 bg-white px-5 py-4 flex items-center gap-4 hover:shadow-sm hover:border-indigo-100 transition-all">
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
                <span className="text-slate-400">{new Date(org.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
              </div>
              <ChevronRight size={14} className="text-slate-300 shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
