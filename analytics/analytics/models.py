"""SQLAlchemy ORM models mirroring the Drizzle schema."""

from sqlalchemy import Column, Integer, String, Boolean, Date, Numeric, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, relationship
from datetime import datetime


class Base(DeclarativeBase):
    pass


class Season(Base):
    __tablename__ = "seasons"
    id = Column(Integer, primary_key=True)
    year = Column(Integer, nullable=False, unique=True)
    label = Column(String(10), nullable=False)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=False)


class Team(Base):
    __tablename__ = "teams"
    id = Column(Integer, primary_key=True)
    external_id = Column(String(50), unique=True)
    abbreviation = Column(String(5), nullable=False, unique=True)
    name = Column(String(100), nullable=False)
    city = Column(String(50), nullable=False)
    nickname = Column(String(50), nullable=False)
    conference = Column(String(10), nullable=False)
    division = Column(String(20), nullable=False)


class Player(Base):
    __tablename__ = "players"
    id = Column(Integer, primary_key=True)
    external_id = Column(String(50), unique=True)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    full_name = Column(String(100), nullable=False)
    position = Column(String(5))
    height_inches = Column(Integer)
    weight_lbs = Column(Integer)
    is_active = Column(Boolean, default=True)


class Game(Base):
    __tablename__ = "games"
    id = Column(Integer, primary_key=True)
    external_id = Column(String(50), unique=True)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    game_date = Column(Date, nullable=False)
    game_time = Column(DateTime)
    home_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    away_team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    status = Column(String(20), default="scheduled")
    home_score = Column(Integer)
    away_score = Column(Integer)


class PlayerGameLog(Base):
    __tablename__ = "player_game_logs"
    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    minutes = Column(Numeric(5, 2))
    pts = Column(Integer, default=0)
    fgm = Column(Integer, default=0)
    fga = Column(Integer, default=0)
    fg3m = Column(Integer, default=0)
    fg3a = Column(Integer, default=0)
    ftm = Column(Integer, default=0)
    fta = Column(Integer, default=0)
    reb = Column(Integer, default=0)
    ast = Column(Integer, default=0)
    stl = Column(Integer, default=0)
    blk = Column(Integer, default=0)
    tov = Column(Integer, default=0)
    pf = Column(Integer, default=0)
    plus_minus = Column(Integer, default=0)
    ts_pct = Column(Numeric(5, 4))
    usg_pct = Column(Numeric(5, 4))


class PlayerSeasonStats(Base):
    __tablename__ = "player_season_stats"
    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    games_played = Column(Integer, default=0)
    mpg = Column(Numeric(5, 2))
    ppg = Column(Numeric(5, 2))
    rpg = Column(Numeric(5, 2))
    apg = Column(Numeric(5, 2))
    ts_pct = Column(Numeric(5, 4))
    usg_pct = Column(Numeric(5, 4))
    bpm = Column(Numeric(6, 2))
    epm = Column(Numeric(6, 2))
    lebron = Column(Numeric(6, 2))
    on_off_net = Column(Numeric(6, 2))
    ws_per_48 = Column(Numeric(6, 4))


class PlayerMetricSnapshot(Base):
    __tablename__ = "player_metric_snapshots"
    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    computed_at = Column(DateTime, default=datetime.utcnow)
    as_of_date = Column(Date, nullable=False)
    bis_score = Column(Numeric(5, 2))
    bis_confidence = Column(Numeric(3, 2))
    bis_components = Column(JSONB)
    rda_score = Column(Numeric(5, 2))
    rda_confidence = Column(Numeric(3, 2))
    rda_label = Column(String(50))
    drs_score = Column(Numeric(5, 2))
    drs_confidence = Column(Numeric(3, 2))
    drs_label = Column(String(50))
    lfi_score = Column(Numeric(5, 2))
    lfi_confidence = Column(Numeric(3, 2))
    lfi_streak_label = Column(String(80))
    lfi_windows = Column(JSONB)


class TeamMetricSnapshot(Base):
    __tablename__ = "team_metric_snapshots"
    id = Column(Integer, primary_key=True)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    computed_at = Column(DateTime, default=datetime.utcnow)
    as_of_date = Column(Date, nullable=False)
    tsc_score = Column(Numeric(5, 2))
    tsc_confidence = Column(Numeric(3, 2))
    ltfi_score = Column(Numeric(5, 2))
    ltfi_windows = Column(JSONB)


class PlayerInjury(Base):
    __tablename__ = "player_injuries"
    id = Column(Integer, primary_key=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    team_id = Column(Integer, ForeignKey("teams.id"), nullable=False)
    season_id = Column(Integer, ForeignKey("seasons.id"), nullable=False)
    status = Column(String(30), nullable=False)
    injury_type = Column(String(100))
    reported_date = Column(Date, nullable=False)
    is_current = Column(Boolean, default=True)


class GameProjection(Base):
    __tablename__ = "game_projections"
    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey("games.id"), nullable=False)
    computed_at = Column(DateTime, default=datetime.utcnow)
    projected_winner_id = Column(Integer, ForeignKey("teams.id"))
    win_prob_home = Column(Numeric(5, 4))
    win_prob_away = Column(Numeric(5, 4))
    proj_score_home = Column(Numeric(5, 2))
    proj_score_away = Column(Numeric(5, 2))
    confidence = Column(Numeric(3, 2))
    key_reasons = Column(JSONB)
