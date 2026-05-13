/**
 * VerificationPage
 *
 * Public (unauthenticated) certificate verification page.
 * - Reads certificateId from URL query param `?id=...` on mount.
 * - Falls back to a manual input field.
 * - Calls the public GET /api/verify/:id endpoint.
 */

import React, { useEffect, useState } from "react";
import { motion } from "motion/react";
import {
  ShieldCheck,
  ShieldX,
  Search,
  Loader2,
  Award,
  Calendar,
  Building2,
  User,
  AlertTriangle,
} from "lucide-react";
import { Button } from "./ui/Button";
import { cn } from "../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VerificationResult {
  valid: boolean;
  certificateId?: string;
  candidateName?: string;
  cefrLevel?: string;
  issuedAt?: string;
  expiresAt?: string;
  organization?: string;
  expired?: boolean;
  error?: string;
}

// ─── CEFR badge color ─────────────────────────────────────────────────────────

const CEFR_COLOR: Record<string, string> = {
  A1: "bg-slate-100 text-slate-700 border-slate-200",
  A2: "bg-slate-100 text-slate-700 border-slate-200",
  B1: "bg-blue-50 text-blue-700 border-blue-200",
  B2: "bg-indigo-50 text-indigo-700 border-indigo-200",
  C1: "bg-violet-50 text-violet-700 border-violet-200",
  C2: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

// ─── Component ────────────────────────────────────────────────────────────────

export const VerificationPage: React.FC = () => {
  const [inputId, setInputId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Auto-fill from URL ?id= param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      setInputId(id);
      verify(id);
    }
  }, []);

  const verify = async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/verify/${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ valid: false, error: "Network error. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verify(inputId);
  };

  const fmt = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })
      : "—";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 flex flex-col items-center justify-center p-6">
      {/* Logo / Header */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="bg-[#9b276c] text-white font-black text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight">
            b4skills
          </div>
        </div>
        <h1 className="text-2xl font-black text-slate-900">Sertifika Doğrulama</h1>
        <p className="text-sm text-slate-400 mt-1">Certificate Verification Portal</p>
      </div>

      {/* Search card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-100 p-8"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
              Sertifika Kodu / Certificate ID
            </label>
            <div className="relative">
              <input
                type="text"
                value={inputId}
                onChange={(e) => setInputId(e.target.value)}
                placeholder="örn. clxyz1234abcd…"
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-12 text-sm font-mono text-slate-900 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
              />
              <Search size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading || !inputId.trim()}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl py-3 disabled:opacity-50"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin mr-2" /> Sorgulanıyor…</>
            ) : (
              <><Search size={16} className="mr-2" /> Doğrula</>
            )}
          </Button>
        </form>

        {/* Result */}
        {result && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-6"
          >
            {result.valid ? (
              <div className={cn(
                "rounded-2xl border p-6 space-y-4",
                result.expired
                  ? "bg-amber-50 border-amber-200"
                  : "bg-emerald-50 border-emerald-200"
              )}>
                {/* Status banner */}
                <div className="flex items-center gap-3">
                  {result.expired ? (
                    <AlertTriangle size={24} className="text-amber-600 shrink-0" />
                  ) : (
                    <ShieldCheck size={24} className="text-emerald-600 shrink-0" />
                  )}
                  <div>
                    <div className={cn(
                      "font-black text-sm",
                      result.expired ? "text-amber-800" : "text-emerald-800"
                    )}>
                      {result.expired ? "Sertifika Süresi Dolmuş" : "Geçerli Sertifika"}
                    </div>
                    <div className="text-xs text-slate-500 font-mono mt-0.5">{result.certificateId}</div>
                  </div>

                  {/* CEFR badge */}
                  {result.cefrLevel && (
                    <div className={cn(
                      "ml-auto px-3 py-1.5 rounded-xl text-base font-black border",
                      CEFR_COLOR[result.cefrLevel] ?? "bg-slate-50 text-slate-700 border-slate-200"
                    )}>
                      {result.cefrLevel}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3">
                  <DetailItem icon={<User size={14} />} label="Aday" value={result.candidateName} />
                  <DetailItem icon={<Award size={14} />} label="Seviye" value={result.cefrLevel} />
                  <DetailItem icon={<Building2 size={14} />} label="Kurum" value={result.organization} />
                  <DetailItem icon={<Calendar size={14} />} label="Düzenleme" value={fmt(result.issuedAt)} />
                  <DetailItem icon={<Calendar size={14} />} label="Geçerlilik" value={fmt(result.expiresAt)} />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-6 flex items-center gap-4">
                <ShieldX size={28} className="text-red-500 shrink-0" />
                <div>
                  <div className="font-black text-red-800 text-sm">Sertifika Bulunamadı</div>
                  <div className="text-xs text-red-600 mt-1">
                    {result.error ?? "Bu kimliğe ait geçerli bir sertifika bulunamadı. Lütfen kodu kontrol edin."}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </motion.div>

      <p className="mt-8 text-xs text-slate-400 text-center max-w-sm">
        Bu sayfa, b4skills tarafından düzenlenen yetkinlik sertifikalarının gerçekliğini doğrular.
        Kurumsal entegrasyon için{" "}
        <a href="mailto:support@b4skills.com" className="underline hover:text-slate-600">
          support@b4skills.com
        </a>{" "}
        ile iletişime geçin.
      </p>
    </div>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const DetailItem: React.FC<{ icon: React.ReactNode; label: string; value?: string }> = ({
  icon, label, value,
}) => (
  <div className="flex items-start gap-2">
    <div className="text-slate-400 mt-0.5">{icon}</div>
    <div>
      <div className="text-[9px] font-black uppercase tracking-widest text-slate-400">{label}</div>
      <div className="text-xs font-bold text-slate-800">{value ?? "—"}</div>
    </div>
  </div>
);
