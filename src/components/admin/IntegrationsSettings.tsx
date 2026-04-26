import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Label } from "../ui/Label";
import { 
  Webhook, 
  Key, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  Copy, 
  ExternalLink,
  ShieldCheck,
  Zap,
  RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

export const IntegrationsSettings: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [orgId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [whRes, akRes] = await Promise.all([
        fetch(`/api/organizations/${orgId}/webhooks`, { credentials: "include" }),
        fetch(`/api/organizations/${orgId}/api-keys`, { credentials: "include" })
      ]);
      const whData = await whRes.json();
      const akData = await akRes.json();
      setWebhooks(Array.isArray(whData) ? whData : []);
      setApiKeys(Array.isArray(akData) ? akData : []);
    } catch (err) {
      console.error("Failed to fetch integrations");
    } finally {
      setLoading(false);
    }
  };

  const addWebhook = async () => {
    if (!newWebhookUrl) return;
    try {
      const res = await fetch(`/api/organizations/${orgId}/webhooks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ url: newWebhookUrl, events: ["session.completed"] })
      });
      const newWh = await res.json();
      setWebhooks([...webhooks, newWh]);
      setNewWebhookUrl("");
    } catch (err) {
      console.error("Failed to add webhook");
    }
  };

  const generateKey = async () => {
    if (!newKeyName) return;
    try {
      const res = await fetch(`/api/organizations/${orgId}/api-keys`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newKeyName })
      });
      const { key } = await res.json();
      setGeneratedKey(key);
      setNewKeyName("");
      fetchData();
    } catch (err) {
      console.error("Failed to generate API key");
    }
  };

  const deleteWebhook = async (webhookId: string) => {
    try {
      await fetch(`/api/organizations/${orgId}/webhooks/${webhookId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setWebhooks(prev => prev.filter(w => w.id !== webhookId));
    } catch (err) {
      console.error("Failed to delete webhook");
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      await fetch(`/api/organizations/${orgId}/api-keys/${keyId}`, {
        method: "DELETE",
        credentials: "include",
      });
      setApiKeys(prev => prev.map(k => k.id === keyId ? { ...k, isActive: false } : k));
    } catch (err) {
      console.error("Failed to revoke API key");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="space-y-8">
      {/* API Keys Section */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <Key className="text-indigo-600" size={20} />
            API Keys
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Key Name</Label>
              <Input 
                placeholder="e.g. Production LMS Integration" 
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={generateKey} className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px]">
                <Plus size={14} className="mr-2" /> Generate Key
              </Button>
            </div>
          </div>

          <AnimatePresence>
            {generatedKey && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl space-y-2"
              >
                <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">New Key Generated (Copy now, it won't be shown again)</div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-2 bg-white rounded border border-emerald-200 text-xs font-mono text-slate-700">{generatedKey}</code>
                  <Button size="icon" variant="ghost" onClick={() => copyToClipboard(generatedKey)} className="text-emerald-600">
                    <Copy size={16} />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => setGeneratedKey(null)} className="text-slate-400">
                    <Trash2 size={16} />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div key={key.id} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                    <Key size={16} />
                  </div>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{key.name}</div>
                    <div className="text-[10px] text-slate-400 font-medium">Created {new Date(key.createdAt).toLocaleDateString()} • Last used {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : "Never"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest",
                    key.isActive ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"
                  )}>
                    {key.isActive ? "Active" : "Inactive"}
                  </span>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => revokeApiKey(key.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Webhooks Section */}
      <Card className="border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
            <Zap className="text-indigo-600" size={20} />
            Webhooks
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8 space-y-6">
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Endpoint URL</Label>
              <Input 
                placeholder="https://your-app.com/api/webhooks" 
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addWebhook} className="rounded-xl h-10 px-6 font-black uppercase tracking-widest text-[10px]">
                <Plus size={14} className="mr-2" /> Add Webhook
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {webhooks.map((wh) => (
              <div key={wh.id} className="p-4 border border-slate-100 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                      <Zap size={16} />
                    </div>
                    <div className="text-sm font-mono font-medium text-slate-700">{wh.url}</div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => deleteWebhook(wh.id)}>
                    <Trash2 size={16} />
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  {wh.events.map((ev: string) => (
                    <span key={ev} className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold uppercase tracking-widest">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
