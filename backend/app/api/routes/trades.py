from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
import csv
import io
import os
import uuid
import shutil

from app.db.database import get_db
from app.models.models import AIFeedback, User
from app.schemas.schemas import TradeCreate, TradeUpdate, TradeResponse
from app.services import trade_service
from app.services.ai_service import analyze_trade
from app.core.security import get_current_user
from app.core.config import settings

router = APIRouter()


@router.post("/", response_model=TradeResponse, status_code=201)
async def create_trade(
    trade_data: TradeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trade = await trade_service.create_trade(db, current_user.id, trade_data)

    # Run AI analysis synchronously (fast enough for API use)
    trade_dict = {
        "pair": trade.pair,
        "trade_type": str(trade.trade_type.value) if hasattr(trade.trade_type, "value") else trade.trade_type,
        "session": str(trade.session.value) if hasattr(trade.session, "value") else trade.session,
        "entry_price": trade.entry_price,
        "stop_loss": trade.stop_loss,
        "take_profit": trade.take_profit,
        "exit_price": trade.exit_price,
        "lot_size": trade.lot_size,
        "risk_reward_ratio": trade.risk_reward_ratio,
        "result": str(trade.result.value) if hasattr(trade.result, "value") else trade.result,
        "followed_strategy": trade.followed_strategy,
        "notes": trade.notes,
        "tags": trade.tags or [],
    }

    feedback = await analyze_trade(trade_dict)
    if feedback:
        trade.ai_feedback = feedback
        db.add(AIFeedback(user_id=current_user.id, trade_id=trade.id, payload=feedback))
        await db.flush()
        await db.refresh(trade)

    return trade


@router.get("/", response_model=List[TradeResponse])
async def list_trades(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, le=200),
    pair: Optional[str] = None,
    session: Optional[str] = None,
    result: Optional[str] = None,
    trade_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await trade_service.get_trades(
        db, current_user.id, skip, limit, pair, session, result, trade_type
    )


@router.get("/count")
async def get_trade_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await trade_service.get_trades(db, current_user.id, limit=10000)
    return {"count": len(trades)}


@router.get("/export/csv")
async def export_trades_csv(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await trade_service.get_trades(db, current_user.id, limit=10000)

    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "ID", "Pair", "Type", "Session", "Entry", "Stop Loss", "Take Profit",
        "Exit Price", "Lot Size", "Risk (pips)", "Reward (pips)", "RR Ratio",
        "P&L ($)", "P&L (%)", "Result", "Strategy Followed", "Trade Score",
        "Notes", "Tags", "Entry Time", "Exit Time", "Created At",
    ])

    for t in trades:
        writer.writerow([
            t.id,
            t.pair,
            t.trade_type.value if hasattr(t.trade_type, "value") else t.trade_type,
            t.session.value if hasattr(t.session, "value") else t.session,
            t.entry_price,
            t.stop_loss,
            t.take_profit,
            t.exit_price or "",
            t.lot_size,
            t.risk or "",
            t.reward or "",
            t.risk_reward_ratio or "",
            t.profit_loss or "",
            t.profit_loss_percentage or "",
            t.result.value if hasattr(t.result, "value") else t.result,
            "Yes" if t.followed_strategy else "No",
            t.trade_score or "",
            (t.notes or "").replace("\n", " "),
            ",".join(t.tags or []),
            t.entry_time.isoformat() if t.entry_time else "",
            t.exit_time.isoformat() if t.exit_time else "",
            t.created_at.isoformat() if t.created_at else "",
        ])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=trades_export.csv"},
    )


@router.post("/upload-screenshot")
async def upload_screenshot(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
):
    # Validate file type
    allowed_types = {"image/jpeg", "image/png", "image/webp", "image/gif"}
    if file.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Only image files are allowed")

    # Validate size
    content = await file.read()
    if len(content) > settings.MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5MB)")

    # Save file
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    ext = file.filename.rsplit(".", 1)[-1] if "." in file.filename else "jpg"
    filename = f"{current_user.id}_{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(settings.UPLOAD_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    return {"url": f"/uploads/{filename}", "filename": filename}


@router.get("/{trade_id}", response_model=TradeResponse)
async def get_trade(
    trade_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trade = await trade_service.get_trade(db, trade_id, current_user.id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.put("/{trade_id}", response_model=TradeResponse)
async def update_trade(
    trade_id: int,
    update_data: TradeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trade = await trade_service.update_trade(db, trade_id, current_user.id, update_data)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.post("/{trade_id}/reanalyze")
async def reanalyze_trade(
    trade_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Force re-run of AI analysis on an existing trade."""
    trade = await trade_service.get_trade(db, trade_id, current_user.id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")

    trade_dict = {
        "pair": trade.pair,
        "trade_type": str(trade.trade_type.value) if hasattr(trade.trade_type, "value") else trade.trade_type,
        "session": str(trade.session.value) if hasattr(trade.session, "value") else trade.session,
        "entry_price": trade.entry_price,
        "stop_loss": trade.stop_loss,
        "take_profit": trade.take_profit,
        "exit_price": trade.exit_price,
        "lot_size": trade.lot_size,
        "risk_reward_ratio": trade.risk_reward_ratio,
        "result": str(trade.result.value) if hasattr(trade.result, "value") else trade.result,
        "followed_strategy": trade.followed_strategy,
        "notes": trade.notes,
        "tags": trade.tags or [],
    }

    feedback = await analyze_trade(trade_dict)
    if feedback:
        trade.ai_feedback = feedback
        db.add(AIFeedback(user_id=current_user.id, trade_id=trade.id, payload=feedback))
        await db.flush()

    return {"feedback": feedback, "trade_id": trade_id}


@router.delete("/{trade_id}", status_code=204)
async def delete_trade(
    trade_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    deleted = await trade_service.delete_trade(db, trade_id, current_user.id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Trade not found")
