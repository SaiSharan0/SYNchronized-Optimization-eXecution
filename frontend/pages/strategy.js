import { useState, useEffect } from "react";
import { Plus, Trash2, Shield, CheckCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../components/Layout";
import ConfirmDialog from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { strategyAPI } from "../lib/api";
import { extractError, colors } from "../lib/utils";
import { Badge } from "../components/Badges";

const RULE_TYPES = [
  {value:"session",      label:"Session"},
  {value:"min_rr",       label:"Min RR Ratio"},
  {value:"pair",         label:"Allowed Pair"},
  {value:"max_lot_size", label:"Max Lot Size"},
  {value:"condition",    label:"Custom Condition"},
];

const RULE_INIT = { type:"session", label:"", value:"", required:true };

function StrategyForm({ onSaved, onCancel }) {
  const [name,    setName]    = useState("");
  const [desc,    setDesc]    = useState("");
  const [rules,   setRules]   = useState([]);
  const [newRule, setNewRule] = useState(RULE_INIT);
  const [saving,  setSaving]  = useState(false);

  function addRule() {
    if (!newRule.label || !newRule.value) return toast.error("Fill rule label and value");
    setRules(r => [...r, { ...newRule, id: Date.now().toString() }]);
    setNewRule(RULE_INIT);
  }

  async function save() {
    if (!name) return toast.error("Strategy name required");
    if (!rules.length) return toast.error("Add at least one rule");
    setSaving(true);
    try {
      const { data } = await strategyAPI.create({ name, description: desc, rules });
      toast.success("Strategy created");
      onSaved(data);
    } catch (err) { toast.error(extractError(err)); }
    setSaving(false);
  }

  return (
    <div className="card p-6">
      <h3 className="font-display font-bold text-lg mb-5">Create Strategy</h3>
      <div className="flex flex-col gap-4">
        <div>
          <label className="label">Strategy Name *</label>
          <input value={name} onChange={e=>setName(e.target.value)} className="input" placeholder="London Breakout Strategy"/>
        </div>
        <div>
          <label className="label">Description</label>
          <textarea value={desc} onChange={e=>setDesc(e.target.value)} className="input resize-y" rows={2} placeholder="Describe your strategy..."/>
        </div>

        {/* Existing rules */}
        {rules.length > 0 && (
          <div>
            <div className="label">Rules</div>
            <div className="flex flex-col gap-2">
              {rules.map((r, i) => (
                <div key={r.id} className="card2 px-3 py-2 flex items-center gap-3 text-sm">
                  <Badge color={r.required ? colors.green : colors.amber}>{r.type}</Badge>
                  <span className="flex-1 text-dark-200">{r.label}: <strong>{String(r.value)}</strong></span>
                  <button onClick={()=>setRules(rs=>rs.filter((_,j)=>j!==i))} className="text-red-400 hover:text-red-300">
                    <XCircle size={14}/>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New rule form */}
        <div className="card2 p-4">
          <div className="label mb-3">Add Rule</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="label text-[11px]">Type</label>
              <select value={newRule.type} onChange={e=>setNewRule(r=>({...r,type:e.target.value}))} className="input text-sm py-2">
                {RULE_TYPES.map(t=><option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label text-[11px]">Label</label>
              <input value={newRule.label} onChange={e=>setNewRule(r=>({...r,label:e.target.value}))} className="input text-sm py-2" placeholder="e.g. London only"/>
            </div>
            <div>
              <label className="label text-[11px]">Value</label>
              <input value={newRule.value} onChange={e=>setNewRule(r=>({...r,value:e.target.value}))} className="input text-sm py-2" placeholder="e.g. london"/>
            </div>
            <div className="flex items-center gap-3 pb-0.5">
              <input type="checkbox" id="req" checked={newRule.required} onChange={e=>setNewRule(r=>({...r,required:e.target.checked}))} className="w-4 h-4 accent-brand-200"/>
              <label htmlFor="req" className="text-xs text-dark-400 cursor-pointer">Required</label>
              <button onClick={addRule} className="btn-primary text-xs px-3 py-1.5 ml-auto">
                <Plus size={12}/> Add
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-danger">Cancel</button>
          <button onClick={save} disabled={saving} className="btn-success disabled:opacity-60">
            <Shield size={14}/>{saving ? "Saving..." : "Save Strategy"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StrategyCard({ strategy, onDelete }) {
  const [perf,     setPerf]     = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    strategyAPI.performance(strategy.id).then(r => setPerf(r.data)).catch(()=>{});
  }, [strategy.id]);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-display font-bold text-lg">{strategy.name}</span>
            {perf && <Badge color={perf.adherence_rate >= 70 ? colors.green : colors.amber}>{perf.adherence_rate}% adherence</Badge>}
          </div>
          {strategy.description && <p className="text-sm text-dark-400 mt-1">{strategy.description}</p>}
        </div>
        <div className="flex gap-2 items-center">
          <button onClick={() => setExpanded(e=>!e)} className="btn-primary text-xs px-2.5 py-1.5">
            {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
          </button>
          <button onClick={() => onDelete(strategy)} className="btn-danger text-xs px-2.5 py-1.5">
            <Trash2 size={12}/>
          </button>
        </div>
      </div>

      {/* Quick perf */}
      {perf && (
        <div className="flex gap-4 flex-wrap text-xs text-dark-400 mb-3">
          <span>Trades: <strong className="text-dark-100">{perf.total_trades}</strong></span>
          <span>Win Rate: <strong style={{color:perf.win_rate>=50?colors.green:colors.red}}>{perf.win_rate}%</strong></span>
          <span>Net P&L: <strong className="font-mono" style={{color:perf.net_pnl>=0?colors.green:colors.red}}>${perf.net_pnl}</strong></span>
          <span>Avg Score: <strong className="text-dark-100">{perf.avg_score}/10</strong></span>
        </div>
      )}

      {/* Rules */}
      {expanded && (
        <div className="mt-3 pt-3 border-t border-dark-600">
          <div className="label mb-2">Strategy Rules</div>
          <div className="flex flex-wrap gap-2">
            {(strategy.rules || []).map((r, i) => (
              <div key={i} className="card2 px-3 py-2 text-xs flex items-center gap-2">
                <span className="text-dark-400">{r.type}:</span>
                <span className="font-semibold text-brand-200">{String(r.value)}</span>
                {r.required && <Badge color={colors.amber} size={9}>required</Badge>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function StrategyPage() {
  const { user, loading: authLoading } = useAuth();
  const [strategies, setStrategies] = useState([]);
  const [adding,     setAdding]     = useState(false);
  const [loading,    setLoading]    = useState(true);
  const [pendingDelete, setPendingDelete] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    strategyAPI.list().then(r => { setStrategies(r.data); setLoading(false); }).catch(()=>setLoading(false));
  }, [authLoading, user]);

  async function deleteStrategy() {
    try {
      await strategyAPI.delete(pendingDelete.id);
      setStrategies(ss => ss.filter(x => x.id !== pendingDelete.id));
      setPendingDelete(null);
      toast.success("Strategy deleted");
    } catch (err) { toast.error(extractError(err)); }
  }

  return (
    <Layout title="Strategy">
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">Strategy Validator</h1>
            <p className="page-sub">Define rules to enforce trading discipline</p>
          </div>
          {!adding && (
            <button onClick={() => setAdding(true)} className="btn-success">
              <Plus size={14}/> New Strategy
            </button>
          )}
        </div>

        {adding && (
          <StrategyForm
            onSaved={s => { setStrategies(ss => [s, ...ss]); setAdding(false); }}
            onCancel={() => setAdding(false)}
          />
        )}

        {loading ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 rounded-full border-2 border-brand-200 border-t-transparent animate-spin"/></div>
        ) : strategies.length === 0 && !adding ? (
          <div className="card p-16 text-center text-dark-400">
            <Shield size={40} className="mx-auto mb-4 opacity-30"/>
            <p>No strategies yet. Create your first trading strategy!</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {strategies.map(s => (
              <StrategyCard
                key={s.id}
                strategy={s}
                onDelete={setPendingDelete}
              />
            ))}
          </div>
        )}
        <ConfirmDialog
          open={!!pendingDelete}
          title="Delete strategy?"
          message={`This will permanently delete "${pendingDelete?.name || "this strategy"}". Linked trades stay, but the strategy rules will be removed.`}
          confirmLabel="Delete strategy"
          onCancel={() => setPendingDelete(null)}
          onConfirm={deleteStrategy}
        />
      </div>
    </Layout>
  );
}
