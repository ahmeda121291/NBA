# CourtVision Roadmap — From Analytics Tool to Content Platform

## Context
CourtVision has strong bones: custom metrics, a 69% accurate projection engine, glassmorphic UI. But it's running on stale manual data, missing key stats, and has zero shareable output. The goal is to transform it from a personal analytics tool into THE platform that NBA writers, scouts, fans, and analysts open every morning and screenshot every night.

**Target audience:** Not gamblers — content creators, journalists, scouts, superfans. People who argue on Twitter with data.

---

## Phase 1: Live Data Foundation (must do first — everything depends on this)

### 1A. Pipeline Automation
**Problem:** Scripts must be run manually. Data goes stale within hours.

- Create `scripts/orchestrate.ts` — single entry point using `node-cron`:
  - During games (6pm-1am ET): lightweight score updater every 15 min hitting NBA CDN scoreboard endpoint
  - Daily at 6am ET: full pipeline (fetch-schedule → ingest → compute-metrics → compute-projections)
- Create `scripts/update-scores.ts` — hits `cdn.nba.com/static/json/liveData/scoreboard/todaysScoreboard_00.json`, updates only `games.home_score`, `games.away_score`, `games.status`
- Add `/api/pipeline/status` route so UI shows "Last updated: 3 min ago"
- Run with `npm run pipeline` (PM2 or systemd for prod)

### 1B. Populate Advanced Stats (currently all NULL)
**Problem:** USG%, BPM, VORP, WS, PER, ORTG, DRTG, pace, SOS all NULL in DB.

- Extend `scripts/ingest.ts`:
  - Add `ingestAdvancedPlayerStats()` — hit `leaguedashplayerstats` with `MeasureType=Advanced` for PER, USG%, TS%, EFG%
  - Add `ingestAdvancedTeamStats()` — hit `leaguedashteamstats` with `MeasureType=Advanced` for ORTG, DRTG, net rating, pace
  - Compute BPM/VORP/WS from available box score data or pull from additional endpoint
  - Compute SOS from opponent win percentages
- Expand ON CONFLICT UPDATE clauses to include the new columns

### 1C. Expand Game Log Coverage
**Problem:** Only top 50 players by PPG have game logs. H2H needs broader coverage.

- Change `ingest.ts` player filter from `LIMIT 50` to `WHERE mpg >= 15` (~250 players)
- Populate `gameTeamStats` table (currently 0 rows) from box score data already fetched during game ingestion

**Files:** `scripts/orchestrate.ts` (new), `scripts/update-scores.ts` (new), `scripts/ingest.ts` (modify), `web/src/app/api/pipeline/status/route.ts` (new), `web/package.json` (add node-cron)

---

## Phase 2: Intelligence Layer

### 2A. Player H2H Matchup System
**Problem:** User wants "how does Tatum play vs TOR?" factored into projections AND displayed.

- New `web/src/lib/db/queries/matchups.ts`:
  - `getPlayerVsTeam(playerId, opponentTeamId)` — aggregated stats from playerGameLogs by opponent
  - `getPlayerMatchupSplits(playerId)` — all opponents, sorted by over/under-performance vs season avg
- Integrate into `projections.ts` — query top-8 players per team, check vs-opponent history, adjust projected score +/- 3 pts
- **UI:** "Opponent Splits" table on player detail page, "Key Matchups" section on game detail page

### 2B. Betting Odds / "Market vs Model"
**Problem:** No context for whether CourtVision's projection is contrarian or consensus.

- Use The-Odds-API (free 500 req/month) or ESPN odds
- New `gameOdds` schema table: gameId, source, spreadHome, totalLine, moneylineHome/Away, fetchedAt
- New `scripts/fetch-odds.ts` — daily at 3pm before game time
- **UI framing:** NOT "how to bet" but "Market vs CourtVision" — show where the model disagrees with Vegas. This is what writers share: contrarian data-backed takes.
- "Edge Finder" column on games page, "Market vs Model" section on game detail

### 2C. Backtesting Framework
- `scripts/backtest.ts` — replay completed games through projection engine, compute accuracy by category (home/away, favorites/underdogs, B2B, etc.)
- Identifies where model is weak → informs weight tuning
- Powers a "Model Accuracy" dashboard section

**Files:** `web/src/lib/db/queries/matchups.ts` (new), `web/src/lib/projections.ts` (modify), `web/src/lib/db/schema.ts` (add gameOdds), `scripts/fetch-odds.ts` (new), `scripts/backtest.ts` (new), `web/src/app/games/[id]/page.tsx` (modify), `web/src/app/players/[id]/page.tsx` (modify)

---

