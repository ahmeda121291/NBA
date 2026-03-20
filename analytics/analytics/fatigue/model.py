"""Fatigue and injury adjustment models."""

from dataclasses import dataclass
from typing import Optional

from ..config import FATIGUE_PENALTIES


@dataclass
class FatigueContext:
    is_back_to_back: bool = False
    is_three_in_four: bool = False
    last_5_avg_minutes: float = 30.0
    season_avg_minutes: float = 30.0
    last_10_avg_minutes: float = 30.0
    games_since_return: Optional[int] = None  # None = not recently injured
    travel_distance_miles: float = 0.0


def compute_fatigue_penalty(ctx: FatigueContext) -> float:
    """
    Returns 0.0-0.4 where higher = more fatigue penalty.
    Caps at 0.40 to prevent over-adjustment.
    """
    penalty = 0.0

    if ctx.is_back_to_back:
        penalty += FATIGUE_PENALTIES["back_to_back"]

    if ctx.is_three_in_four:
        penalty += FATIGUE_PENALTIES["three_in_four"]

    if ctx.last_5_avg_minutes > ctx.season_avg_minutes + 3:
        penalty += FATIGUE_PENALTIES["heavy_recent_minutes"]

    if ctx.last_10_avg_minutes > 36:
        penalty += FATIGUE_PENALTIES["cumulative_load"]

    if ctx.games_since_return is not None and ctx.games_since_return < 5:
        penalty += FATIGUE_PENALTIES["return_from_injury"]

    if ctx.travel_distance_miles > 1500:
        penalty += FATIGUE_PENALTIES["travel_burden"]

    return min(penalty, 0.40)


@dataclass
class InjuredPlayer:
    on_off_net: float
    avg_minutes: float


@dataclass
class ReplacementPlayer:
    on_off_net: float


def compute_team_injury_impact(
    injured: list[tuple[InjuredPlayer, ReplacementPlayer]],
) -> float:
    """
    Estimate net rating impact of injuries.
    Returns a point value (negative = injuries hurt the team).
    """
    total_impact = 0.0
    for inj_player, replacement in injured:
        minutes_share = inj_player.avg_minutes / 48.0
        player_value = inj_player.on_off_net * minutes_share
        replacement_value = replacement.on_off_net * minutes_share
        total_impact += replacement_value - player_value
    return round(total_impact, 2)
