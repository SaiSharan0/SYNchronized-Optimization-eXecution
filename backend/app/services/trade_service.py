from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from typing import List, Optional

from app.models.models import Trade, Strategy
from app.schemas.schemas import TradeCreate, TradeUpdate


# ── Metric Calculations ──────────────────────────────────────────────────────

def calculate_trade_metrics(data: dict) -> dict:
    """
    Auto-calculate risk, reward, RR ratio, and P&L from trade data.
    Works for both forex pips and other instruments.
    """
    entry = float(data.get("entry_price") or 0)
    sl = float(data.get("stop_loss") or 0)
    tp = float(data.get("take_profit") or 0)
    lot_size = float(data.get("lot_size") or 0)
    trade_type = str(data.get("trade_type") or "buy").lower()

    if not all([entry, sl, tp, lot_size]):
        return {}

    if trade_type == "buy":
        risk_pips = abs(entry - sl)
        reward_pips = abs(tp - entry)
    else:  # sell
        risk_pips = abs(sl - entry)
        reward_pips = abs(entry - tp)

    rr_ratio = round(reward_pips / risk_pips, 2) if risk_pips > 0 else 0

    # P&L calculation (standard forex lot model)
    pnl = None
    pnl_pct = None
    exit_price = data.get("exit_price")

    if exit_price:
        ep = float(exit_price)
        if trade_type == "buy":
            pnl = (ep - entry) * lot_size * 100_000
        else:
            pnl = (entry - ep) * lot_size * 100_000
        margin = entry * lot_size * 1_000
        pnl_pct = (pnl / margin * 100) if margin else 0
        pnl = round(pnl, 2)
        pnl_pct = round(pnl_pct, 2)

    return {
        "risk": round(risk_pips, 6),
        "reward": round(reward_pips, 6),
        "risk_reward_ratio": rr_ratio,
        "profit_loss": pnl,
        "profit_loss_percentage": pnl_pct,
    }


def calculate_trade_score(trade: dict) -> float:
    """
    Score 0–10 based on:
      RR ratio          → 0–3 pts
      Strategy adherence → 0–2 pts
      Notes quality     → 0–1 pt
      Trade result      → 0–2 pts
      Screenshot        → 0–1 pt
      Tags present      → 0–1 pt
    """
    score = 0.0

    rr = float(trade.get("risk_reward_ratio") or 0)
    if rr >= 3:
        score += 3
    elif rr >= 2:
        score += 2
    elif rr >= 1:
        score += 1

    if trade.get("followed_strategy"):
        score += 2

    notes = trade.get("notes") or ""
    if len(notes) > 20:
        score += 1

    result = str(trade.get("result") or "").lower()
    if result == "win":
        score += 2
    elif result == "breakeven":
        score += 1

    if trade.get("screenshot_url"):
        score += 1

    tags = trade.get("tags") or []
    if tags:
        score += 1

    return min(round(score, 1), 10.0)


def _enum_value(value):
    return value.value if hasattr(value, "value") else value


async def validate_against_strategy(
    db: AsyncSession,
    strategy_id: int,
    trade_data: dict,
    user_id: Optional[int] = None,
) -> bool:
    """Validate a proposed trade against all required rules in a strategy."""
    query = select(Strategy).where(Strategy.id == strategy_id)
    if user_id is not None:
        query = query.where(Strategy.user_id == user_id)
    result = await db.execute(query)
    strategy = result.scalar_one_or_none()
    if not strategy:
        return False

    for rule in strategy.rules:
        if not rule.get("required", True):
            continue

        rtype = rule.get("type")
        rval = rule.get("value")

        if rtype == "session":
            allowed = rval if isinstance(rval, list) else [rval]
            if trade_data.get("session") not in allowed:
                return False

        elif rtype == "min_rr":
            rr = float(trade_data.get("risk_reward_ratio") or 0)
            if rr < float(rval):
                return False

        elif rtype == "pair":
            allowed = rval if isinstance(rval, list) else [rval]
            if trade_data.get("pair") not in allowed:
                return False

        elif rtype == "max_lot_size":
            if float(trade_data.get("lot_size") or 0) > float(rval):
                return False

        elif rtype in ("sweep_required", "sweep_condition"):
            tags = [str(tag).lower() for tag in trade_data.get("tags") or []]
            notes = str(trade_data.get("notes") or "").lower()
            has_sweep = "sweep" in tags or "liquidity_sweep" in tags or "sweep" in notes
            if bool(rval) and not has_sweep:
                return False

    return True


