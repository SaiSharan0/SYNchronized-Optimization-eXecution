import { useState, useMemo, useEffect } from "react";
import { X, Brain, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { tradesAPI, strategyAPI } from "../lib/api";
import { PAIRS, SESSIONS, extractError, fmt } from "../lib/utils";
import { colors } from "../lib/utils";

function calcMetrics(d) {
  const entry = parseFloat(d.entry_price) || 0;
  const sl    = parseFloat(d.stop_loss)   || 0;
  const tp    = parseFloat(d.take_profit) || 0;
  const lot   = parseFloat(d.lot_size)    || 0;
  if (!entry || !sl || !tp || !lot) return {};

  const riskPips   = d.trade_type === "buy" ? Math.abs(entry - sl) : Math.abs(sl - entry);
  const rewardPips = d.trade_type === "buy" ? Math.abs(tp - entry) : Math.abs(entry - tp);
  const rr         = riskPips > 0 ? rewardPips / riskPips : 0;
  return {
    risk:               riskPips.toFixed(6),
    reward:             rewardPips.toFixed(6),
    risk_reward_ratio:  rr.toFixed(2),
  };
}

const INIT = {
  pair: "EUR/USD", trade_type: "buy", session: "london",
  entry_price: "", stop_loss: "", take_profit: "", exit_price: "",
  lot_size: "0.01", result: "pending", notes: "", tags: "",
  followed_strategy: false, strategy_id: "",
  entry_time: new Date().toISOString().slice(0, 16),
  exit_time: "",
};

export default function TradeModal({ trade, onClose, onSaved }) {
  const isEdit = !!trade?.id;
  const [form,    setForm]    = useState(isEdit ? {
    ...INIT, ...trade,
    entry_time: trade.entry_time?.slice(0, 16) || INIT.entry_time,
    exit_time:  trade.exit_time?.slice(0, 16) || "",
    tags: (trade.tags || []).join(", "),
    strategy_id: trade.strategy_id || "",
  } : INIT);
  const [saving,     setSaving]     = useState(false);
  const [strategies, setStrategies] = useState([]);

  useEffect(() => {
    strategyAPI.list().then(r => setStrategies(r.data)).catch(() => {});
  }, []);

  const metrics = useMemo(() => calcMetrics(form), [
    form,
  ]);

  const set = (k) => (e) =>
    setForm(f => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function handleSave() {
    if (!form.entry_price || !form.stop_loss || !form.take_profit || !form.lot_size)
      return toast.error("Fill all price fields");

    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: typeof form.tags === "string"
          ? form.tags.split(",").map(t => t.trim()).filter(Boolean)
          : form.tags,
        strategy_id:  form.strategy_id ? Number(form.strategy_id) : null,
        exit_price:   form.exit_price  ? parseFloat(form.exit_price)  : null,
        exit_time:    form.exit_time   || null,
        entry_price:  parseFloat(form.entry_price),
        stop_loss:    parseFloat(form.stop_loss),
        take_profit:  parseFloat(form.take_profit),
        lot_size:     parseFloat(form.lot_size),
      };

      const res = isEdit
        ? await tradesAPI.update(trade.id, payload)
        : await tradesAPI.create(payload);

      toast.success(isEdit ? "Trade updated" : "Trade saved + AI analysed");
      onSaved(res.data);
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setSaving(false);
    }
  }

  const rrNum = parseFloat(metrics.risk_reward_ratio) || 0;
  const rrColor = rrNum >= 2 ? colors.green : rrNum >= 1.5 ? colors.cyan : colors.red;

  const Field = ({ label, children }) => (
    <div className="flex flex-col gap-1.5">
      <label className="label">{label}</label>
      {children}
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-2xl max-h-[92vh] overflow-y-auto p-7 animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-display font-bold text-xl text-white">
              {isEdit ? "Edit Trade" : "New Trade"}
            </h2>
            <p className="text-dark-400 text-xs mt-1">
              {isEdit ? "Update trade details" : "AI analysis runs automatically on save"}
            </p>
          </div>
          <button onClick={onClose} className="text-dark-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Live RR preview */}
        {rrNum > 0 && (
          <div className="card2 p-4 mb-5 flex flex-wrap gap-5">
            {[
              ["RR Ratio",     `${rrNum.toFixed(2)}:1`, rrColor],
              ["Risk (pips)",  metrics.risk   || "—",   colors.amber],
              ["Reward (pips)",metrics.reward || "—",   colors.cyan],
            ].map(([l, v, c]) => (
              <div key={l}>
                <div className="text-xs text-dark-400 mb-1">{l}</div>
                <div className="font-mono text-lg font-bold" style={{ color: c }}>{v}</div>
              </div>
            ))}
          </div>
        )}

        {/* Form */}
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Pair">
              <select value={form.pair} onChange={set("pair")} className="input">
                {PAIRS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Direction">
              <select value={form.trade_type} onChange={set("trade_type")} className="input">
                <option value="buy">📈 Buy / Long</option>
                <option value="sell">📉 Sell / Short</option>
              </select>
            </Field>
            <Field label="Session">
              <select value={form.session} onChange={set("session")} className="input">
                {SESSIONS.map(s => (
                  <option key={s} value={s}>{s.replace("_", " ").toUpperCase()}</option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Entry Price *">
              <input type="number" step="any" value={form.entry_price} onChange={set("entry_price")} className="input" placeholder="1.08500" />
            </Field>
            <Field label="Stop Loss *">
              <input type="number" step="any" value={form.stop_loss}   onChange={set("stop_loss")}   className="input" placeholder="1.08200" />
            </Field>
            <Field label="Take Profit *">
              <input type="number" step="any" value={form.take_profit} onChange={set("take_profit")} className="input" placeholder="1.09100" />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Lot Size *">
              <input type="number" step="any" value={form.lot_size}    onChange={set("lot_size")}    className="input" placeholder="0.01" />
            </Field>
            <Field label="Exit Price">
              <input type="number" step="any" value={form.exit_price}  onChange={set("exit_price")}  className="input" placeholder="Optional" />
            </Field>
            <Field label="Result">
              <select value={form.result} onChange={set("result")} className="input">
                <option value="pending">⏳ Pending</option>
                <option value="win">✅ Win</option>
                <option value="loss">❌ Loss</option>
                <option value="breakeven">⚖️ Breakeven</option>
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Entry Time">
              <input type="datetime-local" value={form.entry_time} onChange={set("entry_time")} className="input" />
            </Field>
            <Field label="Strategy">
              <select value={form.strategy_id} onChange={set("strategy_id")} className="input">
                <option value="">No strategy linked</option>
                {strategies.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Notes">
            <textarea
              value={form.notes} onChange={set("notes")}
              rows={3} className="input resize-y"
              placeholder="Describe your setup, confluences, market structure..."
            />
          </Field>

          <div className="grid grid-cols-2 gap-3 items-end">
            <Field label="Tags (comma separated)">
              <input value={form.tags} onChange={set("tags")} className="input" placeholder="breakout, sweep, fib50" />
            </Field>
            <div className="flex items-center gap-3 pb-0.5">
              <input
                type="checkbox" id="strat_followed"
                checked={!!form.followed_strategy}
                onChange={set("followed_strategy")}
                className="w-4 h-4 accent-brand-200"
              />
              <label htmlFor="strat_followed" className="text-sm text-dark-300 cursor-pointer">
                Strategy rules followed
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="btn-danger">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="btn-success opacity-100 disabled:opacity-60">
              {saving
                ? <><RefreshCw size={14} className="animate-spin" /> Saving + Analysing...</>
                : <><Brain size={14} />{isEdit ? "Update Trade" : "Save + AI Analysis"}</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
