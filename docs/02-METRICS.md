# CourtVision — Custom Metric System

## Design Philosophy

No single metric captures basketball truth. CourtVision builds a **layered metric architecture** where each metric captures a specific dimension of value, and composite projections blend them with context-aware weighting.

All metrics output:
- A **score** (normalized 0-100 scale)
- A **confidence rating** (0.0-1.0)
- A **component breakdown** (which inputs drove the score)
- A **delta from baseline** (how much has changed recently)

Confidence degrades when:
- Sample size is small (< 20 games)
- Input metrics are missing
- Player role has changed recently
- Injury/absence gaps exist

---

## PLAYER METRICS

### 1. Baseline Impact Score (BIS)

**Purpose:** Stable estimate of overall player value using the strongest existing impact metrics.

**Inputs & Weights:**
```
EPM:          0.30  (most predictive single metric)
LEBRON:       0.25  (strong blend of box + impact)
RAPM/APM:     0.20  (gold standard when sample is sufficient)
BPM:          0.10  (box-score derived, lower weight due to known biases)
On/Off:       0.10  (noisy but useful supporting signal)
Win Shares/48: 0.05 (legacy, low weight, included for smoothing)
```

**Normalization:**
Each input is z-score normalized against the active player population for the current season.
```python
def normalize(value, population_mean, population_std):
    return (value - population_mean) / population_std
```

**Formula:**
```python
def compute_bis(player):
    inputs = {
        'epm': (player.epm, 0.30),
        'lebron': (player.lebron, 0.25),
        'rapm': (player.rapm, 0.20),
        'bpm': (player.bpm, 0.10),
        'on_off': (player.on_off_net, 0.10),
        'ws48': (player.ws_per_48, 0.05),
    }

    available = {k: v for k, v in inputs.items() if v[0] is not None}
    total_weight = sum(w for _, w in available.values())

    # Renormalize weights for available inputs
    weighted_sum = sum(
        normalize(val, POPULATION_MEANS[k], POPULATION_STDS[k]) * (weight / total_weight)
        for k, (val, weight) in available.items()
    )

    # Convert z-score to 0-100 scale (mean=50, std=10)
    raw_score = 50 + (weighted_sum * 10)
    score = clamp(raw_score, 0, 100)

    # Confidence based on input availability and sample size
    availability_factor = total_weight  # 1.0 if all available
    sample_factor = min(player.games_played / 40, 1.0)
    confidence = availability_factor * 0.6 + sample_factor * 0.4

    return BISResult(
        score=score,
        confidence=confidence,
        components={k: normalize(v, POPULATION_MEANS[k], POPULATION_STDS[k])
                    for k, (v, _) in available.items()},
        percentile=percentile_rank(score, ALL_PLAYER_BIS_SCORES)
    )
```

**Missing Data Fallback:**
- If EPM missing: upweight LEBRON to 0.40
- If RAPM missing: upweight EPM to 0.40
- If fewer than 3 inputs available: flag confidence < 0.3, label "low confidence estimate"

---

### 2. Role Difficulty Adjustment (RDA)

**Purpose:** Measure how hard a player's offensive role is. Separates easy-efficiency role players from high-burden engines.

**Factors & Weights:**
```
self_creation_rate:    0.20  (% of shots that are unassisted)
shot_difficulty:       0.15  (avg defender distance, shot clock context)
late_clock_frequency:  0.15  (% of possessions used with < 7 sec on shot clock)
usage_rate:            0.15  (USG%)
playmaking_burden:     0.15  (potential assists + AST% relative to position)
defensive_attention:   0.10  (double team frequency, help rotation trigger rate)
creation_for_others:   0.10  (hockey assists, screen assists, gravity-created looks)
```

**Formula:**
```python
def compute_rda(player):
    self_creation = player.unassisted_fg_pct  # 0.0-1.0
    shot_diff = normalize_shot_difficulty(player.avg_defender_distance,
                                          player.avg_shot_clock_remaining)
    late_clock = player.possessions_under_7_sec / player.total_possessions
    usage = player.usage_rate / 100
    playmaking = normalize_playmaking(player.potential_assists_per_game,
                                       player.ast_pct, player.position)
    attention = normalize_attention(player.double_team_pct,
                                     player.help_rotation_trigger_rate)
    creation_others = normalize_creation(player.hockey_assists,
                                          player.screen_assists,
                                          player.gravity_created_looks)

    raw = (
        self_creation * 0.20 +
        shot_diff * 0.15 +
        late_clock * 0.15 +
        usage * 0.15 +
        playmaking * 0.15 +
        attention * 0.10 +
        creation_others * 0.10
    )

    score = clamp(raw * 100, 0, 100)
    confidence = compute_sample_confidence(player.games_played,
                                            available_tracking_data=True)

    return RDAResult(
        score=score,
        confidence=confidence,
        label=classify_role_difficulty(score),
        # "Elite Creator" | "High-Burden Star" | "Primary Option" |
        # "Secondary Creator" | "Complementary Scorer" | "Low-Usage Role Player"
        components={...}
    )
```

