import os
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://localhost:5432/courtvision")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")

# Metric weights — centralized for tuning
BIS_WEIGHTS = {
    "epm": 0.30,
    "lebron": 0.25,
    "rapm": 0.20,
    "bpm": 0.10,
    "on_off": 0.10,
    "ws48": 0.05,
}

LFI_WINDOW_WEIGHTS = {3: 0.15, 5: 0.30, 10: 0.35, 20: 0.20}

FATIGUE_PENALTIES = {
    "back_to_back": 0.15,
    "three_in_four": 0.10,
    "heavy_recent_minutes": 0.08,
    "cumulative_load": 0.05,
    "return_from_injury": 0.12,
    "travel_burden": 0.05,
}

HOME_COURT_ADVANTAGE = 3.5  # points, historical baseline

# Confidence thresholds
MIN_GAMES_MODERATE = 20
MIN_GAMES_HIGH = 40
