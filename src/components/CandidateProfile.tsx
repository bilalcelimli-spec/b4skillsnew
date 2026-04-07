import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { 
  User, 
  Mail, 
  Globe, 
  Calendar, 
  Award, 
  FileText, 
  Shield, 
  Settings,
  LogOut,
  ChevronRight,
  Clock,
  ExternalLink,
  CheckCircle2,
  Zap
} from "lucide-react";
import { cn } from "../lib/utils";

interface Profile {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: string;
  organizationId?: string;
  createdAt: string;
}

interface PastTest {
  id: string;
  date: string;
  cefr: string;
  score: number;
  status: string;
}

export const CandidateProfile: React.FC<{ user: any; onLogout: () => void }> = ({ user, onLogout }) => {
  const [pastTests, setPastTests] = useState<PastTest[]>([
    { id: "sess_1", date: "2026-03-15", cefr: "B1", score: 65, status: "COMPLETED" },
    { id: "sess_2", date: "2026-02-10", cefr: "A2+", score: 58, status: "COMPLETED" }
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      {/* Profile Header */}
      <div className="relative h-48 bg-indigo-600 rounded-[40px] overflow-hidden shadow-2xl shadow-indigo-100">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-indigo-900" />
        <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute top-10 left-10 flex items-center gap-6">
          <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-indigo-600 font-black text-3xl shadow-xl">
            {user.displayName?.[0] || "U"}
          </div>
          <div className="text-white">
            <h1 className="text-3xl font-black tracking-tighter uppercase">{user.displayName || "Candidate"}</h1>
            <p className="text-indigo-100 font-bold opacity-80 flex items-center gap-2">
              <Mail size={16} /> {user.email}
            </p>
          </div>
        </div>
        <div className="absolute top-10 right-10 flex gap-3">
          <Button 
            className="bg-white text-indigo-600 hover:bg-indigo-50 h-12 px-6 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl"
            onClick={async () => {
              const res = await fetch("/api/payments/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user.uid, credits: 1 })
              });
              const { url } = await res.json();
              if (url) window.location.href = url;
            }}
          >
            <Zap size={16} className="mr-2" /> Buy Credits
          </Button>
          <Button onClick={onLogout} variant="ghost" className="bg-white/10 text-white hover:bg-white/20 rounded-xl font-bold gap-2">
            <LogOut size={18} /> Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Account Info */}
        <div className="space-y-6">
          <Card className="rounded-[32px] border-slate-100 shadow-sm">
            <CardHeader className="font-black uppercase tracking-widest text-xs text-slate-400">Account Details</CardHeader>
            <CardContent className="space-y-4">
              <InfoItem icon={<Shield className="text-indigo-600" size={18} />} label="Role" value={user.role || "Candidate"} />
              <InfoItem icon={<Globe className="text-amber-600" size={18} />} label="Organization" value={user.organizationId || "Independent"} />
              <InfoItem icon={<Calendar className="text-emerald-600" size={18} />} label="Joined" value={new Date(user.createdAt || Date.now()).toLocaleDateString()} />
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-slate-100 shadow-sm bg-indigo-600 text-white">
            <CardContent className="p-8 text-center">
              <Award size={48} className="mx-auto mb-4 opacity-40" />
              <h3 className="text-xl font-black uppercase tracking-tighter mb-2">Ready for your next test?</h3>
              <p className="text-indigo-100 text-sm font-bold opacity-80 mb-6">
                Our adaptive engine is ready to measure your progress.
              </p>
              <Button className="w-full bg-white text-indigo-600 hover:bg-indigo-50 h-12 rounded-xl font-black uppercase tracking-widest text-xs">
                Launch Assessment
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Test History */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Assessment History</h2>
          <div className="space-y-4">
            {pastTests.map((test) => (
              <Card key={test.id} className="group hover:shadow-xl transition-all duration-300 border-slate-100 rounded-[32px] overflow-hidden">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                      <FileText size={24} />
                    </div>
                    <div>
                      <div className="font-black text-slate-900 uppercase tracking-tight">{test.id}</div>
                      <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
                        <span className="flex items-center gap-1"><Clock size={12} /> {test.date}</span>
                        <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={12} /> {test.status}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-2xl font-black text-slate-900">{test.cefr}</div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proficiency</div>
                    </div>
                    <Button variant="ghost" className="h-12 w-12 p-0 rounded-2xl bg-slate-50 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 transition-all">
                      <ExternalLink size={20} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">{icon}</div>
    <div>
      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</div>
      <div className="text-sm font-black text-slate-900">{value}</div>
    </div>
  </div>
);