**Tracking Data Fallback:**
If tracking data (defender distance, double teams) unavailable:
- Increase weight on self_creation_rate to 0.30
- Increase weight on usage to 0.25
- Drop attention and shot_diff
- Flag confidence reduction

---

### 3. Gravity & Off-Ball Impact (GOI)

**Purpose:** Estimate value created without the ball in hand.

**Factors & Weights:**
```
spacing_effect:          0.25  (teammate 3PT% with player on court vs off)
defender_distortion:     0.20  (avg help-side distance, closeout frequency)
movement_frequency:      0.15  (off-ball miles per game, relocations)
screen_assists:          0.15  (screen assists per game)
teammate_efficiency:     0.15  (teammate eFG% lift when sharing floor)
corner_gravity:          0.10  (open corner 3 generation rate for teammates)
```

**Formula:**
```python
def compute_goi(player):
    spacing = player.teammate_3pt_on - player.teammate_3pt_off
    distortion = normalize(player.avg_help_distance_on - league_avg_help_distance)
    movement = normalize(player.offball_miles_per_game, league_mean, league_std)
    screens = normalize(player.screen_assists_per_game, league_mean, league_std)
    teammate_eff = player.teammate_efg_on - player.teammate_efg_off
    corner = normalize(player.corner_3_generation_rate, league_mean, league_std)

    raw = (
        normalize_to_01(spacing) * 0.25 +
        normalize_to_01(distortion) * 0.20 +
        normalize_to_01(movement) * 0.15 +
        normalize_to_01(screens) * 0.15 +
        normalize_to_01(teammate_eff) * 0.15 +
        normalize_to_01(corner) * 0.10
    )

    score = clamp(raw * 100, 0, 100)
    return GOIResult(score=score, confidence=..., components={...})
```

**V2 Metric** — Requires tracking data. In MVP, use simplified version:
- spacing_effect from on/off 3PT differential
- screen_assists from play-by-play
- teammate_efficiency from on/off eFG

---

### 4. Defensive Reality Score (DRS)

**Purpose:** Estimate whether a player actually improves team defense, avoiding the steals/blocks illusion.

**Factors & Weights:**
```
on_off_defense:        0.25  (team DRtg with player on vs off)
matchup_difficulty:    0.15  (strength of assignment)
rim_deterrence:        0.10  (opponent FG% at rim when player is nearest defender)
contest_quality:       0.10  (% of shots contested, contest effectiveness)
foul_discipline:       0.10  (fouls per 36 relative to position avg)
rotation_consistency:  0.10  (defensive assignment consistency, help rotation timing)
positional_versatility: 0.10 (# of positions defended effectively)
defensive_rebounding:  0.05  (DREB% relative to position)
blow_by_rate:          0.05  (inverse — lower is better)
```

**Formula:**
```python
def compute_drs(player):
    on_off_def = -(player.team_drtg_on - player.team_drtg_off)  # negative DRtg = better
    matchup_diff = normalize(player.avg_matchup_offensive_rating)
    rim_deter = normalize(-(player.opp_fg_at_rim_when_nearest - league_avg))
    contests = normalize(player.contest_rate * player.contest_effectiveness)
    foul_disc = normalize(-(player.fouls_per_36 - position_avg_fouls))
    rotations = normalize(player.rotation_grade)  # if available
    versatility = player.positions_defended_count / 5.0
    dreb = normalize(player.dreb_pct)
    blow_by = normalize(-player.blow_by_rate)

    raw = (
        normalize_to_01(on_off_def) * 0.25 +
        normalize_to_01(matchup_diff) * 0.15 +
        normalize_to_01(rim_deter) * 0.10 +
        normalize_to_01(contests) * 0.10 +
        normalize_to_01(foul_disc) * 0.10 +
        normalize_to_01(rotations) * 0.10 +
        versatility * 0.10 +
        normalize_to_01(dreb) * 0.05 +
        normalize_to_01(blow_by) * 0.05
    )

    score = clamp(raw * 100, 0, 100)
    label = classify_defender(score, player.position)
    # "Elite Anchor" | "Strong Starter" | "Solid" | "Neutral" |
    # "Liability" | "Significant Liability"

    return DRSResult(score=score, confidence=..., label=label, components={...})
```

