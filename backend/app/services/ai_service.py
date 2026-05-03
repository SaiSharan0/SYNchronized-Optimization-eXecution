import json
from typing import Dict, Any, Optional

try:
    from openai import AsyncOpenAI
    _has_openai = True
except ImportError:
    _has_openai = False

from app.core.config import settings

_client: Optional[Any] = None

def _get_client():
    global _client
    if _client is None and _has_openai and settings.OPENAI_API_KEY:
        _client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
    return _client


# ── Prompts ───────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = (
    "You are an elite forex and futures trading performance coach with 20+ years of experience. "
    "You analyse trades with objectivity, precision, and honesty. "
    "Always respond with ONLY valid JSON — no markdown fences, no preamble."
)

TRADE_PROMPT = """\
Analyse this trade and return ONLY a JSON object with these exact keys:

strengths        – array of 3 specific strengths of this trade
mistakes         – array of 3 specific weaknesses or errors
suggestions      – array of 4 specific, actionable improvements
score            – float 0–10 reflecting overall trade quality
detailed_analysis – 2-3 paragraph analysis of setup, execution, result
risk_assessment  – one paragraph on risk management quality
psychology_note  – one sentence on trader psychology evident here
market_context   – one sentence on session/market condition appropriateness

TRADE DATA:
Pair:              {pair}
Direction:         {trade_type}
Session:           {session}
Entry:             {entry_price}
Stop Loss:         {stop_loss}
Take Profit:       {take_profit}
Exit:              {exit_price}
Lot Size:          {lot_size}
RR Ratio:          {rr_ratio}:1
Result:            {result}
Strategy Followed: {followed_strategy}
Notes:             {notes}
Tags:              {tags}
"""

PORTFOLIO_PROMPT = """\
Analyse this portfolio of {count} trades and return ONLY a JSON object with:

patterns             – array of 4 key behavioural/technical patterns observed
psychological_insights – array of 3 psychological tendencies evident
strengths            – array of 3 portfolio-level strengths
weaknesses           – array of 3 portfolio-level weaknesses
action_plan          – array of 5 specific, prioritised improvement actions
overall_score        – float 0–10 for overall trading quality

TRADE SUMMARY (recent {count} trades):
{summary}
"""


# ── Core Functions ────────────────────────────────────────────────────────────

