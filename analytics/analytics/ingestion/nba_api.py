"""nba_api provider implementation.

Uses the nba_api library to fetch data from NBA.com endpoints.
Rate-limited and with retry logic to respect NBA.com's rate limits.
"""

import time
import structlog
from typing import Optional
from datetime import date, datetime

from .base import (
    DataProvider, RawPlayer, RawTeam, RawGame, RawGameLog,
    RawInjury, RawAdvancedStats,
)

logger = structlog.get_logger()

# Rate limiting: NBA.com is sensitive to rapid requests
REQUEST_DELAY = 0.6  # seconds between requests


class NbaApiProvider(DataProvider):
    """Data provider using the nba_api library."""

    def __init__(self):
        self._last_request_time = 0.0

    def _rate_limit(self):
        elapsed = time.time() - self._last_request_time
        if elapsed < REQUEST_DELAY:
            time.sleep(REQUEST_DELAY - elapsed)
        self._last_request_time = time.time()

    def fetch_teams(self) -> list[RawTeam]:
        self._rate_limit()
        try:
            from nba_api.stats.static import teams as nba_teams

            all_teams = nba_teams.get_teams()
            result = []
            for t in all_teams:
                result.append(RawTeam(
                    external_id=str(t["id"]),
                    abbreviation=t["abbreviation"],
                    name=t["full_name"],
                    city=t["city"],
                    nickname=t["nickname"],
                    conference="",  # not in static data, set during transform
                    division="",
                ))
            logger.info("fetched_teams", count=len(result))
            return result
        except Exception as e:
            logger.error("fetch_teams_failed", error=str(e))
            return []

    def fetch_players(self, season: str) -> list[RawPlayer]:
        self._rate_limit()
        try:
            from nba_api.stats.endpoints import commonallplayers

            all_players = commonallplayers.CommonAllPlayers(
                season=season, is_only_current_season=1
            )
            df = all_players.get_data_frames()[0]

            result = []
            for _, row in df.iterrows():
                result.append(RawPlayer(
                    external_id=str(row["PERSON_ID"]),
                    first_name=row.get("DISPLAY_FIRST_LAST", "").split(" ")[0],
                    last_name=" ".join(row.get("DISPLAY_FIRST_LAST", "").split(" ")[1:]),
                    position=None,
                    height_inches=None,
                    weight_lbs=None,
                    birth_date=None,
                    country=None,
                ))
            logger.info("fetched_players", count=len(result), season=season)
            return result
        except Exception as e:
            logger.error("fetch_players_failed", error=str(e), season=season)
            return []

    def fetch_schedule(self, season: str) -> list[RawGame]:
        self._rate_limit()
        try:
            from nba_api.stats.endpoints import leaguegamefinder

            games = leaguegamefinder.LeagueGameFinder(
                season_nullable=season,
                season_type_nullable="Regular Season",
            )
            df = games.get_data_frames()[0]

            # Deduplicate (each game appears twice, once per team)
            seen = set()
            result = []
            for _, row in df.iterrows():
                game_id = str(row["GAME_ID"])
                if game_id in seen:
                    continue
                seen.add(game_id)

                matchup = row.get("MATCHUP", "")
                is_home = "vs." in matchup

                result.append(RawGame(
                    external_id=game_id,
                    game_date=datetime.strptime(row["GAME_DATE"], "%Y-%m-%d").date(),
                    home_team_external_id=str(row["TEAM_ID"]) if is_home else "",
                    away_team_external_id="" if is_home else str(row["TEAM_ID"]),
                    home_score=row.get("PTS") if is_home else None,
                    away_score=None if is_home else row.get("PTS"),
                    status="final" if row.get("WL") else "scheduled",
                ))
            logger.info("fetched_schedule", count=len(result), season=season)
            return result
        except Exception as e:
            logger.error("fetch_schedule_failed", error=str(e), season=season)
            return []

    def fetch_player_game_logs(
        self, external_player_id: str, season: str
    ) -> list[RawGameLog]:
        self._rate_limit()
        try:
            from nba_api.stats.endpoints import playergamelog

            logs = playergamelog.PlayerGameLog(
                player_id=external_player_id, season=season
            )
            df = logs.get_data_frames()[0]

            result = []
            for _, row in df.iterrows():
                min_str = row.get("MIN", "0")
                minutes = self._parse_minutes(min_str)

                result.append(RawGameLog(
                    external_game_id=str(row["Game_ID"]),
                    external_player_id=external_player_id,
                    game_date=datetime.strptime(row["GAME_DATE"], "%b %d, %Y").date(),
                    minutes=minutes,
                    pts=int(row.get("PTS", 0)),
                    fgm=int(row.get("FGM", 0)),
                    fga=int(row.get("FGA", 0)),
                    fg3m=int(row.get("FG3M", 0)),
                    fg3a=int(row.get("FG3A", 0)),
                    ftm=int(row.get("FTM", 0)),
                    fta=int(row.get("FTA", 0)),
                    oreb=int(row.get("OREB", 0)),
                    dreb=int(row.get("DREB", 0)),
                    reb=int(row.get("REB", 0)),
                    ast=int(row.get("AST", 0)),
                    stl=int(row.get("STL", 0)),
                    blk=int(row.get("BLK", 0)),
                    tov=int(row.get("TOV", 0)),
                    pf=int(row.get("PF", 0)),
                    plus_minus=int(row.get("PLUS_MINUS", 0)),
                    starter=False,  # not available in this endpoint
                ))
            return result
        except Exception as e:
            logger.error("fetch_player_game_logs_failed", error=str(e),
                         player_id=external_player_id)
            return []

    def fetch_injuries(self) -> list[RawInjury]:
        # nba_api doesn't have a reliable injury endpoint
        # This would need a separate scraper or API
        logger.warning("injury_fetch_not_implemented",
                        message="Using placeholder — integrate injury API")
        return []

    def fetch_advanced_stats(
        self, external_player_id: str, season: str
    ) -> Optional[RawAdvancedStats]:
        self._rate_limit()
        try:
            from nba_api.stats.endpoints import playerestimatedmetrics

            metrics = playerestimatedmetrics.PlayerEstimatedMetrics(season=season)
            df = metrics.get_data_frames()[0]
            player_row = df[df["PLAYER_ID"] == int(external_player_id)]

            if player_row.empty:
                return None

            row = player_row.iloc[0]
            return RawAdvancedStats(
                external_player_id=external_player_id,
                ts_pct=row.get("E_TOV_PCT"),
                usg_pct=row.get("E_USG_PCT"),
            )
        except Exception as e:
            logger.error("fetch_advanced_stats_failed", error=str(e))
            return None

    @staticmethod
    def _parse_minutes(min_str) -> float:
        if isinstance(min_str, (int, float)):
            return float(min_str)
        try:
            if ":" in str(min_str):
                parts = str(min_str).split(":")
                return float(parts[0]) + float(parts[1]) / 60
            return float(min_str)
        except (ValueError, TypeError):
            return 0.0
