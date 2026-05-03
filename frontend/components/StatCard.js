import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import clsx from "clsx";

export default function StatCard({ icon: Icon, label, value, sub, color = "#00d4ff", trend }) {
  const isPositive = trend != null && trend >= 0;

  return (
    <div className="card p-5 flex flex-col gap-3 animate-fade-in">
      <div className="flex items-start justify-between">
        <div
          className="p-2 rounded-lg border"
          style={{ background: `${color}18`, borderColor: `${color}33` }}
        >
          <Icon size={15} style={{ color }} />
        </div>
        {trend != null && (
          <span
            className={clsx(
              "flex items-center gap-0.5 text-xs font-semibold",
              isPositive ? "text-green-400" : "text-red-400"
            )}
          >
            {isPositive ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div>
        <div className="font-mono text-2xl font-bold" style={{ color }}>
          {value ?? "—"}
        </div>
        <div className="text-xs text-dark-400 mt-1">{label}</div>
        {sub && <div className="text-xs text-dark-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}
