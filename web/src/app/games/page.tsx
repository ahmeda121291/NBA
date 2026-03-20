import { ChevronLeft, ChevronRight } from "lucide-react";

const games = [
  {
    id: 1, time: "7:00 PM ET", arena: "TD Garden",
    home: { abbr: "BOS", name: "Celtics", record: "42-20" },
    away: { abbr: "LAL", name: "Lakers", record: "35-28" },
    homeProb: 0.58, projScore: "114-108", pace: 100.2,
    tags: ["BOS strong at home", "LAL B2B fatigue"],
    injuries: ["AD questionable"],
    homeForm: { ltfi: 68, label: "Hot" },
    awayForm: { ltfi: 52, label: "Neutral" },
  },
  {
    id: 2, time: "7:30 PM ET", arena: "Footprint Center",
    home: { abbr: "PHX", name: "Suns", record: "38-24" },
    away: { abbr: "MIA", name: "Heat", record: "33-29" },
    homeProb: 0.61, projScore: "118-112", pace: 101.8,
    tags: ["Pace mismatch favors PHX", "MIA struggles up-tempo"],
    injuries: [],
    homeForm: { ltfi: 64, label: "Warm" },
    awayForm: { ltfi: 48, label: "Cooling" },
  },
  {
    id: 3, time: "9:00 PM ET", arena: "Ball Arena",
    home: { abbr: "DEN", name: "Nuggets", record: "40-22" },
    away: { abbr: "NYK", name: "Knicks", record: "39-23" },
    homeProb: 0.55, projScore: "112-108", pace: 98.5,
    tags: ["Jokic vs Brunson engine battle", "Elite halfcourt matchup"],
    injuries: [],
    homeForm: { ltfi: 60, label: "Steady" },
    awayForm: { ltfi: 62, label: "Warm" },
  },
];

export default function GamesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Games</h1>
          <p className="text-sm text-text-secondary">
            Projected outcomes and matchup intelligence
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="rounded-lg border border-border p-2 text-text-secondary hover:text-text-primary">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="rounded-lg border border-border px-4 py-2 text-sm font-medium">
            Mar 19, 2026
          </span>
          <button className="rounded-lg border border-border p-2 text-text-secondary hover:text-text-primary">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {games.map((game) => (
          <a
            key={game.id}
            href={`/games/${game.id}`}
            className="block rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent/40 hover:bg-surface-hover"
          >
            <div className="flex items-center justify-between text-xs text-text-muted">
              <span>{game.time}</span>
              <span>{game.arena}</span>
            </div>

            <div className="mt-3 grid grid-cols-3 items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold">{game.away.abbr}</p>
                <p className="text-xs text-text-muted">{game.away.record}</p>
                <span className="mt-1 inline-block rounded-full bg-surface-hover px-2 py-0.5 text-[10px] text-text-secondary">
                  LTFI {game.awayForm.ltfi} — {game.awayForm.label}
                </span>
              </div>

              <div className="text-center">
                <p className="text-xs font-medium text-text-muted">VS</p>
                <p className="mt-1 font-stat text-sm text-text-secondary">
                  Proj: {game.projScore}
                </p>
                <p className="font-stat text-xs text-text-muted">
                  Pace: {game.pace}
                </p>
              </div>

              <div className="text-left">
                <p className="text-2xl font-bold">{game.home.abbr}</p>
                <p className="text-xs text-text-muted">{game.home.record}</p>
                <span className="mt-1 inline-block rounded-full bg-surface-hover px-2 py-0.5 text-[10px] text-text-secondary">
                  LTFI {game.homeForm.ltfi} — {game.homeForm.label}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex h-2 overflow-hidden rounded-full bg-border">
                <div
                  className="bg-accent transition-all"
                  style={{ width: `${Math.round(game.homeProb * 100)}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-xs">
                <span className="font-stat text-text-secondary">
                  {Math.round((1 - game.homeProb) * 100)}%
                </span>
                <span className="font-stat text-text-secondary">
                  {Math.round(game.homeProb * 100)}%
                </span>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {game.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs text-accent"
                >
                  {tag}
                </span>
              ))}
              {game.injuries.map((inj) => (
                <span
                  key={inj}
                  className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs text-amber-400"
                >
                  {inj}
                </span>
              ))}
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
