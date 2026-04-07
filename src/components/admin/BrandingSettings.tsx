import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { Palette, Image as ImageIcon, Globe, Save, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

interface BrandingConfig {
  logoUrl: string;
  primaryColor: string;
  portalName: string;
  faviconUrl: string;
  customCss: string;
}

export const BrandingSettings: React.FC<{ orgId: string; initialBranding?: BrandingConfig }> = ({ orgId, initialBranding }) => {
  const [branding, setBranding] = useState<BrandingConfig>(initialBranding || {
    logoUrl: "",
    primaryColor: "#4f46e5",
    portalName: "b4skills Portal",
    faviconUrl: "",
    customCss: ""
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/organizations/${orgId}/branding`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding)
      });
      if (res.ok) {
        // Success
      }
    } catch (err) {
      console.error("Failed to save branding");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration */}
        <Card className="lg:col-span-2 border-slate-200 shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="border-b border-slate-100 bg-slate-50/50">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Palette className="text-indigo-600" size={20} />
              Visual Identity
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Portal Name</Label>
                <Input 
                  value={branding.portalName}
                  onChange={(e) => setBranding({ ...branding, portalName: e.target.value })}
                  placeholder="e.g. Acme Academy Portal"
                  className="rounded-xl border-slate-200"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Primary Color</Label>
                <div className="flex gap-2">
                  <Input 
                    type="color"
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    className="w-12 h-10 p-1 rounded-lg border-slate-200 cursor-pointer"
                  />
                  <Input 
                    value={branding.primaryColor}
                    onChange={(e) => setBranding({ ...branding, primaryColor: e.target.value })}
                    className="flex-1 rounded-xl border-slate-200 font-mono text-sm"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Logo URL</Label>
              <div className="flex gap-2">
                <Input 
                  value={branding.logoUrl}
                  onChange={(e) => setBranding({ ...branding, logoUrl: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="rounded-xl border-slate-200"
                />
                <Button variant="outline" size="icon" className="rounded-xl">
                  <ImageIcon size={18} />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custom CSS (Advanced)</Label>
              <textarea 
                value={branding.customCss}
                onChange={(e) => setBranding({ ...branding, customCss: e.target.value })}
                placeholder=":root { --brand-radius: 2rem; }"
                className="w-full h-32 p-4 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={handleSave} 
                disabled={saving}
                className="rounded-2xl bg-slate-900 hover:bg-black text-white px-8 h-12 font-black uppercase tracking-widest text-xs"
              >
                {saving ? <RefreshCw className="animate-spin mr-2" size={16} /> : <Save className="mr-2" size={16} />}
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <div className="space-y-6">
          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-slate-50">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-slate-400">Live Preview</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <header className="p-4 border-b border-slate-100 flex items-center justify-between" style={{ borderTop: `4px solid ${branding.primaryColor}` }}>
                  <div className="flex items-center gap-2">
                    {branding.logoUrl ? (
                      <img src={branding.logoUrl} alt="Logo" className="h-6 w-auto" />
                    ) : (
                      <div className="w-6 h-6 rounded bg-slate-200" />
                    )}
                    <span className="font-black text-xs uppercase tracking-tight">{branding.portalName}</span>
                  </div>
                </header>
                <div className="p-8 space-y-4">
                  <div className="h-4 w-3/4 bg-slate-100 rounded" />
                  <div className="h-4 w-1/2 bg-slate-100 rounded" />
                  <Button 
                    className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest"
                    style={{ backgroundColor: branding.primaryColor, color: 'white' }}
                  >
                    Action Button
                  </Button>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-4 text-center italic">
                This preview shows how candidates will see your portal.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-indigo-50/50">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-2">
                <Globe size={14} />
                Domain Mapping
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="text-xs text-slate-600 leading-relaxed mb-4">
                Point your custom domain (e.g. <code className="bg-slate-100 px-1 rounded">test.acme.com</code>) to our servers.
              </div>
              <Button variant="outline" className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest">
                Configure Domain
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
