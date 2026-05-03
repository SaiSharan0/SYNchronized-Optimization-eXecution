# SYNchronized Optimization eXecution

> Production-grade AI-powered trading journal, analytics engine, and decision intelligence platform.

---

## 📁 Project Structure

```
SYNchronized-Optimization-eXecution/
│
├── backend/                        ← FastAPI Python backend
│   ├── app/
│   │   ├── main.py                 ← FastAPI app + middleware + routes
│   │   ├── core/
│   │   │   ├── config.py           ← Pydantic settings (env vars)
│   │   │   └── security.py         ← JWT + bcrypt password hashing
│   │   ├── db/
│   │   │   └── database.py         ← Async SQLAlchemy engine + session
│   │   ├── models/
│   │   │   └── models.py           ← ORM: User, Trade, Strategy, Alert
│   │   ├── schemas/
│   │   │   └── schemas.py          ← Pydantic request/response schemas
│   │   ├── services/
│   │   │   ├── user_service.py     ← User queries
│   │   │   ├── trade_service.py    ← Trade CRUD + metric calculations
│   │   │   ├── analytics_service.py← Full analytics engine
│   │   │   ├── ai_service.py       ← OpenAI integration + mock fallback
│   │   │   └── alert_service.py    ← Telegram messaging
│   │   └── api/routes/
│   │       ├── auth.py             ← Register, login, profile
│   │       ├── trades.py           ← Trade CRUD + CSV export
│   │       ├── analytics.py        ← Analytics endpoints
│   │       ├── ai_analysis.py      ← AI analysis endpoints
│   │       ├── alerts.py           ← Alert management + Telegram
│   │       └── strategy.py         ← Strategy CRUD + validation
│   ├── alembic/                    ← Database migrations
│   │   └── versions/
│   ├── alembic.ini
│   ├── docker-compose.yml
├── docs/
│   └── PHASE1_SETUP_AUTH_UI.md
│   ├── Dockerfile
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                       ← Next.js 14 frontend
│   ├── pages/
│   │   ├── _app.js                 ← App wrapper + AuthProvider
│   │   ├── _document.js            ← HTML document
│   │   ├── index.js                ← Dashboard
│   │   ├── journal.js              ← Trade Journal (table + filters)
│   │   ├── analytics.js            ← Analytics (charts + metrics)
│   │   ├── strategy.js             ← Strategy Validator
│   │   ├── alerts.js               ← Alert System + Telegram
│   │   ├── settings.js             ← Profile + integrations
│   │   ├── login.js                ← Login page
│   │   ├── register.js             ← Register page
│   │   └── 404.js                  ← Not found
│   ├── components/
│   │   ├── Layout.js               ← Auth guard + main layout
│   │   ├── Sidebar.js              ← Collapsible navigation
│   │   ├── StatCard.js             ← KPI metric card
│   │   ├── Badges.js               ← Badge, ResultBadge, ScoreRing…
│   │   ├── TradeModal.js           ← Create/Edit trade modal
│   │   └── TradeDetailModal.js     ← Trade detail + AI feedback
│   ├── context/
│   │   └── AuthContext.js          ← Global auth state
│   ├── lib/
│   │   ├── api.js                  ← Axios API client
│   │   └── utils.js                ← Formatters, colors, helpers
│   ├── styles/
│   │   └── globals.css             ← Tailwind + custom styles
│   ├── package.json
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── .env.local.example
│
└── README.md
```

---

## ⚡ Quickstart (Docker — easiest)

**Requirements:** Docker + Docker Compose installed.

```bash
# 1. Clone / download the project
cd backend

# 2. Copy and fill environment variables
cp .env.example .env
# Edit .env — minimum: set OPENAI_API_KEY (optional for mocks)

# 3. Start MySQL + Backend API
docker compose up --build -d

# 4. In a second terminal — start the frontend
cd ../frontend
cp .env.local.example .env.local
npm install
npm run dev
```

Open **http://localhost:3000** → Register → Start trading.  
Backend API docs: **http://localhost:8000/docs**

---

## 🛠 Manual Setup (No Docker)

### 1. MySQL