**Tracking Fallback:**
Without tracking data, rely more heavily on on/off defense (0.45 weight), DREB% (0.15), foul discipline (0.15), steals/blocks as last resort (0.15 combined), BPM defensive component (0.10).

---

### 5. Scalability & Portability Score (SPS)

**Purpose:** Measure whether a player's value transfers across different contexts and roles.

**Factors & Weights:**
```
usage_efficiency_curve:   0.20  (efficiency at varying usage levels)
off_ball_competence:      0.15  (shooting, cutting, screening without ball)
lineup_flexibility:       0.15  (performance across varied lineup types)
star_compatibility:       0.15  (impact when sharing floor with high-usage players)
bench_unit_impact:        0.10  (impact in non-star lineups)
ball_dominance_dependency: 0.10 (inverse — how much does value drop without ball)
archetype_adaptability:   0.15  (performance across opponent archetypes)
```

**Formula:**
```python
def compute_sps(player):
    # Usage-efficiency curve: efficiency at low, medium, high usage
    usage_curve = compute_usage_efficiency_curve(player)
    # Flat or rising curve = good, steep drop = bad
    curve_score = 1.0 - max(0, usage_curve.high_usage_drop)

    off_ball = compute_off_ball_competence(player)
    lineup_flex = compute_lineup_flexibility(player)  # variance across lineup types
    star_compat = compute_star_compatibility(player)
    bench_impact = compute_bench_impact(player)
    ball_dep = 1.0 - compute_ball_dominance_dependency(player)
    archetype_adapt = compute_archetype_adaptability(player)

    raw = (
        curve_score * 0.20 +
        off_ball * 0.15 +
        lineup_flex * 0.15 +
        star_compat * 0.15 +
        bench_impact * 0.10 +
        ball_dep * 0.10 +
        archetype_adapt * 0.15
    )

    score = clamp(raw * 100, 0, 100)
    label = classify_portability(score)
    # "Plug-and-Play Star" | "Versatile Starter" | "Context-Dependent" |
    # "System-Specific" | "Heliocentric Only"

    return SPSResult(score=score, confidence=..., label=label, components={...})
```

**V2 Metric** — Requires lineup-level data. In MVP, use simplified proxy:
- Usage rate vs. TS% correlation
- On/off with and without team's best player
- Position versatility indicator

---

### 6. Live Form Index (LFI)

**Purpose:** Capture what is happening right now, with noise filtering.

**Rolling Windows:** Last 3, 5, 10, 20 games

**Factors per window:**
```
efficiency_delta:     0.25  (TS% vs season baseline)
usage_delta:          0.10  (usage change — context for efficiency)
minutes_delta:        0.10  (minutes change — role signal)
impact_delta:         0.20  (rolling BPM/on-off vs season baseline)
shot_quality_trend:   0.10  (shot difficulty change, assisted rate change)
opponent_adjustment:  0.15  (opponent DRtg adjustment for recent games)
role_change_flag:     0.10  (binary: has role materially changed?)
```

**Formula:**
```python
def compute_lfi(player):
    windows = [3, 5, 10, 20]
    window_weights = {3: 0.15, 5: 0.30, 10: 0.35, 20: 0.20}

    window_scores = {}
    for w in windows:
        recent = player.last_n_games(w)
        season = player.season_baseline

        eff_delta = (recent.ts_pct - season.ts_pct) / season.ts_pct_std
        usg_delta = (recent.usage - season.usage) / season.usage_std
        min_delta = (recent.minutes - season.minutes) / season.minutes_std
        impact_delta = (recent.bpm - season.bpm) / season.bpm_std
        sq_delta = compute_shot_quality_delta(recent, season)
        opp_adj = compute_opponent_adjustment(recent.opponents)
        role_flag = detect_role_change(recent, season)

        raw = (
            sigmoid(eff_delta) * 0.25 +
            sigmoid(usg_delta) * 0.10 +
            sigmoid(min_delta) * 0.10 +
            sigmoid(impact_delta) * 0.20 +
            sigmoid(sq_delta) * 0.10 +
            opp_adj * 0.15 +
            role_flag * 0.10
        )
        window_scores[w] = raw

    # Blend windows
    blended = sum(window_scores[w] * window_weights[w] for w in windows)
    score = clamp(blended * 100, 0, 100)

    # Classify streak
    streak_label = classify_streak(window_scores, player)

    return LFIResult(
        score=score,
        confidence=compute_lfi_confidence(player.games_played),
        windows=window_scores,
        streak_label=streak_label,
        streak_classification=streak_label,
        delta_from_baseline=score - 50  # 50 = neutral (matching baseline)
    )
```

