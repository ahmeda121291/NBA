"""Streak classification logic — determines if hot/cold streaks are real or noise."""

from dataclasses import dataclass
from typing import Optional


STREAK_LABELS = {
    "hot_likely_real": "Hot and likely real",
    "hot_fragile": "Hot but fragile",
    "hot_opponent_driven": "Hot but opponent-driven",
    "hot_low_volume": "Fake hot streak — low volume",
    "breakout_role_expansion": "Breakout tied to expanded role",
    "cold_bad_luck": "Cold but due for rebound",
    "cold_role_driven": "Slump driven by role change",
    "cold_minutes_driven": "Slump tied to reduced minutes",
    "cold_genuine": "Genuine cold stretch",
    "neutral": "",
}


@dataclass
class StreakContext:
    lfi_3: float  # LFI score for last 3 games
    lfi_5: float
    lfi_10: float
    lfi_20: float
    usage_current: float
    usage_baseline: float
    minutes_current: float
    minutes_baseline: float
    fga_current: float
    fga_baseline: float
    opponent_avg_drtg: float
    role_changed: bool
    shot_quality_current: Optional[float] = None
    shot_quality_baseline: Optional[float] = None


def classify_streak(ctx: StreakContext) -> str:
    """
    Classify a player's current hot/cold streak.

    Returns one of the STREAK_LABELS keys.
    """
    is_hot = ctx.lfi_5 > 60 or ctx.lfi_10 > 58
    is_cold = ctx.lfi_5 < 40 or ctx.lfi_10 < 42

    if not is_hot and not is_cold:
        return "neutral"

    usage_stable = abs(ctx.usage_current - ctx.usage_baseline) < 3
    usage_up = ctx.usage_current - ctx.usage_baseline > 3
    minutes_up = ctx.minutes_current - ctx.minutes_baseline > 3
    weak_opponents = ctx.opponent_avg_drtg > 113  # above league avg = weaker defense
    low_volume = ctx.fga_current < ctx.fga_baseline * 0.75

    if is_hot:
        # Breakout: role expanded, usage up, minutes up
        if ctx.role_changed and usage_up and minutes_up:
            return "breakout_role_expansion"

        # Likely real: stable role, not against weak teams, not low volume
        if usage_stable and not weak_opponents and not low_volume:
            return "hot_likely_real"

        # Opponent-driven
        if weak_opponents:
            return "hot_opponent_driven"

        # Low volume mirage
        if low_volume:
            return "hot_low_volume"

        # Default hot: fragile
        return "hot_fragile"

    if is_cold:
        # Bad luck: good shot quality but bad results
        if (
            ctx.shot_quality_current is not None
            and ctx.shot_quality_baseline is not None
            and ctx.shot_quality_current >= ctx.shot_quality_baseline - 0.01
        ):
            return "cold_bad_luck"

        # Role-driven slump
        if ctx.role_changed:
            return "cold_role_driven"

        # Minutes-driven
        if ctx.minutes_current < ctx.minutes_baseline - 4:
            return "cold_minutes_driven"

        # Genuine cold stretch
        return "cold_genuine"

    return "neutral"


def get_streak_display(label: str) -> str:
    """Get human-readable display text for a streak label."""
    return STREAK_LABELS.get(label, "")
