"""Tests for core metric computations."""

import pytest
from analytics.metrics.base import clamp, normalize_zscore, zscore_to_100, compute_sample_confidence
from analytics.metrics.player.bis import BaselineImpactScore, PlayerImpactInputs, PopulationStats
from analytics.metrics.player.drs import DefensiveRealityScore, DefensiveInputs
from analytics.fatigue.model import compute_fatigue_penalty, FatigueContext
from analytics.streaks.classifier import classify_streak, StreakContext


class TestBaseHelpers:
    def test_clamp(self):
        assert clamp(5, 0, 10) == 5
        assert clamp(-1, 0, 10) == 0
        assert clamp(15, 0, 10) == 10

    def test_normalize_zscore(self):
        assert normalize_zscore(10, 10, 5) == 0.0
        assert normalize_zscore(15, 10, 5) == 1.0
        assert normalize_zscore(5, 10, 5) == -1.0
        assert normalize_zscore(10, 10, 0) == 0.0  # zero std edge case

    def test_zscore_to_100(self):
        assert zscore_to_100(0) == 50
        assert zscore_to_100(2) == 70
        assert zscore_to_100(-2) == 30
        assert zscore_to_100(10) == 100  # clamped
        assert zscore_to_100(-10) == 0  # clamped

    def test_sample_confidence(self):
        assert compute_sample_confidence(50) == 1.0
        assert compute_sample_confidence(40) == 1.0
        assert 0.6 < compute_sample_confidence(30) < 1.0
        assert 0.0 < compute_sample_confidence(5) < 0.6


class TestBIS:
    def setup_method(self):
        self.pop = PopulationStats(
            means={"epm": 0.0, "lebron": 0.0, "rapm": 0.0, "bpm": 0.0, "on_off": 0.0, "ws48": 0.08},
            stds={"epm": 2.5, "lebron": 2.5, "rapm": 2.0, "bpm": 3.0, "on_off": 4.0, "ws48": 0.05},
        )
        self.metric = BaselineImpactScore(self.pop)

    def test_average_player(self):
        result = self.metric.compute(PlayerImpactInputs(
            epm=0.0, lebron=0.0, rapm=0.0, bpm=0.0, on_off_net=0.0, ws_per_48=0.08,
            games_played=50,
        ))
        assert 45 <= result.score <= 55  # Should be near 50

    def test_elite_player(self):
        result = self.metric.compute(PlayerImpactInputs(
            epm=5.0, lebron=4.5, rapm=4.0, bpm=8.0, on_off_net=6.0, ws_per_48=0.20,
            games_played=60,
        ))
        assert result.score >= 70
        assert result.label in ("All-Star", "MVP Caliber")

    def test_missing_data(self):
        result = self.metric.compute(PlayerImpactInputs(
            epm=3.0, games_played=30,
        ))
        assert result.score > 50
        assert result.confidence < 0.8  # Reduced confidence

    def test_no_data(self):
        result = self.metric.compute(PlayerImpactInputs(games_played=0))
        assert result.confidence == 0.0


class TestDRS:
    def test_elite_defender(self):
        metric = DefensiveRealityScore()
        result = metric.compute(DefensiveInputs(
            on_off_drtg=-5.0,
            dreb_pct=22.0,
            fouls_per_36=2.0,
            position_avg_fouls=3.0,
            positions_defended=3,
            stl_pct=2.5,
            blk_pct=4.0,
            dbpm=3.0,
            games_played=50,
        ))
        assert result.score >= 60
        assert "Strong" in result.label or "Elite" in result.label

    def test_poor_defender(self):
        metric = DefensiveRealityScore()
        result = metric.compute(DefensiveInputs(
            on_off_drtg=4.0,
            dreb_pct=10.0,
            fouls_per_36=4.5,
            position_avg_fouls=3.0,
            positions_defended=1,
            stl_pct=0.5,
            blk_pct=0.3,
            dbpm=-2.0,
            games_played=50,
        ))
        assert result.score < 50


class TestFatigue:
    def test_no_fatigue(self):
        penalty = compute_fatigue_penalty(FatigueContext())
        assert penalty == 0.0

    def test_back_to_back(self):
        penalty = compute_fatigue_penalty(FatigueContext(is_back_to_back=True))
        assert penalty == 0.15

    def test_max_fatigue(self):
        penalty = compute_fatigue_penalty(FatigueContext(
            is_back_to_back=True,
            is_three_in_four=True,
            last_5_avg_minutes=38.0,
            season_avg_minutes=32.0,
            last_10_avg_minutes=37.0,
            games_since_return=2,
            travel_distance_miles=2000,
        ))
        assert penalty == 0.40  # capped


class TestStreakClassifier:
    def test_neutral(self):
        ctx = StreakContext(
            lfi_3=52, lfi_5=50, lfi_10=51, lfi_20=50,
            usage_current=25, usage_baseline=25,
            minutes_current=32, minutes_baseline=32,
            fga_current=15, fga_baseline=15,
            opponent_avg_drtg=112, role_changed=False,
        )
        assert classify_streak(ctx) == "neutral"

    def test_hot_likely_real(self):
        ctx = StreakContext(
            lfi_3=70, lfi_5=65, lfi_10=62, lfi_20=55,
            usage_current=26, usage_baseline=25,
            minutes_current=33, minutes_baseline=32,
            fga_current=16, fga_baseline=15,
            opponent_avg_drtg=111, role_changed=False,
        )
        assert classify_streak(ctx) == "hot_likely_real"

    def test_hot_opponent_driven(self):
        ctx = StreakContext(
            lfi_3=70, lfi_5=65, lfi_10=62, lfi_20=55,
            usage_current=26, usage_baseline=25,
            minutes_current=33, minutes_baseline=32,
            fga_current=16, fga_baseline=15,
            opponent_avg_drtg=116,  # weak opponents
            role_changed=False,
        )
        assert classify_streak(ctx) == "hot_opponent_driven"

    def test_breakout(self):
        ctx = StreakContext(
            lfi_3=72, lfi_5=68, lfi_10=64, lfi_20=56,
            usage_current=30, usage_baseline=22,
            minutes_current=36, minutes_baseline=28,
            fga_current=18, fga_baseline=12,
            opponent_avg_drtg=111, role_changed=True,
        )
        assert classify_streak(ctx) == "breakout_role_expansion"

    def test_cold_genuine(self):
        ctx = StreakContext(
            lfi_3=35, lfi_5=38, lfi_10=40, lfi_20=45,
            usage_current=25, usage_baseline=25,
            minutes_current=32, minutes_baseline=32,
            fga_current=15, fga_baseline=15,
            opponent_avg_drtg=115,  # weak opponents but still cold
            role_changed=False,
        )
        assert classify_streak(ctx) == "cold_genuine"
