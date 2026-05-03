import { useState, useEffect } from "react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { AlertTriangle, AlertCircle, TrendingUp, Award, Target, Activity } from "lucide-react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import { LoadingState, ErrorState, EmptyState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import { analyticsAPI } from "../lib/api";
import { fmt, colors } from "../lib/utils";

const CT = ({ active, payload, label }) =>
  active && payload?.length
    ? <div className="card2 px-3 py-2 text-xs border-dark-500">
        <div className="text-dark-400 mb-1">{label}</div>
        {payload.map(p => <div key={p.name} style={{color:p.color || "#e8edf5"}}>{p.name}: {typeof p.value==="number"&&(p.name.includes("P&L")||p.name.includes("Equity"))? `$${p.value}`:p.value}</div>)}
      </div>
    : null;

const PERIODS = ["7d","30d","90d","1y","all"];

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [curve,     setCurve]     = useState([]);
  const [pairs,     setPairs]     = useState({});
  const [sessions,  setSessions]  = useState({});
  const [behavior,  setBehavior]  = useState(null);
  const [period,    setPeriod]    = useState("all");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [a, c, p, s, b] = await Promise.all([
        analyticsAPI.full(),
        analyticsAPI.equityCurve(),
        analyticsAPI.byPair(),
        analyticsAPI.bySession(),
        analyticsAPI.behavior(),
      ]);
      setAnalytics(a.data);
      setCurve(c.data.data || []);
      setPairs(p.data || {});
      setSessions(s.data || {});
      setBehavior(b.data || {});
    } catch {
      setError("Failed to load analytics.");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading && user) load();
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, user]);

  if (loading) {
    return (
      <Layout title="Analytics">
        <LoadingState label="Crunching performance data..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Analytics">
        <ErrorState
          title="Analytics unavailable"
          message={error}
          onRetry={load}
        />
      </Layout>
    );
  }

  if (!analytics || analytics.total_trades === 0)
    return (
      <Layout title="Analytics">
        <EmptyState
          title="No analytics yet"
          message="Add at least one closed trade to generate analytics."
        />
      </Layout>
    );

  const equityPos = (analytics.net_profit || 0) >= 0;
  const pairData  = Object.entries(pairs).slice(0, 8).map(([pair, v]) => ({
    pair, wins: v.wins, losses: v.losses, pnl: v.pnl, wr: v.win_rate,
  }));
  const sessionData = Object.entries(sessions).map(([s, v]) => ({
    session: s.replace("_"," "), wins: v.wins, losses: v.losses, wr: v.win_rate, pnl: v.pnl,
  }));

  const METRICS = [
    {icon:Activity,   label:"Total Trades",   value: analytics.total_trades,                    color:colors.cyan},
    {icon:Target,     label:"Win Rate",        value: fmt.percent(analytics.win_rate),            color: analytics.win_rate >= 50 ? colors.green : colors.red},
    {icon:TrendingUp, label:"Net P&L",         value: fmt.currency(analytics.net_profit),        color: equityPos ? colors.green : colors.red},
    {icon:Target,     label:"Avg RR",          value: fmt.ratio(analytics.avg_rr),               color:colors.amber},
    {icon:Activity,   label:"Expectancy",      value: fmt.currency(analytics.expectancy),        color:colors.purple},
    {icon:Award,      label:"Profit Factor",   value: fmt.number(analytics.profit_factor),       color:colors.cyan},
    {icon:TrendingUp, label:"Gross Profit",    value: fmt.currency(analytics.gross_profit),      color:colors.green},
    {icon:TrendingUp, label:"Gross Loss",      value: fmt.currency(analytics.gross_loss),        color:colors.red},
    {icon:Activity,   label:"Avg Win",         value: fmt.currency(analytics.avg_win),           color:colors.green},
    {icon:Activity,   label:"Avg Loss",        value: fmt.currency(analytics.avg_loss),          color:colors.red},
    {icon:Activity,   label:"Max Drawdown",    value: fmt.currency(analytics.max_drawdown),      color:colors.red},
    {icon:Activity,   label:"Drawdown %",      value: fmt.percent(analytics.max_drawdown_pct),   color:colors.red},
  ];

  return (
    <Layout title="Analytics">
      <div className="flex flex-col gap-6">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title">Analytics</h1>
            <p className="page-sub">Deep performance analysis across all trades</p>
          </div>
        </div>

        {/* Behavior warnings */}
        {(behavior?.overtrading_detected || behavior?.revenge_trading_detected) && (
          <div className="card p-4 border-red-400/30 bg-red-400/5">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={15} className="text-red-400"/>
              <span className="font-bold text-red-400">Behavioral Risks Detected</span>
            </div>
            <div className="flex gap-4 flex-wrap text-sm">
              {behavior.overtrading_detected && (
                <span className="text-dark-300">⚠️ <strong className="text-red-400">Overtrading</strong> — More than 5 trades in a single day</span>
              )}
              {behavior.revenge_trading_detected && (
                <span className="text-dark-300">🎯 <strong className="text-amber-400">Revenge Trading</strong> — Increased lot size after a loss</span>
              )}
            </div>
          </div>
        )}

        {/* Metrics grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {METRICS.map(m => <StatCard key={m.label} {...m}/>)}
        </div>

        {/* Streaks */}
        <div className="card p-5">
          <div className="font-semibold text-sm mb-4">Streak Analysis</div>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Best Win Streak", analytics.best_win_streak,  colors.green],
              ["Worst Loss Streak",analytics.worst_loss_streak,colors.red],
              ["Current Streak",  Math.abs(analytics.current_streak),
                analytics.current_streak >= 0 ? colors.green : colors.red],
            ].map(([l, v, c]) => (
              <div key={l} className="card2 p-4 text-center">
                <div className="font-mono text-4xl font-extrabold mb-1" style={{color:c}}>{v}</div>
                <div className="text-xs text-dark-400">{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Equity curve */}
        <div className="card p-5">
          <div className="font-semibold text-sm mb-4">Equity Curve</div>
          {curve.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={curve}>
                <defs>
                  <linearGradient id="eq2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={equityPos?colors.green:colors.red} stopOpacity={0.3}/>
                    <stop offset="95%" stopColor={equityPos?colors.green:colors.red} stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2e50"/>
                <XAxis dataKey="index" stroke="#445d7a" tick={{fontSize:11}}/>
                <YAxis stroke="#445d7a" tick={{fontSize:11}} tickFormatter={v=>`$${v}`}/>
                <Tooltip content={<CT/>}/>
                <Area type="monotone" dataKey="cumulative_pnl" name="Equity"
                  stroke={equityPos?colors.green:colors.red}
                  fill="url(#eq2)" strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          ) : <div className="h-40 flex items-center justify-center text-dark-400 text-sm">Not enough data</div>}
        </div>

        {/* Pair performance */}
        {pairData.length > 0 && (
          <div className="card p-5">
            <div className="font-semibold text-sm mb-4">Pair Performance</div>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={pairData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2e50"/>
                <XAxis dataKey="pair" stroke="#445d7a" tick={{fontSize:11}}/>
                <YAxis stroke="#445d7a" tick={{fontSize:11}}/>
                <Tooltip content={<CT/>}/>
                <Legend wrapperStyle={{fontSize:12}}/>
                <Bar dataKey="wins" name="Wins" fill={colors.green} radius={[4,4,0,0]}/>
                <Bar dataKey="losses" name="Losses" fill={colors.red} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {Object.entries(pairs).slice(0,4).map(([pair,v]) => (
                <div key={pair} className="card2 p-3">
                  <div className="font-bold mb-2">{pair}</div>
                  <div className="text-xs text-dark-400">Win Rate: <span style={{color:v.win_rate>=50?colors.green:colors.red}}>{v.win_rate}%</span></div>
                  <div className="text-xs text-dark-400 mt-1">P&L: <span className="font-mono" style={{color:v.pnl>=0?colors.green:colors.red}}>${v.pnl}</span></div>
                  <div className="text-xs text-dark-400 mt-1">Trades: {v.total}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Session breakdown */}
        {sessionData.length > 0 && (
          <div className="card p-5">
            <div className="font-semibold text-sm mb-4">Session Win Rate</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={sessionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a2e50"/>
                <XAxis dataKey="session" stroke="#445d7a" tick={{fontSize:11}}/>
                <YAxis stroke="#445d7a" tick={{fontSize:11}} tickFormatter={v=>`${v}%`}/>
                <Tooltip content={<CT/>} formatter={v=>`${v}%`}/>
                <Bar dataKey="wr" name="Win Rate %" fill={colors.cyan} radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </Layout>
  );
}
