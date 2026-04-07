import React, { useState } from "react";
import { Card, CardHeader, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Activity, Copy, Check, Info } from "lucide-react";
import { cn } from "../../lib/utils";

export const ExamCodeManager: React.FC = () => {
  const [productLine, setProductLine] = useState("General");
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<{ code: string }[]>([]);
  const [copied, setCopied] = useState(false);

  const handleGenerateCodes = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/codes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-email": "bilalcelimli@gmail.com",
        },
        body: JSON.stringify({
          organizationId: "default-org", // Use valid organization
          productLine,
          count,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to generate code");
      }

      const data = await res.json();
      // Server returns an array of strings, let's map them to objects
      const formattedCodes = data.codes.map((code: string) => ({ code }));
      setGeneratedCodes(formattedCodes);
    } catch (err) {
      console.error(err);
      alert("Failed to generate codes");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCodes = () => {
    const codesString = generatedCodes.map((c) => c.code).join("\n");
    navigator.clipboard.writeText(codesString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-800">
          Exam Code Manager
        </h2>
        <p className="text-slate-500">
          Generate one-time exam codes for candidates to access tests.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-slate-800">
              Generate New Codes
            </h3>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Product Line</Label>
              <select
                value={productLine}
                onChange={(e) => setProductLine(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="General">General English</option>
                <option value="Primary (7-10)">Primary (7-10)</option>
                <option value="Junior Suite (11-14)">Junior Suite (11-14)</option>
                <option value="15-Min Diagnostic">15-Min Diagnostic</option>
                <option value="Academia">Academia</option>
                <option value="Corporate">Corporate</option>
                <option value="Language Schools">Language Schools</option>
                <option value="Specialized / Integrated Skills">Specialized / Integrated Skills</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>Code Quantity</Label>
              <Input
                type="number"
                min={1}
                max={500}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
              />
              <p className="text-xs text-slate-500">
                You can generate up to 500 codes at once.
              </p>
            </div>

            <Button
              className="w-full mt-4 flex items-center justify-center p-3 rounded-xl font-medium transition-all duration-300 transform bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg disabled:opacity-50"
              onClick={handleGenerateCodes}
              disabled={loading || count < 1 || count > 500}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Activity className="animate-spin" size={16} />
                  <span>Generating...</span>
                </div>
              ) : (
                "Generate Codes"
              )}
            </Button>
          </CardContent>
        </Card>

        {generatedCodes.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <h3 className="text-lg font-medium text-slate-800">
                Generated Codes
              </h3>
              <Button
                onClick={handleCopyCodes}
                disabled={copied}
                className="flex items-center space-x-2 text-sm px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
              >
                {copied ? (
                  <Check size={16} className="text-emerald-500" />
                ) : (
                  <Copy size={16} />
                )}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 max-h-[300px] overflow-y-auto font-mono text-sm text-slate-700 text-center space-y-2">
                {generatedCodes.map((c, i) => (
                  <div
                    key={i}
                    className="py-2 border-b border-slate-100 last:border-0 font-medium tracking-widest text-lg"
                  >
                    {c.code}
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-start space-x-2 bg-blue-50 text-blue-800 p-3 rounded-lg text-sm">
                <Info size={16} className="mt-0.5 flex-shrink-0" />
                <p>
                  These codes are single-use. Distribute them securely to
                  candidates. They can redeem them on the login page.
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
