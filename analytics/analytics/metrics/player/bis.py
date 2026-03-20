"""Baseline Impact Score (BIS) — stable estimate of overall player value."""

from dataclasses import dataclass
from typing import Optional
import numpy as np

from ..base import BaseMetric, MetricResult, normalize_zscore, zscore_to_100, clamp, compute_sample_confidence
from ...config import BIS_WEIGHTS


@dataclass
class PlayerImpactInputs:
    epm: Optional[float] = None
    lebron: Optional[float] = None
    rapm: Optional[float] = None
    bpm: Optional[float] = None
    on_off_net: Optional[float] = None
    ws_per_48: Optional[float] = None
    games_played: int = 0


@dataclass
class PopulationStats:
    """Population means and stds for normalizing each input metric."""
    means: dict[str, float]
    stds: dict[str, float]


class BaselineImpactScore(BaseMetric):
    name = "Baseline Impact Score"
    short_name = "BIS"

    def __init__(self, population_stats: PopulationStats):
        self.pop = population_stats
        self.weights = BIS_WEIGHTS

    def compute(self, inputs: PlayerImpactInputs) -> MetricResult:
        raw_inputs = {
            "epm": inputs.epm,
            "lebron": inputs.lebron,
            "rapm": inputs.rapm,
            "bpm": inputs.bpm,
            "on_off": inputs.on_off_net,
            "ws48": inputs.ws_per_48,
        }

        # Filter to available inputs
        available = {k: v for k, v in raw_inputs.items() if v is not None}

        if not available:
            return MetricResult(score=50.0, confidence=0.0, label="Insufficient data")

        # Renormalize weights
        total_weight = sum(self.weights[k] for k in available)
        norm_weights = {k: self.weights[k] / total_weight for k in available}

        # Compute weighted z-score
        components = {}
        weighted_sum = 0.0
        for key, value in available.items():
            z = normalize_zscore(value, self.pop.means.get(key, 0), self.pop.stds.get(key, 1))
            components[key] = round(z, 3)
            weighted_sum += z * norm_weights[key]

        # Convert to 0-100 scale
        score = zscore_to_100(weighted_sum)

        # Confidence
        availability_factor = total_weight  # 1.0 if all inputs available
        sample_factor = compute_sample_confidence(inputs.games_played)
        confidence = clamp(availability_factor * 0.6 + sample_factor * 0.4, 0, 1)

        return MetricResult(
            score=round(score, 1),
            confidence=round(confidence, 2),
            components=components,
            label=self._classify(score),
        )

    @staticmethod
    def _classify(score: float) -> str:
        if score >= 85:
            return "MVP Caliber"
        if score >= 75:
            return "All-Star"
        if score >= 65:
            return "High-Impact Starter"
        if score >= 55:
            return "Solid Starter"
        if score >= 45:
            return "Rotation Player"
        if score >= 35:
            return "Bench Contributor"
        return "Replacement Level"
