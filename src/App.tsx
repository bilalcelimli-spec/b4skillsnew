import React, { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useScoringStatus } from "./hooks/useScoringStatus";
import { thetaToCefr, thetaToBeps, CEFR_META } from "./lib/cefr/cefr-framework";
import { CefrLevelCard } from "./components/CefrLevelCard";

import { AuthPage } from "./components/AuthPage";
import { CodeEntryPage } from "./components/CodeEntryPage";
import { VerificationPage } from "./components/VerificationPage";
type User = { uid: string; email: string; displayName?: string; role?: string };
const signOut = async () => {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
  } catch { /* proceed regardless — server cleared cookie */ }
  // Navigate to root to avoid URL sync re-setting activeTab to "admin" etc.
  window.location.href = "/";
};

import { Button } from "./components/ui/Button";
import { Card, CardContent, CardHeader } from "./components/ui/Card";

// Heavy role-specific components — lazy-loaded so candidates never download admin/rater code
const UnifiedAdminConsole    = lazy(() => import("./components/admin/UnifiedAdminConsole").then(m => ({ default: m.UnifiedAdminConsole })));
const RatingDashboard        = lazy(() => import("./components/RatingDashboard").then(m => ({ default: m.RatingDashboard })));
const InstitutionalDashboard = lazy(() => import("./components/InstitutionalDashboard").then(m => ({ default: m.InstitutionalDashboard })));
const CertificateView        = lazy(() => import("./components/CertificateView").then(m => ({ default: m.CertificateView })));
const CandidateAdaptiveReport = lazy(() => import("./components/CandidateAdaptiveReport").then(m => ({ default: m.CandidateAdaptiveReport })));
const AssessmentModeSelector  = lazy(() => import("./components/AssessmentModeSelector").then(m => ({ default: m.AssessmentModeSelector })));
const TestPlayer             = lazy(() => import("./components/TestPlayer").then(m => ({ default: m.TestPlayer })));
const LandingPage            = lazy(() => import("./components/LandingPage").then(m => ({ default: m.LandingPage })));
const ItemBankManager        = lazy(() => import("./components/ItemBankManager").then(m => ({ default: m.ItemBankManager })));
const CandidateProfile       = lazy(() => import("./components/CandidateProfile").then(m => ({ default: m.CandidateProfile })));