---

### 7. Matchup Advantage Index (MAI)

**Purpose:** Estimate game-specific edge for a player in tonight's matchup.

**Factors & Weights:**
```
likely_defender_matchup:   0.20  (how does player perform vs this defender type)
opponent_scheme:           0.15  (drop vs switch vs blitz — player's success rate)
size_speed_mismatch:       0.10  (physical matchup advantage)
pace_environment:          0.10  (player's performance at this pace)
opponent_defense_rating:   0.15  (opponent's DRtg at player's primary zones)
help_defense_profile:      0.10  (opponent's rim protection and help)
rest_fatigue:              0.10  (B2B, rest days, minutes load)
historical_vs_opponent:    0.10  (player's track record vs this team, 2-year window)
```

**Formula:**
```python
def compute_mai(player, opponent, game_context):
    defender = project_likely_defender(player, opponent)
    defender_score = player_vs_defender_type_score(player, defender)

    scheme = opponent.defensive_scheme
    scheme_score = player_vs_scheme_score(player, scheme)

    mismatch = compute_physical_mismatch(player, defender)
    pace = player_pace_adjustment(player, game_context.projected_pace)
    opp_def = opponent_zone_defense_quality(opponent, player.primary_zones)
    help = opponent_help_defense_quality(opponent)
    rest = compute_rest_fatigue_factor(player, game_context)
    history = player_vs_team_history(player, opponent.team_id, window_years=2)

    raw = (
        defender_score * 0.20 +
        scheme_score * 0.15 +
        mismatch * 0.10 +
        pace * 0.10 +
        (1.0 - opp_def) * 0.15 +  # weaker opponent defense = higher score
        (1.0 - help) * 0.10 +
        rest * 0.10 +
        history * 0.10
    )

    score = clamp(raw * 100, 0, 100)
    label = classify_matchup(score)
    # "Strong Advantage" | "Slight Advantage" | "Neutral" |
    # "Slight Disadvantage" | "Tough Matchup"

    return MAIResult(score=score, confidence=..., label=label,
                     key_factors=extract_top_factors(components))
```

---

### 8. Game Impact Projection (GIP)

**Purpose:** Project expected player impact and stat line for tonight's game.

