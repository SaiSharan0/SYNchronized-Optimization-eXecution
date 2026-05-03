from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from datetime import datetime

from app.db.database import get_db
from app.models.models import User, Alert
from app.schemas.schemas import AlertCreate, AlertResponse
from app.core.security import get_current_user
from app.services.alert_service import (
    send_telegram_message,
    format_trade_alert,
    format_performance_alert,
)
from app.services.analytics_service import compute_analytics

router = APIRouter()


@router.post("/", response_model=AlertResponse, status_code=201)
async def create_alert(
    alert_data: AlertCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    alert = Alert(user_id=current_user.id, **alert_data.model_dump())
    db.add(alert)
    await db.flush()
    await db.refresh(alert)
    return alert


@router.get("/", response_model=List[AlertResponse])
async def list_alerts(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert)
        .where(Alert.user_id == current_user.id)
        .order_by(Alert.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{alert_id}", response_model=AlertResponse)
async def get_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    return alert


@router.put("/{alert_id}/toggle", response_model=AlertResponse)
async def toggle_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert.is_active = not alert.is_active
    await db.flush()
    await db.refresh(alert)
    return alert


@router.delete("/{alert_id}", status_code=204)
async def delete_alert(
    alert_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Alert).where(Alert.id == alert_id, Alert.user_id == current_user.id)
    )
    alert = result.scalar_one_or_none()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    await db.delete(alert)


# ── Telegram ──────────────────────────────────────────────────────────────────

@router.post("/telegram/test")
async def test_telegram(
    current_user: User = Depends(get_current_user),
):
    """Send a test Telegram message to the user's configured chat."""
    chat_id = current_user.telegram_chat_id
    if not chat_id:
        raise HTTPException(
            status_code=400,
            detail="Telegram Chat ID not configured. Update it in your profile (/api/v1/auth/me).",
        )

    success = await send_telegram_message(
        chat_id,
        "🤖 <b>AI Trading Intelligence System</b>\n\nTelegram connection is working! ✅\nYou'll receive trade alerts and performance updates here.",
    )

    if not success:
        raise HTTPException(
            status_code=502,
            detail="Failed to send Telegram message. Check TELEGRAM_BOT_TOKEN in your .env",
        )

    return {"success": True, "message": "Test message sent to Telegram"}


@router.post("/telegram/performance")
async def send_performance_summary(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send current performance summary to Telegram."""
    chat_id = current_user.telegram_chat_id
    if not chat_id:
        raise HTTPException(status_code=400, detail="Telegram Chat ID not configured")

    analytics = await compute_analytics(db, current_user.id)
    message = format_performance_alert(analytics)

    success = await send_telegram_message(chat_id, message)
    return {"success": success}


@router.post("/check-conditions")
async def check_alert_conditions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Evaluate all active alerts against current conditions.
    Triggers any that meet their conditions and sends Telegram messages.
    """
    result = await db.execute(
        select(Alert).where(
            Alert.user_id == current_user.id,
            Alert.is_active == True,
            Alert.is_triggered == False,
        )
    )
    active_alerts = result.scalars().all()

    analytics = await compute_analytics(db, current_user.id)
    triggered = []

    for alert in active_alerts:
        condition = alert.condition or {}
        should_trigger = False

        # Win rate threshold
        if "min_win_rate" in condition:
            if analytics["win_rate"] >= condition["min_win_rate"]:
                should_trigger = True

        # Drawdown threshold
        if "max_drawdown" in condition:
            if analytics["max_drawdown"] >= condition["max_drawdown"]:
                should_trigger = True

        # Overtrading detection
        if condition.get("on_overtrade") and analytics["overtrading_detected"]:
            should_trigger = True

        # Revenge trading detection
        if condition.get("on_revenge_trade") and analytics["revenge_trading_detected"]:
            should_trigger = True

        if should_trigger:
            alert.is_triggered = True
            alert.triggered_at = datetime.utcnow()

            if current_user.telegram_chat_id:
                msg = f"🚨 <b>Alert: {alert.title}</b>\n\n{alert.message}"
                sent = await send_telegram_message(current_user.telegram_chat_id, msg)
                alert.sent_telegram = sent

            triggered.append({"id": alert.id, "title": alert.title})

    await db.flush()
    return {"triggered": triggered, "checked": len(active_alerts)}