**macOS (Homebrew):**
```bash
brew install mysql
brew services start mysql
mysql -u root -e "CREATE DATABASE IF NOT EXISTS trading_db;"
```

**Ubuntu / Debian:**
```bash
sudo apt update && sudo apt install -y mysql-server
sudo service mysql start
mysql -u root -e "CREATE DATABASE IF NOT EXISTS trading_db;"
```

**Windows:**
Download and install from https://dev.mysql.com/downloads/installer/  
Then open MySQL Workbench or mysql CLI and run: `CREATE DATABASE trading_db;`

---

### 2. Backend Setup

**Requirements:** Python 3.11 or 3.12

```bash
cd ai-trading-system/backend

# Create virtual environment
python -m venv .venv

# Activate
# macOS/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

---

### 3. Backend Environment Variables

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in:

```env
# Required
DATABASE_URL=mysql+aiomysql://root:your_password@localhost:3306/trading_db
JWT_SECRET_KEY=replace-with-random-32-char-string-minimum
SECRET_KEY=replace-with-another-random-32-char-string

# Optional — AI analysis (mock fallback used if absent)
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4o

# Optional — Telegram alerts
TELEGRAM_BOT_TOKEN=bot1234567890:your-bot-token
TELEGRAM_CHAT_ID=your-default-chat-id

# CORS — must match your frontend URL
ALLOWED_ORIGINS=["http://localhost:3000"]
```

> **Generate secret keys:**
> ```bash
> python -c "import secrets; print(secrets.token_urlsafe(32))"
> ```

---

### 4. Run Database Migrations

```bash
# Auto-create on startup (development/local)
# Tables are created automatically when the server starts — no extra step needed.

# Optional: if you want Alembic-managed migrations later,
# initialize a new revision set for MySQL.
```

---

### 5. Run the Backend

```bash
uvicorn app.main:app --reload --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete.
```

Interactive API docs: **http://localhost:8000/docs**

---

### 6. Frontend Setup

**Requirements:** Node.js 18+

```bash
cd ai-trading-system/frontend

# Copy environment file
cp .env.local.example .env.local
# .env.local contains: NEXT_PUBLIC_API_URL=http://localhost:8000

# Install dependencies
npm install

