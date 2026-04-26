import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mail, Lock, User, Eye, EyeOff, ArrowLeft, Loader2, BrainCircuit } from "lucide-react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { cn } from "../lib/utils";
import { DynamicPage } from "./DynamicPage";

type AuthMode = "signin" | "signup" | "forgot" | "reset" | "verify";

interface AuthPageProps {
  onBack?: () => void;
}

// Marker highlight component
const Highlight = ({ children, className }: { children: React.ReactNode, className?: string }) => (
  <span className={cn("relative inline-block whitespace-nowrap mx-1", className)}>
    <span className="absolute inset-y-1 -inset-x-2 bg-[#9b276c] -skew-x-[12deg] -z-10 rounded-sm" />
    <span className="relative z-10 text-white">{children}</span>
  </span>
);

export const AuthPage: React.FC<AuthPageProps> = ({ onBack }) => {
  const [mode, setMode] = useState<AuthMode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);  const [pendingFeature, setPendingFeature] = useState<string | null>(null);

  useEffect(() => {
    const handleBrokenLinks = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const link = target.closest('a');
      if (link && link.getAttribute('href') === '#unavailable') {
        e.preventDefault();
        setPendingFeature(link.innerText.trim() || 'This Feature');
      }
    };
    document.addEventListener("click", handleBrokenLinks);
    return () => document.removeEventListener("click", handleBrokenLinks);
  }, []);
  const clearState = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const switchMode = (next: AuthMode) => {
    clearState();
    setPassword("");
    setConfirmPassword("");
    setMode(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearState();

    if (mode === "forgot") {
      if (!email.trim()) { setError("Please enter your email address."); return; }
      setLoading(true);
      setTimeout(() => {
        setSuccessMessage("Password reset email sent! Check your inbox.");
        setMode("verify");
        setLoading(false);
      }, 1000);
      return;
    }

    if (mode === "verify") {
      setLoading(true);
      setTimeout(() => {
        setSuccessMessage("Code verified! You can now reset your password.");
        setMode("reset");
        setLoading(false);
      }, 1000);
      return;
    }

    if (mode === "reset") {
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      setLoading(true);
      setTimeout(() => {
        setSuccessMessage("Password successfully reset! You can now sign in.");
        setMode("signin");
        setLoading(false);
      }, 1000);
      return;
    }

    if (mode === "signup") {
      if (!displayName.trim()) { setError("Please enter your full name."); return; }
      if (password !== confirmPassword) { setError("Passwords do not match."); return; }
      if (password.length < 6) { setError("Password must be at least 6 characters."); return; }
      setLoading(true);
      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ email: email.trim(), password, displayName: displayName.trim() })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to sign up');
        window.location.reload();
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
      return;
    }

    // signin
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to sign in');
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (pendingFeature) {
    return <DynamicPage pageName={pendingFeature} onBack={() => setPendingFeature(null)} />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex font-sans text-slate-800">
      
      {/* ─── GRAPHIC SIDE (Hidden on mobile) ─── */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-900 overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-40">
          <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80" alt="Tech" className="w-full h-full object-cover mix-blend-overlay filter grayscale" />
        </div>
        {/* Yellow diagonal overlay */}
        <div className="absolute top-0 left-0 w-[120%] h-full bg-gradient-to-r from-[#9b276c] to-transparent opacity-80" style={{ clipPath: 'polygon(0 0, 70% 0, 30% 100%, 0 100%)' }} />
        
        <div className="relative z-10 max-w-lg text-white">
          <div className="mb-6 inline-flex p-4 bg-white/10 backdrop-blur-sm text-[#ae397d] rounded-2xl border border-white/20">
            <BrainCircuit size={48} strokeWidth={1.5} />
          </div>
          <h2 className="text-4xl lg:text-5xl font-bold leading-[1.1] text-white tracking-tight mb-6">
            Intelligent Assessment, <br />
            <span className="text-white bg-[#9b276c] px-2 py-0.5 rounded-sm transform inline-block -skew-x-6 mt-2">Unlimited Potential.</span>
          </h2>
          <p className="text-lg text-[#fff0f7]">
            Access your secure dashboard to manage tests, review granular analytics, and harness the power of AI psychometrics.
          </p>
        </div>
      </div>

      {/* ─── FORM SIDE ─── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        {onBack && mode === "signin" && (
          <button
            onClick={onBack}
            className="absolute left-6 top-6 sm:left-12 sm:top-12 p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Back to home"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        {mode !== "signin" && (
          <button
            onClick={() => switchMode("signin")}
            className="absolute left-6 top-6 sm:left-12 sm:top-12 p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            aria-label="Back to sign in"
          >
            <ArrowLeft size={20} />
          </button>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Brand Header */}
          <div className="mb-10 text-center lg:text-left">
            <div className="bg-[#9b276c] justify-center lg:justify-start text-white font-bold text-xl px-3 py-1.5 -skew-x-6 rounded-sm tracking-tight inline-flex items-center mb-6">
              <span style={{ textShadow: '0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)' }}>b4skills</span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {mode === "signin" && "Welcome back"}
              {mode === "signup" && "Create your account"}
              {mode === "forgot" && "Reset your password"}
              {mode === "verify" && "Verify your email"}
              {mode === "reset" && "Set new password"}
            </h1>
            <p className="text-slate-500 mt-2 font-medium text-sm">
              {mode === "signin" && "Enter your details below to access your dashboard."}
              {mode === "signup" && "Start assessing with precision today."}
              {mode === "forgot" && "We'll send you an email with a link to reset it."}
              {mode === "verify" && "Enter the verification code sent to your email."}
              {mode === "reset" && "Choose a new strong password for your account."}
            </p>
          </div>

          {/* Tab switcher (signin ↔ signup only) */}
          {(mode === "signin" || mode === "signup") && (
            <div className="flex border-b border-slate-200 mb-8">
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className={`flex-1 pb-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
                  mode === "signin"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => switchMode("signup")}
                className={`flex-1 pb-3 text-sm font-bold transition-colors border-b-2 -mb-px ${
                  mode === "signup"
                    ? "border-slate-900 text-slate-900"
                    : "border-transparent text-slate-400 hover:text-slate-700"
                }`}
              >
                Sign Up
              </button>
            </div>
          )}

          {/* Form area */}
          <div className="w-full">
            <AnimatePresence mode="wait">
              <motion.form
                key={mode}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSubmit}
                noValidate
              >
                {/* ─── Sign Up: Full name ─── */}
                {mode === "signup" && (
                  <div className="mb-4">
                    <label htmlFor="displayName" className="block text-sm font-bold text-slate-700 mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        id="displayName"
                        type="text"
                        autoComplete="name"
                        placeholder="Jane Smith"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="pl-10 h-12 bg-white border-slate-200 focus-visible:ring-slate-900 text-[15px]"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* ─── Email ─── */}
                {(mode === "signin" || mode === "signup" || mode === "forgot") && (
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-sm font-bold text-slate-700 mb-1.5">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 bg-white border-slate-200 focus-visible:ring-slate-900 text-[15px]"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* ─── Verification Code ─── */}
                {mode === "verify" && (
                  <div className="mb-4">
                    <label htmlFor="code" className="block text-sm font-bold text-slate-700 mb-1.5">
                      Verification Code
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        id="code"
                        type="text"
                        placeholder="Enter 6-digit code"
                        className="pl-10 h-12 bg-white border-slate-200 focus-visible:ring-slate-900 text-[15px]"
                        required
                      />
                    </div>
                  </div>
                )}

                {/* ─── Password (signin, signup, reset) ─── */}
                {(mode === "signin" || mode === "signup" || mode === "reset") && (
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="block text-sm font-bold text-slate-700">
                        Password
                      </label>
                      {mode === "signin" && (
                        <button
                          type="button"
                          onClick={() => switchMode("forgot")}
                          className="text-xs text-[#9b276c] hover:text-[#661645] font-bold"
                        >
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        autoComplete={mode === "signup" ? "new-password" : "current-password"}
                        placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 bg-white border-slate-200 focus-visible:ring-slate-900 text-[15px]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── Confirm Password (signup, reset) ─── */}
                {(mode === "signup" || mode === "reset") && (
                  <div className="mb-6">
                    <label htmlFor="confirmPassword" className="block text-sm font-bold text-slate-700 mb-1.5">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 bg-white border-slate-200 focus-visible:ring-slate-900 text-[15px]"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm((p) => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 outline-none"
                        aria-label={showConfirm ? "Hide password" : "Show password"}
                      >
                        {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>
                )}

                {/* ─── Error / Success ─── */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-5 px-4 py-3 bg-red-50 border-l-4 border-red-500 rounded-lg text-sm font-medium text-red-800"
                    >
                      {error}
                    </motion.div>
                  )}
                  {successMessage && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-5 px-4 py-3 bg-green-50 border-l-4 border-green-500 rounded-lg text-sm font-medium text-green-800"
                    >
                      {successMessage}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ─── Submit button ─── */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 text-[15px] font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-md shadow-slate-200"
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      {mode === "signin" && "Sign In"}
                      {mode === "signup" && "Create Account"}
                      {mode === "forgot" && "Send Reset Email"}
                      {mode === "verify" && "Verify Code"}
                      {mode === "reset" && "Reset Password"}
                    </>
                  )}
                </Button>

              </motion.form>
            </AnimatePresence>
            
            {/* Footer Terms */}
            <p className="text-center text-xs text-slate-400 mt-8 font-medium">
              By continuing you agree to our{" "}
              <a href="#unavailable" className="text-slate-600 hover:text-[#9b276c] transition-colors underline decoration-slate-300">Terms</a>{" "}
              and{" "}
              <a href="#unavailable" className="text-slate-600 hover:text-[#9b276c] transition-colors underline decoration-slate-300">Privacy Policy</a>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
