from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_admin
from app.db.database import get_db
from app.models.models import Trade, User
from app.schemas.schemas import TradeResponse, UserResponse
from app.services.analytics_service import compute_platform_stats

router = APIRouter()


@router.get("/stats")
async def platform_stats(
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    return await compute_platform_stats(db)


@router.get("/users", response_model=list[UserResponse])
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).order_by(User.created_at.desc()).offset(skip).limit(limit))
    users = result.scalars().all()
    payload = []
    for user in users:
        role = user.role.value if hasattr(user.role, "value") else user.role
        item = UserResponse.model_validate(user).model_dump()
        item["role"] = role or "user"
        item["plan"] = "admin" if item["role"] == "admin" else "free"
        item["features"] = {"system_config": item["role"] == "admin"}
        payload.append(UserResponse(**item))
    return payload


@router.get("/trades", response_model=list[TradeResponse])
async def list_all_trades(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Trade).order_by(Trade.created_at.desc()).offset(skip).limit(limit))
    return result.scalars().all()


@router.get("/counts")
async def counts(
    _admin: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    users = await db.scalar(select(func.count()).select_from(User))
    trades = await db.scalar(select(func.count()).select_from(Trade))
    return {"users": users or 0, "trades": trades or 0}
