import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useScoringStatus } from "./hooks/useScoringStatus";
import { thetaToCefr, thetaToBeps, CEFR_META } from "./lib/cefr/cefr-framework";
import { CefrLevelCard } from "./components/CefrLevelCard";

import { AuthPage } from "./components/AuthPage";
import { CodeEntryPage } from "./components/CodeEntryPage";
type User = { uid: string; email: string; displayName?: string; role?: string };
const signOut = async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch { /* cookie temizlense bile reload yapılmalı */ }
  window.location.reload();
};

import { Button } from "./components/ui/Button";
import { Card, CardContent, CardHeader } from "./components/ui/Card";
import { UnifiedAdminConsole } from "./components/admin/UnifiedAdminConsole";
import { RatingDashboard } from "./components/RatingDashboard";
import { InstitutionalDashboard } from "./components/InstitutionalDashboard";
import { CertificateView } from "./components/CertificateView";
import { CandidateAdaptiveReport } from "./components/CandidateAdaptiveReport";
import { AssessmentModeSelector } from "./components/AssessmentModeSelector";
import { TestPlayer } from "./components/TestPlayer";
import { LandingPage } from "./components/LandingPage";
import { ItemBankManager } from "./components/ItemBankManager";
import { CandidateProfile } from "./components/CandidateProfile";
import { LogIn, LogOut, GraduationCap, LayoutDashboard, FileText, Settings, ShieldCheck, User as UserIcon, ShieldAlert, CheckCircle2, ClipboardList, Building2, BarChart3, Award, Database, UserCircle, Sliders, BoxSelect } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "./lib/utils";

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLanding, setShowLanding] = useState(true);
  const [showCodeEntry, setShowCodeEntry] = useState(false);
  const [activeSession, setActiveSession] = useState<{ orgId: string; sessionId: string; productLine?: string } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"dashboard" | "admin" | "rating" | "institutional" | "results" | "items" | "profile" | "settings" | "psychometrics">("dashboard");
  const [testCompleted, setTestCompleted] = useState<{ theta: number; cefr: string; sessionId: string } | null>(null);
  const [branding, setBranding] = useState<any>(null);
  const [certificate, setCertificate] = useState<any>(null);
  // SSE stream for async Writing/Speaking scoring — active after test completes
  const scoringStatus = useScoringStatus(testCompleted?.sessionId ?? null);

  // Sync URL → state (runs on every location change, incl. browser back/forward)
  useEffect(() => {
    const path = location.pathname;
    const examMatch = path.match(/^\/exam\/(.+)/);
    const reportMatch = path.match(/^\/report\/(.+)/);
    if (examMatch) {
      // exam deep-link — session resumed after auth
    } else if (reportMatch) {
      setActiveTab("results");
    } else {
      // Leaving a report/exam URL: clear transient session state so the
      // state→URL effect doesn't fight the browser back button and push
      // the user back to /report/… or /exam/…
      setTestCompleted(null);
      setActiveSession(null);
      if (path === "/admin") setActiveTab("admin");
      else if (path === "/rating") setActiveTab("rating");
      else if (path === "/institutional") setActiveTab("institutional");
      else if (path === "/profile") setActiveTab("profile");
      else if (path === "/items") setActiveTab("items");
      else if (path === "/settings") setActiveTab("settings");
      else if (path === "/psychometrics") setActiveTab("psychometrics");
      else if (path === "/results") setActiveTab("results");
      else setActiveTab("dashboard");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Sync state → URL
  useEffect(() => {
    if (activeSession?.sessionId) {
      navigate(`/exam/${activeSession.sessionId}`, { replace: true });
    } else if (testCompleted?.sessionId) {
      navigate(`/report/${testCompleted.sessionId}`, { replace: true });
    } else if (!showLanding && user) {
      const tabPath: Record<string, string> = {
        admin: "/admin", dashboard: "/dashboard", rating: "/rating",
        institutional: "/institutional", results: "/results",
        items: "/items", profile: "/profile", settings: "/settings",
        psychometrics: "/psychometrics",
      };
      navigate(tabPath[activeTab] ?? "/dashboard", { replace: true });
    }
  }, [activeTab, activeSession, testCompleted, user]);

  useEffect(() => {
    const fetchUser = async (retryRefresh = true) => {
      setLoading(true);
      try {
        let res = await fetch("/api/auth/me", { credentials: "include" });
        if (!res.ok && retryRefresh) {
          const refreshRes = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
          if (refreshRes.ok) {
            res = await fetch("/api/auth/me", { credentials: "include" });
          }
        }
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        if (data.user) {
          setUser(data.user);
          setUserProfile({ ...data.user, organizationId: data.user.organizationId || "b4skills-demo" });
          setShowLanding(false);
          
          const role = data.user.role?.toUpperCase();
          if (role === "RATER") setActiveTab("rating");
          else if (["ADMIN", "SUPER_ADMIN", "CONTENT_ADMIN", "ASSESSMENT_DIRECTOR"].includes(role)) setActiveTab("admin");
          else if (["ORG_ADMIN", "INST_ADMIN"].includes(role)) setActiveTab("institutional");
          
          if (data.user.organizationId) {
            try {
              const res = await fetch(`/api/branding/${data.user.organizationId}`);
              if (res.ok) {
                const b = await res.json();
                setBranding(b);
              }
            } catch (err) {}
          }
        }
      } catch (err) {
        console.error(err);
        setUser(null);
        setShowLanding(true);
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  const startNewTest = async (productLine?: string) => {
    if (!user || !userProfile) return;
    setTestCompleted(null);
    setCertificate(null);
    setActiveSession({ orgId: userProfile.organizationId || "b4skills-demo", sessionId: "new", productLine });
  };

  const handleTestComplete = async (finalTheta: number | null, sessionId: string) => {
    const theta = finalTheta ?? 0;
    const cefr = thetaToCefr(theta);
    setTestCompleted({ theta, cefr, sessionId });
    setActiveSession(null);
    setActiveTab("results");

    // Auto-generate certificate
    try {
      const res = await fetch("/api/certificates/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          sessionData: { sessionId, theta, cefr, organizationId: userProfile.organizationId },
          candidateProfile: userProfile,
          branding
        })
      });
      const cert = await res.json();
      setCertificate(cert);
    } catch (err) {
      console.error("Failed to generate certificate");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (showCodeEntry) {
    return <CodeEntryPage onBack={() => { setShowCodeEntry(false); setShowLanding(true); }} onSuccess={(productLine, orgId, email) => {
      setUser({ uid: "cand_" + Date.now(), email } as any);
      setUserProfile({ role: "candidate", organizationId: orgId, allowedProductLine: productLine });
      setShowCodeEntry(false);
    }} />;
  }

  if (!user && showLanding) {
    return <LandingPage onStart={() => setShowLanding(false)} onCodeEntry={() => { setShowLanding(false); setShowCodeEntry(true); }} />;
  }

  if (!user) {
    return <AuthPage onBack={() => setShowLanding(true)} />;
  }

  if (activeSession) {
    return (
      <TestPlayer 
        organizationId={activeSession.orgId} 
        candidateId={user.uid} 
        productLine={activeSession.productLine}
        onComplete={handleTestComplete}
      />
    );
  }

  const profRole = userProfile?.role?.toUpperCase();
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "CONTENT_ADMIN", "ASSESSMENT_DIRECTOR"].includes(profRole);
  const isRater = profRole === "RATER" || isAdmin;
  const isOrgAdmin = ["ORG_ADMIN", "INST_ADMIN"].includes(profRole) || isAdmin;

  // Clears stale session state when the user explicitly switches away from results.
  // Prevents the state→URL effect from fighting browser back by re-pushing /report/…
  type Tab = typeof activeTab;
  const goToTab = (tab: Tab) => {
    if (tab !== "results") {
      setTestCompleted(null);
      setCertificate(null);
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col" style={{ backgroundColor: branding?.secondaryColor || "#0f172a" }}>
        <div className="flex items-center gap-2 mb-12">
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="w-8 h-8 rounded" referrerPolicy="no-referrer" />
          ) : (
            <div className="bg-[#9b276c] justify-center text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight flex items-center">
              <span style={{ textShadow: '0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)' }}>b4skills</span>
            </div>
          )}
        </div>
        
        <nav className="space-y-2 flex-1">
          <SidebarItem
            icon={<LayoutDashboard size={20} />}
            label="Dashboard"
            active={activeTab === "dashboard"}
            onClick={() => goToTab("dashboard")}
          />
          {isAdmin && (
            <SidebarItem
              icon={<ShieldAlert size={20} />}
              label="Admin Console"
              active={activeTab === "admin"}
              onClick={() => goToTab("admin")}
            />
          )}
          {isRater && (
            <SidebarItem
              icon={<ClipboardList size={20} />}
              label="Rating Queue"
              active={activeTab === "rating"}
              onClick={() => goToTab("rating")}
            />
          )}
          {isOrgAdmin && (
            <SidebarItem
              icon={<BarChart3 size={20} />}
              label="Institutional"
              active={activeTab === "institutional"}
              onClick={() => goToTab("institutional")}
            />
          )}
          <SidebarItem
            icon={<FileText size={20} />}
            label="My Results"
            active={activeTab === "results"}
            onClick={() => goToTab("results")}
          />
          <SidebarItem
            icon={<UserCircle size={20} />}
            label="Profile"
            active={activeTab === "profile"}
            onClick={() => goToTab("profile")}
          />
        </nav>

        <div className="pt-6 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-lg font-bold" style={{ backgroundColor: branding?.primaryColor || "#6366f1" }}>
              {user.displayName?.[0]}
            </div>
            <div className="overflow-hidden">
              <div className="font-bold truncate text-sm uppercase tracking-tight">{user.displayName}</div>
              <div className="text-[10px] text-slate-400 truncate font-bold uppercase tracking-widest">{user.email}</div>
            </div>
          </div>
          <button 
            onClick={() => signOut()}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest w-full"
          >
            <LogOut size={18} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn("flex-1 overflow-y-auto", activeTab === "admin" && isAdmin ? "p-4" : "p-8")}>
        {activeTab === "admin" && isAdmin ? (
          <UnifiedAdminConsole orgId={userProfile?.organizationId} />
        ) : activeTab === "rating" && isRater ? (
          <RatingDashboard />
        ) : activeTab === "institutional" && isOrgAdmin ? (
          <InstitutionalDashboard organizationId={userProfile?.organizationId} />
        ) : activeTab === "results" && testCompleted?.sessionId ? (
          <CandidateAdaptiveReport
            sessionId={testCompleted.sessionId}
            onClose={() => { setTestCompleted(null); setActiveTab("dashboard"); }}
          />
        ) : activeTab === "results" && certificate ? (
          <CertificateView certificate={certificate} branding={branding} />
        ) : activeTab === "profile" ? (
          <CandidateProfile user={userProfile} onLogout={() => signOut()} />
        ) : (
          <>
            <header className="flex items-center justify-between mb-12">
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tighter uppercase">Welcome back, {user.displayName?.split(' ')[0]}!</h1>
                <p className="text-slate-500 mt-1 font-medium">{branding?.welcomeMessage || "Ready to measure your English proficiency?"}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="flex items-center gap-2 justify-end mb-1">
                    {branding?.logoUrl ? (
                      <img src={branding.logoUrl} alt="Logo" className="h-6 rounded" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="bg-[#9b276c] justify-center text-white font-bold text-sm px-2 py-0.5 -skew-x-6 rounded-sm tracking-tight flex items-center">
                        <span style={{ textShadow: '0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)' }}>b4skills</span>
                      </div>
                    )}
                  </div>
                  <div className="text-[10px] text-indigo-600 font-black uppercase tracking-widest" style={{ color: branding?.primaryColor }}>Enterprise License</div>
                </div>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {testCompleted && (
                  <>
                  <Card className="bg-emerald-600 text-white border-none shadow-emerald-200 shadow-xl rounded-[32px]">
                    <CardContent className="p-8 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 size={24} />
                          <h2 className="text-2xl font-black uppercase tracking-tighter">Assessment Complete!</h2>
                        </div>
                        <p className="text-emerald-100 mb-4 font-bold opacity-80">
                          Your proficiency level has been calculated.
                        </p>
                        <div className="flex items-center gap-4">
                          <div className="bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-sm">
                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200">CEFR Level</div>
                            <div className="text-3xl font-black">{testCompleted.cefr}</div>
                          </div>
                          <div className="bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-sm">
                            <div className="text-[10px] font-black uppercase tracking-widest text-emerald-200">BEPS Score</div>
                            <div className="text-3xl font-black">{thetaToBeps(testCompleted.theta)}</div>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="bg-white text-emerald-600 hover:bg-emerald-50 border-none h-12 px-6 rounded-xl font-black uppercase tracking-widest text-xs"
                        onClick={() => setActiveTab("results")}
                        disabled={scoringStatus.state === "streaming" || scoringStatus.state === "connecting"}
                      >
                        {scoringStatus.state === "streaming" || scoringStatus.state === "connecting"
                          ? "Scoring…"
                          : "View Certificate"}
                      </Button>
                    </CardContent>
                  </Card>
                  {/* Async scoring status banner for Writing / Speaking */}
                  {(scoringStatus.state === "connecting" || scoringStatus.state === "streaming") && (
                    <div
                      role="status"
                      aria-live="polite"
                      className="flex items-center gap-3 px-5 py-3 bg-indigo-50 border border-indigo-200 rounded-2xl text-sm text-indigo-700 font-medium"
                    >
                      <span className="animate-spin inline-block w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full" aria-hidden="true" />
                      Writing &amp; Speaking responses are being scored by AI — results will appear shortly.
                    </div>
                  )}
                  {scoringStatus.state === "timeout" && (
                    <div role="alert" className="flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-sm text-amber-700 font-medium">
                      ⚠️ {scoringStatus.message}
                    </div>
                  )}
                  <CefrLevelCard level={testCompleted.cefr as any} theta={testCompleted.theta} className="mt-0" />
                  </>
                )}

                <AssessmentModeSelector
                  onSelect={(productLine) => startNewTest(productLine)}
                  allowedProductLine={userProfile?.allowedProductLine}
                />

                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    <ActivityItem 
                      title="Placement Test" 
                      date="Oct 12, 2025" 
                      score="B2" 
                      status="Verified"
                    />
                    <ActivityItem 
                      title="Business English Module" 
                      date="Sep 28, 2025" 
                      score="C1" 
                      status="Verified"
                    />
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <Card className="rounded-[32px] border-slate-100 shadow-sm">
                  <CardHeader className="font-black uppercase tracking-widest text-xs text-slate-400">Your Progress</CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <SkillProgress label="Reading" value={75} level="B2" />
                      <SkillProgress label="Listening" value={88} level="C1" />
                      <SkillProgress label="Writing" value={62} level="B1+" />
                      <SkillProgress label="Speaking" value={70} level="B2" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-slate-900 text-white rounded-[32px] border-none shadow-2xl shadow-slate-200">
                  <CardContent className="p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <ShieldCheck className="text-indigo-400" />
                      <h4 className="font-black uppercase tracking-tighter">Security Status</h4>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed font-bold">
                      Your identity has been verified. You are eligible for high-stakes admissions testing.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function SidebarItem({ icon, label, active = false, onClick }: { icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all",
        active ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white hover:bg-slate-800"
      )}
    >
      {icon}
      <span className="font-medium">{label}</span>
    </button>
  );
}

function ActivityItem({ title, date, score, status }: { title: string; date: string; score: string; status: string }) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-200 transition-all cursor-pointer group">
      <div className="flex items-center gap-4">
        <div className="p-2 bg-slate-50 text-slate-400 rounded-lg group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-all">
          <FileText size={24} />
        </div>
        <div>
          <div className="font-bold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">{date}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold text-indigo-600">{score}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-green-600">{status}</div>
      </div>
    </div>
  );
}

function SkillProgress({ label, value, level }: { label: string; value: number; level: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="text-slate-600 font-medium">{label}</span>
        <span className="text-indigo-600 font-bold">{level}</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
