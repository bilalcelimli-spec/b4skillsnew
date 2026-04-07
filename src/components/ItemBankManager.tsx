import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/Card";
import { Button } from "./ui/Button";
import { 
  Plus, 
  Search, 
  Filter, 
  Edit2, 
  Trash2, 
  FileText, 
  Mic, 
  CheckCircle2, 
  AlertCircle,
  MoreVertical,
  Layers,
  BrainCircuit,
  X,
  Save,
  Image as ImageIcon,
  Music,
  Video,
  Link as LinkIcon
} from "lucide-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface Asset {
  id: string;
  type: string;
  url: string;
  metadata?: any;
}

interface Item {
  id: string;
  type: string;
  skill: string;
  cefrLevel: string;
  difficulty: number;
  status: string;
  content: any;
  assets?: Asset[];
}

export const ItemBankManager: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSkill, setFilterSkill] = useState<string>("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<Item> | null>(null);
  const [newAsset, setNewAsset] = useState({ type: "IMAGE", url: "" });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/items");
      const data = await res.json();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch items");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingItem) return;
    
    const method = editingItem.id ? "PUT" : "POST";
    const url = editingItem.id ? `/api/items/${editingItem.id}` : "/api/items";
    
    // Strip assets from the data sent to the item endpoints
    // as assets are managed via their own dedicated endpoints.
    const { assets, ...itemData } = editingItem as any;
    
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemData)
      });
      
      if (res.ok) {
        setIsModalOpen(false);
        setEditingItem(null);
        fetchItems();
      }
    } catch (err) {
      console.error("Failed to save item");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;
    
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (res.ok) fetchItems();
    } catch (err) {
      console.error("Failed to delete item");
    }
  };

  const handleAddAsset = async () => {
    if (!editingItem?.id || !newAsset.url) return;

    try {
      const res = await fetch(`/api/items/${editingItem.id}/assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAsset)
      });

      if (res.ok) {
        const asset = await res.json();
        setEditingItem({
          ...editingItem,
          assets: [...(editingItem.assets || []), asset]
        });
        setNewAsset({ type: "IMAGE", url: "" });
        fetchItems();
      }
    } catch (err) {
      console.error("Failed to add asset");
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    try {
      const res = await fetch(`/api/assets/${assetId}`, { method: "DELETE" });
      if (res.ok) {
        setEditingItem({
          ...editingItem,
          assets: editingItem.assets?.filter(a => a.id !== assetId)
        });
        fetchItems();
      }
    } catch (err) {
      console.error("Failed to delete asset");
    }
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         JSON.stringify(item.content ?? "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterSkill === "ALL" || item.skill === filterSkill;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Item Bank Management</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage psychometric items, rubrics, and adaptive parameters.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => {
              setEditingItem({
                skill: "READING",
                type: "MULTIPLE_CHOICE",
                cefrLevel: "B1",
                difficulty: 0,
                status: "ACTIVE",
                content: { text: "", prompt: "", options: ["", "", "", ""], correctIndex: 0 }
              });
              setIsModalOpen(true);
            }}
            className="gap-2 bg-indigo-600 h-11 px-6 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100"
          >
            <Plus size={18} /> Create New Item
          </Button>
        </div>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by ID or content..." 
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
          {["ALL", "READING", "LISTENING", "WRITING", "SPEAKING"].map(skill => (
            <button
              key={skill}
              onClick={() => setFilterSkill(skill)}
              className={cn(
                "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                filterSkill === skill 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                  : "bg-slate-50 text-slate-400 hover:bg-slate-100"
              )}
            >
              {skill}
            </button>
          ))}
        </div>
      </div>

      {/* Item Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="h-64 bg-slate-100 animate-pulse rounded-[32px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <Card key={item.id} className="group hover:shadow-xl transition-all duration-300 border-slate-100 rounded-[32px] overflow-hidden">
              <CardHeader className="p-5 flex flex-row items-center justify-between border-b border-slate-50">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center",
                    item.skill === "READING" ? "bg-blue-50 text-blue-600" :
                    item.skill === "LISTENING" ? "bg-amber-50 text-amber-600" :
                    item.skill === "WRITING" ? "bg-emerald-50 text-emerald-600" :
                    "bg-rose-50 text-rose-600"
                  )}>
                    {item.skill === "READING" && <FileText size={20} />}
                    {item.skill === "LISTENING" && <BrainCircuit size={20} />}
                    {item.skill === "WRITING" && <Edit2 size={20} />}
                    {item.skill === "SPEAKING" && <Mic size={20} />}
                  </div>
                  <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{item.id}</span>
                </div>
                <button className="text-slate-300 hover:text-slate-600 transition-colors">
                  <MoreVertical size={18} />
                </button>
              </CardHeader>
              <CardContent className="p-6">
                <div className="mb-6">
                  <div className="text-sm font-black text-slate-900 line-clamp-2 mb-3 uppercase tracking-tight leading-tight">
                    {item.content?.prompt || item.content?.text || "Interactive Assessment Item"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {item.type.replace("_", " ")}
                    </span>
                    <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {item.cefrLevel}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Diff</div>
                      <div className="text-sm font-black text-slate-900">{(item.difficulty ?? 0).toFixed(1)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Status</div>
                      <div className={cn(
                        "text-[10px] font-black uppercase px-2.5 py-1 rounded-lg mt-1",
                        item.status === "ACTIVE" ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                      )}>
                        {item.status}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setEditingItem(item);
                        setIsModalOpen(true);
                      }}
                      className="h-10 w-10 p-0 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDelete(item.id)}
                      className="h-10 w-10 p-0 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-all"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
          >
            <div className="p-8 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">
                {editingItem?.id ? "Edit Item" : "Create New Item"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-8 max-h-[70vh] overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skill</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm"
                    value={editingItem?.skill}
                    onChange={(e) => setEditingItem({ ...editingItem, skill: e.target.value })}
                  >
                    <option value="READING">Reading</option>
                    <option value="LISTENING">Listening</option>
                    <option value="WRITING">Writing</option>
                    <option value="SPEAKING">Speaking</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm"
                    value={editingItem?.type}
                    onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value })}
                  >
                    <option value="MULTIPLE_CHOICE">Multiple Choice</option>
                    <option value="OPEN_RESPONSE">Open Response</option>
                    <option value="AUDIO_RESPONSE">Audio Response</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">CEFR Level</label>
                  <select 
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm"
                    value={editingItem?.cefrLevel}
                    onChange={(e) => setEditingItem({ ...editingItem, cefrLevel: e.target.value })}
                  >
                    {["A1", "A2", "B1", "B2", "C1", "C2"].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Difficulty (-3 to 3)</label>
                  <input 
                    type="number" 
                    step="0.1"
                    className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold text-sm"
                    value={editingItem?.difficulty}
                    onChange={(e) => setEditingItem({ ...editingItem, difficulty: parseFloat(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Content (JSON)</label>
                <textarea 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-xs h-48"
                  value={JSON.stringify(editingItem?.content, null, 2)}
                  onChange={(e) => {
                    try {
                      const content = JSON.parse(e.target.value);
                      setEditingItem({ ...editingItem, content });
                    } catch (err) {}
                  }}
                />
              </div>

              {/* Asset Management */}
              {editingItem?.id && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Media Assets</label>
                  
                  <div className="grid grid-cols-1 gap-3">
                    {editingItem.assets?.map((asset) => (
                      <div key={asset.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="text-indigo-600">
                            {asset.type === "IMAGE" && <ImageIcon size={18} />}
                            {asset.type === "AUDIO" && <Music size={18} />}
                            {asset.type === "VIDEO" && <Video size={18} />}
                          </div>
                          <div className="truncate text-xs font-bold text-slate-600 max-w-[300px]">
                            {asset.url}
                          </div>
                        </div>
                        <button 
                          onClick={() => handleDeleteAsset(asset.id)}
                          className="text-slate-300 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-2">
                      <select 
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                        value={newAsset.type}
                        onChange={(e) => setNewAsset({ ...newAsset, type: e.target.value })}
                      >
                        <option value="IMAGE">Image</option>
                        <option value="AUDIO">Audio</option>
                        <option value="VIDEO">Video</option>
                      </select>
                      <input 
                        type="text" 
                        placeholder="Asset URL (e.g. https://...)"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-xs font-medium"
                        value={newAsset.url}
                        onChange={(e) => setNewAsset({ ...newAsset, url: e.target.value })}
                      />
                    </div>
                    <Button 
                      onClick={handleAddAsset}
                      className="bg-slate-900 text-white h-10 px-4 rounded-lg text-[10px] font-black uppercase tracking-widest"
                    >
                      Add
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="font-bold uppercase tracking-widest text-xs">
                Cancel
              </Button>
              <Button onClick={handleSave} className="gap-2 bg-indigo-600 h-12 px-8 rounded-xl font-black uppercase tracking-widest text-xs shadow-lg shadow-indigo-100">
                <Save size={18} /> Save Item
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
