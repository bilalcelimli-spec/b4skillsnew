import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, GraduationCap, Briefcase, Baby, Zap, ShieldCheck, 
  Settings, PenTool, GitMerge, FileAudio, Search, Filter, 
  BarChart, MoreVertical, Plus, ListFilter, Activity, BoxSelect,
  Save, Eye, CheckCircle2, MessageSquareWarning, Users2, Languages, Combine, Network, ChevronRight, ShieldAlert
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { studioItems } from '../../data/studioItems';

// TYPES
type Tab = 'dashboard' | 'product-lines' | 'blueprints' | 'item-bank' | 'editor' | 'workflow' | 'analytics';

export const AssessmentStudio: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  return (
    <div className="h-full w-full flex flex-col bg-slate-50 relative overflow-hidden rounded-xl border border-slate-200">
      
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase flex items-center gap-2">
            <BoxSelect className="text-indigo-600" /> Assessment Studio
          </h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Enterprise Content & Psychometric Engine</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveTab('analytics')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold uppercase tracking-widest rounded-lg transition-colors flex items-center gap-2">
            <Activity size={14} /> Global Logs
          </button>
          <button onClick={() => { setSelectedItemId(null); setActiveTab('editor'); }} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-widest rounded-lg shadow-sm transition-all flex items-center gap-2">
            <Plus size={14} /> New Content
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* SUB-SIDEBAR */}
        <aside className="w-56 bg-slate-900 text-slate-400 p-4 flex flex-col gap-1 overflow-y-auto shrink-0">
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2 pl-3">Architecture</div>
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<BarChart size={16} />} label="Overview" />
          <NavButton active={activeTab === 'product-lines'} onClick={() => setActiveTab('product-lines')} icon={<Network size={16} />} label="Product Lines" />
          <NavButton active={activeTab === 'blueprints'} onClick={() => setActiveTab('blueprints')} icon={<GitMerge size={16} />} label="Blueprints" />
          
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2 pl-3 mt-6">Content Factory</div>
          <NavButton active={activeTab === 'item-bank'} onClick={() => setActiveTab('item-bank')} icon={<ListFilter size={16} />} label="Item Bank" />
          <NavButton active={activeTab === 'editor'} onClick={() => setActiveTab('editor')} icon={<PenTool size={16} />} label="Task Editor" />
          <NavButton active={activeTab === 'workflow'} onClick={() => setActiveTab('workflow')} icon={<ShieldCheck size={16} />} label="Review Workflow" />
          
          <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2 pl-3 mt-6">Quality Control</div>
          <NavButton active={activeTab === 'analytics'} onClick={() => setActiveTab('analytics')} icon={<Activity size={16} />} label="Analytics & Flagged" />
        </aside>

        {/* MAIN CONTENT AREA */}
        <main className="flex-1 bg-slate-50 overflow-y-auto relative">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && <DashboardView key="dashboard" onNavigate={setActiveTab} />}
            {activeTab === 'product-lines' && <ProductLinesView key="product-lines" onNavigate={setActiveTab} />}
            {activeTab === 'blueprints' && <BlueprintBuilderView key="blueprints" onNavigate={setActiveTab} />}
            {activeTab === 'item-bank' && <ItemBankView key="item-bank" onEdit={(id) => { setSelectedItemId(id); setActiveTab('editor'); }} />}
            {activeTab === 'editor' && <TaskEditorView key="editor" itemId={selectedItemId} onNavigate={setActiveTab} />}
            {activeTab === 'workflow' && <ReviewWorkflowView key="workflow" onEdit={(id) => { setSelectedItemId(id); setActiveTab('editor'); }} />}
            {activeTab === 'analytics' && <AnalyticsView key="analytics" onEdit={(id) => { setSelectedItemId(id); setActiveTab('editor'); }} />}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

// ─── NAV BUTTON ────────────────────────────────────────────────────────────
const NavButton: React.FC<{ active: boolean; onClick: () => void; icon: React.ReactNode; label: string }> = ({ active, onClick, icon, label }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 w-full px-3 py-2 rounded-xl text-sm font-bold transition-all text-left",
      active ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/20" : "hover:bg-slate-800 hover:text-slate-200"
    )}
  >
    {icon} 
    <span className="tracking-tight">{label}</span>
  </button>
);


