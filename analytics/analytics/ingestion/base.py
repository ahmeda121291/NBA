"""Provider abstraction for data ingestion.

All data providers must implement this interface. This allows swapping
nba_api for another source without changing downstream logic.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import date
from typing import Optional


@dataclass
class RawPlayer:
    external_id: str
    first_name: str
    last_name: str
    position: Optional[str]
    height_inches: Optional[int]
    weight_lbs: Optional[int]
    birth_date: Optional[date]
    country: Optional[str]


@dataclass
class RawTeam:
    external_id: str
    abbreviation: str
    name: str
    city: str
    nickname: str
    conference: str
    division: str


@dataclass
class RawGameLog:
    external_game_id: str
    external_player_id: str
    game_date: date
    minutes: float
    pts: int
    fgm: int
    fga: int
    fg3m: int
    fg3a: int
    ftm: int
    fta: int
    oreb: int
    dreb: int
    reb: int
    ast: int
    stl: int
    blk: int
    tov: int
    pf: int
    plus_minus: int
    starter: bool


@dataclass
class RawGame:
    external_id: str
    game_date: date
    home_team_external_id: str
    away_team_external_id: str
    home_score: Optional[int]
    away_score: Optional[int]
    status: str  # "scheduled" | "final"


@dataclass
class RawInjury:
    external_player_id: str
    external_team_id: str
    status: str  # "Out" | "Doubtful" | "Questionable" | "Probable"
    injury_type: Optional[str]
    reported_date: date


@dataclass
class RawAdvancedStats:
    external_player_id: str
    per: Optional[float] = None
    ts_pct: Optional[float] = None
    usg_pct: Optional[float] = None
    bpm: Optional[float] = None
    obpm: Optional[float] = None
    dbpm: Optional[float] = None
    vorp: Optional[float] = None
    ws: Optional[float] = None
    ws_per_48: Optional[float] = None
    on_off_net: Optional[float] = None


class DataProvider(ABC):
    """Abstract interface for NBA data sources."""

    @abstractmethod
    def fetch_teams(self) -> list[RawTeam]:
        ...

    @abstractmethod
    def fetch_players(self, season: str) -> list[RawPlayer]:
        ...

    @abstractmethod
    def fetch_schedule(self, season: str) -> list[RawGame]:
        ...

    @abstractmethod
    def fetch_player_game_logs(
        self, external_player_id: str, season: str
    ) -> list[RawGameLog]:
        ...

    @abstractmethod
    def fetch_injuries(self) -> list[RawInjury]:
        ...

    @abstractmethod
    def fetch_advanced_stats(
        self, external_player_id: str, season: str
    ) -> Optional[RawAdvancedStats]:
        ...
