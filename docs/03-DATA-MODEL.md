# CourtVision — Data Model & Schema Design

## Database: PostgreSQL
## ORM: Drizzle (TypeScript) for web app, SQLAlchemy (Python) for analytics engine

---

## Entity Relationship Overview

```
Season ──< TeamSeason ──< Team
                │
                ├──< Roster ──> Player
                │
                ├──< Game ──< GameTeamStats
                │       │
                │       ├──< PlayerGameLog
                │       │
                │       ├──< GameProjection
                │       │
                │       └──< GameExplanation
                │
                ├──< TeamMetricSnapshot
                │
                └──< Lineup ──< LineupStats

Player ──< PlayerMetricSnapshot
       ──< PlayerInjury
       ──< PlayerRollingWindow
       ──< PlayerProjection
```

---

## Core Tables

### seasons
```sql
CREATE TABLE seasons (
    id              SERIAL PRIMARY KEY,
    year            INTEGER NOT NULL UNIQUE,      -- e.g., 2026 for 2025-26 season
    label           VARCHAR(10) NOT NULL,          -- "2025-26"
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    all_star_date   DATE,
    trade_deadline  DATE,
    playoff_start   DATE,
    is_current      BOOLEAN DEFAULT FALSE
);
```

### teams
```sql
CREATE TABLE teams (
    id              SERIAL PRIMARY KEY,
    external_id     VARCHAR(50) UNIQUE,            -- provider ID
    abbreviation    VARCHAR(5) NOT NULL UNIQUE,    -- "LAL", "BOS"
    name            VARCHAR(100) NOT NULL,          -- "Los Angeles Lakers"
    city            VARCHAR(50) NOT NULL,
    nickname        VARCHAR(50) NOT NULL,           -- "Lakers"
    conference      VARCHAR(10) NOT NULL,           -- "East" | "West"
    division        VARCHAR(20) NOT NULL,
    logo_url        TEXT,
    primary_color   VARCHAR(7),                     -- hex
    secondary_color VARCHAR(7),
    arena           VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### players
```sql
CREATE TABLE players (
    id              SERIAL PRIMARY KEY,
    external_id     VARCHAR(50) UNIQUE,
    first_name      VARCHAR(50) NOT NULL,
    last_name       VARCHAR(50) NOT NULL,
    full_name       VARCHAR(100) NOT NULL,
    birth_date      DATE,
    height_inches   INTEGER,
    weight_lbs      INTEGER,
    position        VARCHAR(5),                     -- "PG", "SG", "SF", "PF", "C"
    secondary_position VARCHAR(5),
    draft_year      INTEGER,
    draft_round     INTEGER,
    draft_pick      INTEGER,
    country         VARCHAR(50),
    headshot_url    TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### rosters
```sql
CREATE TABLE rosters (
    id              SERIAL PRIMARY KEY,
    team_id         INTEGER NOT NULL REFERENCES teams(id),
    player_id       INTEGER NOT NULL REFERENCES players(id),
    season_id       INTEGER NOT NULL REFERENCES seasons(id),
    jersey_number   VARCHAR(5),
    position        VARCHAR(5),
    is_two_way      BOOLEAN DEFAULT FALSE,
    start_date      DATE NOT NULL,
    end_date        DATE,                          -- NULL = still on roster
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_id, player_id, season_id, start_date)
);
CREATE INDEX idx_rosters_team_season ON rosters(team_id, season_id);
CREATE INDEX idx_rosters_player_season ON rosters(player_id, season_id);
```

### games
```sql
CREATE TABLE games (
    id              SERIAL PRIMARY KEY,
    external_id     VARCHAR(50) UNIQUE,
    season_id       INTEGER NOT NULL REFERENCES seasons(id),
    game_date       DATE NOT NULL,
    game_time       TIMESTAMPTZ,
    home_team_id    INTEGER NOT NULL REFERENCES teams(id),
    away_team_id    INTEGER NOT NULL REFERENCES teams(id),
    status          VARCHAR(20) DEFAULT 'scheduled', -- scheduled | in_progress | final
    home_score      INTEGER,
    away_score      INTEGER,
    overtime_periods INTEGER DEFAULT 0,
    arena           VARCHAR(100),
    attendance      INTEGER,
    is_back_to_back_home BOOLEAN DEFAULT FALSE,
    is_back_to_back_away BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_games_date ON games(game_date);
CREATE INDEX idx_games_season ON games(season_id);
CREATE INDEX idx_games_home_team ON games(home_team_id);
CREATE INDEX idx_games_away_team ON games(away_team_id);
CREATE INDEX idx_games_status ON games(status);
```

### game_team_stats
```sql
CREATE TABLE game_team_stats (
    id              SERIAL PRIMARY KEY,
    game_id         INTEGER NOT NULL REFERENCES games(id),
    team_id         INTEGER NOT NULL REFERENCES teams(id),
    is_home         BOOLEAN NOT NULL,
    -- Box score
    points          INTEGER,
    fgm             INTEGER,
    fga             INTEGER,
    fg3m            INTEGER,
    fg3a            INTEGER,
    ftm             INTEGER,
    fta             INTEGER,
    oreb            INTEGER,
    dreb            INTEGER,
    reb             INTEGER,
    ast             INTEGER,
    stl             INTEGER,
    blk             INTEGER,
    tov             INTEGER,
    pf              INTEGER,
    -- Advanced
    ortg            DECIMAL(6,2),
    drtg            DECIMAL(6,2),
    net_rating      DECIMAL(6,2),
    pace            DECIMAL(6,2),
    ts_pct          DECIMAL(5,4),
    efg_pct         DECIMAL(5,4),
    tov_pct         DECIMAL(5,4),
    oreb_pct        DECIMAL(5,4),
    ft_rate         DECIMAL(5,4),
    -- Paint / transition
    pts_in_paint    INTEGER,
    pts_fastbreak   INTEGER,
    pts_second_chance INTEGER,
    pts_off_tov     INTEGER,
    largest_lead    INTEGER,
    UNIQUE(game_id, team_id)
);
CREATE INDEX idx_gts_game ON game_team_stats(game_id);
CREATE INDEX idx_gts_team ON game_team_stats(team_id);
```

### player_game_logs
```sql
CREATE TABLE player_game_logs (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL REFERENCES players(id),
    game_id         INTEGER NOT NULL REFERENCES games(id),
    team_id         INTEGER NOT NULL REFERENCES teams(id),
    season_id       INTEGER NOT NULL REFERENCES seasons(id),
    -- Status
    status          VARCHAR(20) DEFAULT 'active',  -- active | dnp | inactive | injured
    starter         BOOLEAN DEFAULT FALSE,
    -- Minutes
    minutes         DECIMAL(5,2),
    -- Box score
    pts             INTEGER DEFAULT 0,
    fgm             INTEGER DEFAULT 0,
    fga             INTEGER DEFAULT 0,
    fg3m            INTEGER DEFAULT 0,
    fg3a            INTEGER DEFAULT 0,
    ftm             INTEGER DEFAULT 0,
    fta             INTEGER DEFAULT 0,
    oreb            INTEGER DEFAULT 0,
    dreb            INTEGER DEFAULT 0,
    reb             INTEGER DEFAULT 0,
    ast             INTEGER DEFAULT 0,
    stl             INTEGER DEFAULT 0,
    blk             INTEGER DEFAULT 0,
    tov             INTEGER DEFAULT 0,
    pf              INTEGER DEFAULT 0,
    plus_minus      INTEGER DEFAULT 0,
    -- Efficiency
    ts_pct          DECIMAL(5,4),
    efg_pct         DECIMAL(5,4),
    usg_pct         DECIMAL(5,4),
    -- Advanced per-game
    game_score      DECIMAL(6,2),
    bpm_game        DECIMAL(6,2),
    UNIQUE(player_id, game_id)
);
CREATE INDEX idx_pgl_player ON player_game_logs(player_id);
CREATE INDEX idx_pgl_game ON player_game_logs(game_id);
CREATE INDEX idx_pgl_team ON player_game_logs(team_id);
CREATE INDEX idx_pgl_season ON player_game_logs(season_id);
CREATE INDEX idx_pgl_player_season ON player_game_logs(player_id, season_id);
```

---

## Advanced Stats Tables

### player_season_stats
```sql
CREATE TABLE player_season_stats (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL REFERENCES players(id),
    season_id       INTEGER NOT NULL REFERENCES seasons(id),
    team_id         INTEGER NOT NULL REFERENCES teams(id),
    games_played    INTEGER DEFAULT 0,
    games_started   INTEGER DEFAULT 0,
    -- Per game averages
    mpg             DECIMAL(5,2),
    ppg             DECIMAL(5,2),
    rpg             DECIMAL(5,2),
    apg             DECIMAL(5,2),
    spg             DECIMAL(5,2),
    bpg             DECIMAL(5,2),
    topg            DECIMAL(5,2),
    fpg             DECIMAL(5,2),
    -- Shooting
    fg_pct          DECIMAL(5,4),
    fg3_pct         DECIMAL(5,4),
    ft_pct          DECIMAL(5,4),
    ts_pct          DECIMAL(5,4),
    efg_pct         DECIMAL(5,4),
    -- Advanced
    per             DECIMAL(6,2),
    usg_pct         DECIMAL(5,4),
    ast_pct         DECIMAL(5,4),
    reb_pct         DECIMAL(5,4),
    stl_pct         DECIMAL(5,4),
    blk_pct         DECIMAL(5,4),
    tov_pct         DECIMAL(5,4),
    bpm             DECIMAL(6,2),
    obpm            DECIMAL(6,2),
    dbpm            DECIMAL(6,2),
    vorp            DECIMAL(6,2),
    ws              DECIMAL(6,2),
    ws_per_48       DECIMAL(6,4),
    -- Impact metrics (from external sources)
    epm             DECIMAL(6,2),
    o_epm           DECIMAL(6,2),
    d_epm           DECIMAL(6,2),
    lebron          DECIMAL(6,2),
    o_lebron        DECIMAL(6,2),
    d_lebron        DECIMAL(6,2),
    raptor          DECIMAL(6,2),
    -- On/Off
    on_court_ortg   DECIMAL(6,2),
    off_court_ortg  DECIMAL(6,2),
    on_court_drtg   DECIMAL(6,2),
    off_court_drtg  DECIMAL(6,2),
    on_off_net      DECIMAL(6,2),
    UNIQUE(player_id, season_id, team_id)
);
CREATE INDEX idx_pss_player ON player_season_stats(player_id);
CREATE INDEX idx_pss_season ON player_season_stats(season_id);
```

### team_season_stats
```sql
CREATE TABLE team_season_stats (
    id              SERIAL PRIMARY KEY,
    team_id         INTEGER NOT NULL REFERENCES teams(id),
    season_id       INTEGER NOT NULL REFERENCES seasons(id),
    wins            INTEGER DEFAULT 0,
    losses          INTEGER DEFAULT 0,
    -- Ratings
    ortg            DECIMAL(6,2),
    drtg            DECIMAL(6,2),
    net_rating      DECIMAL(6,2),
    pace            DECIMAL(6,2),
    -- Shooting
    fg_pct          DECIMAL(5,4),
    fg3_pct         DECIMAL(5,4),
    ft_pct          DECIMAL(5,4),
    ts_pct          DECIMAL(5,4),
    efg_pct         DECIMAL(5,4),
    -- Four factors offense
    o_tov_pct       DECIMAL(5,4),
    o_oreb_pct      DECIMAL(5,4),
    o_ft_rate       DECIMAL(5,4),
    -- Four factors defense
    d_tov_pct       DECIMAL(5,4),
    d_oreb_pct      DECIMAL(5,4),
    d_ft_rate       DECIMAL(5,4),
    -- Style
    pts_in_paint_pg DECIMAL(5,2),
    fastbreak_pts_pg DECIMAL(5,2),
    second_chance_pts_pg DECIMAL(5,2),
    -- Strength of schedule
    sos             DECIMAL(6,4),
    sos_remaining   DECIMAL(6,4),
    -- Splits
    home_wins       INTEGER DEFAULT 0,
    home_losses     INTEGER DEFAULT 0,
    away_wins       INTEGER DEFAULT 0,
    away_losses     INTEGER DEFAULT 0,
    UNIQUE(team_id, season_id)
);
```

---

## Injury & Availability

### player_injuries
```sql
CREATE TABLE player_injuries (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL REFERENCES players(id),
    team_id         INTEGER NOT NULL REFERENCES teams(id),
    season_id       INTEGER NOT NULL REFERENCES seasons(id),
    status          VARCHAR(30) NOT NULL,          -- out | doubtful | questionable | probable | available
    injury_type     VARCHAR(100),                   -- "left ankle sprain"
    body_part       VARCHAR(50),                    -- "ankle"
    side            VARCHAR(10),                    -- "left" | "right" | null
    reported_date   DATE NOT NULL,
    return_date     DATE,                          -- actual return, filled after
    expected_return TEXT,                           -- "2-3 weeks", "day-to-day"
    is_current      BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_injuries_player ON player_injuries(player_id);
CREATE INDEX idx_injuries_current ON player_injuries(is_current) WHERE is_current = TRUE;
CREATE INDEX idx_injuries_team ON player_injuries(team_id);
```

---

## Custom Metrics (Derived/Computed)

### player_metric_snapshots
```sql
CREATE TABLE player_metric_snapshots (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL REFERENCES players(id),
    season_id       INTEGER NOT NULL REFERENCES seasons(id),
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    as_of_date      DATE NOT NULL,                 -- metrics valid as of this date
    -- Baseline Impact Score
    bis_score       DECIMAL(5,2),
    bis_confidence  DECIMAL(3,2),
    bis_percentile  DECIMAL(5,2),
    bis_components  JSONB,                         -- {epm: 1.2, lebron: 0.8, ...}
    -- Role Difficulty Adjustment
    rda_score       DECIMAL(5,2),
    rda_confidence  DECIMAL(3,2),
    rda_label       VARCHAR(50),
    rda_components  JSONB,
    -- Gravity & Off-Ball Impact
    goi_score       DECIMAL(5,2),
    goi_confidence  DECIMAL(3,2),
    goi_components  JSONB,
    -- Defensive Reality Score
    drs_score       DECIMAL(5,2),
    drs_confidence  DECIMAL(3,2),
    drs_label       VARCHAR(50),
    drs_components  JSONB,
    -- Scalability & Portability Score
    sps_score       DECIMAL(5,2),
    sps_confidence  DECIMAL(3,2),
    sps_label       VARCHAR(50),
    sps_components  JSONB,
    -- Live Form Index
    lfi_score       DECIMAL(5,2),
    lfi_confidence  DECIMAL(3,2),
    lfi_streak_label VARCHAR(80),
    lfi_windows     JSONB,                         -- {3: 65, 5: 60, 10: 55, 20: 52}
    lfi_delta       DECIMAL(5,2),
    UNIQUE(player_id, season_id, as_of_date)
);
CREATE INDEX idx_pms_player_date ON player_metric_snapshots(player_id, as_of_date DESC);
CREATE INDEX idx_pms_date ON player_metric_snapshots(as_of_date);
```

### player_game_projections
```sql
CREATE TABLE player_game_projections (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL REFERENCES players(id),
    game_id         INTEGER NOT NULL REFERENCES games(id),
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Matchup Advantage Index
    mai_score       DECIMAL(5,2),
    mai_confidence  DECIMAL(3,2),
    mai_label       VARCHAR(50),
    mai_factors     JSONB,
    -- Game Impact Projection
    gip_impact      DECIMAL(5,2),
    gip_confidence  DECIMAL(3,2),
    -- Projected stat line
    proj_minutes    DECIMAL(5,2),
    proj_pts        DECIMAL(5,2),
    proj_pts_low    DECIMAL(5,2),
    proj_pts_high   DECIMAL(5,2),
    proj_reb        DECIMAL(5,2),
    proj_reb_low    DECIMAL(5,2),
    proj_reb_high   DECIMAL(5,2),
    proj_ast        DECIMAL(5,2),
    proj_ast_low    DECIMAL(5,2),
    proj_ast_high   DECIMAL(5,2),
    proj_stl        DECIMAL(5,2),
    proj_blk        DECIMAL(5,2),
    proj_tov        DECIMAL(5,2),
    proj_fg3m       DECIMAL(5,2),
    proj_usage      DECIMAL(5,2),
    proj_ts_pct     DECIMAL(5,4),
    proj_volatility VARCHAR(20),                   -- "low" | "moderate" | "high"
    UNIQUE(player_id, game_id)
);
CREATE INDEX idx_pgp_game ON player_game_projections(game_id);
CREATE INDEX idx_pgp_player ON player_game_projections(player_id);
```

### team_metric_snapshots
```sql
CREATE TABLE team_metric_snapshots (
    id              SERIAL PRIMARY KEY,
    team_id         INTEGER NOT NULL REFERENCES teams(id),
    season_id       INTEGER NOT NULL REFERENCES seasons(id),
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    as_of_date      DATE NOT NULL,
    -- Team Strength Core
    tsc_score       DECIMAL(5,2),
    tsc_confidence  DECIMAL(3,2),
    tsc_components  JSONB,
    -- Lineup Synergy Score
    lss_score       DECIMAL(5,2),
    lss_confidence  DECIMAL(3,2),
    lss_components  JSONB,
    -- Redundancy Penalty
    rp_score        DECIMAL(5,2),
    rp_penalties    JSONB,
    -- Playoff Translation Score
    pts_score       DECIMAL(5,2),
    pts_confidence  DECIMAL(3,2),
    pts_components  JSONB,
    -- Dependency Risk Score
    drs_team_score  DECIMAL(5,2),
    drs_team_star_drop DECIMAL(6,2),
    drs_team_components JSONB,
    -- Live Team Form Index
    ltfi_score      DECIMAL(5,2),
    ltfi_windows    JSONB,
    ltfi_components JSONB,
    UNIQUE(team_id, season_id, as_of_date)
);
CREATE INDEX idx_tms_team_date ON team_metric_snapshots(team_id, as_of_date DESC);
```

### game_projections
```sql
CREATE TABLE game_projections (
    id              SERIAL PRIMARY KEY,
    game_id         INTEGER NOT NULL REFERENCES games(id),
    computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Style Clash
    sce_factors     JSONB,
    sce_projected_pace DECIMAL(5,2),
    sce_key_clashes JSONB,
    -- Game Outcome Projection
    projected_winner_id INTEGER REFERENCES teams(id),
    win_prob_home   DECIMAL(5,4),
    win_prob_away   DECIMAL(5,4),
    proj_score_home DECIMAL(5,2),
    proj_score_home_low DECIMAL(5,2),
    proj_score_home_high DECIMAL(5,2),
    proj_score_away DECIMAL(5,2),
    proj_score_away_low DECIMAL(5,2),
    proj_score_away_high DECIMAL(5,2),
    proj_pace       DECIMAL(5,2),
    confidence      DECIMAL(3,2),
    margin          DECIMAL(5,2),
    upset_risk      VARCHAR(20),
    key_reasons     JSONB,
    UNIQUE(game_id)
);
CREATE INDEX idx_gproj_game ON game_projections(game_id);
```

---

## Rolling Windows (Materialized)

### player_rolling_windows
```sql
CREATE TABLE player_rolling_windows (
    id              SERIAL PRIMARY KEY,
    player_id       INTEGER NOT NULL REFERENCES players(id),
    season_id       INTEGER NOT NULL REFERENCES seasons(id),
    as_of_date      DATE NOT NULL,
    window_size     INTEGER NOT NULL,              -- 3, 5, 10, 20
    games_in_window INTEGER NOT NULL,
    -- Averages
    mpg             DECIMAL(5,2),
    ppg             DECIMAL(5,2),
    rpg             DECIMAL(5,2),
    apg             DECIMAL(5,2),
    spg             DECIMAL(5,2),
    bpg             DECIMAL(5,2),
    topg            DECIMAL(5,2),
    fg_pct          DECIMAL(5,4),
    fg3_pct         DECIMAL(5,4),
    ft_pct          DECIMAL(5,4),
    ts_pct          DECIMAL(5,4),
    efg_pct         DECIMAL(5,4),
    usg_pct         DECIMAL(5,4),
    -- Opponent-adjusted
    opp_avg_drtg    DECIMAL(6,2),
    UNIQUE(player_id, season_id, as_of_date, window_size)
);
CREATE INDEX idx_prw_player_date ON player_rolling_windows(player_id, as_of_date DESC);
CREATE INDEX idx_prw_window ON player_rolling_windows(window_size);
```

### team_rolling_windows
```sql
CREATE TABLE team_rolling_windows (
    id              SERIAL PRIMARY KEY,
    team_id         INTEGER NOT NULL REFERENCES teams(id),
    season_id       INTEGER NOT NULL REFERENCES seasons(id),
    as_of_date      DATE NOT NULL,
    window_size     INTEGER NOT NULL,
    games_in_window INTEGER NOT NULL,
    -- Ratings
    ortg            DECIMAL(6,2),
    drtg            DECIMAL(6,2),
    net_rating      DECIMAL(6,2),
    pace            DECIMAL(6,2),
    -- Record
    wins            INTEGER,
    losses          INTEGER,
    -- Shooting
    fg_pct          DECIMAL(5,4),
    fg3_pct         DECIMAL(5,4),
    ts_pct          DECIMAL(5,4),
    -- Opponent quality
    opp_avg_net_rtg DECIMAL(6,2),
    UNIQUE(team_id, season_id, as_of_date, window_size)
);
CREATE INDEX idx_trw_team_date ON team_rolling_windows(team_id, as_of_date DESC);
```

---

## Lineups

### lineups
```sql
CREATE TABLE lineups (
    id              SERIAL PRIMARY KEY,
    team_id         INTEGER NOT NULL REFERENCES teams(id),
    season_id       INTEGER NOT NULL REFERENCES seasons(id),
    player_ids      INTEGER[] NOT NULL,            -- sorted array of player IDs
    lineup_hash     VARCHAR(64) NOT NULL,          -- deterministic hash for dedup
    lineup_size     INTEGER NOT NULL DEFAULT 5,    -- 2, 3, 5
    -- Stats
    minutes         DECIMAL(8,2),
    possessions     DECIMAL(8,2),
    ortg            DECIMAL(6,2),
    drtg            DECIMAL(6,2),
    net_rating      DECIMAL(6,2),
    plus_minus      INTEGER,
    games_together  INTEGER,
    -- Computed
    as_of_date      DATE NOT NULL,
    UNIQUE(lineup_hash, season_id, as_of_date)
);
CREATE INDEX idx_lineups_team ON lineups(team_id);
CREATE INDEX idx_lineups_hash ON lineups(lineup_hash);
```

---

## Explanations

### explanations
```sql
CREATE TABLE explanations (
    id              SERIAL PRIMARY KEY,
    entity_type     VARCHAR(20) NOT NULL,          -- "player" | "team" | "game" | "matchup"
    entity_id       INTEGER NOT NULL,
    explanation_type VARCHAR(50) NOT NULL,          -- "projection" | "metric" | "trend" | "insight"
    title           VARCHAR(200),
    body            TEXT NOT NULL,
    factors         JSONB,                         -- structured factors that drove this explanation
    confidence      DECIMAL(3,2),
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    valid_until     TIMESTAMPTZ,                   -- when this explanation expires
    is_featured     BOOLEAN DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_explanations_entity ON explanations(entity_type, entity_id);
CREATE INDEX idx_explanations_featured ON explanations(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_explanations_type ON explanations(explanation_type);
```

---

## Caching Strategy

| Data | Cache TTL | Strategy |
|------|-----------|----------|
| Team/player static info | 24h | Redis + stale-while-revalidate |
| Season stats | 2h | Redis, invalidate on ingestion |
| Game projections | Until tip-off, refresh 2h before | Redis, keyed by game_id |
| Player metric snapshots | 4h | Redis, invalidate on recompute |
| Rolling windows | 4h | Redis, invalidate on new game data |
| Leaderboard queries | 1h | Redis sorted sets |
| Explanations | Until new computation | Redis, keyed by entity |
| Schedule | 12h | Redis |
| Injuries | 30min | Redis, frequent refresh |

---

## Historical Retention

- **Game logs**: Retained permanently (append-only)
- **Metric snapshots**: Daily snapshots retained for current + 2 prior seasons; weekly snapshots for older
- **Rolling windows**: Current season only at daily granularity; archived to weekly for prior seasons
- **Projections**: Retained permanently for accuracy tracking
- **Explanations**: 30-day retention for non-featured; featured retained for season