**Blend:**
```python
def compute_gip(player, opponent, game_context):
    bis = player.bis_score
    rda = player.rda_score
    lfi = player.lfi_score
    mai = compute_mai(player, opponent, game_context)
    drs = player.drs_score

    # Injury/fatigue adjustments
    minutes_adj = project_minutes(player, game_context)
    fatigue_penalty = compute_fatigue_penalty(player, game_context)

    # Impact score (blended)
    impact = (
        bis * 0.30 +
        lfi.score * 0.25 +
        mai.score * 0.20 +
        rda * 0.10 +
        drs * 0.10 +
        fatigue_penalty * 0.05
    )

    # Stat line projection
    projected_stats = project_stat_line(
        player=player,
        projected_minutes=minutes_adj,
        pace=game_context.projected_pace,
        opponent=opponent,
        mai=mai,
        lfi=lfi,
    )

    # Confidence based on input quality
    confidence = min(
        bis_confidence,
        lfi_confidence,
        mai_confidence,
        minutes_confidence
    )

    # Volatility — how wide the range should be
    volatility = compute_player_volatility(player) * (1.0 + fatigue_penalty * 0.2)

    return GIPResult(
        impact_score=clamp(impact, 0, 100),
        projected_minutes=minutes_adj,
        projected_stats=ProjectedStatLine(
            points=StatRange(projected_stats.pts, volatility),
            rebounds=StatRange(projected_stats.reb, volatility),
            assists=StatRange(projected_stats.ast, volatility),
            steals=StatRange(projected_stats.stl, volatility),
            blocks=StatRange(projected_stats.blk, volatility),
            turnovers=StatRange(projected_stats.tov, volatility),
            threes=StatRange(projected_stats.fg3m, volatility),
            fouls=StatRange(projected_stats.pf, volatility),
            usage=projected_stats.usage,
            ts_pct=StatRange(projected_stats.ts_pct, volatility),
        ),
        confidence=confidence,
        volatility_rating=classify_volatility(volatility),
        key_factors=mai.key_factors,
    )

def project_stat_line(player, projected_minutes, pace, opponent, mai, lfi):
    """
    Project stats using:
    1. Season per-minute rates as baseline
    2. Adjusted for pace environment
    3. Adjusted for opponent defense at each stat category
    4. Adjusted for recent form (LFI)
    5. Adjusted for matchup (MAI)
    """
    pace_factor = pace / player.season_pace
    form_factor = 1.0 + (lfi.score - 50) / 200  # ±25% max form adjustment
    matchup_factor = 1.0 + (mai.score - 50) / 200

    base = player.per_minute_rates
    minutes = projected_minutes

    return ProjectedStats(
        pts=base.pts * minutes * pace_factor * form_factor
            * opponent_pts_allowed_factor(opponent, player.position),
        reb=base.reb * minutes * opponent_reb_factor(opponent, player.position),
        ast=base.ast * minutes * pace_factor * form_factor,
        stl=base.stl * minutes * opponent_tov_rate_factor(opponent),
        blk=base.blk * minutes * opponent_rim_attempt_factor(opponent),
        tov=base.tov * minutes * opponent_pressure_factor(opponent),
        fg3m=base.fg3m * minutes * pace_factor
             * form_factor * matchup_factor,
        pf=base.pf * minutes,
        usage=player.usage_rate * form_factor,
        ts_pct=player.ts_pct * form_factor * matchup_factor,
    )

class StatRange:
    def __init__(self, center, volatility):
        self.center = round(center, 1)
        self.low = round(center * (1 - volatility * 0.3), 1)
        self.high = round(center * (1 + volatility * 0.3), 1)
```

---

## TEAM METRICS

### 1. Team Strength Core (TSC)

**Purpose:** Baseline team quality estimate.

```python
def compute_tsc(team):
    ortg = normalize(team.ortg, league_mean_ortg, league_std_ortg)
    drtg = normalize(-team.drtg, -league_mean_drtg, league_std_drtg)  # lower = better
    net = normalize(team.net_rating, league_mean_net, league_std_net)
    sos = team.strength_of_schedule_adjustment
    injury_adj = compute_team_injury_adjustment(team)
    form = team.ltfi_score / 100  # forward reference — computed independently
    lineup_str = compute_lineup_weighted_strength(team)

    raw = (
        net * 0.30 +
        ortg * 0.15 +
        drtg * 0.15 +
        sos * 0.10 +
        injury_adj * 0.10 +
        form * 0.10 +
        lineup_str * 0.10
    )

    score = clamp(50 + raw * 10, 0, 100)
    return TSCResult(score=score, confidence=..., components={...})
```

### 2. Lineup Synergy Score (LSS)

```python
def compute_lss(team):
    top_lineup = team.best_5man_lineup_net_rating
    top_3man_units = avg(team.top_3man_units_net_rating[:5])
    spacing_balance = compute_spacing_balance(team)
    creation_balance = compute_creation_balance(team)
    defensive_flexibility = compute_defensive_flexibility(team)
    unit_stability = compute_unit_stability(team)  # minutes together
    transition_balance = compute_transition_balance(team)

    raw = (
        normalize_to_01(top_lineup) * 0.20 +
        normalize_to_01(top_3man_units) * 0.15 +
        spacing_balance * 0.15 +
        creation_balance * 0.15 +
        defensive_flexibility * 0.15 +
        unit_stability * 0.10 +
        transition_balance * 0.10
    )

    score = clamp(raw * 100, 0, 100)
    return LSSResult(score=score, confidence=..., components={...})
```

### 3. Redundancy Penalty (RP)

