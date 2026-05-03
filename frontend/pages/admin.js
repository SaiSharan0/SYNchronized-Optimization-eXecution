import { useEffect, useState } from "react";
import { Crown, Users, BookOpen, DollarSign, Percent } from "lucide-react";
import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import { LoadingState, ErrorState } from "../components/PageState";
import { useAuth } from "../context/AuthContext";
import { adminAPI } from "../lib/api";
import { colors, fmt } from "../lib/utils";

export default function AdminPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [s, u, t] = await Promise.all([
        adminAPI.stats(),
        adminAPI.users({ limit: 20 }),
        adminAPI.trades({ limit: 20 }),
      ]);
      setStats(s.data);
      setUsers(u.data || []);
      setTrades(t.data || []);
    } catch {
      setError("Admin data is unavailable. Confirm your account role is ADMIN.");
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user?.role === "admin") load();
    else setLoading(false);
  }, [user]);

  if (loading) {
    return <Layout title="Admin"><LoadingState label="Loading admin console..." /></Layout>;
  }

  if (user?.role !== "admin") {
    return <Layout title="Admin"><ErrorState title="Admin access required" message="Your account does not have the ADMIN role." /></Layout>;
  }

  if (error) {
    return <Layout title="Admin"><ErrorState title="Admin console unavailable" message={error} onRetry={load} /></Layout>;
  }

  return (
    <Layout title="Admin">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="page-title">Admin Console</h1>
          <p className="page-sub">Users, trades, and platform health.</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <StatCard icon={Users} label="Users" value={stats?.users ?? 0} color={colors.cyan} />
          <StatCard icon={BookOpen} label="Trades" value={stats?.trades ?? 0} color={colors.purple} />
          <StatCard icon={DollarSign} label="Net P&L" value={fmt.currency(stats?.platform_net_pnl)} color={(stats?.platform_net_pnl || 0) >= 0 ? colors.green : colors.red} />
          <StatCard icon={Percent} label="Win Rate" value={fmt.percent(stats?.platform_win_rate)} color={colors.green} />
          <StatCard icon={Crown} label="Avg RR" value={fmt.ratio(stats?.platform_avg_rr)} color={colors.amber} />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <div className="card p-5">
            <div className="font-semibold text-sm mb-4">Recent Users</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-dark-600">{["User","Email","Role","Created"].map(h => <th className="table-th" key={h}>{h}</th>)}</tr></thead>
                <tbody>{users.map((u) => (
                  <tr key={u.id} className="border-b border-dark-700/60">
                    <td className="table-td font-semibold">{u.username}</td>
                    <td className="table-td text-dark-300">{u.email}</td>
                    <td className="table-td uppercase text-brand-200 text-xs font-bold">{u.role}</td>
                    <td className="table-td">{fmt.date(u.created_at)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          <div className="card p-5">
            <div className="font-semibold text-sm mb-4">Recent Trades</div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-dark-600">{["Pair","User","Result","P&L","RR"].map(h => <th className="table-th" key={h}>{h}</th>)}</tr></thead>
                <tbody>{trades.map((t) => (
                  <tr key={t.id} className="border-b border-dark-700/60">
                    <td className="table-td font-bold">{t.pair}</td>
                    <td className="table-td">#{t.user_id}</td>
                    <td className="table-td uppercase text-xs">{t.result}</td>
                    <td className="table-td font-mono">{t.profit_loss == null ? "-" : fmt.currency(t.profit_loss)}</td>
                    <td className="table-td font-mono">{t.risk_reward_ratio ? fmt.ratio(t.risk_reward_ratio) : "-"}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
