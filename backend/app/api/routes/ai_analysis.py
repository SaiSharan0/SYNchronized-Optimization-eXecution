from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.models import AIFeedback, User
from app.services.ai_service import analyze_trade, analyze_portfolio
from app.services.trade_service import get_trade, get_trades
from app.core.security import get_current_user
from app.core.config import settings
from app.core.plans import ensure_feature_access

router = APIRouter()


def _trade_to_dict(trade) -> dict:
    return {
        "pair": trade.pair,
        "trade_type": trade.trade_type.value if hasattr(trade.trade_type, "value") else trade.trade_type,
        "session": trade.session.value if hasattr(trade.session, "value") else trade.session,
        "entry_price": trade.entry_price,
        "stop_loss": trade.stop_loss,
        "take_profit": trade.take_profit,
        "exit_price": trade.exit_price,
        "lot_size": trade.lot_size,
        "risk_reward_ratio": trade.risk_reward_ratio,
        "result": trade.result.value if hasattr(trade.result, "value") else trade.result,
        "followed_strategy": trade.followed_strategy,
        "notes": trade.notes,
        "tags": trade.tags or [],
    }


@router.post("/analyze/{trade_id}")
async def analyze_single_trade(
    trade_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run or re-run AI analysis on a specific trade."""
    trade = await get_trade(db, trade_id, current_user.id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    feedback = await analyze_trade(_trade_to_dict(trade))

    if feedback:
        trade.ai_feedback = feedback
        db.add(AIFeedback(user_id=current_user.id, trade_id=trade.id, payload=feedback))
        await db.flush()

    return {
        "trade_id": trade_id,
        "feedback": feedback,
        "cached": False,
    }


@router.get("/feedback/{trade_id}")
async def get_trade_feedback(
    trade_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Return stored AI feedback for a trade (no new API call)."""
    trade = await get_trade(db, trade_id, current_user.id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    if not trade.ai_feedback:
        raise HTTPException(status_code=404, detail="No AI feedback yet. Call /analyze first.")

    return {"trade_id": trade_id, "feedback": trade.ai_feedback}


@router.post("/portfolio")
async def analyze_portfolio_endpoint(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Macro pattern analysis across up to 50 recent trades."""
    ensure_feature_access(current_user.email, "ai_portfolio", set(settings.PRO_USER_EMAILS))

    trades = await get_trades(db, current_user.id, limit=50)

    if not trades:
        return {"message": "No trades to analyze", "patterns": [], "action_plan": []}

    trades_data = [
        {
            "pair": t.pair,
            "result": t.result.value if hasattr(t.result, "value") else t.result,
            "risk_reward_ratio": t.risk_reward_ratio,
            "session": t.session.value if hasattr(t.session, "value") else t.session,
            "followed_strategy": t.followed_strategy,
            "trade_score": t.trade_score,
        }
        for t in trades
    ]

    return await analyze_portfolio(trades_data)


@router.post("/batch")
async def batch_analyze_unanalyzed(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run AI on all trades that don't have feedback yet (up to `limit`)."""
    ensure_feature_access(current_user.email, "ai_batch_analysis", set(settings.PRO_USER_EMAILS))

    from sqlalchemy import select
    from app.models.models import Trade

    result = await db.execute(
        select(Trade)
        .where(Trade.user_id == current_user.id, Trade.ai_feedback.is_(None))
        .limit(limit)
    )
    trades = result.scalars().all()

    processed = 0
    for trade in trades:
        feedback = await analyze_trade(_trade_to_dict(trade))
        if feedback:
            trade.ai_feedback = feedback
            db.add(AIFeedback(user_id=current_user.id, trade_id=trade.id, payload=feedback))
            processed += 1

    await db.flush()
    return {"processed": processed, "total_without_feedback": len(trades)}