// Shared loading fallback
const PageLoader = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600" />
  </div>
);
import { LogIn, LogOut, GraduationCap, LayoutDashboard, FileText, Settings, ShieldCheck, User as UserIcon, ShieldAlert, CheckCircle2, ClipboardList, Building2, BarChart3, Award, Database, UserCircle, Sliders, BoxSelect, Menu, X, ChevronRight } from "lucide-react";
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
  const [recentSessions, setRecentSessions] = useState<any[]>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedHistorySessionId, setSelectedHistorySessionId] = useState<string | null>(null);
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

          // Load recent activity for the dashboard
          try {
            const histRes = await fetch(`/api/candidates/${data.user.uid}/history`);
            if (histRes.ok) {
              const sessions = await histRes.json();
              setRecentSessions(Array.isArray(sessions) ? sessions.slice(0, 5) : []);
            }
          } catch (_err) {
            // Non-blocking — dashboard still renders without history
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

  // Public certificate verification page — accessible without authentication
  const verifyMatch = location.pathname.match(/^\/verify\/(.+)/);
  if (verifyMatch) {
    return <VerificationPage certId={verifyMatch[1]} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (showCodeEntry) {
    return <CodeEntryPage onBack={() => { setShowCodeEntry(false); setShowLanding(true); }} onSuccess={(productLine, orgId, email, candidateId, name) => {
      setUser({ uid: candidateId, email, displayName: `${name}` } as any);
      setUserProfile({ uid: candidateId, email, role: "CANDIDATE", organizationId: orgId, allowedProductLine: productLine });
      setShowCodeEntry(false);
    }} />;
  }

  if (!user && showLanding) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LandingPage onStart={() => setShowLanding(false)} onCodeEntry={() => { setShowLanding(false); setShowCodeEntry(true); }} />
      </Suspense>
    );
  }

  if (!user) {
    return <AuthPage onBack={() => setShowLanding(true)} />;
  }

  if (activeSession) {
    return (
      <Suspense fallback={<PageLoader />}>
        <TestPlayer
          organizationId={activeSession.orgId}
          candidateId={user.uid}
          productLine={activeSession.productLine}
          onComplete={handleTestComplete}
        />
      </Suspense>
    );
  }

  const profRole = userProfile?.role?.toUpperCase();
  const isAdmin = ["ADMIN", "SUPER_ADMIN", "CONTENT_ADMIN", "ASSESSMENT_DIRECTOR"].includes(profRole);
  const isRater = profRole === "RATER" || isAdmin;
  const isOrgAdmin = ["ORG_ADMIN", "INST_ADMIN"].includes(profRole) || isAdmin;

  // Clears stale session state when the user explicitly switches away from results.
  type Tab = typeof activeTab;
  const goToTab = (tab: Tab) => {
    if (tab !== "results") {
      setTestCompleted(null);
      setCertificate(null);
      setSelectedHistorySessionId(null);
    }
    setActiveTab(tab);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ── Mobile Navigation Drawer ── */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          {/* Drawer */}
          <aside
            className="relative w-72 max-w-[80vw] bg-slate-900 text-white p-6 flex flex-col h-full overflow-y-auto"
            style={{ backgroundColor: branding?.secondaryColor || "#0f172a" }}
            role="dialog"
            aria-modal="true"
            aria-label="Navigation menu"
          >
            <div className="flex items-center justify-between mb-10">
              {branding?.logoUrl ? (
                <img src={branding.logoUrl} alt="Logo" className="w-8 h-8 rounded" referrerPolicy="no-referrer" />
              ) : (
                <div className="bg-[#9b276c] text-white font-bold text-xl px-3 py-1 -skew-x-6 rounded-sm tracking-tight inline-flex items-center">
                  <span style={{ textShadow: '0 0 8px rgba(253, 224, 71, 0.8), 0 0 15px rgba(253, 224, 71, 0.4)' }}>b4skills</span>
                </div>
              )}
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>
            <nav className="space-y-2 flex-1">
              <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === "dashboard"} onClick={() => { goToTab("dashboard"); setMobileMenuOpen(false); }} />
              {isAdmin && <SidebarItem icon={<ShieldAlert size={20} />} label="Admin Console" active={activeTab === "admin"} onClick={() => { goToTab("admin"); setMobileMenuOpen(false); }} />}
              {isRater && <SidebarItem icon={<ClipboardList size={20} />} label="Rating Queue" active={activeTab === "rating"} onClick={() => { goToTab("rating"); setMobileMenuOpen(false); }} />}
              {isOrgAdmin && <SidebarItem icon={<BarChart3 size={20} />} label="Institutional" active={activeTab === "institutional"} onClick={() => { goToTab("institutional"); setMobileMenuOpen(false); }} />}
              <SidebarItem icon={<FileText size={20} />} label="My Results" active={activeTab === "results"} onClick={() => { goToTab("results"); setMobileMenuOpen(false); }} />
              <SidebarItem icon={<UserCircle size={20} />} label="Profile" active={activeTab === "profile"} onClick={() => { goToTab("profile"); setMobileMenuOpen(false); }} />
            </nav>
            <div className="pt-6 border-t border-slate-800">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shrink-0" style={{ backgroundColor: branding?.primaryColor || "#6366f1" }}>
                  {user.displayName?.[0]}
                </div>
                <div className="overflow-hidden">
                  <div className="font-bold truncate text-sm uppercase tracking-tight">{user.displayName}</div>
                  <div className="text-[10px] text-slate-400 truncate font-bold uppercase tracking-widest">{user.email}</div>
                </div>
              </div>
              <button onClick={() => signOut()} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest w-full">
                <LogOut size={18} /> Sign Out
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Sidebar (desktop only) */}
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
      <main className={cn("flex-1 overflow-y-auto min-w-0", activeTab === "admin" && isAdmin ? "p-4" : "p-6 md:p-8")}>
        {/* Mobile top bar */}
        <div className="flex items-center justify-between mb-6 md:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 rounded-xl bg-slate-900 text-white"
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          {branding?.logoUrl ? (
            <img src={branding.logoUrl} alt="Logo" className="h-7 rounded" referrerPolicy="no-referrer" />
          ) : (
            <div className="bg-[#9b276c] text-white font-bold text-base px-2.5 py-0.5 -skew-x-6 rounded-sm tracking-tight inline-flex items-center">
              <span style={{ textShadow: '0 0 8px rgba(253, 224, 71, 0.8)' }}>b4skills</span>
            </div>
          )}
          <button onClick={() => signOut()} className="p-2 rounded-xl bg-slate-100 text-slate-600" aria-label="Sign out">
            <LogOut size={18} />
          </button>
        </div>
        {activeTab === "admin" && isAdmin ? (
          <Suspense fallback={<PageLoader />}>
            <UnifiedAdminConsole orgId={userProfile?.organizationId} />
          </Suspense>
        ) : activeTab === "rating" && isRater ? (
          <Suspense fallback={<PageLoader />}>
            <RatingDashboard />
          </Suspense>
        ) : activeTab === "institutional" && isOrgAdmin ? (
          <Suspense fallback={<PageLoader />}>
            <InstitutionalDashboard organizationId={userProfile?.organizationId} />
          </Suspense>
        ) : activeTab === "results" && (testCompleted?.sessionId || selectedHistorySessionId) ? (
          <Suspense fallback={<PageLoader />}>
            <CandidateAdaptiveReport
              sessionId={(testCompleted?.sessionId || selectedHistorySessionId)!}
              onClose={() => {
                setTestCompleted(null);
                setSelectedHistorySessionId(null);
                setActiveTab(testCompleted ? "dashboard" : "results");
              }}
            />
          </Suspense>
        ) : activeTab === "results" && certificate ? (
          <Suspense fallback={<PageLoader />}>
            <CertificateView certificate={certificate} branding={branding} />
          </Suspense>
        ) : activeTab === "results" ? (
          <ResultsHistory
            sessions={recentSessions}
            onSelectSession={(id) => setSelectedHistorySessionId(id)}
          />
        ) : activeTab === "profile" ? (
          <Suspense fallback={<PageLoader />}>
            <CandidateProfile user={userProfile} onLogout={() => signOut()} />
          </Suspense>
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

                <Suspense fallback={<div className="h-32 bg-slate-100 rounded-3xl animate-pulse" />}>
                  <AssessmentModeSelector
                    onSelect={(productLine) => startNewTest(productLine)}
                    allowedProductLine={userProfile?.allowedProductLine}
                  />
                </Suspense>

                <section>
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Recent Activity</h3>
                  <div className="space-y-4">
                    {recentSessions.length === 0 ? (
                      <p className="text-sm text-slate-400 font-medium py-4 text-center">No assessments taken yet. Start your first test above!</p>
                    ) : recentSessions.map((s: any) => (
                      <ActivityItem
                        key={s.id}
                        title={s.metadata?.productLine || "Assessment"}
                        date={s.completedAt ? new Date(s.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "In progress"}
                        score={s.scoreReport?.overallCefr ?? s.cefrLevel ?? "—"}
                        status={s.status === "COMPLETED" ? "Verified" : s.status === "IN_PROGRESS" ? "In Progress" : s.status}
                      />
                    ))}
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <Card className="rounded-[32px] border-slate-100 shadow-sm">
                  <CardHeader className="font-black uppercase tracking-widest text-xs text-slate-400">Your Progress</CardHeader>
                  <CardContent>
                    {(() => {
                      const latest = recentSessions.find(s => s.status === "COMPLETED" && s.scoreReport);
                      if (!latest) return <p className="text-sm text-slate-400 font-medium py-2">Complete an assessment to see your skill breakdown.</p>;
                      const r = latest.scoreReport;
                      const toVal = (score: number | null) => score != null ? Math.round(score * 100) : null;
                      const skills = [
                        { label: "Reading",   value: toVal(r.readingScore),   level: r.readingCefr   },
                        { label: "Listening", value: toVal(r.listeningScore), level: r.listeningCefr },
                        { label: "Writing",   value: toVal(r.writingScore),   level: r.writingCefr   },
                        { label: "Speaking",  value: toVal(r.speakingScore),  level: r.speakingCefr  },
                      ].filter(s => s.value != null);
                      if (skills.length === 0) return <p className="text-sm text-slate-400 font-medium py-2">Skill data not yet available.</p>;
                      return (
                        <div className="space-y-6">
                          {skills.map(s => <SkillProgress key={s.label} label={s.label} value={s.value!} level={s.level ?? "—"} />)}
                        </div>
                      );
                    })()}
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

function ResultsHistory({ sessions, onSelectSession }: { sessions: any[]; onSelectSession: (id: string) => void }) {
  const completed = sessions.filter(s => s.status === "COMPLETED");
  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 tracking-tighter uppercase">My Results</h1>
        <p className="text-slate-500 mt-1 font-medium">Review your past assessments and reports.</p>
      </header>
      {completed.length === 0 ? (
        <div className="text-center py-20 text-slate-400">
          <div className="text-5xl mb-4">📋</div>
          <p className="font-medium">No completed assessments yet. Take a test to see your results here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {completed.map((s: any) => {
            const cefr = s.scoreReport?.overallCefr ?? s.cefrLevel ?? "—";
            const beps = s.scoreReport?.bepsScore ?? (s.finalTheta != null ? thetaToBeps(s.finalTheta) : null);
            const date = s.completedAt ? new Date(s.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";
            const product = s.metadata?.productLine ?? "Assessment";
            return (
              <button
                key={s.id}
                onClick={() => onSelectSession(s.id)}
                className="w-full flex items-center justify-between p-5 bg-white border border-slate-200 rounded-2xl hover:border-indigo-300 hover:shadow-md transition-all text-left group"
              >
                <div className="flex items-center gap-4">
                  <div className="p-2.5 bg-indigo-50 text-indigo-500 rounded-xl group-hover:bg-indigo-100 transition-colors">
                    <FileText size={22} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">{product}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{date}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xl font-black text-indigo-600">{cefr}</div>
                    {beps != null && <div className="text-xs text-slate-400 font-bold">{beps} BEPS</div>}
                  </div>
                  <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}
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
