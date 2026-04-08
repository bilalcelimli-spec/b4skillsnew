import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  Activity,
  ArrowUpRight,
  RefreshCw,
  FileText,
  AlertCircle
} from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/src/lib/utils";

export const AuditLogView: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [orgId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/audit-logs`, {
        headers: { "x-user-email": "bilalcelimli@gmail.com" }
      });
      setLogs(await res.json());
    } catch (err) {
      console.error("Failed to fetch audit logs");
    } finally {
      setLoading(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("IMPORT")) return "text-emerald-600 bg-emerald-50 border-emerald-100";
    if (action.includes("UPDATE")) return "text-indigo-600 bg-indigo-50 border-indigo-100";
    if (action.includes("DELETE")) return "text-red-600 bg-red-50 border-red-100";
    return "text-slate-600 bg-slate-50 border-slate-100";
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <ShieldCheck className="text-indigo-600" size={20} />
            Compliance Audit Trail
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={fetchLogs} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600">
            <RefreshCw size={14} className="mr-1" /> Refresh Logs
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/30 text-slate-400 text-[8px] uppercase tracking-widest font-black">
                  <th className="px-6 py-4 border-b border-slate-100">Timestamp</th>
                  <th className="px-6 py-4 border-b border-slate-100">User</th>
                  <th className="px-6 py-4 border-b border-slate-100">Action</th>
                  <th className="px-6 py-4 border-b border-slate-100">Entity</th>
                  <th className="px-6 py-4 border-b border-slate-100 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4 h-12 bg-slate-50/50" />
                    </tr>
                  ))
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-medium italic">
                      No audit logs found for this organization.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="text-[10px] font-mono font-bold text-slate-700 uppercase tracking-widest">
                          {new Date(log.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-[10px] font-black">
                            {log.user?.name?.[0] || "U"}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-900">{log.user?.name || "System"}</div>
                            <div className="text-[8px] text-slate-400 font-medium">{log.user?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border",
                          getActionColor(log.action)
                        )}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                          {log.entityType} • {log.entityId.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg text-slate-400">
                          <FileText size={16} />
                        </Button>
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
