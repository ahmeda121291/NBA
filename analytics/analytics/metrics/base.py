"""Base classes for all metric computations."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class MetricResult:
    score: float
    confidence: float
    components: dict[str, float] = field(default_factory=dict)
    label: Optional[str] = None
    percentile: Optional[float] = None

    @property
    def confidence_level(self) -> str:
        if self.confidence >= 0.8:
            return "high"
        if self.confidence >= 0.6:
            return "moderate"
        if self.confidence >= 0.4:
            return "low"
        return "very_low"


def clamp(value: float, min_val: float, max_val: float) -> float:
    return max(min_val, min(max_val, value))


def normalize_zscore(value: float, mean: float, std: float) -> float:
    if std == 0:
        return 0.0
    return (value - mean) / std


def zscore_to_100(zscore: float) -> float:
    """Convert z-score to 0-100 scale (mean=50, std=10)."""
    return clamp(50 + zscore * 10, 0, 100)


def sigmoid(x: float) -> float:
    """Sigmoid squash to 0-1 range."""
    import math
    return 1.0 / (1.0 + math.exp(-x))


def compute_sample_confidence(games_played: int, min_moderate: int = 20, min_high: int = 40) -> float:
    """Confidence factor based on sample size."""
    if games_played >= min_high:
        return 1.0
    if games_played >= min_moderate:
        return 0.6 + 0.4 * (games_played - min_moderate) / (min_high - min_moderate)
    return max(0.1, 0.6 * games_played / min_moderate)


class BaseMetric(ABC):
    """Abstract base class for all metrics."""

    @abstractmethod
    def compute(self, *args, **kwargs) -> MetricResult:
        ...

    @property
    @abstractmethod
    def name(self) -> str:
        ...

    @property
    @abstractmethod
    def short_name(self) -> str:
        ...
