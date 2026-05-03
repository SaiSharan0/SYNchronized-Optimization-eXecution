from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class TradeType(str, Enum):
    BUY = "buy"
    SELL = "sell"


class SessionType(str, Enum):
    ASIAN = "asian"
    LONDON = "london"
    NEW_YORK = "new_york"
    OVERLAP = "overlap"


class TradeResult(str, Enum):
    WIN = "win"
    LOSS = "loss"
    BREAKEVEN = "breakeven"
    PENDING = "pending"


class AlertTypeEnum(str, Enum):
    PRICE = "price"
    PERFORMANCE = "performance"
    BEHAVIOR = "behavior"
    SESSION = "session"
    SYSTEM = "system"


class UserCreate(BaseModel):
    email: EmailStr
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class GoogleLogin(BaseModel):
    credential: Optional[str] = None
    token: Optional[str] = None


class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    is_active: bool
    role: str = "user"
    plan: str = "free"
    features: Dict[str, bool] = Field(default_factory=dict)
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    avatar_url: Optional[str] = None


class TradeCreate(BaseModel):
    pair: str = Field(..., max_length=20)
    trade_type: TradeType
    session: SessionType
    entry_price: float = Field(..., gt=0)
    stop_loss: float = Field(..., gt=0)
    take_profit: float = Field(..., gt=0)
    lot_size: float = Field(..., gt=0)
    result: TradeResult = TradeResult.PENDING
    exit_price: Optional[float] = Field(None, gt=0)
    notes: Optional[str] = None
    screenshot_url: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    strategy_id: Optional[int] = None
    entry_time: datetime
    exit_time: Optional[datetime] = None

    @field_validator("pair")
    @classmethod
    def pair_upper(cls, value: str) -> str:
        return value.upper().replace(" ", "").replace("-", "/")


class TradeUpdate(BaseModel):
    result: Optional[TradeResult] = None
    exit_price: Optional[float] = Field(None, gt=0)
    exit_time: Optional[datetime] = None
    notes: Optional[str] = None
    screenshot_url: Optional[str] = None
    tags: Optional[List[str]] = None
    followed_strategy: Optional[bool] = None
    trade_score: Optional[float] = Field(None, ge=0, le=10)


class TradeResponse(BaseModel):
    id: int
    user_id: int
    pair: str
    trade_type: str
    session: str
    result: str
    entry_price: float
    stop_loss: float
    take_profit: float
    exit_price: Optional[float] = None
    lot_size: float
    risk: Optional[float] = None
    reward: Optional[float] = None
    risk_reward_ratio: Optional[float] = None
    profit_loss: Optional[float] = None
    profit_loss_percentage: Optional[float] = None
    followed_strategy: bool
    trade_score: Optional[float] = None
    notes: Optional[str] = None
    screenshot_url: Optional[str] = None
    tags: Optional[List[str]] = None
    ai_feedback: Optional[Dict[str, Any]] = None
    strategy_id: Optional[int] = None
    entry_time: datetime
    exit_time: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class StrategyRule(BaseModel):
    id: str
    type: str
    label: str
    value: Any
    required: bool = True


class StrategyCreate(BaseModel):
    name: str = Field(..., max_length=200)
    description: Optional[str] = None
    rules: List[StrategyRule]


class StrategyResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    rules: List[Dict[str, Any]]
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AnalyticsResponse(BaseModel):
    total_trades: int
    winning_trades: int
    losing_trades: int
    win_rate: float
    net_profit: float
    gross_profit: float
    gross_loss: float
    avg_win: float
    avg_loss: float
    expectancy: float
    profit_factor: float
    max_drawdown: float
    max_drawdown_pct: float
    avg_rr: float
    current_streak: int
    best_win_streak: int
    worst_loss_streak: int
    best_session: Optional[str] = None
    worst_session: Optional[str] = None
    session_stats: Dict[str, Any]
    pair_stats: Dict[str, Any]
    overtrading_detected: bool
    revenge_trading_detected: bool
    computed_at: Optional[str] = None


class AlertCreate(BaseModel):
    type: AlertTypeEnum
    title: str = Field(..., max_length=200)
    message: str
    condition: Optional[Dict[str, Any]] = None


class AlertResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    condition: Optional[Dict[str, Any]] = None
    is_active: bool
    is_triggered: bool
    triggered_at: Optional[datetime] = None
    sent_telegram: bool
    created_at: datetime

    model_config = {"from_attributes": True}