```python
def compute_rp(team):
    penalties = []

    # Too many ball-dominant players
    high_usage = [p for p in team.rotation if p.usage_rate > 25]
    if len(high_usage) > 2:
        penalties.append(('usage_overlap', (len(high_usage) - 2) * 8))

    # Insufficient shooting
    shooters = [p for p in team.rotation if p.three_pt_pct > 0.36 and p.three_pt_attempts > 3]
    if len(shooters) < 3:
        penalties.append(('shooting_deficit', (3 - len(shooters)) * 10))

    # No rim pressure
    rim_attackers = [p for p in team.rotation if p.rim_fg_attempts_per_game > 3]
    if len(rim_attackers) < 2:
        penalties.append(('rim_pressure_deficit', (2 - len(rim_attackers)) * 8))

    # POA defense weakness
    weak_poa = [p for p in team.starting_guards if p.drs_score < 35]
    if len(weak_poa) > 1:
        penalties.append(('poa_defense_weakness', len(weak_poa) * 7))

    # No connective passers
    connectors = [p for p in team.rotation if p.ast_pct > 15 and p.usage_rate < 25]
    if len(connectors) < 2:
        penalties.append(('connector_deficit', (2 - len(connectors)) * 6))

    total_penalty = sum(p[1] for p in penalties)
    score = clamp(100 - total_penalty, 0, 100)  # 100 = no redundancy issues
    return RPResult(score=score, penalties=penalties)
```

### 4. Playoff Translation Score (PTS)

```python
def compute_pts(team):
    halfcourt_off = team.halfcourt_ortg_rank_pct  # 0-1, higher = better
    halfcourt_def = team.halfcourt_drtg_rank_pct
    shot_creation = compute_team_shot_creation_quality(team)
    def_versatility = compute_team_defensive_versatility(team)
    tov_control = 1.0 - normalize_to_01(team.tov_rate)
    foul_discipline = 1.0 - normalize_to_01(team.foul_rate)
    top_lineup_quality = normalize_to_01(team.best_5man_net_rating)
    star_scalability = avg([p.sps_score for p in team.top_3_players]) / 100

    raw = (
        halfcourt_off * 0.20 +
        halfcourt_def * 0.20 +
        shot_creation * 0.15 +
        def_versatility * 0.15 +
        tov_control * 0.08 +
        foul_discipline * 0.07 +
        top_lineup_quality * 0.08 +
        star_scalability * 0.07
    )

    score = clamp(raw * 100, 0, 100)
    return PTSResult(score=score, confidence=..., components={...})
```

### 5. Dependency Risk Score (DRS-Team)

```python
def compute_drs_team(team):
    star = team.best_player_by_bis
    star_minutes_share = star.minutes / team.total_available_minutes
    star_usage = star.usage_rate

    # Team performance with vs without star
    net_with = team.net_rating_with_star
    net_without = team.net_rating_without_star
    drop = net_with - net_without

    backup_quality = avg([p.bis_score for p in team.backup_players]) / 100
    usage_concentration = compute_usage_herfindahl(team)  # higher = more concentrated
    lineup_resilience = compute_lineup_resilience(team)  # performance of non-star lineups

    dependency = (
        normalize_to_01(drop) * 0.30 +
        usage_concentration * 0.20 +
        (1.0 - backup_quality) * 0.20 +
        (1.0 - lineup_resilience) * 0.15 +
        star_minutes_share * 0.15
    )

    # Invert: high score = low dependency = good
    score = clamp((1.0 - dependency) * 100, 0, 100)
    return DRSTeamResult(score=score, star_drop=drop, components={...})
```

### 6. Live Team Form Index (LTFI)

```python
def compute_ltfi(team):
    windows = {5: 0.25, 10: 0.40, 20: 0.35}
    scores = {}

    for w, weight in windows.items():
        recent = team.last_n_games(w)
        season = team.season_baseline

        net_delta = recent.net_rating - season.net_rating
        opp_quality = avg([g.opponent_tsc for g in recent.games])
        injury_state = compute_injury_severity(team.current_injuries)
        lineup_continuity = compute_lineup_continuity(recent)
        shooting_luck = recent.three_pt_pct - team.expected_three_pt_pct
        clutch_adj = normalize_clutch_performance(recent)

        raw = (
            sigmoid(net_delta / 3) * 0.30 +
            opp_quality * 0.20 +
            (1.0 - injury_state) * 0.15 +
            lineup_continuity * 0.15 +
            sigmoid(-shooting_luck / 0.03) * 0.10 +  # penalize luck-driven hot streaks
            clutch_adj * 0.10
        )
        scores[w] = raw

    blended = sum(scores[w] * windows[w] for w in windows)
    score = clamp(blended * 100, 0, 100)
    return LTFIResult(score=score, windows=scores, components={...})
```

### 7. Style Clash Engine (SCE)

