import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.db.database import Base


def enum_values(enum_cls):
    return [member.value for member in enum_cls]


class TradeType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"


class SessionType(str, enum.Enum):
    ASIAN = "asian"
    LONDON = "london"
    NEW_YORK = "new_york"
    OVERLAP = "overlap"


class TradeResult(str, enum.Enum):
    WIN = "win"
    LOSS = "loss"
    BREAKEVEN = "breakeven"
    PENDING = "pending"


class AlertType(str, enum.Enum):
    PRICE = "price"
    PERFORMANCE = "performance"
    BEHAVIOR = "behavior"
    SESSION = "session"
    SYSTEM = "system"


class UserRole(str, enum.Enum):
    USER = "user"
    ADMIN = "admin"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    username = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole, native_enum=False, values_callable=enum_values), default=UserRole.USER, nullable=False)
    full_name = Column(String(255))
    avatar_url = Column(String(500))
    telegram_chat_id = Column(String(100))
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    trades = relationship("Trade", back_populates="user", cascade="all, delete-orphan")
    strategies = relationship("Strategy", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("Alert", back_populates="user", cascade="all, delete-orphan")


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    strategy_id = Column(Integer, ForeignKey("strategies.id", ondelete="SET NULL"), nullable=True)

    pair = Column(String(20), nullable=False, index=True)
    trade_type = Column(Enum(TradeType, native_enum=False, values_callable=enum_values), nullable=False)
    session = Column(Enum(SessionType, native_enum=False, values_callable=enum_values), nullable=False)
    result = Column(Enum(TradeResult, native_enum=False, values_callable=enum_values), default=TradeResult.PENDING, nullable=False)

    entry_price = Column(Float, nullable=False)
    stop_loss = Column(Float, nullable=False)
    take_profit = Column(Float, nullable=False)
    exit_price = Column(Float)
    lot_size = Column(Float, nullable=False)

    risk = Column(Float)
    reward = Column(Float)
    risk_reward_ratio = Column(Float)
    profit_loss = Column(Float)
    profit_loss_percentage = Column(Float)

    followed_strategy = Column(Boolean, default=False, nullable=False)
    trade_score = Column(Float)

    notes = Column(Text)
    screenshot_url = Column(String(500))
    tags = Column(JSON, default=list)
    ai_feedback = Column(JSON)

    entry_time = Column(DateTime(timezone=True), nullable=False)
    exit_time = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="trades")
    strategy = relationship("Strategy", back_populates="trades")


class Strategy(Base):
    __tablename__ = "strategies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    rules = Column(JSON, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="strategies")
    trades = relationship("Trade", back_populates="strategy")


class AnalyticsSnapshot(Base):
    __tablename__ = "analytics"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())


class AIFeedback(Base):
    __tablename__ = "ai_feedback"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    trade_id = Column(Integer, ForeignKey("trades.id", ondelete="CASCADE"), nullable=False, index=True)
    payload = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    type = Column(Enum(AlertType, native_enum=False, values_callable=enum_values), nullable=False)
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    condition = Column(JSON)
    is_active = Column(Boolean, default=True, nullable=False)
    is_triggered = Column(Boolean, default=False, nullable=False)
    triggered_at = Column(DateTime(timezone=True))
    sent_telegram = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="alerts")
