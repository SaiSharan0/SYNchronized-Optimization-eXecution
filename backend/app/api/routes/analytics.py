from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from typing import Optional
from datetime import datetime, timedelta

from app.db.database import get_db
from app.models.models import User, Trade
from app.services.analytics_service import compute_analytics
from app.core.security import get_current_user

router = APIRouter()


@router.get("/")
async def get_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Full analytics for all time."""
    return await compute_analytics(db, current_user.id)


@router.get("/summary")
async def get_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Fast summary stats for dashboard KPIs."""
    stats = await compute_analytics(db, current_user.id)
    return {
        "total_trades": stats["total_trades"],
        "winning_trades": stats["winning_trades"],
        "losing_trades": stats["losing_trades"],
        "win_rate": stats["win_rate"],
        "net_profit": stats["net_profit"],
        "avg_rr": stats["avg_rr"],
        "expectancy": stats["expectancy"],
        "profit_factor": stats["profit_factor"],
        "current_streak": stats["current_streak"],
        "overtrading_detected": stats["overtrading_detected"],
        "revenge_trading_detected": stats["revenge_trading_detected"],
    }


@router.get("/equity-curve")
async def get_equity_curve(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Equity curve data points for charting."""
    from sqlalchemy import and_
    result = await db.execute(
        select(Trade)
        .where(
            Trade.user_id == current_user.id,
            Trade.result.in_(["win", "loss", "breakeven"]),
        )
        .order_by(Trade.entry_time)
    )
    trades = result.scalars().all()

    curve = []
    running = 0.0
    for i, t in enumerate(trades):
        running += t.profit_loss or 0
        curve.append({
            "index": i + 1,
            "cumulative_pnl": round(running, 2),
            "trade_pnl": round(t.profit_loss or 0, 2),
            "pair": t.pair,
            "result": t.result.value if hasattr(t.result, "value") else t.result,
            "date": t.entry_time.isoformat() if t.entry_time else None,
        })

    return {"data": curve, "total_pnl": round(running, 2)}


@router.get("/by-session")
async def get_session_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Win rate and P&L broken down by trading session."""
    stats = await compute_analytics(db, current_user.id)
    return stats.get("session_stats", {})


@router.get("/by-pair")
async def get_pair_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Win rate and P&L broken down by currency pair."""
    stats = await compute_analytics(db, current_user.id)
    return stats.get("pair_stats", {})


@router.get("/behavior")
async def get_behavior_report(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Overtrading and revenge trading detection."""
    stats = await compute_analytics(db, current_user.id)
    return {
        "overtrading_detected": stats["overtrading_detected"],
        "revenge_trading_detected": stats["revenge_trading_detected"],
        "best_win_streak": stats["best_win_streak"],
        "worst_loss_streak": stats["worst_loss_streak"],
        "current_streak": stats["current_streak"],
        "max_drawdown": stats["max_drawdown"],
        "max_drawdown_pct": stats["max_drawdown_pct"],
    }


@router.get("/period")
async def get_period_analytics(
    period: str = Query("30d", regex="^(7d|30d|90d|1y|all)$"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Analytics filtered to a specific time period."""
    period_map = {"7d": 7, "30d": 30, "90d": 90, "1y": 365}
    days = period_map.get(period)

    if days:
        cutoff = datetime.utcnow() - timedelta(days=days)
        result = await db.execute(
            select(Trade).where(
                Trade.user_id == current_user.id,
                Trade.entry_time >= cutoff,
                Trade.result.in_(["win", "loss", "breakeven"]),
            ).order_by(Trade.entry_time)
        )
        trades = result.scalars().all()
    else:
        return await compute_analytics(db, current_user.id)

    # Inline lightweight compute for period
    if not trades:
        return {"period": period, "total_trades": 0, "message": "No trades in this period"}

    wins = [t for t in trades if (t.result.value if hasattr(t.result, "value") else t.result) == "win"]
    losses = [t for t in trades if (t.result.value if hasattr(t.result, "value") else t.result) == "loss"]
    pnls = [t.profit_loss or 0 for t in trades]
    net = sum(pnls)
    wr = round(len(wins) / len(trades) * 100, 1) if trades else 0
    rrs = [t.risk_reward_ratio for t in trades if t.risk_reward_ratio]
    avg_rr = round(sum(rrs) / len(rrs), 2) if rrs else 0

    return {
        "period": period,
        "total_trades": len(trades),
        "wins": len(wins),
        "losses": len(losses),
        "win_rate": wr,
        "net_profit": round(net, 2),
        "avg_rr": avg_rr,
    }
