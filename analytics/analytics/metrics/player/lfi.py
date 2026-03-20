"""Live Form Index (LFI) — captures current form with noise filtering."""

from dataclasses import dataclass
from typing import Optional
import numpy as np

from ..base import BaseMetric, MetricResult, sigmoid, clamp, compute_sample_confidence
from ...config import LFI_WINDOW_WEIGHTS


@dataclass
class WindowStats:
    ts_pct: float
    usage: float
    minutes: float
    bpm: float
    opponent_avg_drtg: float
    fga_per_game: float


@dataclass
class SeasonBaseline:
    ts_pct: float
    ts_pct_std: float
    usage: float
    usage_std: float
    minutes: float
    minutes_std: float
    bpm: float
    bpm_std: float
    fga_per_game: float


@dataclass
class LFIResult(MetricResult):
    streak_label: str = "neutral"
    windows: dict[int, float] = None
    delta: float = 0.0

    def __post_init__(self):
        if self.windows is None:
            self.windows = {}


class LiveFormIndex(BaseMetric):
    name = "Live Form Index"
    short_name = "LFI"

    def compute(
        self,
        window_stats: dict[int, WindowStats],
        baseline: SeasonBaseline,
        games_played: int,
        role_changed: bool = False,
    ) -> LFIResult:
        window_scores = {}

        for window_size, stats in window_stats.items():
            # Efficiency delta
            eff_delta = (stats.ts_pct - baseline.ts_pct) / max(baseline.ts_pct_std, 0.01)
            usg_delta = (stats.usage - baseline.usage) / max(baseline.usage_std, 1)
            min_delta = (stats.minutes - baseline.minutes) / max(baseline.minutes_std, 1)
            impact_delta = (stats.bpm - baseline.bpm) / max(baseline.bpm_std, 1)

            # Opponent adjustment: higher opponent DRtg = easier opponents
            league_avg_drtg = 112.0
            opp_adj = sigmoid((league_avg_drtg - stats.opponent_avg_drtg) / 3)

            role_flag = 0.7 if role_changed else 0.5  # neutral = 0.5

            raw = (
                sigmoid(eff_delta) * 0.25
                + sigmoid(usg_delta) * 0.10
                + sigmoid(min_delta) * 0.10
                + sigmoid(impact_delta) * 0.20
                + 0.5 * 0.10  # shot quality placeholder
                + opp_adj * 0.15
                + role_flag * 0.10
            )
            window_scores[window_size] = raw

        # Blend windows
        blended = sum(
            window_scores.get(w, 0.5) * weight
            for w, weight in LFI_WINDOW_WEIGHTS.items()
        )

        score = clamp(blended * 100, 0, 100)
        confidence = compute_sample_confidence(games_played)

        # Streak classification
        streak_label = self._classify_streak(
            window_scores, baseline, window_stats, role_changed
        )

        return LFIResult(
            score=round(score, 1),
            confidence=round(confidence, 2),
            streak_label=streak_label,
            windows={k: round(v * 100, 1) for k, v in window_scores.items()},
            delta=round(score - 50, 1),
            label=streak_label if streak_label != "neutral" else None,
        )

    def _classify_streak(
        self,
        window_scores: dict[int, float],
        baseline: SeasonBaseline,
        window_stats: dict[int, WindowStats],
        role_changed: bool,
    ) -> str:
        lfi_5 = window_scores.get(5, 0.5) * 100
        lfi_10 = window_scores.get(10, 0.5) * 100

        is_hot = lfi_5 > 60 or lfi_10 > 58
        is_cold = lfi_5 < 40 or lfi_10 < 42

        if not is_hot and not is_cold:
            return "neutral"

        recent = window_stats.get(10)
        if not recent:
            return "neutral"

        usage_stable = abs(recent.usage - baseline.usage) < 3
        usage_up = recent.usage - baseline.usage > 3
        minutes_up = recent.minutes - baseline.minutes > 3
        weak_opponents = recent.opponent_avg_drtg > 113
        low_volume = recent.fga_per_game < baseline.fga_per_game * 0.75

        if is_hot:
            if role_changed and usage_up and minutes_up:
                return "breakout_role_expansion"
            if usage_stable and not weak_opponents and not low_volume:
                return "hot_likely_real"
            if weak_opponents:
                return "hot_opponent_driven"
            if low_volume:
                return "hot_low_volume"
            return "hot_fragile"

        if is_cold:
            if not weak_opponents:
                return "cold_bad_luck"
            if role_changed:
                return "cold_role_driven"
            if recent.minutes < baseline.minutes - 4:
                return "cold_minutes_driven"
            return "cold_genuine"

        return "neutral"
