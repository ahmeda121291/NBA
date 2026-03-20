"""Defensive Reality Score (DRS) — estimates real defensive impact."""

from dataclasses import dataclass
from typing import Optional

from ..base import BaseMetric, MetricResult, clamp, compute_sample_confidence, sigmoid


@dataclass
class DefensiveInputs:
    on_off_drtg: float  # team DRtg on court - off court (negative = better)
    matchup_difficulty: Optional[float] = None  # avg offensive rating of assignment
    rim_deterrence: Optional[float] = None  # opponent FG% at rim when nearest
    contest_rate: Optional[float] = None
    fouls_per_36: Optional[float] = None
    position_avg_fouls: Optional[float] = None
    positions_defended: int = 1
    dreb_pct: Optional[float] = None
    blow_by_rate: Optional[float] = None
    dbpm: Optional[float] = None
    stl_pct: Optional[float] = None
    blk_pct: Optional[float] = None
    games_played: int = 0
    has_tracking_data: bool = False


class DefensiveRealityScore(BaseMetric):
    name = "Defensive Reality Score"
    short_name = "DRS"

    def compute(self, inputs: DefensiveInputs) -> MetricResult:
        components = {}

        if inputs.has_tracking_data:
            return self._compute_full(inputs)
        return self._compute_fallback(inputs)

    def _compute_full(self, inputs: DefensiveInputs) -> MetricResult:
        components = {}

        # On/Off defense (most important signal)
        on_off = sigmoid(-inputs.on_off_drtg / 3)  # negative = better
        components["on_off_defense"] = round(on_off, 3)

        matchup = sigmoid((inputs.matchup_difficulty or 110) / 115 - 0.9) if inputs.matchup_difficulty else 0.5
        components["matchup_difficulty"] = round(matchup, 3)

        rim = sigmoid(-(inputs.rim_deterrence or 0.60) / 0.65 + 0.5) if inputs.rim_deterrence else 0.5
        components["rim_deterrence"] = round(rim, 3)

        contests = sigmoid((inputs.contest_rate or 0.5) * 2 - 1) if inputs.contest_rate else 0.5
        components["contest_quality"] = round(contests, 3)

        foul_disc = 0.5
        if inputs.fouls_per_36 is not None and inputs.position_avg_fouls is not None:
            foul_disc = sigmoid(-(inputs.fouls_per_36 - inputs.position_avg_fouls) / 1.5)
        components["foul_discipline"] = round(foul_disc, 3)

        versatility = min(inputs.positions_defended / 3.0, 1.0)
        components["versatility"] = round(versatility, 3)

        dreb = sigmoid((inputs.dreb_pct or 15) / 20 - 0.5) if inputs.dreb_pct else 0.5
        blow_by = sigmoid(-(inputs.blow_by_rate or 0.1) / 0.15 + 0.5) if inputs.blow_by_rate else 0.5

        raw = (
            on_off * 0.25
            + matchup * 0.15
            + rim * 0.10
            + contests * 0.10
            + foul_disc * 0.10
            + 0.5 * 0.10  # rotation consistency placeholder
            + versatility * 0.10
            + dreb * 0.05
            + blow_by * 0.05
        )

        score = clamp(raw * 100, 0, 100)
        confidence = compute_sample_confidence(inputs.games_played)

        return MetricResult(
            score=round(score, 1),
            confidence=round(confidence, 2),
            components=components,
            label=self._classify(score),
        )

    def _compute_fallback(self, inputs: DefensiveInputs) -> MetricResult:
        """Fallback when tracking data unavailable."""
        components = {}

        on_off = sigmoid(-inputs.on_off_drtg / 3)
        components["on_off_defense"] = round(on_off, 3)

        dreb = sigmoid((inputs.dreb_pct or 15) / 20 - 0.5) if inputs.dreb_pct else 0.5
        components["dreb"] = round(dreb, 3)

        foul_disc = 0.5
        if inputs.fouls_per_36 is not None and inputs.position_avg_fouls is not None:
            foul_disc = sigmoid(-(inputs.fouls_per_36 - inputs.position_avg_fouls) / 1.5)
        components["foul_discipline"] = round(foul_disc, 3)

        stl_blk = 0.5
        if inputs.stl_pct is not None and inputs.blk_pct is not None:
            stl_blk = sigmoid((inputs.stl_pct + inputs.blk_pct) / 6 - 0.5)
        components["stl_blk"] = round(stl_blk, 3)

        dbpm_signal = sigmoid((inputs.dbpm or 0) / 2) if inputs.dbpm is not None else 0.5
        components["dbpm"] = round(dbpm_signal, 3)

        raw = (
            on_off * 0.45
            + dreb * 0.15
            + foul_disc * 0.15
            + stl_blk * 0.15
            + dbpm_signal * 0.10
        )

        score = clamp(raw * 100, 0, 100)
        confidence = compute_sample_confidence(inputs.games_played) * 0.75  # reduced for fallback

        return MetricResult(
            score=round(score, 1),
            confidence=round(confidence, 2),
            components=components,
            label=self._classify(score),
        )

    @staticmethod
    def _classify(score: float) -> str:
        if score >= 80:
            return "Elite Anchor"
        if score >= 65:
            return "Strong Starter"
        if score >= 55:
            return "Solid"
        if score >= 45:
            return "Neutral"
        if score >= 35:
            return "Liability"
        return "Significant Liability"
