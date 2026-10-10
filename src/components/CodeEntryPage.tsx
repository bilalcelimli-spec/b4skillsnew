import React, { useRef, useState } from "react";
import { ArrowLeft, Loader2, KeyRound } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Label } from "./ui/Label";
import { AuthPage, type AuthenticatedUser } from "./AuthPage";
import { assessmentDisplayName } from "../lib/fixed-forms/ozgun-kids";

export const CodeEntryPage: React.FC<{ onBack: () => void, onAccountSignIn?: (user: AuthenticatedUser) => void, onSuccess: (productLine: string, orgId: string, email: string, candidateId: string, name: string, surname: string) => void }> = ({ onBack, onAccountSignIn, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [productLine, setProductLine] = useState<string | null>(null);
  const requestPending = useRef(false);
  const candidateId = useRef<string | null>(null);
  const [code, setCode] = useState("");
  const normalizedCode = code.trim().toUpperCase();
  const [formData, setFormData] = useState({
    name: "", surname: "", email: "", school: "", grade: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginRequired, setLoginRequired] = useState(false);
  const [showLogin, setShowLogin] = useState(false);

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestPending.current) return;
    requestPending.current = true;
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/codes/validate", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: normalizedCode })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || data?.error || "Unable to verify your code. Please try again.");
      if (data?.valid !== true || typeof data.productLine !== "string") throw new Error("Unable to verify your code. Please try again.");
      setCode(normalizedCode);
      setProductLine(data.productLine);
      setStep(2);
    } catch (err: any) {
      setError(err.message || "Invalid code");
    } finally {
      requestPending.current = false;
      setLoading(false);
    }
  };

  const handleSubmitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestPending.current) return;
    requestPending.current = true;
    setError(null);
    setLoading(true);
    // Generate a stable candidateId for this registration and reuse it
    const cid = candidateId.current ??= "cand_" + crypto.randomUUID();
    const details = {name:formData.name.trim(), surname:formData.surname.trim(), email:formData.email.trim().toLowerCase(), school:formData.school.trim(), grade:formData.grade.trim()};
    try {
      if (Object.values(details).some(value => !value)) throw new Error("Please complete all candidate details; spaces alone are not valid.");
      const res = await fetch("/api/codes/redeem", {
        method: "POST", headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code: normalizedCode, candidateId: cid, email: details.email, name: details.name, surname: details.surname, school: details.school, className: details.grade
        })
      });
      const data = await res.json().catch(() => null);
      setLoginRequired(!res.ok && data?.error === "account_login_required");
      if (!res.ok) throw new Error(data?.message || data?.error || "Unable to register. Please try again.");
      if (data?.success !== true || !data.productLine || !data.organizationId || !data.candidateId) throw new Error("Registration could not be confirmed. Please contact your institution before trying again.");
      
      // Use the server-resolved candidateId (the actual DB user id, not the local cid)
      onSuccess(data.productLine, data.organizationId, details.email, data.candidateId, details.name, details.surname);
    } catch (err: any) {
      setError(err instanceof TypeError ? "Connection interrupted. Your details are still here. Check your connection before trying again. If your code is reported as used, contact your institution." : err.message || "Registration failed");
    } finally {
      requestPending.current = false;
      setLoading(false);
    }
  };

  if (showLogin) return <AuthPage initialMode="signin" initialEmail={formData.email.trim().toLowerCase()} signInOnly
    onBack={() => setShowLogin(false)}
    onAuthenticated={user => {
      if (user.role !== "CANDIDATE" || user.email.trim().toLowerCase() !== formData.email.trim().toLowerCase()) {
        throw new Error("Please sign in to the candidate account matching your exam details.");
      }
      onAccountSignIn?.(user);
      setShowLogin(false);
      setLoginRequired(false);
      setError(null);
    }}/>;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8">
        <button onClick={() => { if (step === 2) { setStep(1); setError(null); setProductLine(null); setLoginRequired(false); } else onBack(); }} disabled={loading} aria-label={step === 2 ? "Change exam code" : "Go back"} className="text-slate-400 hover:text-slate-900 mb-6 transition-colors">
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        <p className="text-xs font-bold text-indigo-600 mb-4" aria-live="polite">Step {step} of 2 · {step === 1 ? "Verify code" : "Candidate details"}</p>
        {step === 1 ? (
          <form onSubmit={handleVerifyCode} className="space-y-6">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <KeyRound size={32} />
              </div>
              <h1 className="text-2xl font-black text-slate-900 uppercase">Have an Exam Code?</h1>
              <p className="text-slate-500 mt-2 font-medium">Enter the exam code provided by your institution.</p>
            </div>
            {error && <div role="alert" className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center">{error}</div>}
            <div>
              <label htmlFor="exam-code" className="sr-only">Exam code</label>
              <Input
                id="exam-code"
                type="text"
                placeholder="Your exam code"
                className="text-center font-mono text-xl py-6 tracking-widest uppercase"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-label="Exam code"
              />
            </div>
            <Button type="submit" className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-lg font-bold" disabled={loading || normalizedCode.length < 5}>
              {loading ? <Loader2 className="animate-spin" /> : "Verify Code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSubmitInfo} className="space-y-4">
            <div className="text-center mb-6">
              <h1 className="text-xl font-black text-slate-900 uppercase">Candidate Details</h1>
              <p className="text-slate-500 text-sm mt-1">Enter your details for your assessment report. The exam starts after preparation.</p>
            </div>
            {error && <div role="alert" className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold text-center">{error}</div>}
            
            {loginRequired && <Button type="button" className="w-full" onClick={() => setShowLogin(true)}>Sign in to continue</Button>}
            {productLine && <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4"><p className="text-xs font-bold text-indigo-600">Your assessment</p><p className="font-bold text-slate-900">{assessmentDisplayName(productLine)}</p></div>}
            <fieldset disabled={loading} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="candidate-name">First Name</Label>
                <Input id="candidate-name" autoComplete="given-name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-1">
                <Label htmlFor="candidate-surname">Last Name</Label>
                <Input id="candidate-surname" autoComplete="family-name" value={formData.surname} onChange={e => setFormData({...formData, surname: e.target.value})} required />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="candidate-email">Email Address</Label>
              <Input id="candidate-email" autoComplete="email" type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="candidate-school">School / Organization</Label>
              <Input id="candidate-school" autoComplete="organization" value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} required />
            </div>
            <div className="space-y-1">
              <Label htmlFor="candidate-grade">Grade / Level</Label>
              <Input id="candidate-grade" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} required />
            </div>

            </fieldset>
            <Button type="submit" className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-lg font-bold mt-4" disabled={loading}>
              {loading ? <Loader2 className="animate-spin" /> : "Start Exam"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};
