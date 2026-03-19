# CourtVision — Architecture & Stack

---

## Tech Stack (Final)

### Frontend
| Technology | Purpose |
|-----------|---------|
| Next.js 15 (App Router) | Framework, SSR, routing |
| React 19 | UI |
| TypeScript | Type safety |
| Tailwind CSS 4 | Styling |
| shadcn/ui | Component library |
| Recharts | Data visualizations |
| TanStack Query v5 | Server state management |
| TanStack Table | Data tables |
| Zustand | Client state (minimal) |
| nuqs | URL search params state |

### Backend
| Technology | Purpose |
|-----------|---------|
| Next.js API Routes | Primary API layer |
| Drizzle ORM | Database access from TypeScript |
| Redis (Upstash) | Caching |
| BullMQ | Background job queue |

### Analytics Engine (Python)
| Technology | Purpose |
|-----------|---------|
| Python 3.12 | Metric computation |
| SQLAlchemy | DB access |
| Pandas / NumPy | Data processing |
| SciPy | Statistical functions |
| APScheduler | Job scheduling |
| FastAPI | Internal API for triggering jobs |

### Database
| Technology | Purpose |
|-----------|---------|
| PostgreSQL 16 | Primary database |
| Redis | Cache + job queue |

### Infrastructure
| Technology | Purpose |
|-----------|---------|
| Vercel | Frontend hosting |
| Railway | PostgreSQL + Redis + Python workers |
| Sentry | Error monitoring |
| GitHub Actions | CI/CD |

### Auth
| Technology | Purpose |
|-----------|---------|
| Clerk | Authentication (MVP) |

---

## Service Architecture

```
┌─────────────────────────────────────────────────┐
│                    Vercel                         │
│  ┌─────────────────────────────────────────────┐ │
│  │          Next.js App (Frontend)              │ │
│  │  ┌──────────┐ ┌──────────┐ ┌─────────────┐ │ │
│  │  │  Pages   │ │Components│ │  API Routes  │ │ │
│  │  └──────────┘ └──────────┘ └──────┬──────┘ │ │
│  └───────────────────────────────────┼─────────┘ │
└──────────────────────────────────────┼───────────┘
                                       │
                    ┌──────────────────┼──────────────┐
                    │                  ▼              │
                    │  ┌──────────────────────────┐   │
                    │  │      PostgreSQL 16        │   │
                    │  └────────────▲─────────────┘   │
                    │               │                 │
                    │  ┌────────────┴─────────────┐   │
                    │  │       Redis Cache         │   │
                    │  └────────────▲─────────────┘   │
                    │               │                 │
                    │  ┌────────────┴─────────────┐   │
                    │  │   Python Analytics Engine │   │
                    │  │  ┌─────────┐ ┌─────────┐ │   │
                    │  │  │Ingestion│ │ Metrics  │ │   │
                    │  │  │Pipeline │ │ Engine   │ │   │
                    │  │  └─────────┘ └─────────┘ │   │
                    │  │  ┌─────────┐ ┌─────────┐ │   │
                    │  │  │Scheduler│ │Explain   │ │   │
                    │  │  │  (APS)  │ │ Engine   │ │   │
                    │  │  └─────────┘ └─────────┘ │   │
                    │  └──────────────────────────┘   │
                    │           Railway               │
                    └─────────────────────────────────┘
```

---

## Repo Structure

