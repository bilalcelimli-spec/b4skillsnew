import { OZGUN_PRODUCT, OZGUN_MEDIA, OZGUN_TITLE } from "../../lib/fixed-forms/ozgun-kids";
import React, { useState, useEffect } from "react";
import { useToast } from "../../hooks/useToast.js";
import { Card, CardHeader, CardContent } from "../ui/Card";
import { Button } from "../ui/Button";
import { Label } from "../ui/Label";
import { Input } from "../ui/Input";
import { Activity, Copy, Check, Info } from "lucide-react";
import { cn } from "../../lib/utils";

export const ExamCodeManager: React.FC<{ orgId?: string }> = ({ orgId }) => {
  const { toast } = useToast();
  const [productLine, setProductLine] = useState("General English");
  const [count, setCount] = useState(1);
  const [loading, setLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<{ code: string }[]>([]);
  const [copied, setCopied] = useState(false);
  const [fixedKey,setFixedKey]=useState('');
  const [keyConfirmed,setKeyConfirmed]=useState(false);
  const [keyBusy,setKeyBusy]=useState(false);
  const [keyLoaded,setKeyLoaded]=useState(false);
  const [keyDirty,setKeyDirty]=useState(false);
  useEffect(()=>{
    if(productLine!==OZGUN_PRODUCT||!orgId)return;
    let cancelled=false;setKeyLoaded(false);setKeyBusy(true);
    fetch(`/api/fixed-forms/ozgun-kids/config?organizationId=${encodeURIComponent(orgId)}`,{credentials:'include'})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error);if(!cancelled){setFixedKey(data.answerKey);setKeyConfirmed(data.confirmed);setKeyLoaded(true);setKeyDirty(false);}})
      .catch(error=>{if(!cancelled)toast({title:'Cevap anahtarı yüklenemedi',description:error.message,variant:'error'});})
      .finally(()=>{if(!cancelled)setKeyBusy(false);});
    return()=>{cancelled=true;};
  },[productLine,orgId]);
  async function saveFixedKey(){
    setKeyBusy(true);
    try{
      const response=await fetch('/api/fixed-forms/ozgun-kids/config',{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({organizationId:orgId,answerKey:fixedKey,confirmed:keyConfirmed})});
      const data=await response.json();if(!response.ok)throw new Error(data.error);
      setKeyDirty(false);toast({title:'Cevap anahtarı kaydedildi',variant:'success'});
    }catch(error){toast({title:'Anahtar kaydedilemedi',description:(error as Error).message,variant:'error'});}finally{setKeyBusy(false);}
  }

  const handleGenerateCodes = async () => {
    if (!orgId) {
      toast({ title: "No organization", description: "No organization selected.", variant: "warning" });
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/codes/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          organizationId: orgId,
          productLine,
          quantity: count,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to generate code");
      }

      const data = await res.json();
      // Server returns an array of strings, let's map them to objects
      const formattedCodes = data.codes.map((code: string) => ({ code }));
      setGeneratedCodes(formattedCodes);
    } catch (err: any) {
      toast({ title: "Code generation failed", description: err.message, variant: "error" });
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
              <Label htmlFor="exam-code-product">Product Line</Label>
              <select
                id="exam-code-product"
                value={productLine}
                onChange={(e) => setProductLine(e.target.value)}
                className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value={OZGUN_PRODUCT}>{OZGUN_TITLE}</option>
                <option value="General English">General English</option>
                <option value="Primary (7-10)">Primary (7-10)</option>
                <option value="Junior Suite (11-14)">Junior Suite (11-14)</option>
                <option value="15-Min Diagnostic">Rapid Diagnostic (30–40 min)</option>
                <option value="Express Assessment (30-Min)">Express Assessment (30-Min)</option>
                <option value="Academia">Academia</option>
                <option value="Corporate">Corporate</option>
                <option value="Language Schools">Language Schools</option>
                <option value="Specialized / Integrated Skills">Specialized / Integrated Skills</option>
              </select>
            </div>

            {productLine===OZGUN_PRODUCT&&<section className="space-y-3 rounded-xl bg-pink-50 border border-pink-100 p-4">
              <h4 className="font-bold">{OZGUN_TITLE}</h4>
              <p className="text-sm">96 sabit soru · Grammar 20 dk, Vocabulary 15 dk, Reading 35 dk, Listening 32 dk. Toplam 105 dk (3 dk açıklama dahil). Writing/Speaking yoktur; rapor doğru/yanlış/boş sayılarını gösterir.</p>
              <p className="text-xs">Soru sırasına uygun paylaşılan cevap anahtarı yüklüdür. Kurumunuz için düzenleyebilirsiniz. Geçici kur önerileri ve 16 soruluk düzey kümeleri raporda gösterilir; bunlar doğrulanmış CEFR sınırları değildir. Otomatik yerleştirme veya yeterlilik sertifikası üretilmez.</p>
              <a className="text-sm underline text-indigo-700" href={`${OZGUN_MEDIA}/booklet.pdf`} target="_blank" rel="noreferrer">Öğrenci kitapçığını incele</a>
              <div className="space-y-1"><Label htmlFor="ozgun-answer-key">Cevap anahtarı (1–96, A/B/C/D)</Label><textarea id="ozgun-answer-key" rows={4} value={fixedKey} disabled={keyBusy} onChange={event=>{setFixedKey(event.target.value.replace(/\s/g,'').toUpperCase());setKeyConfirmed(false);setKeyDirty(true);}} className="w-full rounded-lg border p-2 font-mono break-all"/><p className="text-xs">{fixedKey.length}/96 cevap. Anahtar oturum başlarken sabitlenir; sonraki değişiklikler mevcut oturumların puanını değiştirmez.</p></div>
              <label className="flex gap-2 text-sm"><input type="checkbox" checked={keyConfirmed} disabled={keyBusy} onChange={event=>{setKeyConfirmed(event.target.checked);setKeyDirty(true);}}/>Bu cevap anahtarını kurumum için doğruladım.</label>
              <Button variant="outline" size="sm" disabled={keyBusy||!keyLoaded||!keyDirty||!(/^[ABCD]{96}$/.test(fixedKey))} onClick={saveFixedKey}>{keyBusy?'Yükleniyor…':'Cevap anahtarını kaydet'}</Button>
            </section>}

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
              disabled={loading || count < 1 || count > 500 || (productLine===OZGUN_PRODUCT && (!keyLoaded||keyBusy||keyDirty))}
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
