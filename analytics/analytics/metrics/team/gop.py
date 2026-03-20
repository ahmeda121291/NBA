"""Game Outcome Projection (GOP) — projects likely game result."""

import math
from dataclasses import dataclass
from typing import Optional

from ..base import MetricResult, clamp


@dataclass
class GameContext:
    is_back_to_back_home: bool = False
    is_back_to_back_away: bool = False
    home_rest_days: int = 1
    away_rest_days: int = 1
    travel_distance_miles: float = 0


@dataclass
class TeamProjectionInputs:
    tsc_score: float
    tsc_confidence: float
    ltfi_score: float
    injury_impact: float  # net rating points lost due to injuries
    rest_factor: float  # 0 = well rested, negative = fatigued


@dataclass
class GOPResult:
    projected_winner: str  # "home" or "away"
    win_prob_home: float
    win_prob_away: float
    proj_score_home: float
    proj_score_home_low: float
    proj_score_home_high: float
    proj_score_away: float
    proj_score_away_low: float
    proj_score_away_high: float
    projected_pace: float
    confidence: float
    margin: float
    upset_risk: str
    key_reasons: list[str]


class GameOutcomeProjection:
    name = "Game Outcome Projection"
    short_name = "GOP"

    def compute(
        self,
        home: TeamProjectionInputs,
        away: TeamProjectionInputs,
        context: GameContext,
        home_team_name: str = "Home",
        away_team_name: str = "Away",
        projected_pace: float = 100.0,
    ) -> GOPResult:
        reasons = []

        # Base strength differential
        strength_diff = (home.tsc_score - away.tsc_score) * 0.3
        if abs(strength_diff) > 1:
            better = home_team_name if strength_diff > 0 else away_team_name
            reasons.append(f"{better} stronger overall team (TSC advantage)")

        # Home court advantage
        hca = 3.5
        reasons.append(f"{home_team_name} home court advantage (+{hca} pts)")

        # Live form
        form_diff = (home.ltfi_score - away.ltfi_score) * 0.15
        if abs(form_diff) > 0.5:
            better = home_team_name if form_diff > 0 else away_team_name
            reasons.append(f"{better} in stronger recent form")

        # Injury impact
        injury_diff = home.injury_impact - away.injury_impact
        if abs(injury_diff) > 1:
            worse = home_team_name if injury_diff < 0 else away_team_name
            reasons.append(f"{worse} weakened by injuries")

        # Rest/fatigue
        rest_diff = home.rest_factor - away.rest_factor
        if abs(rest_diff) > 0.5:
            tired = away_team_name if rest_diff > 0 else home_team_name
            reasons.append(f"{tired} fatigue factor")

        # Total home advantage
        home_advantage = strength_diff + hca + form_diff + injury_diff + rest_diff

        # Win probability (logistic)
        win_prob_home = 1.0 / (1.0 + math.exp(-home_advantage / 4.5))
        win_prob_home = clamp(win_prob_home, 0.05, 0.95)

        # Projected scores
        avg_efficiency = 1.12  # points per possession baseline
        projected_total = projected_pace * avg_efficiency * 2
        home_score = projected_total / 2 + home_advantage / 2
        away_score = projected_total / 2 - home_advantage / 2

        score_range = 6.0  # typical game variance

        # Confidence
        confidence = min(home.tsc_confidence, away.tsc_confidence)

        # Upset risk
        upset_risk = self._classify_upset_risk(win_prob_home)

        return GOPResult(
            projected_winner="home" if win_prob_home > 0.5 else "away",
            win_prob_home=round(win_prob_home, 4),
            win_prob_away=round(1.0 - win_prob_home, 4),
            proj_score_home=round(home_score, 1),
            proj_score_home_low=round(home_score - score_range, 1),
            proj_score_home_high=round(home_score + score_range, 1),
            proj_score_away=round(away_score, 1),
            proj_score_away_low=round(away_score - score_range, 1),
            proj_score_away_high=round(away_score + score_range, 1),
            projected_pace=projected_pace,
            confidence=round(confidence, 2),
            margin=round(abs(home_advantage), 1),
            upset_risk=upset_risk,
            key_reasons=reasons[:4],
        )

    @staticmethod
    def _classify_upset_risk(win_prob_home: float) -> str:
        prob = max(win_prob_home, 1 - win_prob_home)
        if prob >= 0.75:
            return "low"
        if prob >= 0.60:
            return "moderate"
        return "high"
