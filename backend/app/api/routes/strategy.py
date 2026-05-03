from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.db.database import get_db
from app.models.models import User, Strategy, Trade
from app.schemas.schemas import StrategyCreate, StrategyResponse
from app.core.security import get_current_user

router = APIRouter()


@router.post("/", response_model=StrategyResponse, status_code=201)
async def create_strategy(
    strategy_data: StrategyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    strategy = Strategy(
        user_id=current_user.id,
        name=strategy_data.name,
        description=strategy_data.description,
        rules=[rule.model_dump() for rule in strategy_data.rules],
    )
    db.add(strategy)
    await db.flush()
    await db.refresh(strategy)
    return strategy


@router.get("/", response_model=List[StrategyResponse])
async def list_strategies(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Strategy).where(
            Strategy.user_id == current_user.id,
            Strategy.is_active == True,
        ).order_by(Strategy.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{strategy_id}", response_model=StrategyResponse)
async def get_strategy(
    strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id,
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    return strategy


@router.put("/{strategy_id}", response_model=StrategyResponse)
async def update_strategy(
    strategy_id: int,
    strategy_data: StrategyCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id,
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    strategy.name = strategy_data.name
    strategy.description = strategy_data.description
    strategy.rules = [rule.model_dump() for rule in strategy_data.rules]
    await db.flush()
    await db.refresh(strategy)
    return strategy


@router.get("/{strategy_id}/performance")
async def get_strategy_performance(
    strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """How well is the user following this strategy, and what are the results?"""
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id,
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    trades_result = await db.execute(
        select(Trade).where(
            Trade.strategy_id == strategy_id,
            Trade.user_id == current_user.id,
        )
    )
    trades = trades_result.scalars().all()
    closed = [t for t in trades if t.result in ("win", "loss", "breakeven")
              or (hasattr(t.result, "value") and t.result.value in ("win", "loss", "breakeven"))]

    total = len(trades)
    followed = sum(1 for t in trades if t.followed_strategy)
    wins = sum(1 for t in closed if (t.result.value if hasattr(t.result, "value") else t.result) == "win")
    losses = sum(1 for t in closed if (t.result.value if hasattr(t.result, "value") else t.result) == "loss")
    pnl = sum(t.profit_loss or 0 for t in closed)

    return {
        "strategy_id": strategy_id,
        "strategy_name": strategy.name,
        "total_trades": total,
        "followed_count": followed,
        "adherence_rate": round(followed / total * 100, 1) if total > 0 else 0,
        "wins": wins,
        "losses": losses,
        "win_rate": round(wins / len(closed) * 100, 1) if closed else 0,
        "net_pnl": round(pnl, 2),
        "avg_score": round(
            sum(t.trade_score or 0 for t in trades) / total, 1
        ) if total > 0 else 0,
    }


@router.post("/{strategy_id}/validate")
async def validate_trade_against_strategy(
    strategy_id: int,
    trade_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Dry-run validation: check if a proposed trade passes strategy rules."""
    from app.services.trade_service import validate_against_strategy

    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id,
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")

    passed = await validate_against_strategy(db, strategy_id, trade_data)
    violations = []

    for rule in strategy.rules:
        if not rule.get("required", True):
            continue
        rtype = rule.get("type")
        rval = rule.get("value")

        if rtype == "session" and trade_data.get("session") != rval:
            violations.append(f"Session must be '{rval}', got '{trade_data.get('session')}'")
        elif rtype == "min_rr":
            rr = trade_data.get("risk_reward_ratio", 0) or 0
            if rr < float(rval):
                violations.append(f"RR {rr:.2f} is below minimum {rval}")
        elif rtype == "pair" and trade_data.get("pair") != rval:
            violations.append(f"Pair must be '{rval}', got '{trade_data.get('pair')}'")
        elif rtype == "max_lot_size":
            ls = trade_data.get("lot_size", 0) or 0
            if ls > float(rval):
                violations.append(f"Lot size {ls} exceeds maximum {rval}")

    return {
        "valid": passed,
        "violations": violations,
        "rules_checked": len(strategy.rules),
    }


@router.delete("/{strategy_id}", status_code=204)
async def delete_strategy(
    strategy_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Strategy).where(
            Strategy.id == strategy_id,
            Strategy.user_id == current_user.id,
        )
    )
    strategy = result.scalar_one_or_none()
    if not strategy:
        raise HTTPException(status_code=404, detail="Strategy not found")
    strategy.is_active = False  # Soft delete
