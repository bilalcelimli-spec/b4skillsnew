import React, { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Upload, FileText, CheckCircle, AlertCircle, RefreshCw, X, Download } from "lucide-react";
import Papa from "papaparse";
import { motion, AnimatePresence } from "motion/react";

interface CandidateRow {
  email: string;
  name: string;
  cohort?: string;
  externalId?: string;
}

export const BulkCandidateImport: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<CandidateRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [status, setStatus] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      Papa.parse(selectedFile, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setData(results.data as CandidateRow[]);
        },
        error: (err) => {
          console.error("CSV Parse Error:", err);
        }
      });
    }
  };

  const handleImport = async () => {
    if (data.length === 0) return;
    setImporting(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/organizations/${orgId}/candidates/bulk-import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidates: data })
      });
      const result = await res.json();
      setStatus(result);
    } catch (err) {
      console.error("Failed to import candidates");
      setStatus({ success: 0, failed: data.length, errors: ["Network error occurred"] });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const csv = Papa.unparse([
      { email: "candidate1@example.com", name: "John Doe", cohort: "Spring 2026", externalId: "ID-001" },
      { email: "candidate2@example.com", name: "Jane Smith", cohort: "Spring 2026", externalId: "ID-002" }
    ]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "candidate_import_template.csv";
    link.click();
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Upload className="text-indigo-600" size={20} />
              Bulk Candidate Import
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600">
              <Download size={14} className="mr-1" />
              Download Template
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-8">
          {!file ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-12 flex flex-col items-center justify-center gap-4 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer group"
            >
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <FileText size={32} />
              </div>
              <div className="text-center">
                <div className="font-black text-slate-900 uppercase tracking-tight">Click to upload CSV</div>
                <div className="text-xs text-slate-400 font-medium mt-1">Maximum file size: 5MB</div>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".csv" 
                className="hidden" 
              />
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-lg flex items-center justify-center">
                    <FileText size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{file.name}</div>
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{data.length} Candidates detected</div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={() => { setFile(null); setData([]); setStatus(null); }} className="rounded-lg text-slate-400 hover:text-red-500">
                  <X size={18} />
                </Button>
              </div>

              {status ? (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl border border-slate-200 space-y-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 p-4 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                      <div className="text-2xl font-black text-emerald-600">{status.success}</div>
                      <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Successfully Imported</div>
                    </div>
                    <div className="flex-1 p-4 bg-red-50 border border-red-100 rounded-xl text-center">
                      <div className="text-2xl font-black text-red-600">{status.failed}</div>
                      <div className="text-[10px] font-black text-red-600 uppercase tracking-widest">Failed / Skipped</div>
                    </div>
                  </div>

                  {status.errors.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-black text-red-600 uppercase tracking-widest flex items-center gap-1">
                        <AlertCircle size={12} />
                        Import Errors
                      </div>
                      <div className="max-h-32 overflow-y-auto p-3 bg-slate-50 rounded-lg border border-slate-200 text-[10px] font-mono text-slate-600 space-y-1">
                        {status.errors.map((err, i) => (
                          <div key={i}>• {err}</div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button 
                    onClick={() => { setFile(null); setData([]); setStatus(null); }}
                    variant="outline" 
                    className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest"
                  >
                    Import Another File
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                        <tr>
                          <th className="p-3 font-black uppercase tracking-widest text-slate-400 text-[8px]">Name</th>
                          <th className="p-3 font-black uppercase tracking-widest text-slate-400 text-[8px]">Email</th>
                          <th className="p-3 font-black uppercase tracking-widest text-slate-400 text-[8px]">Cohort</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.slice(0, 10).map((row, i) => (
                          <tr key={i}>
                            <td className="p-3 font-bold text-slate-700">{row.name}</td>
                            <td className="p-3 text-slate-500">{row.email}</td>
                            <td className="p-3 text-slate-400">{row.cohort || "-"}</td>
                          </tr>
                        ))}
                        {data.length > 10 && (
                          <tr>
                            <td colSpan={3} className="p-3 text-center text-[10px] text-slate-400 italic">
                              + {data.length - 10} more rows...
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  <Button 
                    onClick={handleImport} 
                    disabled={importing}
                    className="w-full rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white h-12 font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100"
                  >
                    {importing ? <RefreshCw className="animate-spin mr-2" size={16} /> : <CheckCircle className="mr-2" size={16} />}
                    Confirm & Start Import
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
