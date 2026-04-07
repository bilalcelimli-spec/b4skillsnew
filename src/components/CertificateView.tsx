import React from "react";
import { Certificate } from "../lib/certification/certificate-service";
import { Card, CardContent } from "./ui/Card";
import { Button } from "./ui/Button";
import { 
  Award, 
  ShieldCheck, 
  Calendar, 
  Globe, 
  Download, 
  Share2, 
  ExternalLink,
  GraduationCap,
  CheckCircle2,
  FileDown
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/utils";
import { exportToPdf } from "../lib/utils/pdf-export";

interface CertificateViewProps {
  certificate: Certificate;
  branding?: any;
}

export const CertificateView: React.FC<CertificateViewProps> = ({ certificate, branding }) => {
  const primaryColor = branding?.primaryColor || "#4f46e5";

  const handleDownload = async () => {
    await exportToPdf("certificate-document", `b4skills_Certificate_${certificate.id}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Certificate</h1>
          <p className="text-slate-500 mt-1">Official English Proficiency Certification</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="gap-2 rounded-xl h-11 px-6 font-bold text-slate-600">
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
          {/* Header */}
          <div className="mb-12 flex flex-col items-center gap-4">
            {branding?.logoUrl ? (
              <img src={branding.logoUrl} alt="Logo" className="h-16 w-auto mb-4" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
                <GraduationCap size={48} className="text-indigo-600" style={{ color: primaryColor }} />
              </div>
            )}
            <div className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em]">{branding?.name || "b4skills"}</div>
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 tracking-tight">
            Certificate of Proficiency
          </h2>

          <p className="text-xl text-slate-500 mb-4 italic">This is to certify that</p>
          <div className="text-4xl md:text-5xl font-serif font-bold text-slate-900 mb-12 border-b-2 border-slate-100 pb-4 px-12">
            {certificate.candidateName}
          </div>

          <p className="text-lg text-slate-600 max-w-2xl mb-12 leading-relaxed">
            has successfully completed the adaptive English proficiency assessment and demonstrated a level of English language ability equivalent to
          </p>

          {/* CEFR Level Badge */}
          <div className="mb-16 relative">
            <div className="absolute inset-0 bg-indigo-600 blur-3xl opacity-10 rounded-full" style={{ backgroundColor: primaryColor }} />
            <div className="relative w-48 h-48 rounded-full border-8 border-indigo-50 flex flex-col items-center justify-center bg-white shadow-xl">
              <div className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1" style={{ color: primaryColor }}>CEFR Level</div>
              <div className="text-7xl font-black text-slate-900">{certificate.cefrLevel}</div>
            </div>
          </div>

          {/* Skill Breakdown */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full max-w-3xl mb-16">
            <SkillScore label="Reading" score={certificate.skillScores?.reading} />
            <SkillScore label="Listening" score={certificate.skillScores?.listening} />
            <SkillScore label="Speaking" score={certificate.skillScores?.speaking} />
            <SkillScore label="Writing" score={certificate.skillScores?.writing} />
          </div>

          {/* Footer Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 w-full pt-12 border-t border-slate-100">
            <div className="text-left">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Issue Date</div>
              <div className="font-bold text-slate-900 flex items-center gap-2">
                <Calendar size={16} className="text-slate-400" />
                {new Date(certificate.issuedAt).toLocaleDateString()}
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-24 h-24 bg-slate-50 p-2 rounded-lg border border-slate-100 mb-2">
                <img src={certificate.qrCodeUrl} alt="Verification QR" className="w-full h-full" referrerPolicy="no-referrer" />
              </div>
              <div className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Scan to Verify</div>
            </div>

            <div className="text-right">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Certificate ID</div>
              <div className="font-mono font-bold text-slate-900">{certificate.id}</div>
              <div className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1 mt-1">
                <ShieldCheck size={12} /> Verified Secure
              </div>
            </div>
          </div>
        </CardContent>
      </motion.div>

      {/* Verification Link */}
      <div className="mt-12 text-center">
        <a 
          href={certificate.verificationUrl} 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          <Globe size={16} />
          Verify this certificate at b4skills.com/verify
          <ExternalLink size={14} />
        </a>
      </div>
    </div>
  );
};

const SkillScore: React.FC<{ label: string; score?: number }> = ({ label, score = 0 }) => (
  <div className="text-center">
    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</div>
    <div className="text-2xl font-black text-slate-900">{score}</div>
    <div className="w-full h-1 bg-slate-100 rounded-full mt-2 overflow-hidden">
      <div className="h-full bg-indigo-600" style={{ width: `${score}%` }} />
    </div>
  </div>
);