# Start development server
npm run dev
```

Open **http://localhost:3000**

---

### 7. Connect Everything

With both servers running:

| Service   | URL                           |
|-----------|-------------------------------|
| Frontend  | http://localhost:3000         |
| Backend   | http://localhost:8000         |
| API Docs  | http://localhost:8000/docs    |
| ReDoc     | http://localhost:8000/redoc   |

1. Go to **http://localhost:3000/register**
2. Create your account
3. You'll be redirected to the Dashboard
4. Go to **Journal → New Trade** to add your first trade
5. AI analysis runs automatically on save

---

## 🔌 Complete API Reference

### Authentication
| Method | Endpoint              | Description              |
|--------|-----------------------|--------------------------|
| POST   | `/api/v1/auth/register` | Create account          |
| POST   | `/api/v1/auth/login`    | Login → JWT token       |
| GET    | `/api/v1/auth/me`       | Current user            |
| PUT    | `/api/v1/auth/me`       | Update profile          |
| POST   | `/api/v1/auth/logout`   | Logout                  |

### Trades
| Method | Endpoint                        | Description                    |
|--------|---------------------------------|--------------------------------|
| POST   | `/api/v1/trades/`               | Create trade (AI auto-runs)   |
| GET    | `/api/v1/trades/`               | List trades (filter: pair/session/result/type) |
| GET    | `/api/v1/trades/{id}`           | Trade detail                  |
| PUT    | `/api/v1/trades/{id}`           | Update trade                  |
| DELETE | `/api/v1/trades/{id}`           | Delete trade                  |
| POST   | `/api/v1/trades/{id}/reanalyze` | Re-run AI analysis            |
| GET    | `/api/v1/trades/export/csv`     | Export all trades as CSV      |
| POST   | `/api/v1/trades/upload-screenshot` | Upload screenshot image    |

### Analytics
| Method | Endpoint                          | Description                      |
|--------|-----------------------------------|----------------------------------|
| GET    | `/api/v1/analytics/`              | Full analytics (all-time)       |
| GET    | `/api/v1/analytics/summary`       | Fast KPI summary for dashboard  |
| GET    | `/api/v1/analytics/equity-curve`  | Equity curve data points        |
| GET    | `/api/v1/analytics/by-session`    | Session performance breakdown   |
| GET    | `/api/v1/analytics/by-pair`       | Pair performance breakdown      |
| GET    | `/api/v1/analytics/behavior`      | Overtrading / revenge detection |
| GET    | `/api/v1/analytics/period?period=30d` | Period-filtered (7d/30d/90d/1y) |

### AI Analysis
| Method | Endpoint                      | Description                       |
|--------|-------------------------------|-----------------------------------|
| POST   | `/api/v1/ai/analyze/{id}`     | Analyse a specific trade         |
| GET    | `/api/v1/ai/feedback/{id}`    | Get stored AI feedback           |
| POST   | `/api/v1/ai/portfolio`        | Macro portfolio analysis          |
| POST   | `/api/v1/ai/batch?limit=10`   | Batch-analyse unanalysed trades  |

### Strategy
| Method | Endpoint                          | Description                     |
|--------|-----------------------------------|---------------------------------|
| POST   | `/api/v1/strategy/`               | Create strategy with rules     |
| GET    | `/api/v1/strategy/`               | List active strategies         |
| GET    | `/api/v1/strategy/{id}`           | Strategy detail                |
| PUT    | `/api/v1/strategy/{id}`           | Update strategy                |
| DELETE | `/api/v1/strategy/{id}`           | Soft-delete strategy           |
| GET    | `/api/v1/strategy/{id}/performance` | Win rate + adherence stats   |
| POST   | `/api/v1/strategy/{id}/validate`  | Dry-run trade validation       |

### Alerts
| Method | Endpoint                            | Description                    |
|--------|-------------------------------------|--------------------------------|
| POST   | `/api/v1/alerts/`                   | Create alert                  |
| GET    | `/api/v1/alerts/`                   | List alerts                   |
| PUT    | `/api/v1/alerts/{id}/toggle`        | Enable / disable              |
| DELETE | `/api/v1/alerts/{id}`               | Delete alert                  |
| POST   | `/api/v1/alerts/telegram/test`      | Send test Telegram message    |
| POST   | `/api/v1/alerts/telegram/performance` | Send performance summary    |
| POST   | `/api/v1/alerts/check-conditions`   | Evaluate all active alerts    |

---

## 🧠 Database Schema

### `users`
| Column             | Type        | Description               |
|--------------------|-------------|---------------------------|
| id                 | Integer PK  |                           |
| email              | String(255) | Unique                    |
| username           | String(100) | Unique                    |
| hashed_password    | String(255) | bcrypt                    |
| full_name          | String(255) |                           |
| telegram_chat_id   | String(100) | For Telegram alerts       |
| is_active          | Boolean     |                           |
| created_at         | DateTime    |                           |

### `trades`
| Column              | Type       | Description                        |
|---------------------|------------|------------------------------------|
| id                  | Integer PK |                                    |
| user_id             | FK → users |                                    |
| strategy_id         | FK → strat |                                    |
| pair                | String(20) | EUR/USD, XAU/USD, etc.            |
| trade_type          | Enum       | buy / sell                        |
| session             | Enum       | asian / london / new_york / overlap|
| result              | Enum       | win / loss / breakeven / pending  |
| entry_price         | Float      |                                    |
| stop_loss           | Float      |                                    |
| take_profit         | Float      |                                    |
| exit_price          | Float      |                                    |
| lot_size            | Float      |                                    |
| risk                | Float      | Auto-calculated pips              |
| reward              | Float      | Auto-calculated pips              |
| risk_reward_ratio   | Float      | Auto-calculated                   |
| profit_loss         | Float      | Auto-calculated $                 |
| profit_loss_pct     | Float      | Auto-calculated %                 |
| followed_strategy   | Boolean    | Validated against rules           |
| trade_score         | Float      | 0–10 quality score                |
| notes               | Text       |                                    |
| screenshot_url      | String     |                                    |
| tags                | JSON       | String array                      |
| ai_feedback         | JSON       | {strengths, mistakes, suggestions}|
| entry_time          | DateTime   |                                    |
| exit_time           | DateTime   |                                    |

### `strategies`
| Column      | Type       | Description              |
|-------------|------------|--------------------------|
| id          | Integer PK |                          |
| user_id     | FK → users |                          |
| name        | String     |                          |
| description | Text       |                          |
| rules       | JSON       | Array of rule objects    |
| is_active   | Boolean    |                          |

### `alerts`
| Column       | Type       | Description                   |
|--------------|------------|-------------------------------|
| id           | Integer PK |                               |
| user_id      | FK → users |                               |
| type         | Enum       | performance/behavior/price    |
| title        | String     |                               |
| message      | Text       |                               |
| condition    | JSON       | Auto-trigger conditions       |
| is_active    | Boolean    |                               |
| is_triggered | Boolean    |                               |
| sent_telegram| Boolean    |                               |

---

## 📦 Strategy Rule Types

```json
{
  "id":       "rule_1",
  "type":     "session",
  "label":    "London session only",
  "value":    "london",
  "required": true
}
```

| Type           | Example value | Description              |
|----------------|---------------|--------------------------|
| `session`      | `"london"`    | Required session         |
| `min_rr`       | `2.0`         | Minimum risk-reward      |
| `pair`         | `"EUR/USD"`   | Allowed pair             |
| `max_lot_size` | `0.1`         | Maximum lot size         |
| `condition`    | `"Sweep req"` | Custom / manual check    |

---

## 🔑 Environment Variables

### Backend (`backend/.env`)
```env
DATABASE_URL=mysql+aiomysql://root:your_password@localhost:3306/trading_db
SECRET_KEY=<random 32+ chars>
JWT_SECRET_KEY=<random 32+ chars>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
TELEGRAM_BOT_TOKEN=bot...:...
TELEGRAM_CHAT_ID=123456789
ALLOWED_ORIGINS=["http://localhost:3000"]
UPLOAD_DIR=uploads
MAX_FILE_SIZE=5242880
DEBUG=false
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 🐳 Docker Reference

