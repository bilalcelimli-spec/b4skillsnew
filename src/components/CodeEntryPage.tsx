import React, { useState } from "react";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";

export const CodeEntryPage: React.FC<{ onBack: () => void, onSuccess: (productLine: string, orgId: string, email: string) => void }> = ({ onBack, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [formData, setFormData] = useState({
    name: "", surname: "", email: "", school: "", grade: "", password: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/codes/validate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Invalid code");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const cid = "cand_" + Date.now(); // Fake simple ID since Firebase is broken
      const res = await fetch("/api/codes/redeem", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code, candidateId: cid, email: formData.email, name: formData.name, surname: formData.surname, school: formData.school, className: formData.grade
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      onSuccess(data.productLine, data.organizationId, formData.email);
    } catch (err: any) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
        <button onClick={onBack} className="text-slate-400 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft size={24} />
        </button>
        {step === 1 ? (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 uppercase">Have an Exam Code?</h1>
              <p className="text-slate-500 mt-2 font-medium">Enter your 10-character code to begin.</p>
            </div>
            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center">{error}</div>}
            <div>
              <Input
                type="text"
                placeholder="e.g. EXAM-ABCD-1234"
                className="text-center font-mono text-xl py-6 tracking-widest uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
                required
              />
            </div>
            <Button type="submit" className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold" disabled={loading || code.length < 5}>
              {loading ? <Loader2 className="animate-spin" /> : "Verify Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmitInfo} className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-xl font-black text-slate-900 uppercase">Candidate Details</h1>
              <p className="text-slate-500 text-sm mt-1">Please provide your details for the certificate.</p>
            </div>
            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center">{error}</div>}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>First Name</Label>
                <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <Label>Last Name</Label>
                <Input value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Email Address</Label>
              <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            </div>
            <div className="space-y-1">
              <Label>School / Organization</Label>
              <Input value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} required />
            </div>
            <div className="space-y-1">
              <Label>Grade / Level</Label>
              <Input value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} required />
            </div>

            <Button type="submit" className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-lg font-bold mt-4" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Start Exam"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
