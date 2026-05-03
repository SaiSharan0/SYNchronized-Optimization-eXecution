import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Brain, RefreshCw, ArrowLeft } from "lucide-react";
import toast from "react-hot-toast";
import Layout from "../../components/Layout";
import { LoadingState, ErrorState, EmptyState } from "../../components/PageState";
import { ResultBadge, SessionBadge, TypeBadge, ScoreRing } from "../../components/Badges";
import { aiAPI, tradesAPI } from "../../lib/api";
import { extractError, fmt, colors } from "../../lib/utils";

export default function TradeDetailPage() {
  const router = useRouter();
  const { id } = router.query;

  const [trade, setTrade] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reanalysing, setReanalysing] = useState(false);

  const loadTrade = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const { data } = await tradesAPI.get(id);
      setTrade(data);
    } catch {
      setTrade(null);
      setError("Trade not found or unavailable.");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    loadTrade();
  }, [loadTrade]);

  async function reanalyse() {
    if (!trade) return;
    setReanalysing(true);
    try {
      const { data } = await aiAPI.analyze(trade.id);
      setTrade((prev) => ({ ...prev, ai_feedback: data.feedback }));
      toast.success("AI analysis refreshed");
    } catch (err) {
      toast.error(extractError(err));
    }
    setReanalysing(false);
  }

  if (loading) {
    return (
      <Layout title="Trade Detail">
        <LoadingState label="Loading trade detail..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Trade Detail">
        <ErrorState title="Trade unavailable" message={error} onRetry={loadTrade} />
      </Layout>
    );
  }

  if (!trade) {
    return (
      <Layout title="Trade Detail">
        <EmptyState title="No trade selected" message="Pick a trade from Journal to view details." />
      </Layout>
    );
  }

  const metrics = [
    ["Entry", trade.entry_price, colors.cyan],
    ["Stop Loss", trade.stop_loss, colors.red],
    ["Take Profit", trade.take_profit, colors.green],
    ["Exit", trade.exit_price || "-", "#6b8cae"],
    [
      "RR Ratio",
      trade.risk_reward_ratio ? `${trade.risk_reward_ratio}:1` : "-",
      (trade.risk_reward_ratio || 0) >= 1.5 ? colors.green : colors.amber,
    ],
    ["P&L", trade.profit_loss == null ? "-" : `$${trade.profit_loss}`, trade.profit_loss >= 0 ? colors.green : colors.red],
  ];

  return (
    <Layout title={`Trade ${trade.id}`}>
      <div className="flex flex-col gap-5">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <div className="mb-2">
              <Link href="/journal" className="btn-primary inline-flex text-xs px-3 py-1.5">
                <ArrowLeft size={12} /> Back to Journal
              </Link>
            </div>
            <h1 className="page-title">{trade.pair}</h1>
            <p className="page-sub">Trade #{trade.id}</p>
          </div>

          <div className="flex items-center gap-3">
            <ScoreRing score={trade.trade_score || 0} size={56} />
            <button
              type="button"
              className="btn-primary disabled:opacity-60"
              onClick={reanalyse}
              disabled={reanalysing}
            >
              {reanalysing ? <RefreshCw size={14} className="animate-spin" /> : <Brain size={14} />}
              {reanalysing ? "Analysing..." : "Re-analyse"}
            </button>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TypeBadge type={trade.trade_type} />
            <ResultBadge result={trade.result} />
            <SessionBadge session={trade.session} />
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.map(([label, value, color]) => (
              <div key={label} className="card2 p-3">
                <div className="text-xs text-dark-400 mb-1">{label}</div>
                <div className="font-mono text-base font-semibold" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="card2 p-3">
              <div className="text-xs text-dark-400 mb-1">Entry Time</div>
              <div className="text-sm">{fmt.date(trade.entry_time)}</div>
            </div>
            <div className="card2 p-3">
              <div className="text-xs text-dark-400 mb-1">Exit Time</div>
              <div className="text-sm">{fmt.date(trade.exit_time)}</div>
            </div>
          </div>

          {trade.notes ? (
            <div className="card2 p-4 mt-3">
              <div className="text-xs text-dark-400 mb-1">Notes</div>
              <p className="text-sm text-dark-200 leading-relaxed">{trade.notes}</p>
            </div>
          ) : null}
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain size={15} className="text-brand-200" />
            <h2 className="font-semibold text-sm">AI Analysis</h2>
          </div>

          {!trade.ai_feedback ? (
            <EmptyState
              title="No AI analysis"
              message="Run re-analyse to generate feedback for this trade."
              actionLabel="Run Analysis"
              onAction={reanalyse}
              className="min-h-[180px] border-0 bg-transparent shadow-none"
            />
          ) : (
            <div className="card2 p-4">
              <p className="text-sm text-dark-200 leading-relaxed mb-3">{trade.ai_feedback.detailed_analysis || "No narrative generated."}</p>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
                <div>
                  <div className="mb-2 font-bold text-green-400">Strengths</div>
                  {(trade.ai_feedback.strengths || []).map((item, idx) => (
                    <p key={idx} className="mb-2 text-dark-300">- {item}</p>
                  ))}
                </div>
                <div>
                  <div className="mb-2 font-bold text-red-400">Mistakes</div>
                  {(trade.ai_feedback.mistakes || []).map((item, idx) => (
                    <p key={idx} className="mb-2 text-dark-300">- {item}</p>
                  ))}
                </div>
                <div>
                  <div className="mb-2 font-bold text-amber-400">Improvements</div>
                  {(trade.ai_feedback.suggestions || []).map((item, idx) => (
                    <p key={idx} className="mb-2 text-dark-300">- {item}</p>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
