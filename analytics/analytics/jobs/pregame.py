"""Pregame refresh job — runs 2 hours before each game's tip-off.

Steps:
1. Refresh injury data
2. Compute game projections (GOP)
3. Compute player game projections (MAI + GIP)
4. Generate game explanation
5. Update caches
"""

import structlog
from datetime import date

from ..db import get_session

logger = structlog.get_logger()


def run_pregame_refresh(game_id: int):
    """Refresh projections for a specific game."""
    logger.info("pregame_refresh_started", game_id=game_id)

    try:
        with get_session() as session:
            # Step 1: Refresh injuries for both teams
            _refresh_injuries(session, game_id)

            # Step 2: Compute game outcome projection
            _compute_game_projection(session, game_id)

            # Step 3: Compute player projections
            _compute_player_projections(session, game_id)

            # Step 4: Generate game explanation
            _generate_game_explanation(session, game_id)

        # Step 5: Update game caches
        _update_game_caches(game_id)

        logger.info("pregame_refresh_completed", game_id=game_id)

    except Exception as e:
        logger.error("pregame_refresh_failed", game_id=game_id, error=str(e))
        raise


def run_pregame_refresh_all(game_date: date):
    """Refresh all games for a given date."""
    logger.info("pregame_refresh_all_started", date=str(game_date))

    with get_session() as session:
        # TODO: Fetch game IDs for date
        # for game_id in game_ids:
        #     run_pregame_refresh(game_id)
        pass


def _refresh_injuries(session, game_id: int):
    logger.info("refreshing_injuries", game_id=game_id)
    # TODO: Implement


def _compute_game_projection(session, game_id: int):
    logger.info("computing_game_projection", game_id=game_id)
    # TODO: Implement
    # 1. Get both teams' TSC, LTFI
    # 2. Get injury impacts
    # 3. Get fatigue/rest context
    # 4. Run GOP.compute()
    # 5. Upsert game_projections


def _compute_player_projections(session, game_id: int):
    logger.info("computing_player_projections", game_id=game_id)
    # TODO: Implement
    # For each rotation player in both teams:
    # 1. Compute MAI
    # 2. Compute GIP (stat line projection)
    # 3. Upsert player_game_projections


def _generate_game_explanation(session, game_id: int):
    logger.info("generating_game_explanation", game_id=game_id)
    # TODO: Implement


def _update_game_caches(game_id: int):
    logger.info("updating_game_caches", game_id=game_id)
    # TODO: Implement