```bash
# Start everything (mysql + api)
docker compose up --build

# Background mode
docker compose up -d

# View logs
docker compose logs -f api

# Stop everything
docker compose down

# Reset database (⚠️ destroys data)
docker compose down -v
```

---

## 🚀 Production Deployment Hints

1. **Backend**: Deploy to Railway, Render, or Fly.io — set all env vars in their dashboard
2. **Frontend**: Deploy to Vercel — set `NEXT_PUBLIC_API_URL` to your backend URL
3. **Database**: Use a managed MySQL service (PlanetScale, Aiven, Railway) — update `DATABASE_URL`
4. **Secrets**: Never commit `.env` files — use platform secret managers

```bash
# Production backend
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Production frontend
npm run build
npm start
```

---

## ✅ Feature Checklist

| Feature                     | Status |
|-----------------------------|--------|
| JWT Authentication          | ✅     |
| Trade Journal (CRUD)        | ✅     |
| Auto Risk/Reward Calc       | ✅     |
| Trade Scoring (0-10)        | ✅     |
| Dashboard with Charts       | ✅     |
| Equity Curve                | ✅     |
| Strategy Validator          | ✅     |
| AI Trade Feedback (OpenAI)  | ✅     |
| AI Mock Fallback            | ✅     |
| Analytics Engine            | ✅     |
| Expectancy Calculation      | ✅     |
| Max Drawdown                | ✅     |
| Win/Loss Streaks            | ✅     |
| Session Breakdown           | ✅     |
| Pair Performance            | ✅     |
| Overtrading Detection       | ✅     |
| Revenge Trading Detection   | ✅     |
| Telegram Alerts             | ✅     |
| CSV Export                  | ✅     |
| Screenshot Upload           | ✅     |
| Batch AI Analysis           | ✅     |
| Portfolio AI Analysis       | ✅     |
| Alembic Migrations          | ✅     |
| Docker Compose              | ✅     |
| Dark UI (TradingView style) | ✅     |
| Responsive Layout           | ✅     |
