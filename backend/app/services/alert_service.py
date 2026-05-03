import httpx
from typing import Optional
from app.core.config import settings

TELEGRAM_BASE = "https://api.telegram.org/bot{token}/{method}"


async def send_telegram_message(chat_id: str, message: str) -> bool:
    """Send a formatted message via Telegram bot API."""
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        print(f"[Telegram] Bot token not configured. Skipped message: {message[:60]}")
        return False

    url = TELEGRAM_BASE.format(token=token, method="sendMessage")
    payload = {
        "chat_id": chat_id or settings.TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML",
        "disable_web_page_preview": True,
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, json=payload)
            if resp.status_code != 200:
                print(f"[Telegram] API error {resp.status_code}: {resp.text[:200]}")
            return resp.status_code == 200
    except httpx.TimeoutException:
        print("[Telegram] Request timed out")
        return False
    except Exception as exc:
        print(f"[Telegram] Unexpected error: {exc}")
        return False


def format_trade_alert(trade: dict) -> str:
    """Format a trade entry/exit alert for Telegram."""
    result = str(trade.get("result", "pending")).lower()
    emoji = {"win": "🟢", "loss": "🔴", "breakeven": "⚖️"}.get(result, "⚪")
    strategy_line = "✅ Strategy followed" if trade.get("followed_strategy") else "⚠️ Strategy NOT followed"
    rr = trade.get("risk_reward_ratio", 0)
    pnl = trade.get("profit_loss")
    pnl_line = f"\n💵 P&L: <b>${pnl:+.2f}</b>" if pnl is not None else ""

    return (
        f"{emoji} <b>Trade Alert — {trade.get('pair', '?')}</b>\n\n"
        f"📊 <b>Direction:</b> {str(trade.get('trade_type','')).upper()}\n"
        f"🕐 <b>Session:</b> {str(trade.get('session','')).replace('_',' ').title()}\n"
        f"🎯 <b>Entry:</b> {trade.get('entry_price', 0)}\n"
        f"🛑 <b>Stop Loss:</b> {trade.get('stop_loss', 0)}\n"
        f"✅ <b>Take Profit:</b> {trade.get('take_profit', 0)}\n"
        f"⚖️ <b>RR Ratio:</b> {rr:.2f}:1\n"
        f"📦 <b>Lot Size:</b> {trade.get('lot_size', 0)}\n"
        f"📋 <b>Result:</b> {result.upper()}{pnl_line}\n"
        f"{strategy_line}"
    )


def format_performance_alert(analytics: dict) -> str:
    """Format a performance summary for Telegram."""
    streak = analytics.get("current_streak", 0)
    streak_line = (
        f"🔥 Win streak: <b>{streak}</b>" if streak > 0
        else f"❄️ Loss streak: <b>{abs(streak)}</b>" if streak < 0
        else "➡️ No active streak"
    )
    warnings = ""
    if analytics.get("overtrading_detected"):
        warnings += "\n⚠️ <b>OVERTRADING DETECTED</b> — slow down"
    if analytics.get("revenge_trading_detected"):
        warnings += "\n🚨 <b>REVENGE TRADING DETECTED</b> — take a break"

    return (
        f"📊 <b>Performance Update</b>\n\n"
        f"🏆 Win Rate: <b>{analytics.get('win_rate', 0):.1f}%</b>\n"
        f"💵 Net P&L: <b>${analytics.get('net_profit', 0):.2f}</b>\n"
        f"📉 Max Drawdown: <b>${analytics.get('max_drawdown', 0):.2f}</b>\n"
        f"⚖️ Expectancy: <b>${analytics.get('expectancy', 0):.2f}</b>\n"
        f"📈 Profit Factor: <b>{analytics.get('profit_factor', 0):.2f}</b>\n"
        f"🎯 Avg RR: <b>{analytics.get('avg_rr', 0):.2f}:1</b>\n"
        f"{streak_line}"
        f"{warnings}"
    )


def format_behavior_alert(behavior_type: str, details: str = "") -> str:
    """Format a behavioral risk alert."""
    if behavior_type == "overtrading":
        return (
            "⚠️ <b>Overtrading Alert</b>\n\n"
            "You have taken more than 5 trades in a single day.\n"
            "This significantly increases emotional decision-making risk.\n\n"
            "👉 <b>Recommendation:</b> Close your platform and review your trades tomorrow.\n"
            f"{details}"
        )
    elif behavior_type == "revenge_trading":
        return (
            "🚨 <b>Revenge Trading Alert</b>\n\n"
            "You increased your position size after a loss.\n"
            "This is a classic revenge trading pattern that leads to blow-ups.\n\n"
            "👉 <b>Recommendation:</b> Return to your standard lot size immediately.\n"
            f"{details}"
        )
    return f"🔔 <b>Behavioral Alert</b>\n\n{details}"
