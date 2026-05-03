import { resultColor, sessionColor, scoreColor } from "../lib/utils";

/* ── Generic badge ──────────────────────────────────────────────────── */
export function Badge({ children, color = "#00d4ff", size = 11 }) {
  return (
    <span
      className="badge"
      style={{
        background:   `${color}18`,
        borderColor:  `${color}44`,
        color,
        fontSize:     size,
      }}
    >
      {children}
    </span>
  );
}

/* ── Result badge ───────────────────────────────────────────────────── */
export function ResultBadge({ result }) {
  const labels = { win: "WIN", loss: "LOSS", breakeven: "B/E", pending: "PENDING" };
  return <Badge color={resultColor(result)}>{labels[result] || result?.toUpperCase()}</Badge>;
}

/* ── Session badge ──────────────────────────────────────────────────── */
const SESSION_ICONS = { asian: "🌏", london: "🏦", new_york: "🗽", overlap: "⚡" };
export function SessionBadge({ session }) {
  const icon  = SESSION_ICONS[session] || "🕐";
  const label = session?.replace("_", " ").toUpperCase() || "—";
  return <Badge color={sessionColor(session)}>{icon} {label}</Badge>;
}

/* ── Direction badge ────────────────────────────────────────────────── */
export function TypeBadge({ type }) {
  return (
    <Badge color={type === "buy" ? "#22c55e" : "#ef4444"}>
      {type === "buy" ? "▲" : "▼"} {type?.toUpperCase()}
    </Badge>
  );
}

/* ── Circular score ring ─────────────────────────────────────────────── */
export function ScoreRing({ score, size = 52 }) {
  const s = Number(score || 0);
  const color = scoreColor(s);
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (s / 10);

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e3458" strokeWidth={5} />
        <circle
          cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <div
        className="absolute inset-0 flex items-center justify-center font-mono font-bold"
        style={{ fontSize: size > 48 ? 14 : 11, color }}
      >
        {s.toFixed(1)}
      </div>
    </div>
  );
}
