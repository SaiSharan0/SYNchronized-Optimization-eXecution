import { format, formatDistanceToNow } from "date-fns";

/* ── Formatting ─────────────────────────────────────────────────────── */
export const fmt = {
  currency: (v, digits = 2) =>
    v == null ? "—" : `$${Number(v).toFixed(digits)}`,
  percent:  (v, digits = 1) =>
    v == null ? "—" : `${Number(v).toFixed(digits)}%`,
  ratio:    (v, digits = 2) =>
    v == null ? "—" : `${Number(v).toFixed(digits)}:1`,
  number:   (v, digits = 2) =>
    v == null ? "—" : Number(v).toFixed(digits),
  date:     (d) =>
    d ? format(new Date(d), "MMM d, yyyy HH:mm") : "—",
  dateShort:(d) =>
    d ? format(new Date(d), "MMM d") : "—",
  ago:      (d) =>
    d ? formatDistanceToNow(new Date(d), { addSuffix: true }) : "—",
  pair:     (s) => s?.toUpperCase() || "—",
  session:  (s) => s?.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase()) || "—",
  result:   (r) => r?.charAt(0).toUpperCase() + r?.slice(1) || "—",
  score:    (v) => v == null ? "—" : `${Number(v).toFixed(1)}/10`,
};

/* ── Colors ─────────────────────────────────────────────────────────── */
export const colors = {
  cyan:   "#00d4ff",
  green:  "#22c55e",
  red:    "#ef4444",
  amber:  "#f59e0b",
  purple: "#a855f7",
  blue:   "#3b82f6",
};

export function resultColor(result) {
  return { win: colors.green, loss: colors.red, breakeven: colors.amber, pending: "#6b8cae" }[result] || "#6b8cae";
}

export function scoreColor(score) {
  const n = Number(score || 0);
  if (n >= 8) return colors.green;
  if (n >= 6) return colors.cyan;
  if (n >= 4) return colors.amber;
  return colors.red;
}

export function sessionColor(session) {
  return { asian: colors.purple, london: colors.cyan, new_york: colors.green, overlap: colors.amber }[session] || "#6b8cae";
}

/* ── CSV Download ───────────────────────────────────────────────────── */
export function downloadBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
}

/* ── Error extraction ───────────────────────────────────────────────── */
export function extractError(err) {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.message ||
    err?.message ||
    "An unexpected error occurred"
  );
}

/* ── Pairs list ─────────────────────────────────────────────────────── */
export const PAIRS = [
  "EUR/USD","GBP/USD","USD/JPY","USD/CHF","AUD/USD",
  "NZD/USD","USD/CAD","EUR/GBP","EUR/JPY","GBP/JPY",
  "XAU/USD","XAG/USD","BTC/USD","ETH/USD","US30","NAS100",
];

export const SESSIONS = ["asian","london","new_york","overlap"];

export const RESULTS = ["pending","win","loss","breakeven"];
