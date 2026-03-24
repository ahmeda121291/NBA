"""
CourtVision NBA Data Ingestion Pipeline
Pulls real NBA data from nba_api and loads into Supabase PostgreSQL.

Usage:
  pip install -r requirements.txt
  python ingest.py
"""

import os
import sys
import time
import traceback
from datetime import datetime
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import execute_values

# Load env from web/.env.local
env_path = os.path.join(os.path.dirname(__file__), "..", "web", ".env.local")
load_dotenv(env_path)

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    print("ERROR: DATABASE_URL not found. Check web/.env.local")
    sys.exit(1)

# nba_api imports
from nba_api.stats.static import teams as nba_teams_static, players as nba_players_static
from nba_api.stats.endpoints import (
    leaguegamefinder,
    boxscoretraditionalv2,
    playergamelog,
    leaguestandingsv3,
    commonplayerinfo,
    teamyearbyyearstats,
    playerdashboardbyyearoveryear,
    leaguedashteamstats,
    leaguedashplayerstats,
)

SEASON = "2024-25"
SEASON_YEAR = 2025
REQUEST_DELAY = 0.8  # seconds between API calls to avoid rate limiting


def get_conn():
    return psycopg2.connect(DATABASE_URL)


def step(msg):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}")


def pause():
    time.sleep(REQUEST_DELAY)


