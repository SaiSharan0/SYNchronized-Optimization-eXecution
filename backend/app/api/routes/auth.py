from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from google.auth.transport import requests
from google.oauth2 import id_token
import secrets

from app.db.database import get_db
from app.models.models import User, UserRole
from app.schemas.schemas import UserCreate, UserLogin, GoogleLogin, Token, UserResponse, UserUpdate
from app.core.config import settings
from app.core.plans import get_user_plan, get_feature_access
from app.core.security import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


def _serialize_user(user: User) -> UserResponse:
    admin_emails = set(settings.ADMIN_USER_EMAILS)
    stored_role = user.role.value if hasattr(user.role, "value") else user.role
    role = "admin" if stored_role == "admin" or (user.email or "").strip().lower() in admin_emails else "user"
    plan = get_user_plan(user.email, set(settings.PRO_USER_EMAILS))
    features = get_feature_access(plan)
    features["system_config"] = role == "admin"

    payload = UserResponse.model_validate(user).model_dump()
    payload["role"] = role
    payload["plan"] = plan
    payload["features"] = features
    return UserResponse(**payload)


@router.post("/register", response_model=Token, status_code=201)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    email = user_data.email.lower()
    result = await db.execute(select(User).where(User.email == email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already taken")

    user = User(
        email=email,
        username=user_data.username,
        hashed_password=hash_password(user_data.password),
        full_name=user_data.full_name,
        role=UserRole.ADMIN if email in set(settings.ADMIN_USER_EMAILS) else UserRole.USER,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=_serialize_user(user))


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )
    if not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=_serialize_user(user))


@router.post("/google", response_model=Token)
async def google_login(payload: GoogleLogin, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=503, detail="Google Sign-In is not configured")

    token = payload.credential or payload.token
    if not token:
        raise HTTPException(status_code=422, detail="Google ID token is required")

    try:
        info = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            settings.GOOGLE_CLIENT_ID,
        )
    except Exception as exc:
        print(f"[Auth] Google credential verification failed: {exc}")
        raise HTTPException(status_code=401, detail="Invalid Google credential")

    email = (info.get("email") or "").lower()
    if not email or not info.get("email_verified"):
        raise HTTPException(status_code=401, detail="Google email is not verified")

    result = await db.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()

    if not user:
        base_username = (email.split("@")[0] or "googleuser").lower()
        username = "".join(ch for ch in base_username if ch.isalnum() or ch in ("_", "-"))[:40] or "googleuser"
        candidate = username
        suffix = 1
        while True:
            existing = await db.execute(select(User).where(User.username == candidate))
            if not existing.scalar_one_or_none():
                break
            suffix += 1
            candidate = f"{username}{suffix}"[:50]

        user = User(
            email=email,
            username=candidate,
            full_name=info.get("name") or candidate,
            avatar_url=info.get("picture"),
            hashed_password=hash_password(secrets.token_urlsafe(32)),
            role=UserRole.ADMIN if email.lower() in set(settings.ADMIN_USER_EMAILS) else UserRole.USER,
            is_verified=True,
        )
        db.add(user)
        await db.flush()
        await db.refresh(user)
    elif not user.is_active:
        raise HTTPException(status_code=403, detail="Account is disabled")

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token, user=_serialize_user(user))


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return _serialize_user(current_user)


@router.put("/me", response_model=UserResponse)
async def update_me(
    update_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    for key, value in update_data.model_dump(exclude_unset=True).items():
        setattr(current_user, key, value)
    await db.flush()
    await db.refresh(current_user)
    return _serialize_user(current_user)


@router.post("/logout")
async def logout():
    return {"message": "Logged out successfully"}
