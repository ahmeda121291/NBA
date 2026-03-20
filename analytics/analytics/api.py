"""FastAPI internal API for triggering analytics jobs."""

from fastapi import FastAPI, BackgroundTasks
from datetime import date

from .jobs.nightly import run_nightly_refresh
from .jobs.pregame import run_pregame_refresh, run_pregame_refresh_all

app = FastAPI(title="CourtVision Analytics", version="0.1.0")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/jobs/nightly")
def trigger_nightly(background_tasks: BackgroundTasks):
    background_tasks.add_task(run_nightly_refresh)
    return {"status": "queued", "job": "nightly_refresh"}


@app.post("/jobs/pregame/{game_id}")
def trigger_pregame(game_id: int, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_pregame_refresh, game_id)
    return {"status": "queued", "job": "pregame_refresh", "game_id": game_id}


@app.post("/jobs/pregame-all")
def trigger_pregame_all(game_date: date, background_tasks: BackgroundTasks):
    background_tasks.add_task(run_pregame_refresh_all, game_date)
    return {"status": "queued", "job": "pregame_refresh_all", "date": str(game_date)}
