"""Deterministic explanation templates.

Every template uses only structured data passed in — no hallucinated stats.
"""

PLAYER_EVALUATION_TEMPLATE = """{name}'s Baseline Impact Score of {bis:.0f} ({bis_label}) places them \
in the {bis_percentile:.0f}th percentile among active players.

Role Difficulty Adjustment of {rda:.0f} ({rda_label}) indicates the difficulty \
of their offensive role — capturing self-creation burden, shot difficulty, and \
playmaking responsibility.

Defensive Reality Score of {drs:.0f} ({drs_label}) reflects their actual defensive \
impact beyond raw steals and blocks, incorporating on/off data, matchup difficulty, \
and positional versatility.

Current Live Form Index is {lfi:.0f}, classified as "{streak_label}". This captures \
recent performance trends across rolling windows, adjusted for opponent quality \
and role stability."""

GAME_PROJECTION_TEMPLATE = """{winner} is projected to win {away} @ {home} with \
{win_prob} probability (projected margin: {margin:.1f} points).

Key factors:
{reasons}

Injury impact:
{injuries}

Confidence level: {confidence_label}. Projections are probabilistic ranges — \
actual results may differ significantly, especially in close games."""

STREAK_TEMPLATE = """{name}'s current form is classified as "{streak_label}" \
with a Live Form Index of {lfi:.0f}.

Usage has shifted {usage_delta:+.1f}% from baseline, while true shooting \
percentage has moved {ts_delta:+.1f}%. Recent opponents have been \
{opponent_quality} quality, and minutes have changed by {minutes_delta:+.1f} \
per game.

This classification considers shot quality, volume stability, opponent \
context, and role changes to separate genuine form shifts from noise."""

TEAM_EVALUATION_TEMPLATE = """{name}'s Team Strength Core of {tsc:.0f} ({tsc_label}) \
reflects their overall quality adjusted for strength of schedule, injuries, \
and recent form.

Live Team Form Index of {ltfi:.0f} shows {form_description} recent performance \
across rolling windows. {injury_context}

Key strengths: {strengths}
Key concerns: {concerns}"""
