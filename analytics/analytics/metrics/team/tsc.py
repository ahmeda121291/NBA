"""Team Strength Core (TSC) — baseline team quality estimate."""

from dataclasses import dataclass
from typing import Optional

from ..base import BaseMetric, MetricResult, normalize_zscore, zscore_to_100, clamp, compute_sample_confidence


@dataclass
class TeamStrengthInputs:
    ortg: float
    drtg: float
    net_rating: float
    sos: float  # strength of schedule adjustment (points)
    injury_adjustment: float  # estimated net rating impact of injuries
    ltfi_score: Optional[float] = None  # live form, if already computed
    lineup_weighted_strength: Optional[float] = None
    games_played: int = 0


@dataclass
class LeagueStats:
    mean_ortg: float
    std_ortg: float
    mean_drtg: float
    std_drtg: float
    mean_net: float
    std_net: float


class TeamStrengthCore(BaseMetric):
    name = "Team Strength Core"
    short_name = "TSC"

    def __init__(self, league_stats: LeagueStats):
        self.league = league_stats

    def compute(self, inputs: TeamStrengthInputs) -> MetricResult:
        components = {}

        z_ortg = normalize_zscore(inputs.ortg, self.league.mean_ortg, self.league.std_ortg)
        z_drtg = normalize_zscore(-inputs.drtg, -self.league.mean_drtg, self.league.std_drtg)
        z_net = normalize_zscore(inputs.net_rating, self.league.mean_net, self.league.std_net)

        components["ortg"] = round(z_ortg, 3)
        components["drtg"] = round(z_drtg, 3)
        components["net_rating"] = round(z_net, 3)
        components["sos"] = round(inputs.sos, 3)
        components["injury_adj"] = round(inputs.injury_adjustment, 3)

        form_signal = (inputs.ltfi_score or 50) / 100
        lineup_signal = (inputs.lineup_weighted_strength or 0.5)

        raw = (
            z_net * 0.30
            + z_ortg * 0.15
            + z_drtg * 0.15
            + inputs.sos / 5 * 0.10  # normalize SOS
            + inputs.injury_adjustment / 5 * 0.10
            + form_signal * 0.10
            + lineup_signal * 0.10
        )

        score = zscore_to_100(raw)
        confidence = compute_sample_confidence(inputs.games_played)

        return MetricResult(
            score=round(score, 1),
            confidence=round(confidence, 2),
            components=components,
            label=self._classify(score),
        )

    @staticmethod
    def _classify(score: float) -> str:
        if score >= 80:
            return "Championship Contender"
        if score >= 70:
            return "Strong Playoff Team"
        if score >= 60:
            return "Playoff Team"
        if score >= 50:
            return "Competitive"
        if score >= 40:
            return "Below Average"
        return "Rebuilding"