// ─── DASHBOARD VIEW ─────────────────────────────────────────────────────────
const DashboardView: React.FC<{ onNavigate: (tab: Tab) => void }> = ({ onNavigate }) => {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricCard label="Items in Draft" value="1,204" icon={<PenTool className="text-amber-500" />} />
        <MetricCard label="Pending Review" value="342" icon={<ShieldCheck className="text-blue-500" />} />
        <MetricCard label="Flagged by IRT" value="18" icon={<MessageSquareWarning className="text-red-500" />} />
        <MetricCard label="Published Assets" value="45,901" icon={<CheckCircle2 className="text-emerald-500" />} />
      </div>

      <div>
        <h3 className="text-lg font-black uppercase tracking-tighter text-slate-800 mb-4 flex items-center gap-2 border-b border-slate-200 pb-2">
          <Network size={18} className="text-indigo-600"/> Product Line Health
        </h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ProductCard title="Primary Module (7-10)" count="4,500 Items" health="98%" icon={<Baby />} onNavigate={() => onNavigate('product-lines')} />
          <ProductCard title="Junior Suite (11-14)" count="8,200 Items" health="95%" icon={<GraduationCap />} onNavigate={() => onNavigate('product-lines')} />
          <ProductCard title="Quick Diagnostic" count="450 Items" health="99% (High Dist)" icon={<Zap />} onNavigate={() => onNavigate('product-lines')} />
          <ProductCard title="Academia" count="12,000 Items" health="92%" icon={<Building2 />} onNavigate={() => onNavigate('product-lines')} />
          <ProductCard title="Corporate" count="9,500 Items" health="88% (Needs BPO)" icon={<Briefcase />} onNavigate={() => onNavigate('product-lines')} />
          <ProductCard title="Language Schools" count="16,000 Items" health="96%" icon={<Languages />} onNavigate={() => onNavigate('product-lines')} />
        </div>
      </div>
    </motion.div>
  );
};

const MetricCard = ({ label, value, icon }: any) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <div className="p-2 bg-slate-50 rounded-xl">{icon}</div>
    </div>
    <div className="text-3xl font-black text-slate-900 tracking-tighter">{value}</div>
    <div className="text-xs font-bold uppercase tracking-widest text-slate-500 mt-1">{label}</div>
  </div>
);

const ProductCard = ({ title, count, health, icon, onNavigate }: any) => (
  <div onClick={onNavigate} className="group bg-white border border-slate-200 rounded-2xl p-5 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer">
    <div className="flex items-center gap-3 mb-4">
      <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl group-hover:bg-indigo-600 group-hover:text-white transition-colors">{icon}</div>
      <h4 className="font-bold text-slate-800 leading-tight">{title}</h4>
    </div>
    <div className="flex justify-between text-sm font-medium border-t border-slate-100 pt-3">
      <span className="text-slate-500">{count}</span>
      <span className="text-emerald-600 font-bold">{health}</span>
    </div>
  </div>
);


// ─── PRODUCT LINES VIEW ──────────────────────────────────────────────────────
const ProductLinesView: React.FC<{ onNavigate: (tab: Tab) => void }> = ({ onNavigate }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Product Lines</h2>
        <p className="text-sm font-medium text-slate-500 mt-1">Configure global constraints and psychometric logic for each assessment division.</p>
      </div>

      <div className="space-y-6">
        <LineConfigCard 
          title="Primary Module (7-10)" icon={<Baby/>} color="bg-pink-50 text-pink-600"
          desc="Low-stakes, visual-heavy, max reading 30 words. Strict Age & Safeguarding gates enforced."
          tags={["Adaptive Constrained", "No Complex Text", "Audio-First"]}
          onNavigate={onNavigate}
        />
        <LineConfigCard 
          title="Corporate Solutions" icon={<Briefcase/>} color="bg-emerald-50 text-emerald-600"
          desc="High-volume screening. Role-based blueprinting (Sales, Tech, BPO). Generates Can-Do HR statements."
          tags={["ATS Integrated", "Strict Proctored", "Business Domain"]}
          onNavigate={onNavigate}
        />
        <LineConfigCard 
          title="15-Minute Diagnostic" icon={<Zap/>} color="bg-amber-50 text-amber-600"
          desc="Lead-gen universal tool. Pure CAT starting at B1. High IRT discrimination items only."
          tags={["High 'a' Parameter", "Fast Convergence", "Max 20 Items"]}
          onNavigate={onNavigate}
        />
      </div>
    </motion.div>
  );
};

