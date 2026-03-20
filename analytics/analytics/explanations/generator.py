"""Explanation generator — produces grounded natural-language explanations.

Every explanation is built from structured metric data. No hallucinated stats.
Uses deterministic templates for consistency, with optional LLM polish.
"""

from dataclasses import dataclass
from typing import Optional

from .templates import (
    PLAYER_EVALUATION_TEMPLATE,
    GAME_PROJECTION_TEMPLATE,
    STREAK_TEMPLATE,
    TEAM_EVALUATION_TEMPLATE,
)


@dataclass
class ExplanationOutput:
    title: str
    body: str
    factors: dict
    confidence: float
    entity_type: str
    entity_id: int
    explanation_type: str


class ExplanationGenerator:
    """Generates grounded explanations from structured metric data."""

    def player_evaluation(
        self,
        player_name: str,
        player_id: int,
        bis: float,
        bis_label: str,
        bis_percentile: float,
        rda: float,
        rda_label: str,
        drs: float,
        drs_label: str,
        lfi: float,
        streak_label: str,
        confidence: float,
        key_components: Optional[dict] = None,
    ) -> ExplanationOutput:
        factors = {
            "BIS": bis,
            "BIS Label": bis_label,
            "BIS Percentile": bis_percentile,
            "RDA": rda,
            "RDA Label": rda_label,
            "DRS": drs,
            "DRS Label": drs_label,
            "LFI": lfi,
            "Streak": streak_label,
        }

        body = PLAYER_EVALUATION_TEMPLATE.format(
            name=player_name,
            bis=bis,
            bis_label=bis_label,
            bis_percentile=bis_percentile,
            rda=rda,
            rda_label=rda_label,
            drs=drs,
            drs_label=drs_label,
            lfi=lfi,
            streak_label=streak_label,
        )

        return ExplanationOutput(
            title=f"{player_name} — Current Evaluation",
            body=body,
            factors=factors,
            confidence=confidence,
            entity_type="player",
            entity_id=player_id,
            explanation_type="metric",
        )

    def game_projection(
        self,
        game_id: int,
        home_name: str,
        away_name: str,
        win_prob_home: float,
        margin: float,
        key_reasons: list[str],
        confidence: float,
        home_ltfi: float,
        away_ltfi: float,
        injury_notes: list[str],
    ) -> ExplanationOutput:
        factors = {
            "Home Win Probability": f"{win_prob_home:.0%}",
            "Projected Margin": margin,
            "Home LTFI": home_ltfi,
            "Away LTFI": away_ltfi,
        }

        reasons_text = "\n".join(f"• {r}" for r in key_reasons)
        injury_text = "\n".join(f"• {n}" for n in injury_notes) if injury_notes else "No significant injuries."

        body = GAME_PROJECTION_TEMPLATE.format(
            home=home_name,
            away=away_name,
            winner=home_name if win_prob_home > 0.5 else away_name,
            win_prob=f"{max(win_prob_home, 1-win_prob_home):.0%}",
            margin=margin,
            reasons=reasons_text,
            injuries=injury_text,
            confidence_label="high" if confidence >= 0.7 else "moderate" if confidence >= 0.5 else "low",
        )

        return ExplanationOutput(
            title=f"{away_name} @ {home_name} — Projection",
            body=body,
            factors=factors,
            confidence=confidence,
            entity_type="game",
            entity_id=game_id,
            explanation_type="projection",
        )

    def streak_insight(
        self,
        player_name: str,
        player_id: int,
        streak_label: str,
        lfi: float,
        usage_delta: float,
        ts_delta: float,
        opponent_quality: str,
        minutes_delta: float,
    ) -> ExplanationOutput:
        factors = {
            "LFI": lfi,
            "Streak Classification": streak_label,
            "Usage Change": f"{usage_delta:+.1f}%",
            "TS% Change": f"{ts_delta:+.1f}%",
            "Opponent Quality": opponent_quality,
            "Minutes Change": f"{minutes_delta:+.1f}",
        }

        body = STREAK_TEMPLATE.format(
            name=player_name,
            streak_label=streak_label,
            lfi=lfi,
            usage_delta=usage_delta,
            ts_delta=ts_delta,
            opponent_quality=opponent_quality,
            minutes_delta=minutes_delta,
        )

        return ExplanationOutput(
            title=f"{player_name} — Streak Analysis",
            body=body,
            factors=factors,
            confidence=0.7,
            entity_type="player",
            entity_id=player_id,
            explanation_type="trend",
        )
