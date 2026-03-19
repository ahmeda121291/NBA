# CourtVision — Product Requirements Document

## Product Name
**CourtVision** — Advanced NBA Intelligence Platform

## Version
1.0 PRD — March 2026

---

## 1. Product Summary

CourtVision is a web-based NBA intelligence platform that helps serious basketball thinkers evaluate teams, players, games, and matchups through layered, explanation-first analytics. It combines public advanced metrics with proprietary composite scoring, contextual adjustments (injuries, fatigue, lineup synergy, matchup dynamics), and AI-generated narrative explanations grounded in structured data.

This is **not** a betting product. It is a basketball analysis platform designed for coaches, scouts, analysts, front-office thinkers, content creators, and serious fans.

---

## 2. Target Users

### Primary
| User | Needs |
|------|-------|
| NBA analysts / media | Deep, explainable evaluations for content and research |
| Scouts / front-office staff | Player evaluation, portability scoring, lineup fit analysis |
| Coaches / player development | Matchup preparation, role analysis, form tracking |
| Serious fans | Smart basketball understanding beyond box scores |
| Content creators | Data-backed narratives, comparison tools, insight feeds |

### Secondary
| User | Needs |
|------|-------|
| Fantasy players (non-gambling) | Context-driven player evaluation |
| Students / researchers | Historical analysis, metric methodology transparency |

---

## 3. Product Goals

1. **Evaluate every NBA player** through multi-dimensional metrics (impact, role difficulty, gravity, defense, scalability, live form)
2. **Evaluate every NBA team** through composite strength, lineup synergy, style profiling, and dependency risk
3. **Project every game** with explainable win probabilities, score ranges, and key factors
4. **Detect and classify streaks** — distinguish real breakouts from noise
5. **Surface matchup intelligence** — who has the edge tonight and why
6. **Account for context** — injuries, fatigue, schedule, lineup disruption, role changes
7. **Explain everything** — every score, projection, and trend includes human-readable reasoning
8. **Respect uncertainty** — ranges and confidence bands, never fake precision

---

## 4. Core Modules

### 4.1 Home Dashboard
The landing page. Shows today's NBA landscape at a glance.

**Content:**
- Today's games with projected outcomes
- Key injury alerts affecting projections
- Top 5 hottest players (with streak classification)
- Top 5 hottest teams
- Biggest matchup alerts for tonight
- Featured insight cards (auto-generated)
- Recent risers/fallers across player metrics

### 4.2 Games Hub
All scheduled games for today and upcoming dates.

**Per game card:**
- Teams, time, venue
- Projected winner + confidence badge
- Win probability bar
- Projected score range
- Key injury flags
- 1-2 matchup hooks (e.g., "Pace mismatch favors PHX")
- Live form tags for each team

### 4.3 Game Detail Page
Deep dive into a single game.

**Sections:**
- **Projection Summary** — winner, score range, pace, win probability, confidence
- **Style Clash Analysis** — pace, transition, paint vs. perimeter, rebounding battle
- **Injury Impact** — who's out/questionable, replacement impact estimates
- **Recent Form Comparison** — rolling team metrics side by side
- **Lineup Comparison** — projected starters, bench depth, key unit matchups
- **Key Player Matchups** — 3-4 matchup pairs with advantage scores
- **Projected Stat Lines** — top 8 players per team with projected stats + ranges
- **Swing Factor Players** — who could tilt this game
- **Historical Context** — season series, style matchup history
- **Model Explanation** — plain-English summary of why the model sees the game this way

### 4.4 Teams Hub
All 30 teams with sorting/filtering.

### 4.5 Team Detail Page
**Sections:**
- **Overview** — record, standings, injury state, schedule context
- **Composite Metrics** — TSC, LSS, RP, PTS, DRS-Team, LTFI (each with explanation)
- **Style Profile** — pace, shot distribution, defensive scheme, transition tendency
- **Recent Form** — rolling 5/10/20 windows vs. season baseline
- **Lineup Intelligence** — top units, minutes distribution, net rating by lineup
- **Roster Breakdown** — every player with role tag, mini metric card
- **Split Explorer** — home/away, clutch, vs. top/bottom teams, pre/post events
- **Schedule Context** — remaining difficulty, rest patterns, travel burden
- **Historical Trends** — month-over-month, pre/post trade deadline

### 4.6 Players Hub
All active players with sorting/filtering/search.