# ── CRUD ──────────────────────────────────────────────────────────────────────

async def create_trade(
    db: AsyncSession,
    user_id: int,
    trade_data: TradeCreate,
) -> Trade:
    data = trade_data.model_dump()
    data["user_id"] = user_id

    # Auto-calculate metrics
    metrics = calculate_trade_metrics(data)
    data.update(metrics)

    # Validate against strategy if linked
    if data.get("strategy_id"):
        data["followed_strategy"] = await validate_against_strategy(
            db, data["strategy_id"], data, user_id
        )

    # Score the trade
    data["trade_score"] = calculate_trade_score(data)

    trade = Trade(**data)
    db.add(trade)
    await db.flush()
    await db.refresh(trade)
    return trade


async def get_trades(
    db: AsyncSession,
    user_id: int,
    skip: int = 0,
    limit: int = 50,
    pair: Optional[str] = None,
    session: Optional[str] = None,
    result: Optional[str] = None,
    trade_type: Optional[str] = None,
) -> List[Trade]:
    query = select(Trade).where(Trade.user_id == user_id)

    if pair:
        query = query.where(Trade.pair == pair.upper())
    if session:
        query = query.where(Trade.session == session.lower())
    if result:
        query = query.where(Trade.result == result.lower())
    if trade_type:
        query = query.where(Trade.trade_type == trade_type.lower())

    query = query.order_by(desc(Trade.created_at)).offset(skip).limit(limit)
    rows = await db.execute(query)
    return rows.scalars().all()


async def get_trade(
    db: AsyncSession,
    trade_id: int,
    user_id: int,
) -> Optional[Trade]:
    result = await db.execute(
        select(Trade).where(Trade.id == trade_id, Trade.user_id == user_id)
    )
    return result.scalar_one_or_none()


async def update_trade(
    db: AsyncSession,
    trade_id: int,
    user_id: int,
    update_data: TradeUpdate,
) -> Optional[Trade]:
    trade = await get_trade(db, trade_id, user_id)
    if not trade:
        return None

    update_dict = update_data.model_dump(exclude_unset=True)

    # Recalculate metrics if price data changes
    if "exit_price" in update_dict:
        recalc = {
            "entry_price": trade.entry_price,
            "stop_loss": trade.stop_loss,
            "take_profit": trade.take_profit,
            "lot_size": trade.lot_size,
            "trade_type": (
                trade.trade_type.value
                if hasattr(trade.trade_type, "value")
                else trade.trade_type
            ),
            "exit_price": update_dict["exit_price"],
        }
        update_dict.update(calculate_trade_metrics(recalc))

    for key, value in update_dict.items():
        setattr(trade, key, value)

    # Recalculate score with updated fields
    trade.trade_score = calculate_trade_score({
        "risk_reward_ratio": trade.risk_reward_ratio,
        "followed_strategy": trade.followed_strategy,
        "notes": trade.notes,
        "result": (
            trade.result.value if hasattr(trade.result, "value") else trade.result
        ),
        "screenshot_url": trade.screenshot_url,
        "tags": trade.tags,
    })

    await db.flush()
    await db.refresh(trade)
    return trade


async def delete_trade(
    db: AsyncSession,
    trade_id: int,
    user_id: int,
) -> bool:
    trade = await get_trade(db, trade_id, user_id)
    if not trade:
        return False
    await db.delete(trade)
    return True
