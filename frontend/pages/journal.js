import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Download } from "lucide-react";
import { Edit3, Trash2, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import TradeModal from "../components/TradeModal";
import TradeDetailModal from "../components/TradeDetailModal";
import ConfirmDialog from "../components/ConfirmDialog";
import { LoadingState, ErrorState, EmptyState } from "../components/PageState";
import { ResultBadge, SessionBadge, TypeBadge, ScoreRing } from "../components/Badges";
import { useAuth } from "../context/AuthContext";
import { tradesAPI } from "../lib/api";
import { fmt, colors, extractError, downloadBlob } from "../lib/utils";
import { CheckCircle, XCircle } from "lucide-react";

export default function JournalPage() {
  const { user, loading: authLoading } = useAuth();
  const [trades,   setTrades]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(null);   // null | "add" | trade
  const [detail,   setDetail]   = useState(null);
  const [editTrade,setEditTrade]= useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [filters,  setFilters]  = useState({ pair:"", session:"", result:"", trade_type:"" });
  const [search,   setSearch]   = useState("");
  const [page,     setPage]     = useState(0);
  const [error,    setError]    = useState("");
  const router = useRouter();
  const LIMIT = 50;

  const fetchTrades = useCallback(async () => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const params = { skip: page * LIMIT, limit: LIMIT };
      if (filters.pair)       params.pair       = filters.pair;
      if (filters.session)    params.session     = filters.session;
      if (filters.result)     params.result      = filters.result;
      if (filters.trade_type) params.trade_type  = filters.trade_type;
      const { data } = await tradesAPI.list(params);
      setTrades(data);
    } catch {
      setError("Failed to load trades.");
    }
    setLoading(false);
  }, [page, filters, authLoading, user]);

  useEffect(() => { fetchTrades(); }, [fetchTrades]);

  async function handleDelete(id) {
    try {
      await tradesAPI.delete(id);
      setTrades(ts => ts.filter(t => t.id !== id));
      setDetail(null);
      setPendingDelete(null);
      toast.success("Trade deleted");
    } catch (err) { toast.error(extractError(err)); }
  }

  async function exportCsv() {
    try {
      const { data } = await tradesAPI.exportCsv();
      downloadBlob(data, "trades_export.csv");
      toast.success("CSV exported");
    } catch { toast.error("Export failed"); }
  }

  function handleSaved(trade) {
    setTrades(ts => {
      const idx = ts.findIndex(t => t.id === trade.id);
      return idx >= 0 ? ts.map(t => t.id === trade.id ? trade : t) : [trade, ...ts];
    });
    setModal(null);
    setEditTrade(null);
  }

  const displayed = trades.filter(t =>
    !search ||
    t.pair.toLowerCase().includes(search.toLowerCase()) ||
    (t.notes || "").toLowerCase().includes(search.toLowerCase())
  );

  const FilterSelect = ({ k, label, opts }) => (
    <select
      value={filters[k]}
      onChange={e => setFilters(f => ({ ...f, [k]: e.target.value }))}
      className="input text-sm py-2 w-auto min-w-[110px] appearance-none cursor-pointer"
    >
      <option value="">{label}</option>
      {opts.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
    </select>
  );

  return (
    <Layout title="Journal">
      {/* Modals */}
      {(modal === "add" || editTrade) && (
        <TradeModal
          trade={editTrade || undefined}
          onClose={() => { setModal(null); setEditTrade(null); }}
          onSaved={handleSaved}
        />
      )}
      {detail && (
        <TradeDetailModal
          trade={detail}
          onClose={() => setDetail(null)}
          onDelete={id => setPendingDelete({ id, type: "trade", label: detail?.pair })}
          onEdit={t => { setDetail(null); setEditTrade(t); }}
        />
      )}
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete trade?"
        message={`This will permanently delete ${pendingDelete?.label || "this trade"} and its AI notes. This cannot be undone.`}
        confirmLabel="Delete trade"
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => handleDelete(pendingDelete.id)}
      />

      <div className="flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">Trade Journal</h1>
            <p className="page-sub">{trades.length} trades loaded</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={exportCsv} className="btn-primary text-xs px-3 py-2">
              <Download size={13}/> Export CSV
            </button>
            <button onClick={() => setModal("add")} className="btn-success">
              <Plus size={14}/> New Trade
            </button>
          </div>
        </div>

        {/* Filters bar */}
        <div className="card p-4 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-400"/>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              className="input pl-8 text-sm py-2" placeholder="Search pair, notes..."
            />
          </div>
          <FilterSelect k="pair" label="All Pairs" opts={["EUR/USD","GBP/USD","USD/JPY","XAU/USD","BTC/USD"].map(p=>({value:p,label:p}))}/>
          <FilterSelect k="session" label="All Sessions" opts={[{value:"asian",label:"Asian"},{value:"london",label:"London"},{value:"new_york",label:"New York"},{value:"overlap",label:"Overlap"}]}/>
          <FilterSelect k="result" label="All Results" opts={[{value:"win",label:"Win"},{value:"loss",label:"Loss"},{value:"breakeven",label:"Breakeven"},{value:"pending",label:"Pending"}]}/>
          <FilterSelect k="trade_type" label="Buy/Sell" opts={[{value:"buy",label:"Buy"},{value:"sell",label:"Sell"}]}/>
          {Object.values(filters).some(Boolean) && (
            <button onClick={()=>setFilters({pair:"",session:"",result:"",trade_type:""})} className="text-xs text-dark-400 hover:text-brand-200 transition-colors">
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="card overflow-auto">
          {loading ? (
            <LoadingState label="Loading journal..." className="min-h-[400px] border-0 bg-transparent shadow-none" />
          ) : error ? (
            <ErrorState
              title="Journal unavailable"
              message={error}
              onRetry={fetchTrades}
              className="min-h-[400px] border-0 bg-transparent shadow-none"
            />
          ) : displayed.length === 0 ? (
            <EmptyState
              title={trades.length === 0 ? "No trades yet" : "No matches"}
              message={trades.length === 0 ? "Start your journal with your first setup." : "Try adjusting your search or filters."}
              actionLabel={trades.length === 0 ? "New Trade" : undefined}
              onAction={trades.length === 0 ? () => setModal("add") : undefined}
              className="min-h-[400px] border-0 bg-transparent shadow-none"
            />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-600">
                  {["Pair","Type","Session","Entry","SL","TP","RR","P&L","Result","Strat","Score","Actions"].map(h=>(
                    <th key={h} className="table-th">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map((t, i) => (
                  <tr
                    key={t.id}
                    className={`cursor-pointer hover:bg-dark-700/40 transition-colors ${i%2?"bg-dark-900/30":""}`}
                    onClick={() => setDetail(t)}
                  >
                    <td className="table-td font-bold">{t.pair}</td>
                    <td className="table-td"><TypeBadge type={t.trade_type}/></td>
                    <td className="table-td"><SessionBadge session={t.session}/></td>
                    <td className="table-td font-mono text-xs">{t.entry_price}</td>
                    <td className="table-td font-mono text-xs text-red-400">{t.stop_loss}</td>
                    <td className="table-td font-mono text-xs text-green-400">{t.take_profit}</td>
                    <td className="table-td font-mono text-xs" style={{color:(t.risk_reward_ratio||0)>=1.5?colors.green:colors.amber}}>
                      {t.risk_reward_ratio ? `${t.risk_reward_ratio}:1` : "—"}
                    </td>
                    <td className="table-td font-mono text-xs" style={{color:t.profit_loss>=0?colors.green:t.profit_loss<0?colors.red:"#6b8cae"}}>
                      {t.profit_loss != null ? `$${t.profit_loss}` : "—"}
                    </td>
                    <td className="table-td"><ResultBadge result={t.result}/></td>
                    <td className="table-td">
                      {t.followed_strategy
                        ? <CheckCircle size={14} className="text-green-400"/>
                        : <XCircle size={14} className="text-dark-500"/>}
                    </td>
                    <td className="table-td"><ScoreRing score={t.trade_score||0} size={38}/></td>
                    <td className="table-td" onClick={e=>e.stopPropagation()}>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setDetail(t)}
                          className="p-1.5 rounded-md bg-brand-200/10 border border-brand-200/30 text-brand-200 hover:bg-brand-200/20"
                        ><Eye size={11}/></button>
                        <button
                          onClick={() => router.push(`/trades/${t.id}`)}
                          className="p-1.5 rounded-md bg-brand-200/10 border border-brand-200/30 text-brand-200 hover:bg-brand-200/20"
                          title="Open Trade Page"
                        >
                          <span className="text-[10px] font-bold">ID</span>
                        </button>
                        <button
                          onClick={() => setEditTrade(t)}
                          className="p-1.5 rounded-md bg-brand-200/10 border border-brand-200/30 text-brand-200 hover:bg-brand-200/20"
                        ><Edit3 size={11}/></button>
                        <button
                          onClick={() => setPendingDelete({ id: t.id, type: "trade", label: t.pair })}
                          className="p-1.5 rounded-md bg-red-400/10 border border-red-400/30 text-red-400 hover:bg-red-400/20"
                        ><Trash2 size={11}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </Layout>
  );
}