### 4.7 Player Detail Page
**Sections:**
- **Overview** — team, position, age, experience, current status
- **Composite Metrics** — BIS, RDA, GOI, DRS, SPS, LFI, MAI, GIP (each with explanation)
- **Role Profile** — usage type, creation burden, shot profile, defensive assignment
- **Shot Profile** — zone breakdown, frequency, efficiency, trend
- **Recent Trends** — rolling windows with delta from baseline
- **Matchup History** — performance vs. team archetypes, specific defenders
- **On/Off Context** — team performance with/without, lineup partners
- **Upcoming Projection** — next game stat line projection with ranges
- **Explanation Panel** — why metrics are where they are, what changed recently

### 4.8 Leaderboards
Sortable tables for:
- Best players by BIS
- Best current form by LFI
- Most scalable by SPS
- Best defenders by DRS
- Hottest teams by LTFI
- Best lineups by LSS
- Most underrated vs. box score
- Real vs. fake hot streaks

### 4.9 Historical Explorer
Query tool supporting:
- Rolling 3/5/10/20 game windows
- Season-over-season comparison
- Opponent splits
- Pre/post injury windows
- Pre/post roster changes
- Custom date ranges
- Export to CSV

### 4.10 Compare Tool
Side-by-side comparison for:
- Player vs. player (all metrics, radar charts, rolling trends)
- Team vs. team (all metrics, style overlay, strength/weakness)
- Lineup vs. lineup (where data permits)

### 4.11 Insight Feed
Auto-generated, grounded analysis cards:
- "Why [Team] is more dangerous than their record"
- "Why [Player]'s scoring bump is misleading"
- "Tonight's matchup favors [Team] because..."
- "[Lineup] is quietly elite — here's why"
- "[Player]'s hot streak looks real/fake because..."

Each insight cites specific metric inputs and factors.

### 4.12 Model Explainability Page
Public documentation of:
- Every custom metric: definition, inputs, formula overview, limitations
- Confidence/uncertainty framework
- Data sources and refresh cadence
- What the model can and cannot do
- Philosophy: why multi-metric, why explanation-first

---

## 5. Feature Prioritization

### MVP (V1)
| Priority | Feature |
|----------|---------|
| P0 | Home Dashboard |
| P0 | Games Hub + Game Detail |
| P0 | Teams Hub + Team Detail |
| P0 | Players Hub + Player Detail |
| P0 | Core player metrics (BIS, RDA, DRS, LFI, GIP) |
| P0 | Core team metrics (TSC, LTFI, SCE, GOP) |
| P0 | Injury tracking and adjustment |
| P0 | Projected game outcomes |
| P0 | Projected player stat lines |
| P0 | Streak classification (basic) |
| P1 | Leaderboards |
| P1 | Compare tool (player vs. player) |
| P1 | Explanation panels on all detail pages |
| P1 | Model Explainability page |

### V2
| Priority | Feature |
|----------|---------|
| P2 | Insight Feed (AI-generated) |
| P2 | Historical Explorer |
| P2 | Lineup-level analysis (LSS, lineup compare) |
| P2 | Advanced streak classification |
| P2 | GOI (gravity/off-ball) metric |
| P2 | SPS (scalability/portability) metric |
| P2 | Team compare tool |
| P2 | Lineup compare tool |
| P2 | PTS (playoff translation) metric |
| P2 | RP (redundancy penalty) metric |
| P2 | CSV/data export |
| P3 | Custom date range queries |
| P3 | Notification system |
| P3 | Saved comparisons / bookmarks |
| P3 | Public API access |

---

## 6. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Initial page load | < 2s |
| API response time | < 500ms (cached), < 2s (computed) |
| Data freshness | Nightly full refresh, pregame refresh 2h before tip |
| Uptime | 99.5% |
| Concurrent users | Support 1,000+ |
| Responsive design | Desktop-first, functional on tablet/mobile |
| Accessibility | WCAG 2.1 AA |
| SEO | SSR for team/player pages |

---

## 7. Product Language Guidelines

**Never use:**
- "edge", "pick", "lock", "fade", "hammer", "units"
- "over/under", "spread", "moneyline", "parlay"
- "sharp", "square", "book", "odds"
- Any gambling or sportsbook terminology

**Always use:**
- "projection", "evaluation", "analysis", "intelligence"
- "matchup advantage", "form indicator", "confidence band"
- "basketball context", "coaching insight", "front-office perspective"
- "expected range", "likely outcome", "key factors"

---

## 8. Success Metrics

| Metric | Target |
|--------|--------|
| Daily active users | 5,000+ within 6 months |
| Avg. session duration | > 4 minutes |
| Pages per session | > 3 |
| Return rate (7-day) | > 40% |
| Game detail page views | > 80% of daily games viewed |
| Projection accuracy | Track and publish calibration |