# ============================================================
# 1. Seed season
# ============================================================
def ingest_season(conn):
    step("1/7  Seeding current season")
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO seasons (year, label, start_date, end_date, is_current)
            VALUES (%s, %s, %s, %s, true)
            ON CONFLICT (year) DO UPDATE SET is_current = true
            RETURNING id
        """, (SEASON_YEAR, SEASON, "2024-10-22", "2025-06-22"))
        season_id = cur.fetchone()[0]
        conn.commit()
        print(f"  Season ID: {season_id}")
        return season_id


# ============================================================
# 2. Ingest all 30 teams
# ============================================================
TEAM_COLORS = {
    "ATL": ("#E03A3E", "#C1D32F"), "BOS": ("#007A33", "#BA9653"), "BKN": ("#000000", "#FFFFFF"),
    "CHA": ("#1D1160", "#00788C"), "CHI": ("#CE1141", "#000000"), "CLE": ("#860038", "#041E42"),
    "DAL": ("#00538C", "#002B5E"), "DEN": ("#0E2240", "#FEC524"), "DET": ("#C8102E", "#1D42BA"),
    "GSW": ("#1D428A", "#FFC72C"), "HOU": ("#CE1141", "#000000"), "IND": ("#002D62", "#FDBB30"),
    "LAC": ("#C8102E", "#1D428A"), "LAL": ("#552583", "#FDB927"), "MEM": ("#5D76A9", "#12173F"),
    "MIA": ("#98002E", "#F9A01B"), "MIL": ("#00471B", "#EEE1C6"), "MIN": ("#0C2340", "#236192"),
    "NOP": ("#0C2340", "#C8102E"), "NYK": ("#006BB6", "#F58426"), "OKC": ("#007AC1", "#EF6C00"),
    "ORL": ("#0077C0", "#C4CED4"), "PHI": ("#006BB6", "#ED174C"), "PHX": ("#1D1160", "#E56020"),
    "POR": ("#E03A3E", "#000000"), "SAC": ("#5A2D81", "#63727A"), "SAS": ("#C4CED4", "#000000"),
    "TOR": ("#CE1141", "#000000"), "UTA": ("#002B5C", "#00471B"), "WAS": ("#002B5C", "#E31837"),
}

TEAM_ARENAS = {
    "ATL": "State Farm Arena", "BOS": "TD Garden", "BKN": "Barclays Center",
    "CHA": "Spectrum Center", "CHI": "United Center", "CLE": "Rocket Mortgage FieldHouse",
    "DAL": "American Airlines Center", "DEN": "Ball Arena", "DET": "Little Caesars Arena",
    "GSW": "Chase Center", "HOU": "Toyota Center", "IND": "Gainbridge Fieldhouse",
    "LAC": "Intuit Dome", "LAL": "Crypto.com Arena", "MEM": "FedExForum",
    "MIA": "Kaseya Center", "MIL": "Fiserv Forum", "MIN": "Target Center",
    "NOP": "Smoothie King Center", "NYK": "Madison Square Garden", "OKC": "Paycom Center",
    "ORL": "Amway Center", "PHI": "Wells Fargo Center", "PHX": "Footprint Center",
    "POR": "Moda Center", "SAC": "Golden 1 Center", "SAS": "Frost Bank Center",
    "TOR": "Scotiabank Arena", "UTA": "Delta Center", "WAS": "Capital One Arena",
}


def ingest_teams(conn):
    step("2/7  Ingesting 30 NBA teams")
    all_teams = nba_teams_static.get_teams()
    rows = []
    for t in all_teams:
        abbr = t["abbreviation"]
        colors = TEAM_COLORS.get(abbr, ("#333333", "#666666"))
        arena = TEAM_ARENAS.get(abbr, "")
        conf = "East" if abbr in [
            "ATL","BOS","BKN","CHA","CHI","CLE","DET","IND",
            "MIA","MIL","NYK","ORL","PHI","TOR","WAS"
        ] else "West"
        div_map = {
            "ATL": "Southeast", "BOS": "Atlantic", "BKN": "Atlantic", "CHA": "Southeast",
            "CHI": "Central", "CLE": "Central", "DAL": "Southwest", "DEN": "Northwest",
            "DET": "Central", "GSW": "Pacific", "HOU": "Southwest", "IND": "Central",
            "LAC": "Pacific", "LAL": "Pacific", "MEM": "Southwest", "MIA": "Southeast",
            "MIL": "Central", "MIN": "Northwest", "NOP": "Southwest", "NYK": "Atlantic",
            "OKC": "Northwest", "ORL": "Southeast", "PHI": "Atlantic", "PHX": "Pacific",
            "POR": "Northwest", "SAC": "Pacific", "SAS": "Southwest", "TOR": "Atlantic",
            "UTA": "Northwest", "WAS": "Southeast",
        }
        rows.append((
            str(t["id"]), abbr, f"{t['city']} {t['nickname']}",
            t["city"], t["nickname"], conf, div_map.get(abbr, ""),
            f"https://cdn.nba.com/logos/nba/{t['id']}/primary/L/logo.svg",
            colors[0], colors[1], arena,
        ))

    with conn.cursor() as cur:
        execute_values(cur, """
            INSERT INTO teams (external_id, abbreviation, name, city, nickname, conference, division, logo_url, primary_color, secondary_color, arena)
            VALUES %s
            ON CONFLICT (abbreviation) DO UPDATE SET
                external_id = EXCLUDED.external_id,
                name = EXCLUDED.name,
                logo_url = EXCLUDED.logo_url,
                primary_color = EXCLUDED.primary_color,
                secondary_color = EXCLUDED.secondary_color,
                arena = EXCLUDED.arena,
                updated_at = NOW()
        """, rows)
        conn.commit()
        print(f"  Inserted/updated {len(rows)} teams")


# ============================================================
# 3. Ingest players (active NBA players on current rosters)
# ============================================================
def ingest_players(conn, season_id):
    step("3/7  Ingesting active players")
    pause()
    try:
        stats = leaguedashplayerstats.LeagueDashPlayerStats(
            season=SEASON, per_mode_detailed="PerGame"
        )
        df = stats.get_data_frames()[0]
    except Exception as e:
        print(f"  Warning: LeagueDashPlayerStats failed ({e}), falling back to static list")
        all_p = nba_players_static.get_active_players()
        df = None

    with conn.cursor() as cur:
        # Build team abbr -> db id map
        cur.execute("SELECT abbreviation, id FROM teams")
        team_map = {row[0]: row[1] for row in cur.fetchall()}

        if df is not None and len(df) > 0:
            count = 0
            for _, row in df.iterrows():
                ext_id = str(row["PLAYER_ID"])
                full_name = row["PLAYER_NAME"]
                parts = full_name.split(" ", 1)
                first = parts[0]
                last = parts[1] if len(parts) > 1 else ""
                team_abbr = row.get("TEAM_ABBREVIATION", "")
                age = row.get("AGE", None)

                cur.execute("""
                    INSERT INTO players (external_id, first_name, last_name, full_name,
                        headshot_url, is_active)
                    VALUES (%s, %s, %s, %s, %s, true)
                    ON CONFLICT (external_id) DO UPDATE SET
                        full_name = EXCLUDED.full_name,
                        headshot_url = EXCLUDED.headshot_url,
                        is_active = true,
                        updated_at = NOW()
                    RETURNING id
                """, (
                    ext_id, first, last, full_name,
                    f"https://cdn.nba.com/headshots/nba/latest/1040x760/{ext_id}.png",
                ))
                player_db_id = cur.fetchone()[0]

                # Insert roster entry
                if team_abbr and team_abbr in team_map:
                    cur.execute("""
                        INSERT INTO rosters (team_id, player_id, season_id, position, start_date)
                        VALUES (%s, %s, %s, %s, '2024-10-22')
                        ON CONFLICT DO NOTHING
                    """, (team_map[team_abbr], player_db_id, season_id, ""))

                count += 1

            conn.commit()
            print(f"  Inserted/updated {count} players from league stats")

            # Also insert season stats from the same data
            step("3b/7  Inserting player season stats")
            for _, row in df.iterrows():
                ext_id = str(row["PLAYER_ID"])
                team_abbr = row.get("TEAM_ABBREVIATION", "")
                if team_abbr not in team_map:
                    continue
                cur.execute("SELECT id FROM players WHERE external_id = %s", (ext_id,))
                r = cur.fetchone()
                if not r:
                    continue
                pid = r[0]
                tid = team_map[team_abbr]

                cur.execute("""
                    INSERT INTO player_season_stats (
                        player_id, season_id, team_id, games_played, games_started,
                        mpg, ppg, rpg, apg, spg, bpg, topg, fpg,
                        fg_pct, fg3_pct, ft_pct
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT ON CONSTRAINT idx_pss_player_season_team DO UPDATE SET
                        games_played = EXCLUDED.games_played,
                        ppg = EXCLUDED.ppg, rpg = EXCLUDED.rpg, apg = EXCLUDED.apg,
                        spg = EXCLUDED.spg, bpg = EXCLUDED.bpg, topg = EXCLUDED.topg,
                        fg_pct = EXCLUDED.fg_pct, fg3_pct = EXCLUDED.fg3_pct, ft_pct = EXCLUDED.ft_pct,
                        mpg = EXCLUDED.mpg
                """, (
                    pid, season_id, tid,
                    int(row.get("GP", 0)), int(row.get("GS", 0)),
                    float(row.get("MIN", 0)), float(row.get("PTS", 0)),
                    float(row.get("REB", 0)), float(row.get("AST", 0)),
                    float(row.get("STL", 0)), float(row.get("BLK", 0)),
                    float(row.get("TOV", 0)), float(row.get("PF", 0)),
                    float(row.get("FG_PCT", 0)), float(row.get("FG3_PCT", 0)),
                    float(row.get("FT_PCT", 0)),
                ))
            conn.commit()
            print(f"  Season stats inserted")
        else:
            print("  Using static player list (no stats)")
            all_p = nba_players_static.get_active_players()
            count = 0
            for p in all_p:
                cur.execute("""
                    INSERT INTO players (external_id, first_name, last_name, full_name, headshot_url, is_active)
                    VALUES (%s, %s, %s, %s, %s, true)
                    ON CONFLICT (external_id) DO UPDATE SET is_active = true, updated_at = NOW()
                """, (
                    str(p["id"]), p["first_name"], p["last_name"], p["full_name"],
                    f"https://cdn.nba.com/headshots/nba/latest/1040x760/{p['id']}.png",
                ))
                count += 1
            conn.commit()
            print(f"  Inserted {count} players (basic info only)")


# ============================================================
# 4. Ingest team season stats
# ============================================================
def ingest_team_stats(conn, season_id):
    step("4/7  Ingesting team season stats")
    pause()
    try:
        stats = leaguedashteamstats.LeagueDashTeamStats(
            season=SEASON, per_mode_detailed="PerGame"
        )
        df = stats.get_data_frames()[0]
    except Exception as e:
        print(f"  Warning: LeagueDashTeamStats failed: {e}")
        return

    with conn.cursor() as cur:
        cur.execute("SELECT external_id, id FROM teams")
        team_map = {row[0]: row[1] for row in cur.fetchall()}

        for _, row in df.iterrows():
            tid_ext = str(row["TEAM_ID"])
            if tid_ext not in team_map:
                continue
            tid = team_map[tid_ext]
            cur.execute("""
                INSERT INTO team_season_stats (team_id, season_id, wins, losses, fg_pct, fg3_pct, ft_pct)
                VALUES (%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT ON CONSTRAINT idx_tss_team_season DO UPDATE SET
                    wins = EXCLUDED.wins, losses = EXCLUDED.losses,
                    fg_pct = EXCLUDED.fg_pct, fg3_pct = EXCLUDED.fg3_pct, ft_pct = EXCLUDED.ft_pct
            """, (
                tid, season_id,
                int(row.get("W", 0)), int(row.get("L", 0)),
                float(row.get("FG_PCT", 0)), float(row.get("FG3_PCT", 0)),
                float(row.get("FT_PCT", 0)),
            ))
        conn.commit()
        print(f"  Inserted team stats for {len(df)} teams")


# ============================================================
# 5. Ingest games and box scores
# ============================================================
def ingest_games(conn, season_id):
    step("5/7  Ingesting games for current season")
    pause()

    with conn.cursor() as cur:
        cur.execute("SELECT external_id, id FROM teams")
        team_map = {row[0]: row[1] for row in cur.fetchall()}

    # Get all games via LeagueGameFinder
    try:
        gf = leaguegamefinder.LeagueGameFinder(
            season_nullable=SEASON,
            league_id_nullable="00",
            season_type_nullable="Regular Season",
        )
        df = gf.get_data_frames()[0]
    except Exception as e:
        print(f"  Warning: LeagueGameFinder failed: {e}")
        return

    # Group by GAME_ID — each game has 2 rows (home + away)
    game_ids = df["GAME_ID"].unique()
    print(f"  Found {len(game_ids)} games to process")

    with conn.cursor() as cur:
        count = 0
        for gid in game_ids:
            game_rows = df[df["GAME_ID"] == gid]
            if len(game_rows) < 2:
                continue

            # Determine home/away — home team has '@' NOT in matchup
            row1 = game_rows.iloc[0]
            row2 = game_rows.iloc[1]

            if "@" in str(row1.get("MATCHUP", "")):
                away_row, home_row = row1, row2
            else:
                home_row, away_row = row1, row2

            home_tid = str(home_row["TEAM_ID"])
            away_tid = str(away_row["TEAM_ID"])

            if home_tid not in team_map or away_tid not in team_map:
                continue

            game_date = str(home_row["GAME_DATE"])[:10]
            home_pts = int(home_row.get("PTS", 0)) if home_row.get("PTS") else None
            away_pts = int(away_row.get("PTS", 0)) if away_row.get("PTS") else None
            status = "final" if home_pts and away_pts else "scheduled"

            cur.execute("""
                INSERT INTO games (external_id, season_id, game_date, home_team_id, away_team_id,
                    status, home_score, away_score)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                ON CONFLICT (external_id) DO UPDATE SET
                    status = EXCLUDED.status,
                    home_score = EXCLUDED.home_score,
                    away_score = EXCLUDED.away_score,
                    updated_at = NOW()
            """, (
                gid, season_id, game_date, team_map[home_tid], team_map[away_tid],
                status, home_pts, away_pts,
            ))
            count += 1

        conn.commit()
        print(f"  Inserted/updated {count} games")


# ============================================================
# 6. Ingest recent player game logs (top players)
# ============================================================
def ingest_player_game_logs(conn, season_id):
    step("6/7  Ingesting player game logs (top 50 by PPG)")

    with conn.cursor() as cur:
        # Get top 50 players by PPG
        cur.execute("""
            SELECT p.id, p.external_id, p.full_name, pss.team_id
            FROM players p
            JOIN player_season_stats pss ON p.id = pss.player_id AND pss.season_id = %s
            ORDER BY pss.ppg DESC NULLS LAST
            LIMIT 50
        """, (season_id,))
        top_players = cur.fetchall()

        # Get game external_id -> db id map
        cur.execute("SELECT external_id, id FROM games WHERE season_id = %s", (season_id,))
        game_map = {row[0]: row[1] for row in cur.fetchall()}

    print(f"  Processing game logs for {len(top_players)} players...")

    with conn.cursor() as cur:
        for i, (pid, ext_id, name, tid) in enumerate(top_players):
            pause()
            try:
                gl = playergamelog.PlayerGameLog(
                    player_id=ext_id, season=SEASON, season_type_all_star="Regular Season"
                )
                gl_df = gl.get_data_frames()[0]
            except Exception as e:
                print(f"    [{i+1}/{len(top_players)}] {name}: failed ({e})")
                continue

            log_count = 0
            for _, row in gl_df.iterrows():
                game_ext_id = row.get("Game_ID", "")
                if game_ext_id not in game_map:
                    continue
                gid = game_map[game_ext_id]

                # Parse minutes (format: "MM:SS" or just number)
                mins_raw = row.get("MIN", 0)
                try:
                    if isinstance(mins_raw, str) and ":" in mins_raw:
                        parts = mins_raw.split(":")
                        mins = float(parts[0]) + float(parts[1]) / 60
                    else:
                        mins = float(mins_raw) if mins_raw else 0
                except:
                    mins = 0

                fga = int(row.get("FGA", 0))
                fta = int(row.get("FTA", 0))
                pts = int(row.get("PTS", 0))
                # TS% = PTS / (2 * (FGA + 0.44 * FTA))
                denom = 2 * (fga + 0.44 * fta)
                ts_pct = pts / denom if denom > 0 else 0

                cur.execute("""
                    INSERT INTO player_game_logs (
                        player_id, game_id, team_id, season_id, minutes,
                        pts, fgm, fga, fg3m, fg3a, ftm, fta,
                        oreb, dreb, reb, ast, stl, blk, tov, pf, plus_minus, ts_pct
                    ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)
                    ON CONFLICT ON CONSTRAINT idx_pgl_player_game DO UPDATE SET
                        pts = EXCLUDED.pts, reb = EXCLUDED.reb, ast = EXCLUDED.ast,
                        minutes = EXCLUDED.minutes, plus_minus = EXCLUDED.plus_minus,
                        ts_pct = EXCLUDED.ts_pct
                """, (
                    pid, gid, tid, season_id, mins,
                    pts, int(row.get("FGM", 0)), fga,
                    int(row.get("FG3M", 0)), int(row.get("FG3A", 0)),
                    int(row.get("FTM", 0)), fta,
                    int(row.get("OREB", 0)), int(row.get("DREB", 0)),
                    int(row.get("REB", 0)), int(row.get("AST", 0)),
                    int(row.get("STL", 0)), int(row.get("BLK", 0)),
                    int(row.get("TOV", 0)), int(row.get("PF", 0)),
                    int(row.get("PLUS_MINUS", 0)), round(ts_pct, 4),
                ))
                log_count += 1

            conn.commit()
            if (i + 1) % 10 == 0 or i == 0:
                print(f"    [{i+1}/{len(top_players)}] {name}: {log_count} game logs")

    print("  Done with player game logs")


# ============================================================
# 7. Summary
# ============================================================
def print_summary(conn):
    step("DONE — Database Summary")
    with conn.cursor() as cur:
        tables = [
            "seasons", "teams", "players", "rosters", "games",
            "player_season_stats", "team_season_stats", "player_game_logs",
        ]
        for t in tables:
            cur.execute(f"SELECT COUNT(*) FROM {t}")
            count = cur.fetchone()[0]
            print(f"  {t:30s} {count:>6} rows")


# ============================================================
# Main
# ============================================================
def main():
    print("\n" + "=" * 60)
    print("  CourtVision NBA Data Ingestion Pipeline")
    print(f"  Season: {SEASON}  |  Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    conn = get_conn()
    try:
        season_id = ingest_season(conn)
        ingest_teams(conn)
        ingest_players(conn, season_id)
        ingest_team_stats(conn, season_id)
        ingest_games(conn, season_id)
        ingest_player_game_logs(conn, season_id)
        print_summary(conn)
    except Exception as e:
        print(f"\nERROR: {e}")
        traceback.print_exc()
    finally:
        conn.close()

    print(f"\nFinished at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")


if __name__ == "__main__":
    main()