## Phase 3: Viral Content Engine (the differentiator)

This is what makes CourtVision a platform, not just a dashboard. Every chart designed for 1200x675 (Twitter card) or 1080x1080 (IG square), with CourtVision watermark.

### 3A. Chart Export Infrastructure
- `web/src/lib/chart-export.ts` — SVG-to-PNG pipeline using `@resvg/resvg-js` (server-side Rust-based renderer)
- `/api/charts/[type]/route.ts` — dynamic chart image API
- OG meta tags so pasting a CourtVision URL into Twitter shows the chart as preview
- `web/src/components/shared/share-button.tsx` — "Copy Image" / "Download PNG" / "Copy Link"

### 3B. Chart Types (priority order)

1. **Four-Quadrant Scatter Plot** — offense vs defense, usage vs efficiency, BIS vs LFI. Team logos or player headshots as data points. Quadrant labels. THE most-shared chart type on NBA Twitter.

2. **Tier List Generator** — S/A/B/C/D/F tiers with player cards. Configurable by any metric. New `/tier-lists` page. Writers will use this daily.

3. **Player Stock Ticker** — LFI/BIS over time like a financial chart. Green/red for trending. "52-game high/low" markers. Injury annotations.

4. **H2H Comparison Card** — Two players side-by-side, stat bars, radar overlay. Built on existing compare page. Screenshot-optimized fixed dimensions.

5. **Ranking Bars** — Horizontal bars, top 10/20 for any stat, player headshots, highlight specific player in accent color.

6. **Performance Heatmap** — GitHub-contribution-graph style calendar. Each cell = one game, color = performance. Instantly recognizable.

### 3C. "Lab" Page — The Content Creator's Tool
- New `web/src/app/lab/page.tsx` — interactive chart builder
- Pick chart type → pick metrics/axes → pick players/teams → live preview → export PNG
- This is the core product for writers/analysts

**Files:** `web/src/lib/chart-export.ts` (new), `web/src/app/api/charts/[type]/route.ts` (new), `web/src/app/api/og/[...slug]/route.ts` (new), `web/src/components/charts/*.tsx` (new, 6 chart components), `web/src/app/lab/page.tsx` (new), `web/src/components/shared/share-button.tsx` (new)

---

## Phase 4: Engagement & Stickiness

### 4A. Daily Pulse Enhancement
- "Stat of the Day" — algorithmically surface the most interesting anomaly
- "Model Record" — running accuracy tracker (e.g., "CourtVision: 142-98 this season, 59.2%")
- "Today's Edges" — games where model disagrees most with market

### 4B. Award Race Tracker
- MVP, DPOY, 6MOY, ROY, MIP race dashboards using CourtVision metrics as ranking criteria
- Award season = peak engagement season. New `/awards` page.

### 4C. "What If" Simulator
- "What if Player X was traded to Team Y?" — recalculate team metrics with roster swap
- Goes viral every trade deadline. Medium effort but enormous engagement.

### 4D. Narrative Engine
- Button that generates a ready-to-post tweet from any chart/data point
- Example: "Tatum's BIS of 82 (96th %ile) + verified hot streak (LFI 78) = most dangerous player in the league. [chart]"
- Writers save 5 min per post. Massive value add.

### 4E. Embeddable Widgets
- `<iframe>` embed codes for any chart — writers paste into articles
- Free distribution channel

---

## Execution Priority

| # | Feature | Why First | Effort |
|---|---------|-----------|--------|
| 1 | Pipeline automation | Everything depends on fresh data | Medium |
| 2 | Advanced stats population | Fills visible blanks, looks broken without it | Low |
| 3 | Player H2H matchups | User's #1 request, unique insight | Medium |
| 4 | Quadrant charts + tier lists | Highest viral potential, defines the brand | Medium |
| 5 | Chart export/share infra | Enables all sharing | Medium |
| 6 | Betting odds "Market vs Model" | Content hook for daily engagement | Low |
| 7 | Lab page (chart builder) | Core tool for target audience | Medium |
| 8 | Stock ticker + heatmap charts | Depth of content options | Medium |
| 9 | Award tracker | Seasonal but high engagement | Medium |
| 10 | What-If simulator | Viral but higher effort | High |

---

## Verification
- After Phase 1: Run `npm run pipeline`, confirm advanced stats populate, check games page shows fresh scores
- After Phase 2: Check player detail page shows opponent splits, game detail shows H2H + odds comparison, run backtest for accuracy
- After Phase 3: Generate a quadrant chart PNG, verify 1200x675 output with watermark, test OG preview by pasting URL
- After Phase 4: Verify Pulse page shows stat of day + model record, test What-If with a trade scenario
