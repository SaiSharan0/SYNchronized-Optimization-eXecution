from fastapi import HTTPException


FEATURES = {
    "journal_crud": {"free": True, "pro": True},
    "strategy_validator": {"free": True, "pro": True},
    "analytics_core": {"free": True, "pro": True},
    "ai_single_trade": {"free": True, "pro": True},
    "ai_portfolio": {"free": False, "pro": True},
    "ai_batch_analysis": {"free": False, "pro": True},
    "advanced_exports": {"free": False, "pro": True},
}


def get_user_plan(email: str, pro_users: set[str]) -> str:
    normalized = (email or "").strip().lower()
    return "pro" if normalized and normalized in pro_users else "free"


def get_feature_access(plan: str) -> dict:
    return {feature: matrix.get(plan, False) for feature, matrix in FEATURES.items()}


def can_access_feature(email: str, feature: str, pro_users: set[str]) -> bool:
    plan = get_user_plan(email, pro_users)
    return bool(FEATURES.get(feature, {}).get(plan, False))


def ensure_feature_access(email: str, feature: str, pro_users: set[str]) -> None:
    if can_access_feature(email, feature, pro_users):
        return

    raise HTTPException(
        status_code=403,
        detail=f"'{feature}' is available on the Pro plan. Upgrade to continue.",
    )
