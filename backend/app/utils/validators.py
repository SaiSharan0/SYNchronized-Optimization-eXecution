import re
from typing import Optional


def is_valid_pair(pair: str) -> bool:
    """Validate forex/crypto pair format like EUR/USD or EURUSD."""
    clean = pair.replace("/", "").replace("-", "").upper()
    return bool(re.match(r"^[A-Z]{6,8}$", clean))


def sanitize_notes(notes: Optional[str]) -> Optional[str]:
    """Strip dangerous characters from free-text notes."""
    if not notes:
        return notes
    # Keep alphanumeric, common punctuation, and whitespace
    return re.sub(r"[<>\"'`;]", "", notes).strip()