const LineConfigCard = ({ title, icon, desc, color, tags, onNavigate }: any) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row gap-6 items-start">
    <div className={`p-4 rounded-2xl ${color} shrink-0`}>{icon}</div>
    <div className="flex-1">
      <h3 className="text-xl font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 font-medium mb-4">{desc}</p>
      <div className="flex gap-2 flex-wrap">
        {tags.map((t: string) => (
          <span key={t} className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold uppercase tracking-wider rounded-lg">{t}</span>
        ))}
      </div>
    </div>
    <div className="shrink-0 flex flex-col gap-2">
      <button onClick={() => onNavigate('blueprints')} className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-700">Edit Settings</button>
      <button onClick={() => onNavigate('blueprints')} className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest">View Blueprints</button>
    </div>
  </div>
);


// ─── BLUEPRINT BUILDER VIEW ──────────────────────────────────────────────────
const BlueprintBuilderView: React.FC<{ onNavigate: (tab: Tab) => void }> = ({ onNavigate }) => {
  const [saved, setSaved] = useState(false);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col">
      <div className="p-6 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Blueprint Builder</h2>
          <div className="text-sm font-medium text-slate-500 flex items-center gap-2">
            <span>Corporate Product Line</span> <ChevronRight size={14}/> <span className="font-bold text-indigo-600">BPO Screening (V2.4)</span>
          </div>
        </div>
        <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000); }} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-lg flex items-center gap-2"><Save size={14}/> {saved ? '✓ Saved!' : 'Save Blueprint Version'}</button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/4 bg-slate-50 border-r border-slate-200 p-6 overflow-y-auto">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Global Rules</h4>
          <div className="space-y-4">
            <div className="bg-white p-4 border border-slate-200 rounded-xl">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Test Type</label>
              <select className="w-full text-sm font-bold text-slate-700 border-none bg-slate-50 rounded p-2 outline-none">
                <option>Multi-Stage Adaptive (MST)</option>
                <option>Computerized Adaptive (CAT)</option>
                <option>Fixed Form / Linear</option>
              </select>
            </div>
            <div className="bg-white p-4 border border-slate-200 rounded-xl">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Target CEFR Range</label>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-slate-100 rounded text-xs font-bold">A2</span>
                <span className="text-slate-400 text-xs">to</span>
                <span className="px-3 py-1 bg-slate-100 rounded text-xs font-bold">B2+</span>
              </div>
            </div>
            <div className="bg-white p-4 border border-slate-200 rounded-xl">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1 block">Exposure Control</label>
              <input type="range" className="w-full mt-2" />
              <div className="text-right text-xs font-bold text-indigo-600 mt-1">Max 15%</div>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-[#f8fafc] p-8 overflow-y-auto relative border-[16px] border-transparent" style={{ backgroundImage: 'radial-gradient(#e2e8f0 1px, transparent 0)', backgroundSize: '24px 24px' }}>
            {/* Visual Node Graph Mockup */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-8">
              <BlueprintNode title="Routing Stage (Vocab)" items="Top 'a' items (10)" diff="Mixed" />
              <ChevronRight className="text-slate-300" size={32} />
              <div className="flex flex-col gap-4">
                <BlueprintNode title="Reading (High)" items="B1 - B2+ (15)" diff="Difficulty: High" borderColor="border-emerald-400" />
                <BlueprintNode title="Reading (Low)" items="A1 - A2+ (15)" diff="Difficulty: Low" borderColor="border-amber-400" />
              </div>
            </div>
        </div>
      </div>
    </motion.div>
  );
};