```
courtvision/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, type-check, test
│       └── deploy.yml                # Vercel + Railway deploy
├── docs/
│   ├── 01-PRD.md
│   ├── 02-METRICS.md
│   ├── 03-DATA-MODEL.md
│   ├── 04-ARCHITECTURE.md
│   └── 05-UX.md
├── web/                              # Next.js app
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── drizzle.config.ts
│   ├── public/
│   │   └── images/
│   ├── src/
│   │   ├── app/                      # App Router pages
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx              # Home Dashboard
│   │   │   ├── games/
│   │   │   │   ├── page.tsx          # Games Hub
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Game Detail
│   │   │   ├── teams/
│   │   │   │   ├── page.tsx          # Teams Hub
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Team Detail
│   │   │   ├── players/
│   │   │   │   ├── page.tsx          # Players Hub
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx      # Player Detail
│   │   │   ├── leaderboards/
│   │   │   │   └── page.tsx
│   │   │   ├── compare/
│   │   │   │   └── page.tsx
│   │   │   ├── insights/
│   │   │   │   └── page.tsx
│   │   │   ├── methodology/
│   │   │   │   └── page.tsx          # Model Explainability
│   │   │   └── api/
│   │   │       ├── games/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts
│   │   │       ├── teams/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts
│   │   │       ├── players/
│   │   │       │   ├── route.ts
│   │   │       │   └── [id]/
│   │   │       │       └── route.ts
│   │   │       ├── leaderboards/
│   │   │       │   └── route.ts
│   │   │       ├── compare/
│   │   │       │   └── route.ts
│   │   │       ├── projections/
│   │   │       │   └── route.ts
│   │   │       ├── injuries/
│   │   │       │   └── route.ts
│   │   │       ├── insights/
│   │   │       │   └── route.ts
│   │   │       └── search/
│   │   │           └── route.ts
│   │   ├── components/
│   │   │   ├── ui/                   # shadcn/ui components
│   │   │   ├── layout/
│   │   │   │   ├── header.tsx
│   │   │   │   ├── sidebar.tsx
│   │   │   │   └── footer.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── todays-games.tsx
│   │   │   │   ├── hot-players.tsx
│   │   │   │   ├── hot-teams.tsx
│   │   │   │   ├── injury-alerts.tsx
│   │   │   │   └── insight-cards.tsx
│   │   │   ├── games/
│   │   │   │   ├── game-card.tsx
│   │   │   │   ├── game-projection.tsx
│   │   │   │   ├── style-clash.tsx
│   │   │   │   ├── matchup-pairs.tsx
│   │   │   │   └── stat-line-table.tsx
│   │   │   ├── teams/
│   │   │   │   ├── team-card.tsx
│   │   │   │   ├── team-metrics.tsx
│   │   │   │   ├── team-style.tsx
│   │   │   │   └── roster-table.tsx
│   │   │   ├── players/
│   │   │   │   ├── player-card.tsx
│   │   │   │   ├── player-metrics.tsx
│   │   │   │   ├── shot-chart.tsx
│   │   │   │   ├── trend-chart.tsx
│   │   │   │   └── projection-card.tsx
│   │   │   ├── metrics/
│   │   │   │   ├── metric-badge.tsx
│   │   │   │   ├── metric-card.tsx
│   │   │   │   ├── confidence-indicator.tsx
│   │   │   │   ├── streak-tag.tsx
│   │   │   │   └── radar-chart.tsx
│   │   │   ├── compare/
│   │   │   │   ├── compare-selector.tsx
│   │   │   │   └── compare-table.tsx
│   │   │   └── shared/
│   │   │       ├── stat-range.tsx
│   │   │       ├── trend-arrow.tsx
│   │   │       ├── search-bar.tsx
│   │   │       ├── data-table.tsx
│   │   │       └── explanation-drawer.tsx
│   │   ├── lib/
│   │   │   ├── db/
│   │   │   │   ├── index.ts          # Drizzle client
│   │   │   │   ├── schema.ts         # Drizzle schema
│   │   │   │   └── queries/          # Reusable query functions
│   │   │   │       ├── games.ts
│   │   │   │       ├── teams.ts
│   │   │   │       ├── players.ts
│   │   │   │       └── metrics.ts
│   │   │   ├── redis.ts              # Redis client
│   │   │   ├── cache.ts              # Cache helpers
│   │   │   ├── utils.ts              # General utilities
│   │   │   ├── constants.ts          # Metric labels, colors, etc.
│   │   │   └── types.ts              # Shared TypeScript types
│   │   └── hooks/
│   │       ├── use-games.ts
│   │       ├── use-teams.ts
│   │       ├── use-players.ts
│   │       └── use-search.ts
│   └── tests/
│       ├── api/
│       └── components/
├── analytics/                        # Python analytics engine
│   ├── pyproject.toml
│   ├── analytics/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── db.py                     # SQLAlchemy connection
│   │   ├── models.py                 # SQLAlchemy models
│   │   ├── ingestion/
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # Provider abstraction
│   │   │   ├── nba_api.py           # nba_api provider
│   │   │   ├── schedule.py
│   │   │   ├── players.py
│   │   │   ├── teams.py
│   │   │   ├── game_logs.py
│   │   │   ├── injuries.py
│   │   │   └── advanced_stats.py
│   │   ├── metrics/
│   │   │   ├── __init__.py
│   │   │   ├── base.py              # Base metric class
│   │   │   ├── player/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── bis.py
│   │   │   │   ├── rda.py
│   │   │   │   ├── drs.py
│   │   │   │   ├── lfi.py
│   │   │   │   ├── mai.py
│   │   │   │   └── gip.py
│   │   │   └── team/
│   │   │       ├── __init__.py
│   │   │       ├── tsc.py
│   │   │       ├── ltfi.py
│   │   │       ├── sce.py
│   │   │       └── gop.py
│   │   ├── projections/
│   │   │   ├── __init__.py
│   │   │   ├── game.py
│   │   │   └── player.py
│   │   ├── streaks/
│   │   │   ├── __init__.py
│   │   │   └── classifier.py
│   │   ├── fatigue/
│   │   │   ├── __init__.py
│   │   │   └── model.py
│   │   ├── explanations/
│   │   │   ├── __init__.py
│   │   │   ├── generator.py
│   │   │   └── templates.py
│   │   ├── jobs/
│   │   │   ├── __init__.py
│   │   │   ├── nightly.py
│   │   │   ├── pregame.py
│   │   │   ├── postgame.py
│   │   │   └── rolling.py
│   │   └── api.py                   # FastAPI internal endpoints
│   └── tests/
│       ├── test_metrics.py
│       ├── test_ingestion.py
│       └── test_projections.py
├── migrations/                       # Drizzle migrations
├── scripts/
│   ├── seed.ts                       # Seed script
│   └── setup-db.sh
├── .env.example
├── .gitignore
├── package.json                      # Root workspace
└── README.md
```

