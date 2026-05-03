import { useState } from "react";
import Image from "next/image";
import { X, Brain, RefreshCw, Trash2, Edit3, Download } from "lucide-react";
import toast from "react-hot-toast";
import { tradesAPI, aiAPI } from "../lib/api";
import { fmt, extractError, scoreColor, colors } from "../lib/utils";
import { ResultBadge, SessionBadge, TypeBadge, ScoreRing, Badge } from "./Badges";

export default function TradeDetailModal({ trade, onClose, onDelete, onEdit }) {
  const [t,          setT]          = useState(trade);
  const [reanalysing, setReanalysing] = useState(false);

  const fb = t.ai_feedback;
  const sc = t.trade_score || 0;

  async function reanalyse() {
    setReanalysing(true);
    try {
      const { data } = await aiAPI.analyze(t.id);
      setT(prev => ({ ...prev, ai_feedback: data.feedback }));
      toast.success("AI analysis refreshed");
    } catch (err) {
      toast.error(extractError(err));
    } finally {
      setReanalysing(false);
    }
  }

  const Grid4 = ({ items }) => (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map(([label, value, color]) => (
        <div key={label} className="card2 p-3">
          <div className="text-xs text-dark-400 mb-1.5">{label}</div>
          <div className="font-mono text-base font-bold" style={{ color: color || "#e8edf5" }}>
            {value ?? "—"}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="card w-full max-w-3xl max-h-[92vh] overflow-y-auto p-7 animate-slide-up">

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <span className="font-display font-extrabold text-2xl text-white">{t.pair}</span>
              <TypeBadge type={t.trade_type} />
              <ResultBadge result={t.result} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <SessionBadge session={t.session} />
              {t.followed_strategy && <Badge color={colors.green}>✓ Strategy</Badge>}
              {(t.tags || []).map(tag => (
                <Badge key={tag} color="#6b8cae">{tag}</Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ScoreRing score={sc} size={56} />
            <button onClick={onClose} className="text-dark-400 hover:text-white ml-2">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Price grid */}
        <Grid4 items={[
          ["Entry",    t.entry_price,   colors.cyan],
          ["Stop Loss",t.stop_loss,     colors.red],
          ["Take Profit",t.take_profit, colors.green],
          ["Exit",     t.exit_price || "—", "#6b8cae"],
          ["RR Ratio", t.risk_reward_ratio ? `${t.risk_reward_ratio}:1` : "—",
            (t.risk_reward_ratio || 0) >= 1.5 ? colors.green : colors.amber],
          ["Lot Size", t.lot_size,      colors.cyan],
          ["P&L",      t.profit_loss != null ? `$${t.profit_loss}` : "—",
            t.profit_loss >= 0 ? colors.green : colors.red],
          ["Score",    `${sc}/10`,      scoreColor(sc)],
        ]} />

        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-3 mt-3">
          {[["Entry Time", fmt.date(t.entry_time)], ["Exit Time", fmt.date(t.exit_time)]].map(([l,v])=>(
            <div key={l} className="card2 p-3">
              <div className="text-xs text-dark-400 mb-1">{l}</div>
              <div className="text-sm text-dark-100">{v}</div>
            </div>
          ))}
        </div>

        {/* Notes */}
        {t.notes && (
          <div className="card2 p-4 mt-4">
            <div className="text-xs text-dark-400 uppercase tracking-wider mb-2">Trade Notes</div>
            <p className="text-sm text-dark-100 leading-relaxed">{t.notes}</p>
          </div>
        )}

        {/* Screenshot */}
        {t.screenshot_url && (
          <div className="mt-4">
            <div className="text-xs text-dark-400 uppercase tracking-wider mb-2">Screenshot</div>
            <Image
              src={`${process.env.NEXT_PUBLIC_API_URL}${t.screenshot_url}`}
              alt="Trade screenshot"
              width={900}
              height={500}
              unoptimized
              className="rounded-lg border border-dark-600 max-h-60 object-contain"
            />
          </div>
        )}

        {/* AI Feedback */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain size={15} className="text-brand-200" />
              <span className="font-display font-bold text-brand-200 text-base">AI Analysis</span>
              {fb?.score && (
                <span
                  className="font-mono text-xs px-2 py-0.5 rounded"
                  style={{ background: `${scoreColor(fb.score)}18`, color: scoreColor(fb.score) }}
                >
                  {fb.score}/10
                </span>
              )}
            </div>
            <button
              onClick={reanalyse}
              disabled={reanalysing}
              className="btn-primary text-xs px-3 py-1.5 disabled:opacity-60"
            >
              {reanalysing
                ? <><RefreshCw size={11} className="animate-spin" />Analysing...</>
                : <><RefreshCw size={11} />Re-analyse</>
              }
            </button>
          </div>

          {fb ? (
            <div className="card2 p-5">
              {fb.detailed_analysis && (
                <p className="text-sm text-dark-200 leading-relaxed mb-4">{fb.detailed_analysis}</p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "✓ STRENGTHS",    items: fb.strengths   || [], color: colors.green },
                  { label: "✗ MISTAKES",     items: fb.mistakes    || [], color: colors.red   },
                  { label: "→ SUGGESTIONS",  items: fb.suggestions || [], color: colors.amber },
                ].map(({ label, items, color }) => (
                  <div key={label}>
                    <div className="text-xs font-bold mb-2" style={{ color }}>{label}</div>
                    {items.map((s, i) => (
                      <div key={i} className="flex gap-2 text-xs text-dark-300 mb-2">
                        <span style={{ color }} className="flex-shrink-0 mt-0.5">•</span>
                        <span className="leading-relaxed">{s}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {fb.risk_assessment && (
                <div
                  className="mt-4 p-3 rounded-lg text-xs text-dark-300 leading-relaxed border-l-4"
                  style={{ background: `${colors.amber}0a`, borderColor: colors.amber }}
                >
                  <strong style={{ color: colors.amber }}>Risk: </strong>
                  {fb.risk_assessment}
                </div>
              )}

              {fb.psychology_note && (
                <div
                  className="mt-3 p-3 rounded-lg text-xs text-dark-300 leading-relaxed border-l-4"
                  style={{ background: `${colors.purple}0a`, borderColor: colors.purple }}
                >
                  <strong style={{ color: colors.purple }}>Psychology: </strong>
                  {fb.psychology_note}
                </div>
              )}
            </div>
          ) : (
            <div className="card2 p-6 text-center text-dark-400 text-sm">
              No AI feedback yet. Click <strong>Re-analyse</strong> to generate.
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-6 pt-4 border-t border-dark-600">
          <button onClick={() => onDelete(t.id)} className="btn-danger">
            <Trash2 size={13} /> Delete
          </button>
          <button onClick={() => onEdit(t)} className="btn-primary">
            <Edit3 size={13} /> Edit Trade
          </button>
        </div>
      </div>
    </div>
  );
}