const BlueprintNode = ({ title, items, diff, borderColor = "border-slate-300" }: any) => (
  <div className={`w-48 bg-white border-2 ${borderColor} rounded-2xl shadow-lg p-4`}>
    <div className="text-xs font-black text-slate-800 uppercase tracking-tighter mb-2 border-b border-slate-100 pb-2">{title}</div>
    <div className="text-sm font-medium text-slate-600 mb-1">{items}</div>
    <div className="text-xs text-slate-400 font-bold">{diff}</div>
  </div>
);


// ─── ITEM BANK VIEW ──────────────────────────────────────────────────────────
const ItemBankView: React.FC<{ onEdit: (id: string) => void }> = ({ onEdit }) => {
  const items = studioItems.map(item => ({
    id: item.id,
    cefr: item.cefrLevel,
    skill: item.skill,
    type: item.subSkill,
    status: item.status,
    pval: item.metrics?.facility?.toFixed(2) || '-',
    rbis: item.metrics?.ptBiserial?.toFixed(2) || '-',
    productLine: item.productLine
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Unified Item Bank</h2>
          <p className="text-sm font-medium text-slate-500 mt-1">Search, filter, and manage all multi-modal assessment assets.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input type="text" placeholder="Search ID or content..." className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm font-medium w-64 focus:border-indigo-500 outline-none" />
          </div>
          <button className="px-4 py-2 border border-slate-200 bg-white rounded-xl text-slate-700 flex items-center gap-2 text-sm font-bold"><Filter size={16}/> Filter</button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
              <th className="p-4">Item ID</th>
              <th className="p-4">CEFR</th>
              <th className="p-4">Skill & Type</th>
              <th className="p-4">Status</th>
              <th className="p-4">Facility (p)</th>
              <th className="p-4">Pt-Biserial</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="p-4 font-bold text-slate-900 text-sm">
                  {it.id}
                  <div className="text-[10px] uppercase text-slate-400 mt-1">{it.productLine}</div>
                </td>
                <td className="p-4"><span className="px-2 py-1 bg-indigo-50 text-indigo-700 font-black text-xs rounded uppercase">{it.cefr}</span></td>
                <td className="p-4 text-sm font-medium text-slate-700">
                  {it.skill} <span className="text-slate-400 text-xs ml-1">• {it.type}</span>
                </td>
                <td className="p-4">
                  <span className={cn(
                    "px-2 py-1 text-[10px] font-black uppercase tracking-widest rounded-md",
                    it.status === 'Published' ? "bg-emerald-100 text-emerald-700" :
                    it.status === 'Linguistic Review' || it.status === 'Age & Bias Review' ? "bg-blue-100 text-blue-700" :
                    it.status === 'Flagged' ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"
                  )}>{it.status}</span>
                </td>
                <td className="p-4 text-sm font-bold text-slate-600">{it.pval}</td>
                <td className="p-4 text-sm font-bold text-slate-600">{it.rbis}</td>
                <td className="p-4 text-right">
                  <button onClick={() => onEdit(it.id)} className="p-2 border border-slate-200 rounded-lg hover:bg-white hover:text-indigo-600 transition-colors text-slate-400">
                    <PenTool size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};


// ─── TASK EDITOR VIEW (Split Pane) ──────────────────────────────────────────
const TaskEditorView: React.FC<{ itemId: string | null; onNavigate: (tab: Tab) => void }> = ({ itemId, onNavigate }) => {
  const [saveStatus, setSaveStatus] = useState<'idle'|'saving'|'saved'|'submitted'>('idle');
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={() => onNavigate('item-bank')} className="text-slate-400 hover:text-slate-900"><ChevronRight className="rotate-180" size={20}/></button>
          <div>
            <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Editing: {itemId || 'New Item'}</h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Academia Module</p>
          </div>
        </div>
        <div className="flex gap-2">
          <span className="px-3 py-1.5 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-widest rounded flex items-center gap-1"><GitMerge size={12}/> V2 Draft</span>
          <button onClick={() => { setSaveStatus('saving'); setTimeout(() => setSaveStatus('saved'), 800); }} className="px-4 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg uppercase tracking-widest">
            {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? '✓ Saved' : 'Save Draft'}
          </button>
          <button onClick={() => setSaveStatus('submitted')} className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg uppercase tracking-widest">
            {saveStatus === 'submitted' ? '✓ In Review' : 'Submit for Review'}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane: Authoring */}
        <div className="flex-1 p-8 overflow-y-auto border-r border-slate-200 bg-white">
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Content Authoring (Rich Text)</h4>
          <div className="border border-slate-200 rounded-xl p-4 min-h-[200px] font-serif text-slate-800 text-lg leading-relaxed focus:outline-none" contentEditable>
            <p>According to recent macroeconomic studies, the correlation between global supply chain disruptions and localized inflation metrics is primarily driven by...</p>
          </div>
          
          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mt-8 mb-4">Prompt & Question</h4>
          <input type="text" value="What is the authors primary argument regarding supply chains?" className="w-full p-4 border border-slate-200 rounded-xl text-base font-medium outline-none focus:border-indigo-500" readOnly />

          <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mt-8 mb-4">Distractors (with Rationales)</h4>
          <div className="space-y-4">
            <DistractorInput text="They cause immediate deflation." isCorrect={false} rationale="Contradicts paragraph 2, sentence 1." />
            <DistractorInput text="They drive localized inflation." isCorrect={true} rationale="Directly stated in paragraph 1." />
            <DistractorInput text="They have no macroeconomic impact." isCorrect={false} rationale="Too strong an absolute, opposed by the main premise." />
          </div>
        </div>

        {/* Right Pane: Properties & IRT */}
        <div className="w-80 bg-slate-50 p-6 overflow-y-auto shrink-0 space-y-6">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-1">Taxonomy</h4>
            <div className="space-y-3 mt-3">
              <div>
                <label className="text-xs font-bold text-slate-600">CEFR Target</label>
                <select className="w-full mt-1 p-2 bg-white border border-slate-200 rounded text-sm"><option>C1</option></select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Skill</label>
                <select className="w-full mt-1 p-2 bg-white border border-slate-200 rounded text-sm"><option>Reading</option></select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600">Domain Tag</label>
                <select className="w-full mt-1 p-2 bg-white border border-slate-200 rounded text-sm"><option>Economics (EAP)</option></select>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 border-b border-slate-200 pb-1">Pre-Calibrated IRT (Engine Logic)</h4>
            <div className="space-y-3 mt-3">
              <div><label className="text-xs font-bold text-slate-600">Difficulty (b) Logit</label><input type="text" value="+1.85" readOnly className="w-full mt-1 p-2 bg-slate-100 border border-slate-200 rounded text-sm text-slate-500" /></div>
              <div><label className="text-xs font-bold text-slate-600">Discrimination (a)</label><input type="text" value="1.92" readOnly className="w-full mt-1 p-2 bg-slate-100 border border-slate-200 rounded text-sm text-slate-500" /></div>
              <div><label className="text-xs font-bold text-slate-600">Guessing (c)</label><input type="text" value="0.25" readOnly className="w-full mt-1 p-2 bg-slate-100 border border-slate-200 rounded text-sm text-slate-500" /></div>
            </div>
            <p className="text-[10px] text-slate-400 mt-2 italic">Values locked post-pilot phase.</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const DistractorInput = ({ text, isCorrect, rationale }: any) => (
  <div className={`p-4 border-2 rounded-xl flex flex-col gap-2 bg-white ${isCorrect ? 'border-emerald-400' : 'border-slate-200'}`}>
    <div className="flex gap-2 items-center">
      <div className={`w-4 h-4 rounded-full border-2 ${isCorrect ? 'bg-emerald-500 border-emerald-600' : 'border-slate-300'}`} />
      <input type="text" value={text} readOnly className="flex-1 outline-none text-base text-slate-800 font-medium" />
    </div>
    <div className="ml-6 pl-3 border-l-2 border-slate-100">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Defense Rationale</label>
      <p className="text-xs text-slate-600 font-medium">{rationale}</p>
    </div>
  </div>
);


// ─── REVIEW WORKFLOW (KANBAN) ────────────────────────────────────────────────
const ReviewWorkflowView: React.FC<{ onEdit: (id: string) => void }> = ({ onEdit }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full flex flex-col p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Psychometric Gate Pipeline</h2>
        <p className="text-sm font-medium text-slate-500 mt-1">Move items through the 4-stage strict validation protocol before pilot/publishing.</p>
      </div>
      
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4">
        <KanbanCol title="Linguistic Review" count={24} color="border-t-blue-500" items={['ITM-312', 'ITM-901', 'ITM-882']} onEdit={onEdit} />
        <KanbanCol title="Sense & Bias / Age" count={12} color="border-t-amber-500" items={['ITM-404']} onEdit={onEdit} />
        <KanbanCol title="Psychometric Ready" count={8} color="border-t-purple-500" items={['ITM-221', 'ITM-819']} onEdit={onEdit} />
        <KanbanCol title="Published / Live" count={45901} color="border-t-emerald-500" items={['ITM-001', 'ITM-002', '...']} isMuted />
      </div>
    </motion.div>
  );
};

const KanbanCol = ({ title, count, color, items, isMuted, onEdit }: any) => (
  <div className={`w-80 shrink-0 bg-slate-100 rounded-2xl flex flex-col border-t-[6px] ${color} overflow-hidden shadow-sm`}>
    <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
      <h4 className="font-black text-slate-800 text-sm tracking-tight">{title}</h4>
      <span className="px-2 py-0.5 bg-slate-200 rounded-full text-[10px] font-bold text-slate-600">{count}</span>
    </div>
    <div className="p-3 flex-1 overflow-y-auto space-y-3">
      {items.map((i: string) => (
        <div
          key={i}
          onClick={() => !isMuted && onEdit && onEdit(i)}
          className={`p-4 rounded-xl shadow-sm border border-slate-200 bg-white transition-colors ${isMuted ? 'opacity-50' : 'cursor-pointer hover:border-indigo-300 hover:bg-indigo-50'}`}
        >
          <div className="text-xs font-black text-slate-900">{i}</div>
          <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400 mt-1">B1 • Reading</div>
        </div>
      ))}
    </div>
  </div>
);


// ─── ANALYTICS VIEW ─────────────────────────────────────────────────────────
const AnalyticsView: React.FC<{ onEdit: (id: string) => void }> = ({ onEdit }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 max-w-5xl mx-auto flex flex-col items-center text-center mt-20">
      <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
        <MessageSquareWarning size={40} />
      </div>
      <h2 className="text-3xl font-black text-slate-900 tracking-tighter mb-4">Item Analytics Engine</h2>
      <p className="text-slate-500 max-w-lg mb-8">
        Nightly cron jobs recalculate Pt-Biserial values and Facility (P-values). Items flagged below correlation threshold 0.15 will surface here for emergency editorial review to prevent engine contamination.
      </p>
      
      <div className="w-full bg-white border border-red-200 rounded-2xl p-6 shadow-sm text-left">
        <h3 className="text-red-700 font-bold mb-4 flex items-center gap-2"><ShieldAlert size={16}/> Filtered Urgent Flagged Assets (2)</h3>
        <div className="space-y-4">
          <div className="p-4 border border-slate-200 rounded-xl flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-900">ITM-8442 (Corporate B2 Listen)</div>
              <div className="text-xs text-red-600 font-bold mt-1">Issue: Biserial = 0.04 (Underperforming). Distractor D selected more than Key.</div>
            </div>
            <button onClick={() => onEdit('ITM-8442')} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest">Revise</button>
          </div>
          <div className="p-4 border border-slate-200 rounded-xl flex justify-between items-center">
            <div>
              <div className="font-bold text-slate-900">ITM-7110 (Primary A1 Read)</div>
              <div className="text-xs text-amber-600 font-bold mt-1">Issue: Facility (p) = 0.10. Too difficult for intended A1 pool.</div>
            </div>
            <button onClick={() => onEdit('ITM-7110')} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase tracking-widest">Revise</button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
