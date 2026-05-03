import asyncio
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, func

from app.db.database import AsyncSessionLocal, engine, Base
from app.models.models import Alert, AlertType, Strategy, Trade, User
from app.services.trade_service import calculate_trade_metrics, calculate_trade_score


DEMO_TRADES = [
    {
        "pair": "XAU/USD",
        "trade_type": "buy",
        "session": "london",
        "entry_price": 2318.4,
        "stop_loss": 2311.2,
        "take_profit": 2334.8,
        "exit_price": 2332.1,
        "lot_size": 0.03,
        "result": "win",
        "notes": "London continuation after liquidity sweep and reclaim. Waited for candle close before entry.",
        "tags": ["liquidity", "continuation", "london"],
        "followed_strategy": True,
    },
    {
        "pair": "EUR/USD",
        "trade_type": "sell",
        "session": "new_york",
        "entry_price": 1.0872,
        "stop_loss": 1.0901,
        "take_profit": 1.0812,
        "exit_price": 1.0838,
        "lot_size": 0.2,
        "result": "win",
        "notes": "NY reversal from supply. Reduced risk after first push stalled near the midline.",
        "tags": ["supply", "reversal"],
        "followed_strategy": True,
    },
    {
        "pair": "GBP/USD",
        "trade_type": "buy",
        "session": "london",
        "entry_price": 1.2635,
        "stop_loss": 1.2609,
        "take_profit": 1.2687,
        "exit_price": 1.2618,
        "lot_size": 0.12,
        "result": "loss",
        "notes": "Entered before confirmation. Good setup idea, poor timing.",
        "tags": ["breakout", "early-entry"],
        "followed_strategy": False,
    },
    {
        "pair": "USD/JPY",
        "trade_type": "sell",
        "session": "asian",
        "entry_price": 155.62,
        "stop_loss": 155.98,
        "take_profit": 154.88,
        "exit_price": 155.61,
        "lot_size": 0.08,
        "result": "breakeven",
        "notes": "Moved stop after momentum failed. Protected capital instead of forcing the trade.",
        "tags": ["range", "risk-control"],
        "followed_strategy": True,
    },
    {
        "pair": "BTC/USD",
        "trade_type": "buy",
        "session": "overlap",
        "entry_price": 64250,
        "stop_loss": 63380,
        "take_profit": 66100,
        "exit_price": None,
        "lot_size": 0.01,
        "result": "pending",
        "notes": "Breakout retest position. Waiting for either target or invalidation.",
        "tags": ["crypto", "retest"],
        "followed_strategy": True,
    },
]


async def seed_user(db, user):
    trade_count = await db.scalar(select(func.count(Trade.id)).where(Trade.user_id == user.id))
    if trade_count:
        return False

    strategy = Strategy(
        user_id=user.id,
        name="Liquidity Pullback Plan",
        description="Trade with session bias, wait for sweep/reclaim, and require at least 1.5R.",
        rules=[
            {"id": "session", "type": "session", "label": "London or NY only", "value": ["london", "new_york", "overlap"], "required": True},
            {"id": "rr", "type": "min_rr", "label": "Minimum 1.5R", "value": 1.5, "required": True},
            {"id": "risk", "type": "max_lot_size", "label": "Keep size controlled", "value": 0.25, "required": True},
        ],
    )
    db.add(strategy)
    await db.flush()

    now = datetime.now(UTC).replace(tzinfo=None)
    for index, item in enumerate(DEMO_TRADES):
        data = {
            **item,
            "user_id": user.id,
            "strategy_id": strategy.id if item["followed_strategy"] else None,
            "entry_time": now - timedelta(days=6 - index, hours=index),
            "exit_time": None if item["result"] == "pending" else now - timedelta(days=6 - index, hours=index - 2),
        }
        data.update(calculate_trade_metrics(data))
        data["trade_score"] = calculate_trade_score(data)
        data["ai_feedback"] = {
            "score": data["trade_score"],
            "strengths": ["Clear risk level", "Journal note recorded"],
            "mistakes": [] if item["followed_strategy"] else ["Entered before full confirmation"],
            "suggestions": ["Keep position size consistent", "Review screenshot before next session"],
            "detailed_analysis": "Demo analysis to show how AI feedback appears in the trade detail view.",
            "risk_assessment": "Risk stayed within the sample plan.",
            "psychology_note": "The note focuses on process, not only outcome.",
        }
        db.add(Trade(**data))

    db.add_all([
        Alert(
            user_id=user.id,
            type=AlertType.PERFORMANCE,
            title="Win rate check",
            message="Review your playbook if win rate drops below 45%.",
            condition={"min_win_rate": 45},
        ),
        Alert(
            user_id=user.id,
            type=AlertType.BEHAVIOR,
            title="Overtrading guard",
            message="Slow down if you place too many trades in one day.",
            condition={"on_overtrade": True},
        ),
    ])
    return True


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        users = (await db.execute(select(User))).scalars().all()
        seeded = 0
        for user in users:
            if await seed_user(db, user):
                seeded += 1
        await db.commit()
        print(f"Seeded demo data for {seeded} user(s).")
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