async def analyze_trade(trade_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    Analyse a single trade.  Falls back to mock feedback if OpenAI is
    unavailable or the API call fails.
    """
    client = _get_client()

    if client:
        prompt = TRADE_PROMPT.format(
            pair=trade_data.get("pair", "Unknown"),
            trade_type=str(trade_data.get("trade_type", "")).upper(),
            session=str(trade_data.get("session", "")).replace("_", " ").title(),
            entry_price=trade_data.get("entry_price", 0),
            stop_loss=trade_data.get("stop_loss", 0),
            take_profit=trade_data.get("take_profit", 0),
            exit_price=trade_data.get("exit_price") or "Not closed yet",
            lot_size=trade_data.get("lot_size", 0),
            rr_ratio=trade_data.get("risk_reward_ratio", 0),
            result=str(trade_data.get("result", "pending")).upper(),
            followed_strategy="YES" if trade_data.get("followed_strategy") else "NO",
            notes=trade_data.get("notes") or "None provided",
            tags=", ".join(trade_data.get("tags") or []) or "None",
        )

        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.6,
                max_tokens=1200,
                response_format={"type": "json_object"},
            )
            raw = response.choices[0].message.content
            return json.loads(raw)
        except Exception as exc:
            print(f"[AI] OpenAI call failed: {exc}. Using mock feedback.")

    return _mock_feedback(trade_data)


async def analyze_portfolio(trades_data: list) -> Dict[str, Any]:
    """
    Macro-level analysis of a batch of trades.
    """
    if not trades_data:
        return {"error": "No trades provided"}

    summary = json.dumps(trades_data[:20], indent=2)
    client = _get_client()

    if client:
        prompt = PORTFOLIO_PROMPT.format(
            count=len(trades_data),
            summary=summary,
        )
        try:
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.6,
                max_tokens=1000,
                response_format={"type": "json_object"},
            )
            return json.loads(response.choices[0].message.content)
        except Exception as exc:
            print(f"[AI] Portfolio analysis failed: {exc}.")

    return _mock_portfolio(trades_data)


# ── Mock Fallbacks ─────────────────────────────────────────────────────────────

def _mock_feedback(data: Dict[str, Any]) -> Dict[str, Any]:
    rr = float(data.get("risk_reward_ratio") or 0)
    result = str(data.get("result") or "pending").lower()
    followed = bool(data.get("followed_strategy"))
    pair = data.get("pair", "")
    session = str(data.get("session") or "").replace("_", " ").title()

    score = 3.0
    if rr >= 2:
        score += 2.0
    elif rr >= 1.5:
        score += 1.0
    if result == "win":
        score += 2.0
    elif result == "breakeven":
        score += 0.5
    if followed:
        score += 1.5
    if data.get("notes"):
        score += 0.5
    score = min(round(score, 1), 10.0)

    strengths = []
    if rr >= 2:
        strengths.append(f"Strong RR ratio of {rr:.1f}:1 demonstrates disciplined target placement")
    if followed:
        strengths.append("Strategy rules were respected — key to long-term consistency")
    if result == "win":
        strengths.append("Profitable result validates the trade setup and execution")
    if data.get("notes"):
        strengths.append("Trade was documented — excellent journaling discipline")
    while len(strengths) < 3:
        strengths.append("Trade was captured in the journal for review")

    mistakes = []
    if rr < 1.5:
        mistakes.append(f"RR of {rr:.1f}:1 is below the recommended 1.5:1 minimum threshold")
    if not followed:
        mistakes.append("Strategy rules were not followed — breaks systematic discipline")
    if not data.get("notes"):
        mistakes.append("No trade notes: impossible to review reasoning or learn from the setup")
    while len(mistakes) < 3:
        mistakes.append("No screenshot attached — visual reference aids future review")

    return {
        "strengths": strengths[:3],
        "mistakes": mistakes[:3],
        "suggestions": [
            "Set a hard rule: minimum 1:2 RR before entering any trade",
            "Complete your pre-trade checklist before every entry",
            f"Review all {session} session setups weekly to spot recurring patterns",
            "Journal your emotional state before, during, and after each trade",
        ],
        "score": score,
        "detailed_analysis": (
            f"This {str(data.get('trade_type','')).upper()} on {pair} during the {session} session "
            f"{'demonstrates strong strategic discipline' if followed else 'reveals a deviation from the defined strategy'}. "
            f"The {rr:.1f}:1 risk-reward setup {'provides a favourable edge' if rr >= 1.5 else 'does not provide sufficient reward for the risk taken'}. "
            f"The trade ended in a {result.upper()}, "
            f"{'confirming the validity of the setup' if result == 'win' else 'indicating a need to review the entry criteria or market conditions'}. "
            "Consistent documentation and post-trade review remain essential for sustained improvement."
        ),
        "risk_assessment": (
            f"Risk management is {'adequate' if rr >= 1.5 else 'below standard'}. "
            f"A lot size of {data.get('lot_size', 0)} should be sized to risk no more than 1–2% of the account per trade. "
            "Ensure stop loss is placed at a structurally significant level, not an arbitrary distance."
        ),
        "psychology_note": (
            "Consistent journaling suggests a growth mindset."
            if data.get("notes")
            else "Lack of notes may indicate impulsive entry without adequate pre-trade planning."
        ),
        "market_context": (
            f"The {session} session was selected for this trade on {pair}, "
            f"which is {'appropriate for high-liquidity setups' if session.lower() in ('london', 'new york', 'overlap') else 'typically lower-liquidity — confirm alignment with your strategy'}."
        ),
    }


def _mock_portfolio(trades_data: list) -> Dict[str, Any]:
    wins = sum(1 for t in trades_data if t.get("result") == "win")
    total = len(trades_data)
    wr = wins / total * 100 if total else 0
    avg_rr = sum(t.get("risk_reward_ratio") or 0 for t in trades_data) / total if total else 0
    followed = sum(1 for t in trades_data if t.get("followed_strategy"))

    return {
        "patterns": [
            f"Win rate of {wr:.1f}% across {total} trades {'is above' if wr >= 50 else 'is below'} the 50% benchmark",
            f"Average RR of {avg_rr:.2f}:1 {'provides positive expectancy' if avg_rr >= 1.5 else 'suggests RR improvement needed'}",
            f"Strategy adherence at {followed}/{total} trades ({followed/total*100:.0f}% if total else 0%) — {'good discipline' if followed/total > 0.7 else 'needs improvement'}" if total else "Insufficient data",
            "Connect OpenAI API key for deeper AI-powered pattern recognition",
        ],
        "psychological_insights": [
            "Journaling behaviour indicates systematic approach to trading",
            "Strategy adherence rate reveals discipline level under live market conditions",
            "Risk-reward consistency shows whether entries are planned or reactive",
        ],
        "strengths": [
            "Trades are being logged — foundation for data-driven improvement",
            f"{followed} trades followed the defined strategy",
            f"{wins} winning trades show ability to identify valid setups",
        ],
        "weaknesses": [
            "Add OpenAI API key for personalised weakness detection",
            "Ensure all trades have screenshots for visual pattern review",
            "Tag trades consistently to enable session/setup filtering",
        ],
        "action_plan": [
            "Review all losing trades this week for common entry mistakes",
            "Identify your highest win-rate session and focus there",
            "Set a minimum RR filter — skip any setup below 1.5:1",
            "Add a pre-trade checklist to enforce strategy rules",
            "Schedule a weekly 30-minute journal review session",
        ],
        "overall_score": round(min(wr / 10 + avg_rr, 10), 1),
    }
