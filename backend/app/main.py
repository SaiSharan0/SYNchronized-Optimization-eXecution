from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import text
import os
import time

from app.core.config import settings
from app.db.database import engine, Base
from app.api.routes import admin, ai_analysis, alerts, analytics, auth, strategy, trades


# ── Lifespan ──────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create DB tables on startup (for dev; use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(5) NOT NULL DEFAULT 'user'"))
    # Ensure uploads dir exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    yield
    await engine.dispose()


# ── App ───────────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Trading Intelligence System",
    description=(
        "Production-grade trading journal with AI analysis, strategy validation, "
        "analytics engine, and Telegram alerts."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)


# ── Middleware ────────────────────────────────────────────────────────────────

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_timing(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    duration = round((time.perf_counter() - start) * 1000, 1)
    response.headers["X-Process-Time-Ms"] = str(duration)
    return response


# ── Static files (screenshots) ────────────────────────────────────────────────

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ── Routes ────────────────────────────────────────────────────────────────────

API = "/api/v1"
app.include_router(auth.router,        prefix=f"{API}/auth",      tags=["Auth"])
app.include_router(trades.router,      prefix=f"{API}/trades",    tags=["Trades"])
app.include_router(analytics.router,   prefix=f"{API}/analytics", tags=["Analytics"])
app.include_router(ai_analysis.router, prefix=f"{API}/ai",        tags=["AI Analysis"])
app.include_router(alerts.router,      prefix=f"{API}/alerts",    tags=["Alerts"])
app.include_router(strategy.router,    prefix=f"{API}/strategy",  tags=["Strategy"])
app.include_router(admin.router,       prefix=f"{API}/admin",     tags=["Admin"])


# ── Health & Info ─────────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "openai_configured": bool(settings.OPENAI_API_KEY),
        "telegram_configured": bool(settings.TELEGRAM_BOT_TOKEN),
    }


@app.get("/api/v1/info", tags=["System"])
async def api_info():
    return {
        "name": settings.APP_NAME,
        "version": "1.0.0",
        "endpoints": {
            "auth": f"{API}/auth",
            "trades": f"{API}/trades",
            "analytics": f"{API}/analytics",
            "ai": f"{API}/ai",
            "alerts": f"{API}/alerts",
            "strategy": f"{API}/strategy",
        },
    }
