from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Dict, Any
from datetime import datetime
from collections import defaultdict

from app.models.models import Trade, User


async def compute_analytics(db: AsyncSession, user_id: int) -> Dict[str, Any]:
    """
    Full analytics computation for a user.
    Only considers closed trades (win / loss / breakeven).
    """
    result = await db.execute(
        select(Trade)
        .where(Trade.user_id == user_id)
        .order_by(Trade.entry_time)
    )
    all_trades = result.scalars().all()

    def _result_str(t) -> str:
        return t.result.value if hasattr(t.result, "value") else str(t.result)

    closed = [t for t in all_trades if _result_str(t) in ("win", "loss", "breakeven")]

    if not closed:
        return _empty_analytics()

    wins = [t for t in closed if _result_str(t) == "win"]
    losses = [t for t in closed if _result_str(t) == "loss"]
    total = len(closed)

    win_count = len(wins)
    loss_count = len(losses)
    win_rate = win_count / total * 100 if total else 0

    # ── P&L ────────────────────────────────────────────────────────────────
    pnls = [t.profit_loss or 0 for t in closed]
    net_profit = sum(pnls)
    gross_profit = sum(p for p in pnls if p > 0)
    gross_loss = abs(sum(p for p in pnls if p < 0))

    avg_win = sum(t.profit_loss or 0 for t in wins) / win_count if win_count else 0
    avg_loss = abs(sum(t.profit_loss or 0 for t in losses) / loss_count) if loss_count else 0

    # ── Expectancy & Profit Factor ─────────────────────────────────────────
    loss_rate = loss_count / total if total else 0
    expectancy = (win_rate / 100 * avg_win) - (loss_rate * avg_loss)
    profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (999.0 if gross_profit else 0)
    profit_factor = min(profit_factor, 999.99)

    # ── Average RR ─────────────────────────────────────────────────────────
    rrs = [t.risk_reward_ratio for t in closed if t.risk_reward_ratio]
    avg_rr = sum(rrs) / len(rrs) if rrs else 0

    # ── Max Drawdown ───────────────────────────────────────────────────────
    max_dd, max_dd_pct = _calc_drawdown(pnls)

    # ── Streaks ────────────────────────────────────────────────────────────
    current_streak, best_win_streak, worst_loss_streak = _calc_streaks(closed, _result_str)

    # ── Session & Pair Breakdown ───────────────────────────────────────────
    session_stats = _session_breakdown(closed, _result_str)
    pair_stats = _pair_breakdown(closed, _result_str)
    best_session, worst_session = _best_worst_session(session_stats)

    # ── Behavior Detection ─────────────────────────────────────────────────
    overtrading = _detect_overtrading(all_trades)
    revenge_trading = _detect_revenge_trading(closed)

    return {
        "total_trades": total,
        "winning_trades": win_count,
        "losing_trades": loss_count,
        "win_rate": round(win_rate, 2),
        "net_profit": round(net_profit, 2),
        "gross_profit": round(gross_profit, 2),
        "gross_loss": round(gross_loss, 2),
        "avg_win": round(avg_win, 2),
        "avg_loss": round(avg_loss, 2),
        "expectancy": round(expectancy, 2),
        "profit_factor": round(profit_factor, 2),
        "max_drawdown": round(max_dd, 2),
        "max_drawdown_pct": round(max_dd_pct, 2),
        "avg_rr": round(avg_rr, 2),
        "current_streak": current_streak,
        "best_win_streak": best_win_streak,
        "worst_loss_streak": worst_loss_streak,
        "best_session": best_session,
        "worst_session": worst_session,
        "session_stats": session_stats,
        "pair_stats": pair_stats,
        "overtrading_detected": overtrading,
        "revenge_trading_detected": revenge_trading,
        "computed_at": datetime.utcnow().isoformat(),
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

def _calc_drawdown(pnls: List[float]):
    if not pnls:
        return 0, 0
    peak = 0.0
    max_dd = 0.0
    max_dd_pct = 0.0
    running = 0.0
    for pnl in pnls:
        running += pnl
        if running > peak:
            peak = running
        dd = peak - running
        if dd > max_dd:
            max_dd = dd
            max_dd_pct = (dd / peak * 100) if peak > 0 else 0
    return max_dd, max_dd_pct


def _calc_streaks(trades, result_fn):
    if not trades:
        return 0, 0, 0

    best_win = 0
    worst_loss = 0
    cur_win = 0
    cur_loss = 0

    for t in trades:
        r = result_fn(t)
        if r == "win":
            cur_win += 1
            cur_loss = 0
            best_win = max(best_win, cur_win)
        elif r == "loss":
            cur_loss += 1
            cur_win = 0
            worst_loss = max(worst_loss, cur_loss)
        else:
            cur_win = 0
            cur_loss = 0

    last = result_fn(trades[-1])
    current = cur_win if last == "win" else (-cur_loss if last == "loss" else 0)
    return current, best_win, worst_loss


def _session_breakdown(trades, result_fn) -> Dict:
    data = defaultdict(lambda: {"wins": 0, "losses": 0, "total": 0, "pnl": 0.0})

    for t in trades:
        s = (t.session.value if hasattr(t.session, "value") else t.session) or "unknown"
        data[s]["total"] += 1
        data[s]["pnl"] += t.profit_loss or 0
        r = result_fn(t)
        if r == "win":
            data[s]["wins"] += 1
        elif r == "loss":
            data[s]["losses"] += 1

    return {
        s: {
            **v,
            "win_rate": round(v["wins"] / v["total"] * 100, 1) if v["total"] else 0,
            "pnl": round(v["pnl"], 2),
        }
        for s, v in data.items()
    }


def _pair_breakdown(trades, result_fn) -> Dict:
    data = defaultdict(lambda: {"wins": 0, "losses": 0, "total": 0, "pnl": 0.0})

    for t in trades:
        p = t.pair or "Unknown"
        data[p]["total"] += 1
        data[p]["pnl"] += t.profit_loss or 0
        r = result_fn(t)
        if r == "win":
            data[p]["wins"] += 1
        elif r == "loss":
            data[p]["losses"] += 1

    result = {
        p: {
            **v,
            "win_rate": round(v["wins"] / v["total"] * 100, 1) if v["total"] else 0,
            "pnl": round(v["pnl"], 2),
        }
        for p, v in data.items()
    }
    # Sort by trade count descending
    return dict(sorted(result.items(), key=lambda x: x[1]["total"], reverse=True))


def _best_worst_session(session_stats: Dict[str, Any]):
    if not session_stats:
        return None, None
    ordered = sorted(session_stats.items(), key=lambda item: (item[1].get("pnl", 0), item[1].get("win_rate", 0)))
    return ordered[-1][0], ordered[0][0]


def _detect_overtrading(trades) -> bool:
    """Flag if any calendar day had more than 5 trades."""
    daily: Dict[str, int] = defaultdict(int)
    for t in trades:
        if t.entry_time:
            day = t.entry_time.strftime("%Y-%m-%d")
            daily[day] += 1
    return any(c > 5 for c in daily.values())


def _detect_revenge_trading(closed_trades) -> bool:
    """
    Flag if a loss was followed (within 30 min) by a new trade
    with at least 1.5× the previous lot size.
    """
    if len(closed_trades) < 2:
        return False

    for i in range(1, len(closed_trades)):
        prev = closed_trades[i - 1]
        curr = closed_trades[i]

        prev_result = prev.result.value if hasattr(prev.result, "value") else prev.result
        if prev_result != "loss":
            continue

        if prev.exit_time and curr.entry_time:
            gap_minutes = (curr.entry_time - prev.exit_time).total_seconds() / 60
            if gap_minutes < 30 and (curr.lot_size or 0) >= (prev.lot_size or 0) * 1.5:
                return True

    return False


def _empty_analytics() -> Dict[str, Any]:
    return {
        "total_trades": 0,
        "winning_trades": 0,
        "losing_trades": 0,
        "win_rate": 0,
        "net_profit": 0,
        "gross_profit": 0,
        "gross_loss": 0,
        "avg_win": 0,
        "avg_loss": 0,
        "expectancy": 0,
        "profit_factor": 0,
        "max_drawdown": 0,
        "max_drawdown_pct": 0,
        "avg_rr": 0,
        "current_streak": 0,
        "best_win_streak": 0,
        "worst_loss_streak": 0,
        "best_session": None,
        "worst_session": None,
        "session_stats": {},
        "pair_stats": {},
        "overtrading_detected": False,
        "revenge_trading_detected": False,
        "computed_at": datetime.utcnow().isoformat(),
    }


async def compute_platform_stats(db: AsyncSession) -> Dict[str, Any]:
    from sqlalchemy import func, select

    users = await db.scalar(select(func.count()).select_from(User))
    trades = await db.scalar(select(func.count()).select_from(Trade))
    closed_result = await db.execute(select(Trade).where(Trade.result.in_(["win", "loss", "breakeven"])))
    closed = closed_result.scalars().all()
    pnl = sum(t.profit_loss or 0 for t in closed)
    wins = sum(1 for t in closed if (t.result.value if hasattr(t.result, "value") else t.result) == "win")
    win_rate = round(wins / len(closed) * 100, 2) if closed else 0
    avg_rr_values = [t.risk_reward_ratio for t in closed if t.risk_reward_ratio]
    return {
        "users": users or 0,
        "trades": trades or 0,
        "closed_trades": len(closed),
        "platform_net_pnl": round(pnl, 2),
        "platform_win_rate": win_rate,
        "platform_avg_rr": round(sum(avg_rr_values) / len(avg_rr_values), 2) if avg_rr_values else 0,
    }