```python
def compute_sce(home_team, away_team, game_context):
    factors = {}

    # Pace clash
    factors['pace'] = compute_pace_clash(home_team, away_team)

    # Transition battle
    factors['transition'] = compute_transition_clash(home_team, away_team)

    # Inside-outside profile
    factors['rim_vs_three'] = compute_rim_three_clash(home_team, away_team)

    # Rebounding battle
    factors['rebounding'] = compute_rebounding_clash(home_team, away_team)

    # Turnover pressure
    factors['turnover_pressure'] = compute_turnover_clash(home_team, away_team)

    # PnR tendencies
    factors['pick_and_roll'] = compute_pnr_clash(home_team, away_team)

    # Switching vulnerability
    factors['switching'] = compute_switching_clash(home_team, away_team)

    # Paint containment
    factors['paint'] = compute_paint_clash(home_team, away_team)

    # Bench mismatch
    factors['bench'] = compute_bench_mismatch(home_team, away_team)

    return SCEResult(
        factors=factors,
        projected_pace=project_game_pace(home_team, away_team),
        style_narrative=generate_style_narrative(factors),
        key_clashes=extract_top_clashes(factors, n=3),
    )
```

### 8. Game Outcome Projection (GOP)

```python
def compute_gop(home_team, away_team, game_context):
    # Base team strength
    home_tsc = home_team.tsc_score
    away_tsc = away_team.tsc_score

    # Home court advantage (~3.5 points historically, adjusted per team)
    hca = compute_home_court_advantage(home_team)

    # Live form adjustment
    home_form = (home_team.ltfi_score - 50) * 0.15
    away_form = (away_team.ltfi_score - 50) * 0.15

    # Injury impact
    home_injury = compute_team_injury_impact(home_team)
    away_injury = compute_team_injury_impact(away_team)

    # Style clash modifier
    sce = compute_sce(home_team, away_team, game_context)
    style_modifier = compute_style_modifier(sce, home_team, away_team)

    # Rest/fatigue
    home_rest = compute_rest_factor(home_team, game_context)
    away_rest = compute_rest_factor(away_team, game_context)

    # Point differential estimate
    home_advantage = (
        (home_tsc - away_tsc) * 0.3 +  # ~0.3 points per TSC point difference
        hca +
        home_form - away_form +
        home_injury - away_injury +
        style_modifier +
        home_rest - away_rest
    )

    # Win probability using logistic function
    win_prob_home = 1.0 / (1.0 + math.exp(-home_advantage / 4.5))

    # Projected score
    projected_pace = sce.projected_pace
    possessions = projected_pace  # approx possessions per team
    base_efficiency = (home_team.ortg + away_team.ortg) / 2 / 100
    projected_total = possessions * base_efficiency * 2
    home_score = projected_total / 2 + home_advantage / 2
    away_score = projected_total / 2 - home_advantage / 2

    # Confidence based on input quality
    confidence = min(
        home_team.tsc_confidence,
        away_team.tsc_confidence,
        compute_injury_confidence(home_team, away_team),
    )

    return GOPResult(
        projected_winner='home' if win_prob_home > 0.5 else 'away',
        win_probability_home=win_prob_home,
        win_probability_away=1.0 - win_prob_home,
        projected_score_home=StatRange(home_score, game_volatility),
        projected_score_away=StatRange(away_score, game_volatility),
        projected_pace=projected_pace,
        confidence=confidence,
        margin=abs(home_advantage),
        upset_risk=classify_upset_risk(win_prob_home),
        key_reasons=extract_key_reasons(home_advantage_components),
    )
```

---

## HOT STREAK CLASSIFICATION

