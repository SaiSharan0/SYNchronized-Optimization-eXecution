# AI Trading Intelligence System — Backend

FastAPI · MySQL · SQLAlchemy (async) · OpenAI · Telegram

---

## Quick Start

### Option A — Docker (recommended, zero setup)

```bash
cp .env.example .env          # local only, do not commit
docker compose up --build     # starts mysql + api
```

API available at **http://localhost:8000**
Docs at **http://localhost:8000/docs**

---

### Option B — Local (Python 3.11+)

#### 1 — MySQL

```bash
# macOS
brew install mysql && brew services start mysql
mysql -u root -e "CREATE DATABASE IF NOT EXISTS trading_db;"

# Ubuntu
sudo apt install mysql-server && sudo service mysql start
mysql -u root -e "CREATE DATABASE IF NOT EXISTS trading_db;"
```

#### 2 — Python environment

```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

#### 3 — Environment variables

```bash
cp .env.example .env
# Edit .env — at minimum set DATABASE_URL
```

#### 4 — Database migrations

```bash
# FastAPI auto-creates tables on startup (dev/local)
# Tables are created automatically via Base.metadata.create_all
# (Alembic can be re-initialized later for managed migrations)
```

#### 5 — Run the server

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Environment Variables (backend/.env)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | MySQL async URL (`mysql+aiomysql://...`) |
| `JWT_SECRET_KEY` | ✅ | Min 32 chars random string |
| `OPENAI_API_KEY` | ⚠️ | For AI feedback (mocks used if absent) |
| `TELEGRAM_BOT_TOKEN` | ⚠️ | For alert notifications |
| `TELEGRAM_CHAT_ID` | ⚠️ | Default Telegram chat target |
| `ALLOWED_ORIGINS` | ✅ | JSON array of allowed CORS origins |

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/auth/register` | Create account |
| POST | `/api/v1/auth/login` | Login → JWT token |
| GET | `/api/v1/auth/me` | Current user profile |
| PUT | `/api/v1/auth/me` | Update profile |
| POST | `/api/v1/auth/logout` | Logout (client drops token) |

### Trades
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/trades/` | Create trade (AI analysis runs automatically) |
| GET | `/api/v1/trades/` | List trades (with filters: pair, session, result, type) |
| GET | `/api/v1/trades/{id}` | Trade detail |
| PUT | `/api/v1/trades/{id}` | Update trade |
| DELETE | `/api/v1/trades/{id}` | Delete trade |
| POST | `/api/v1/trades/{id}/reanalyze` | Re-run AI analysis |
| GET | `/api/v1/trades/export/csv` | Export all trades as CSV |
| POST | `/api/v1/trades/upload-screenshot` | Upload screenshot image |

### Analytics
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/analytics/` | Full analytics (all time) |
| GET | `/api/v1/analytics/summary` | Fast KPI summary for dashboard |
| GET | `/api/v1/analytics/equity-curve` | Equity curve data points |
| GET | `/api/v1/analytics/by-session` | Session performance breakdown |
| GET | `/api/v1/analytics/by-pair` | Pair performance breakdown |
| GET | `/api/v1/analytics/behavior` | Overtrading / revenge trade detection |
| GET | `/api/v1/analytics/period?period=30d` | Period-filtered analytics (7d/30d/90d/1y) |

### AI Analysis
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/ai/analyze/{trade_id}` | Analyse a specific trade |
| GET | `/api/v1/ai/feedback/{trade_id}` | Get stored AI feedback |
| POST | `/api/v1/ai/portfolio` | Macro portfolio pattern analysis |
| POST | `/api/v1/ai/batch?limit=10` | Batch-analyse unanalysed trades |

### Strategy
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/strategy/` | Create strategy with rules |
| GET | `/api/v1/strategy/` | List strategies |
| GET | `/api/v1/strategy/{id}` | Strategy detail |
| PUT | `/api/v1/strategy/{id}` | Update strategy |
| DELETE | `/api/v1/strategy/{id}` | Soft-delete strategy |
| GET | `/api/v1/strategy/{id}/performance` | Win rate / adherence stats |
| POST | `/api/v1/strategy/{id}/validate` | Dry-run trade validation |

### Alerts
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/v1/alerts/` | Create alert |
| GET | `/api/v1/alerts/` | List alerts |
| PUT | `/api/v1/alerts/{id}/toggle` | Enable / disable alert |
| DELETE | `/api/v1/alerts/{id}` | Delete alert |
| POST | `/api/v1/alerts/telegram/test` | Send Telegram test message |
| POST | `/api/v1/alerts/telegram/performance` | Send performance summary |
| POST | `/api/v1/alerts/check-conditions` | Evaluate all active alerts |

---

## Strategy Rule Types

When creating a strategy, each rule object must have:

```json
{
  "id": "rule_1",
  "type": "session",
  "label": "London session only",
  "value": "london",
  "required": true
}
```

Supported `type` values:

| Type | Value example | Description |
|---|---|---|
| `session` | `"london"` | Required trading session |
| `min_rr` | `2.0` | Minimum risk-reward ratio |
| `pair` | `"EUR/USD"` | Allowed currency pair |
| `max_lot_size` | `0.1` | Maximum lot size |
| `condition` | `"Sweep required"` | Custom rule label (manual check) |

---

## Project Structure

```
backend/
├── app/
│   ├── main.py                  # FastAPI app + middleware + router mounting
│   ├── core/
│   │   ├── config.py            # Pydantic settings (env vars)
│   │   └── security.py          # JWT + password hashing
│   ├── db/
│   │   └── database.py          # Async SQLAlchemy engine + session
│   ├── models/
│   │   └── models.py            # ORM models: User, Trade, Strategy, Alert
│   ├── schemas/
│   │   └── schemas.py           # Pydantic request/response schemas
│   ├── services/
│   │   ├── user_service.py      # User DB queries
│   │   ├── trade_service.py     # Trade CRUD + metric calculations
│   │   ├── analytics_service.py # Full analytics engine
│   │   ├── ai_service.py        # OpenAI integration + mock fallback
│   │   └── alert_service.py     # Telegram messaging
│   ├── api/routes/
│   │   ├── auth.py              # Register, login, profile
│   │   ├── trades.py            # Trade CRUD + CSV export
│   │   ├── analytics.py         # Analytics endpoints
│   │   ├── ai_analysis.py       # AI endpoints
│   │   ├── alerts.py            # Alert management + Telegram
│   │   └── strategy.py          # Strategy CRUD + validation
│   └── utils/
│       ├── pagination.py        # Generic paginated response
│       └── validators.py        # Input sanitization helpers
├── alembic/
│   ├── env.py                   # Async Alembic configuration
│   ├── script.py.mako           # Migration template
│   └── versions/                # Add revisions here if Alembic is re-enabled
├── alembic.ini
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── .env.example
└── README.md
```

---

## Telegram Setup

1. Message [@BotFather](https://t.me/BotFather) on Telegram → `/newbot`
2. Copy the bot token → set `TELEGRAM_BOT_TOKEN` in `.env`
3. Start a conversation with your bot
4. Get your chat ID from [@userinfobot](https://t.me/userinfobot)
5. Set `TELEGRAM_CHAT_ID` in `.env` or update via `PUT /api/v1/auth/me`
6. Test: `POST /api/v1/alerts/telegram/test`

---

## Creating a Migration After Model Changes

```bash
alembic revision --autogenerate -m "add new column"
alembic upgrade head
```
