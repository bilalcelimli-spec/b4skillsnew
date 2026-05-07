import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Certificate } from "../lib/certification/certificate-service";
import { Card, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";
import { 
  ShieldCheck, 
  Calendar, 
  Globe, 
  Share2, 
  ExternalLink,
  FileDown
} from "lucide-react";
import { motion } from "motion/react";
import { exportToPdf } from "../lib/utils/pdf-export";

interface CertificateViewProps {
  certificate: Certificate;
  branding?: any;
}

export const CertificateView: React.FC<CertificateViewProps> = ({ certificate, branding }) => {
  const primaryColor = branding?.primaryColor || "#9b276c";
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Generate QR code client-side so it always uses the correct domain
  useEffect(() => {
    const verifyUrl = `${window.location.origin}/verify/${certificate.id}`;
    QRCode.toDataURL(verifyUrl, {
      width: 200,
      margin: 1,
      color: { dark: "#1e293b", light: "#ffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(""));
  }, [certificate.id]);

  const handleDownload = async () => {
    await exportToPdf("certificate-document", `b4skills_Certificate_${certificate.id}`);
  };

  const handleShare = async () => {
    const verifyUrl = `${window.location.origin}/verify/${certificate.id}`;
    if (navigator.share) {
      await navigator.share({ title: "My b4skills Certificate", url: verifyUrl }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(verifyUrl).catch(() => {});
      alert("Verification link copied to clipboard!");
    }
  };

  // Determine which logo to display: org logo → site favicon → nothing
  const logoUrl = branding?.logoUrl || null;
  const orgName = branding?.name || "b4skills";

  // Only show skill breakdown if at least one score is non-zero
  const skillScores = certificate.skillScores;
  const hasSkillScores =
    skillScores &&
    (skillScores.reading > 0 ||
      skillScores.listening > 0 ||
      skillScores.speaking > 0 ||
      skillScores.writing > 0);

  // Overall percentage for display (theta range -3 to 3 → 0–100)
  const overallPct = Math.round(((certificate.theta + 3) / 6) * 100);

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Certificate</h1>
          <p className="text-slate-500 mt-1">Official English Proficiency Certification</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-xl h-11 px-6 font-bold text-slate-600" onClick={handleShare}>
            <Share2 size={18} /> Share
          </Button>
          <Button className="gap-2 bg-slate-900 hover:bg-black text-white rounded-xl h-11 px-6 font-bold shadow-lg shadow-slate-200" onClick={handleDownload}>
            <FileDown size={18} /> Download PDF
          </Button>
        </div>
      </div>

      {/* The Certificate Document */}
      <motion.div
        id="certificate-document"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative bg-white border-8 border-slate-100 shadow-2xl rounded-[40px] overflow-hidden print:border-none print:shadow-none"
      >
        {/* Decorative Borders */}
        <div className="absolute inset-0 border-[24px] border-slate-50 pointer-events-none" />
        <div className="absolute inset-0 border-[2px] border-slate-200 m-6 pointer-events-none" />

        <CardContent className="relative p-16 md:p-24 flex flex-col items-center text-center">
          {/* Header — Logo + Org name */}
          <div className="mb-12 flex flex-col items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={orgName}
                className="h-16 w-auto mb-2 object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              /* Fallback: site favicon as inline SVG badge */
              <div
                className="w-20 h-20 rounded-2xl flex items-center justify-center mb-2 shadow-lg"
                style={{ backgroundColor: primaryColor }}
              >
                <img
                  src="/favicon.svg"
                  alt={orgName}
                  className="w-12 h-12 object-contain"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              </div>
            )}
            <div className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em]">{orgName}</div>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 tracking-tight">
            Certificate of Proficiency
          </h2>

          <p className="text-xl text-slate-500 mb-4 italic">This is to certify that</p>
          <div className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-12 border-b-2 border-slate-100 pb-4 px-12">
            {certificate.candidateName || "Candidate"}
          </div>

          <p className="text-lg text-slate-600 max-w-2xl mb-12 leading-relaxed">
            has successfully completed the adaptive English proficiency assessment and demonstrated a level of English language ability equivalent to
          </p>

          {/* CEFR Level Badge */}
          <div className="mb-16 relative">
            <div
              className="absolute inset-0 blur-3xl opacity-10 rounded-full"
              style={{ backgroundColor: primaryColor }}
            />
            <div className="relative w-48 h-48 rounded-full border-8 border-indigo-50 flex flex-col items-center justify-center bg-white shadow-xl">
              <div
                className="text-[10px] font-black uppercase tracking-widest mb-1"
                style={{ color: primaryColor }}
              >
                CEFR Level
              </div>
              <div className="text-7xl font-black text-slate-900">{certificate.cefrLevel || "—"}</div>
            </div>
          </div>

          {/* Overall score bar (always shown) */}
          <div className="w-full max-w-xs mb-10">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Overall Score</div>
            <div className="text-3xl font-black text-slate-900 mb-3">{overallPct}<span className="text-base font-bold text-slate-400">/100</span></div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${overallPct}%`, backgroundColor: primaryColor }} />
            </div>
          </div>

          {/* Skill Breakdown — only when individual scores exist */}
          {hasSkillScores && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-3xl mb-16">
              <SkillScore label="Reading" score={skillScores.reading} primaryColor={primaryColor} />
              <SkillScore label="Listening" score={skillScores.listening} primaryColor={primaryColor} />
              <SkillScore label="Speaking" score={skillScores.speaking} primaryColor={primaryColor} />
              <SkillScore label="Writing" score={skillScores.writing} primaryColor={primaryColor} />
            </div>
          )}

          {/* Footer Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full pt-12 border-t border-slate-100">
            <div className="text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Issue Date</div>
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                {new Date(certificate.issuedAt).toLocaleDateString("en-GB", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4 mb-2">Valid Until</div>
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                {new Date(certificate.expiresAt).toLocaleDateString("en-GB", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-28 h-28 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm mb-2">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Verification QR" className="w-full h-full" />
                ) : (
                  <div className="w-full h-full bg-slate-100 rounded-lg animate-pulse" />
                )}
              </div>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Scan to Verify</div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Certificate ID</div>
              <div className="font-mono font-bold text-slate-900 text-sm break-all">{certificate.id}</div>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1 mt-2">
                <ShieldCheck size={12} /> Verified & Secure
              </div>
            </div>
          </div>
        </CardContent>
      </motion.div>

      {/* Verification Link */}
      <div className="mt-12 text-center">
        <a
          href={`${window.location.origin}/verify/${certificate.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <Globe size={16} />
          Verify this certificate at {window.location.hostname}/verify/{certificate.id.slice(0, 8)}…
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};

const SkillScore: React.FC<{ label: string; score?: number; primaryColor: string }> = ({
  label,
  score = 0,
  primaryColor,
}) => (
  <div className="text-center">
    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</div>
    <div className="text-2xl font-black text-slate-900">{score}</div>
    <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: primaryColor }} />
    </div>
  </div>
);
