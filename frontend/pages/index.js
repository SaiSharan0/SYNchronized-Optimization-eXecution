import { useState, useEffect } from "react";
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Hash, Percent, DollarSign, Target, Zap, Activity,
  AlertTriangle, AlertCircle, TrendingUp, TrendingDown,
} from "lucide-react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import { ResultBadge, SessionBadge, TypeBadge, ScoreRing } from "../components/Badges";
import { LoadingState, ErrorState, EmptyState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import { analyticsAPI, tradesAPI } from "../lib/api";
import { fmt, colors } from "../lib/utils";

const SLICE_COLORS = [colors.green, colors.red, colors.amber, "#6b8cae"];

const CustomTooltip = ({ active, payload, label }) =>
  active && payload?.length
    ? <div className="card2 px-3 py-2 text-xs"><div className="text-dark-400 mb-1">{label}</div>{payload.map(p=><div key={p.name} style={{color:p.color}}>{p.name}: {p.name==="P&L"||p.name==="Equity"?`$${p.value}`:p.value}</div>)}</div>
    : null;

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [analytics, setAnalytics] = useState(null);
  const [curve,     setCurve]     = useState([]);
  const [recent,    setRecent]    = useState([]);
  const [sessions,  setSessions]  = useState({});
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [a, c, t, s] = await Promise.all([
        analyticsAPI.summary(),
        analyticsAPI.equityCurve(),
        tradesAPI.list({ limit: 7 }),
        analyticsAPI.bySession(),
      ]);
      setAnalytics(a.data);
      setCurve(c.data.data || []);
      setRecent(t.data || []);
      setSessions(s.data || {});
    } catch {
      setError("Failed to load dashboard metrics.");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!authLoading && user) load();
    if (!authLoading && !user) setLoading(false);
  }, [authLoading, user]);

  if (loading) {
    return (
      <Layout title="Dashboard">
        <LoadingState label="Loading dashboard..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout title="Dashboard">
        <ErrorState
          title="Dashboard unavailable"
          message={error}
          onRetry={load}
        />
      </Layout>
    );
  }

  if (!analytics || (analytics.total_trades || 0) === 0) {
    return (
      <Layout title="Dashboard">
        <EmptyState
          title="No trading data yet"
          message="Add your first trade in Journal to unlock performance insights."
        />
      </Layout>
    );
  }

  const equity    = curve.length > 0 ? curve[curve.length-1].cumulative_pnl : 0;
  const equityPos = equity >= 0;
  const pieData   = analytics ? [
    { name:"Wins",  value: analytics.winning_trades || 0 },
    { name:"Losses",value: analytics.losing_trades  || 0 },
  ] : [];

  return (
    <Layout title="Dashboard">
      <div className="flex flex-col gap-6">
        {/* Page header */}
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">Real-time trading performance overview</p>
        </div>

        {/* Behavior alerts */}
        {(analytics?.overtrading_detected || analytics?.revenge_trading_detected) && (
          <div className="flex gap-3 flex-wrap">
            {analytics.overtrading_detected && (
              <div className="card px-4 py-3 border-red-400/30 bg-red-400/5 flex items-center gap-3">
                <AlertTriangle size={14} className="text-red-400 flex-shrink-0"/>
                <span className="text-sm text-red-400 font-semibold">Overtrading Detected</span>
                <span className="text-xs text-dark-400">More than 5 trades in a single day</span>
              </div>
            )}
            {analytics.revenge_trading_detected && (
              <div className="card px-4 py-3 border-amber-400/30 bg-amber-400/5 flex items-center gap-3">
                <AlertCircle size={14} className="text-amber-400 flex-shrink-0"/>
                <span className="text-sm text-amber-400 font-semibold">Revenge Trading Detected</span>
                <span className="text-xs text-dark-400">Increased lot size after a loss</span>
              </div>
            )}
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard icon={Hash}       label="Total Trades"   value={analytics?.total_trades ?? 0}                                       color={colors.cyan}   />
          <StatCard icon={Percent}    label="Win Rate"       value={fmt.percent(analytics?.win_rate)}                                   color={analytics?.win_rate >= 50 ? colors.green : colors.red} />
          <StatCard icon={DollarSign} label="Net P&L"        value={fmt.currency(analytics?.net_profit)}                               color={analytics?.net_profit >= 0 ? colors.green : colors.red} />
          <StatCard icon={Target}     label="Avg RR"         value={fmt.ratio(analytics?.avg_rr)}                                       color={colors.amber}  />
          <StatCard icon={Zap}        label="Expectancy"     value={fmt.currency(analytics?.expectancy)}                               color={colors.purple}  />
          <StatCard icon={Activity}   label="Profit Factor"  value={fmt.number(analytics?.profit_factor)}                              color={colors.cyan}   />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Equity curve */}
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center gap-2 mb-5">
              {equityPos ? <TrendingUp size={15} className="text-green-400"/> : <TrendingDown size={15} className="text-red-400"/>}
              <span className="font-semibold text-sm">Equity Curve</span>
              <span className="font-mono text-sm ml-auto" style={{color: equityPos ? colors.green : colors.red}}>
                {equityPos ? "+" : ""}{fmt.currency(equity)}
              </span>
            </div>
            {curve.length > 1 ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={curve}>
                  <defs>
                    <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={equityPos ? colors.green : colors.red} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={equityPos ? colors.green : colors.red} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a2e50"/>
                  <XAxis dataKey="index" stroke="#445d7a" tick={{fontSize:11}}/>
                  <YAxis stroke="#445d7a" tick={{fontSize:11}} tickFormatter={v=>`$${v}`}/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="cumulative_pnl" name="Equity"
                    stroke={equityPos ? colors.green : colors.red}
                    fill="url(#eqGrad)" strokeWidth={2}/>
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-dark-400 text-sm">
                Add closed trades to see equity curve
              </div>
            )}
          </div>

          {/* Win/Loss pie */}
          <div className="card p-5">
            <div className="font-semibold text-sm mb-5">Win / Loss Ratio</div>
            {pieData.some(d=>d.value>0) ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                         dataKey="value" paddingAngle={3}>
                      {pieData.map((_, i) => <Cell key={i} fill={SLICE_COLORS[i]}/>)}
                    </Pie>
                    <Tooltip contentStyle={{background:"#0d1929",border:"1px solid #1e3458",borderRadius:8,fontSize:12}}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-5 mt-3">
                  {pieData.map((d,i)=>(
                    <div key={d.name} className="flex items-center gap-2 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background:SLICE_COLORS[i]}}/>
                      <span className="text-dark-300">{d.name}: <strong style={{color:SLICE_COLORS[i]}}>{d.value}</strong></span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-dark-400 text-sm">No closed trades</div>
            )}
          </div>
        </div>

        {/* Session performance */}
        {Object.keys(sessions).length > 0 && (
          <div className="card p-5">
            <div className="font-semibold text-sm mb-4">Session Performance</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Object.entries(sessions).map(([sess, v]) => (
                <div key={sess} className="card2 p-4">
                  <SessionBadge session={sess}/>
                  <div className="mt-3 flex flex-col gap-1.5">
                    {[
                      ["Win Rate", `${v.win_rate}%`,   v.win_rate >= 50 ? colors.green : colors.red],
                      ["Trades",   v.total,             colors.cyan],
                      ["P&L",      fmt.currency(v.pnl), v.pnl >= 0 ? colors.green : colors.red],
                    ].map(([label, val, color]) => (
                      <div key={label} className="flex justify-between text-xs">
                        <span className="text-dark-400">{label}</span>
                        <span className="font-mono font-semibold" style={{color}}>{val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent trades */}
        <div className="card p-5">
          <div className="font-semibold text-sm mb-4">Recent Trades</div>
          {recent.length === 0
            ? <div className="text-dark-400 text-sm py-6 text-center">No trades yet. Go to Journal to add your first trade.</div>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-dark-600">
                      {["Pair","Type","Session","Entry","RR","P&L","Result","Score"].map(h=>(
                        <th key={h} className="table-th">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((t,i) => (
                      <tr key={t.id} className={i%2?"bg-dark-900/40":""}>
                        <td className="table-td font-bold">{t.pair}</td>
                        <td className="table-td"><TypeBadge type={t.trade_type}/></td>
                        <td className="table-td"><SessionBadge session={t.session}/></td>
                        <td className="table-td font-mono">{t.entry_price}</td>
                        <td className="table-td font-mono" style={{color:(t.risk_reward_ratio||0)>=1.5?colors.green:colors.amber}}>
                          {t.risk_reward_ratio ? `${t.risk_reward_ratio}:1` : "—"}
                        </td>
                        <td className="table-td font-mono" style={{color:t.profit_loss>=0?colors.green:t.profit_loss<0?colors.red:"#6b8cae"}}>
                          {t.profit_loss != null ? `$${t.profit_loss}` : "—"}
                        </td>
                        <td className="table-td"><ResultBadge result={t.result}/></td>
                        <td className="table-td"><ScoreRing score={t.trade_score||0} size={40}/></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>
    </Layout>
  );
}