```python
def classify_streak(window_scores, player):
    """
    Classify a player's current streak based on multiple signals.
    """
    lfi_3 = window_scores[3]
    lfi_5 = window_scores[5]
    lfi_10 = window_scores[10]
    lfi_20 = window_scores[20]

    is_hot = lfi_5 > 60 or lfi_10 > 58
    is_cold = lfi_5 < 40 or lfi_10 < 42

    if not is_hot and not is_cold:
        return StreakLabel.NEUTRAL

    recent = player.last_n_games(10)
    season = player.season_baseline

    usage_stable = abs(recent.usage - season.usage) < 3
    usage_up = recent.usage - season.usage > 3
    minutes_stable = abs(recent.minutes - season.minutes) < 3
    minutes_up = recent.minutes - season.minutes > 3
    shot_quality_up = recent.shot_quality > season.shot_quality + 0.02
    weak_opponents = avg([g.opp_drtg for g in recent.games]) > league_avg_drtg + 1
    role_changed = detect_role_change(recent, season)
    low_volume = recent.fga_per_game < season.fga_per_game * 0.75

    if is_hot:
        if role_changed and usage_up and minutes_up:
            return StreakLabel.BREAKOUT_ROLE_EXPANSION
            # "Breakout tied to expanded role"
        if usage_stable and not weak_opponents and not low_volume:
            return StreakLabel.HOT_LIKELY_REAL
            # "Hot and likely real"
        if weak_opponents:
            return StreakLabel.HOT_OPPONENT_DRIVEN
            # "Hot but opponent-driven"
        if low_volume:
            return StreakLabel.HOT_LOW_VOLUME
            # "Fake hot streak — low volume"
        if shot_quality_up and not usage_stable:
            return StreakLabel.HOT_FRAGILE
            # "Hot but fragile"
        return StreakLabel.HOT_FRAGILE

    if is_cold:
        if weak_opponents is False and shot_quality_up:
            return StreakLabel.COLD_BAD_LUCK
            # "Cold but due for rebound — shot quality is fine"
        if role_changed:
            return StreakLabel.COLD_ROLE_DRIVEN
            # "Slump driven by role/context change"
        if recent.minutes < season.minutes - 4:
            return StreakLabel.COLD_MINUTES_DRIVEN
            # "Slump tied to reduced minutes"
        return StreakLabel.COLD_GENUINE
        # "Genuine cold stretch"
```

**Streak Labels:**
| Label | Display Text |
|-------|-------------|
| HOT_LIKELY_REAL | "Hot and likely real" |
| HOT_FRAGILE | "Hot but fragile" |
| HOT_OPPONENT_DRIVEN | "Hot but opponent-driven" |
| HOT_LOW_VOLUME | "Fake hot streak — low volume" |
| BREAKOUT_ROLE_EXPANSION | "Breakout tied to expanded role" |
| COLD_BAD_LUCK | "Cold but due for rebound" |
| COLD_ROLE_DRIVEN | "Slump driven by role change" |
| COLD_MINUTES_DRIVEN | "Slump tied to reduced minutes" |
| COLD_GENUINE | "Genuine cold stretch" |
| NEUTRAL | (no label) |

---

## FATIGUE & INJURY ADJUSTMENT MODEL

```python
def compute_fatigue_penalty(player, game_context):
    """Returns 0.0-1.0 where 1.0 = max fatigue penalty."""
    penalty = 0.0

    # Back-to-back
    if game_context.is_back_to_back:
        penalty += 0.15

    # 3-in-4 nights
    if game_context.is_3_in_4:
        penalty += 0.10

    # Recent minutes load (last 5 games avg vs season)
    recent_mpg = player.last_5_avg_minutes
    season_mpg = player.season_avg_minutes
    if recent_mpg > season_mpg + 3:
        penalty += 0.08

    # Cumulative heavy-minute stretch
    if player.last_10_avg_minutes > 36:
        penalty += 0.05

    # Recent return from injury
    if player.games_since_return is not None and player.games_since_return < 5:
        penalty += 0.12

    # Travel burden (simplified)
    if game_context.travel_distance_miles > 1500:
        penalty += 0.05

    return min(penalty, 0.40)  # Cap at 40% penalty


def compute_team_injury_impact(team):
    """
    Estimate net rating impact of current injuries.
    Returns a point value adjustment (negative = injuries hurt).
    """
    impact = 0.0
    for player in team.injured_players:
        # Player's marginal value = their on/off differential * minutes share
        player_impact = player.on_off_net * (player.avg_minutes / 48)

        # Replacement quality
        replacement = team.get_replacement(player)
        replacement_impact = replacement.on_off_net * (player.avg_minutes / 48)

        # Net loss
        impact += (replacement_impact - player_impact)

    return impact
```

---

## CONFIDENCE FRAMEWORK

All metrics include a confidence score (0.0-1.0):

| Confidence | Label | Meaning |
|------------|-------|---------|
| 0.8-1.0 | High | Sufficient data, all inputs available |
| 0.6-0.8 | Moderate | Some inputs missing or small sample |
| 0.4-0.6 | Low | Multiple inputs missing, limited sample |
| 0.0-0.4 | Very Low | Insufficient data, treat as rough estimate |

Confidence factors:
- Games played this season (min 20 for moderate, 40 for high)
- Input metric availability
- Tracking data availability
- Role stability (recent changes reduce confidence)
- Sample size for specific splits/matchup data