---

## API Design

### Response Shape Convention
```typescript
// Success
{
  data: T,
  meta?: {
    total?: number,
    page?: number,
    per_page?: number,
    computed_at?: string,
    confidence?: number,
  }
}

// Error
{
  error: {
    code: string,
    message: string,
  }
}
```

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | /api/games | Today's games (or ?date=YYYY-MM-DD) |
| GET | /api/games/[id] | Game detail with projection |
| GET | /api/teams | All teams with current metrics |
| GET | /api/teams/[id] | Team detail |
| GET | /api/teams/[id]/roster | Team roster with player metrics |
| GET | /api/teams/[id]/rolling?window=10 | Rolling team stats |
| GET | /api/players | All players (paginated, filterable) |
| GET | /api/players/[id] | Player detail with all metrics |
| GET | /api/players/[id]/gamelog | Player game log |
| GET | /api/players/[id]/rolling?window=10 | Rolling player stats |
| GET | /api/players/[id]/projection?game_id=X | Player game projection |
| GET | /api/leaderboards?metric=bis&limit=25 | Leaderboard by metric |
| GET | /api/compare?type=player&ids=1,2 | Compare entities |
| GET | /api/projections?date=YYYY-MM-DD | All game projections for date |
| GET | /api/injuries?team_id=X | Current injuries |
| GET | /api/insights?limit=10 | Latest insights |
| GET | /api/search?q=lebron | Search players/teams |

---

## Job Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| nightly_full_refresh | 4:00 AM ET | Full stats ingestion + metric recompute |
| pregame_refresh | 2h before each tip | Game projections + player projections |
| postgame_reconcile | 1h after each final | Ingest results, update rolling, track accuracy |
| rolling_recompute | 6:00 AM ET | Recompute all rolling windows |
| injury_refresh | Every 30 min 10am-midnight ET | Refresh injury data |
| explanation_generate | After pregame_refresh | Generate/update explanations |

---

## Ingestion Pipeline Design

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐
│  Provider    │────▶│  Transformer │────▶│  Loader      │
│  (nba_api)  │     │  (normalize) │     │  (PostgreSQL) │
└─────────────┘     └──────────────┘     └──────────────┘
       │                                        │
       │         ┌──────────────┐               │
       └────────▶│  Validator   │◀──────────────┘
                 │  (checks)    │
                 └──────────────┘
```

Provider abstraction:
```python
class DataProvider(ABC):
    @abstractmethod
    def fetch_schedule(self, season: str) -> list[RawGame]: ...
    @abstractmethod
    def fetch_player_game_logs(self, player_id: str, season: str) -> list[RawGameLog]: ...
    @abstractmethod
    def fetch_team_stats(self, team_id: str, season: str) -> RawTeamStats: ...
    @abstractmethod
    def fetch_injuries(self) -> list[RawInjury]: ...
```

This allows swapping `nba_api` for another provider without changing downstream logic.
