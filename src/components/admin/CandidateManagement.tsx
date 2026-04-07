import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Key,
  Users, 
  Search, 
  Filter, 
  MoreVertical, 
  Mail, 
  Shield, 
  UserPlus,
  RefreshCw,
  Trash2,
  CheckCircle2
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

export const CandidateManagement: React.FC<{ orgId: string, onGenerateCodes?: () => void }> = ({ orgId, onGenerateCodes }) => {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchCandidates();
  }, [orgId]);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      // Mock data for now
      await new Promise(resolve => setTimeout(resolve, 1000));
      setCandidates([
        { id: "1", name: "Alice Johnson", email: "alice@example.com", status: "COMPLETED", lastActive: "2024-03-20" },
        { id: "2", name: "Bob Smith", email: "bob@example.com", status: "IN_PROGRESS", lastActive: "2024-03-21" },
        { id: "3", name: "Charlie Brown", email: "charlie@example.com", status: "SCHEDULED", lastActive: "2024-03-19" },
      ]);
    } catch (err) {
      console.error("Failed to fetch candidates");
    } finally {
      setLoading(false);
    }
  };

  const filtered = candidates.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <Input 
            placeholder="Search candidates by name or email..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="rounded-xl h-10 px-4 text-[10px] font-black uppercase tracking-widest">
            <Filter size={14} className="mr-2" /> Filter
          </Button>
          <Button variant="primary" size="sm" className="rounded-xl h-10 px-6 text-[10px] font-black uppercase tracking-widest" onClick={onGenerateCodes}>
            <Key size={14} className="mr-2" /> Generate Exam Codes
          </Button>
        </div>
      </div>

      <Card className="border-slate-200 shadow-sm rounded-3xl overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-400 text-[8px] uppercase tracking-widest font-black">
                  <th className="px-8 py-4 border-b border-slate-100">Candidate</th>
                  <th className="px-8 py-4 border-b border-slate-100">Status</th>
                  <th className="px-8 py-4 border-b border-slate-100">Last Active</th>
                  <th className="px-8 py-4 border-b border-slate-100 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-8 py-6 h-16 bg-slate-50/30" />
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-8 py-12 text-center text-slate-400 font-medium italic">
                      No candidates found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((cand) => (
                    <tr key={cand.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs">
                            {cand.name[0]}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{cand.name}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{cand.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest",
                          cand.status === "COMPLETED" ? "bg-emerald-100 text-emerald-600" :
                          cand.status === "IN_PROGRESS" ? "bg-amber-100 text-amber-600" :
                          "bg-indigo-100 text-indigo-600"
                        )}>
                          {cand.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="text-xs font-bold text-slate-700">{cand.lastActive}</div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600">
                            <Mail size={16} />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500">
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
