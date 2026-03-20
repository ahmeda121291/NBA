import { Calendar, TrendingUp, AlertTriangle, Zap } from "lucide-react";

// Placeholder data — will be replaced with real API calls
const todaysGames = [
  { id: 1, home: "BOS", away: "LAL", time: "7:00 PM ET", homeProb: 0.58, projScore: "114-108" },
  { id: 2, home: "PHX", away: "MIA", time: "7:30 PM ET", homeProb: 0.61, projScore: "118-112" },
  { id: 3, home: "DEN", away: "NYK", time: "9:00 PM ET", homeProb: 0.55, projScore: "112-108" },
  { id: 4, home: "MIL", away: "GSW", time: "9:30 PM ET", homeProb: 0.53, projScore: "116-114" },
];

const hotPlayers = [
  { name: "Shai Gilgeous-Alexander", team: "OKC", lfi: 78, streak: "Hot and likely real" },
  { name: "Jayson Tatum", team: "BOS", lfi: 72, streak: "Breakout tied to expanded role" },
  { name: "Anthony Edwards", team: "MIN", lfi: 69, streak: "Hot but fragile" },
  { name: "De'Aaron Fox", team: "SAC", lfi: 67, streak: "Hot and likely real" },
  { name: "Tyrese Maxey", team: "PHI", lfi: 65, streak: "Hot but opponent-driven" },
];

const injuryAlerts = [
  { player: "Joel Embiid", team: "PHI", status: "OUT", injury: "Left knee" },
  { player: "Luka Doncic", team: "DAL", status: "GTD", injury: "Right ankle" },
  { player: "Ja Morant", team: "MEM", status: "OUT", injury: "Right shoulder" },
  { player: "Anthony Davis", team: "LAL", status: "GTD", injury: "Back tightness" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-text-secondary">
          Today&apos;s NBA landscape at a glance
        </p>
      </div>

      {/* Today's Games */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Today&apos;s Games
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {todaysGames.map((game) => (
            <a
              key={game.id}
              href={`/games/${game.id}`}
              className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/50 hover:bg-surface-hover"
            >
              <div className="flex items-center justify-between text-xs text-text-muted">
                <span>{game.time}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold">{game.away}</span>
                <span className="text-xs text-text-muted">@</span>
                <span className="text-lg font-bold">{game.home}</span>
              </div>
              <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="bg-accent transition-all"
                  style={{ width: `${Math.round((1 - game.homeProb) * 100)}%` }}
                />
                <div
                  className="bg-slate-500 transition-all"
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
              <div className="mt-2 text-center text-xs text-text-muted">
                Proj: {game.projScore}
              </div>
            </a>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Hot Players */}
        <section className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-emerald-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Hottest Players
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-surface">
            {hotPlayers.map((player, i) => (
              <div
                key={player.name}
                className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="font-stat text-sm text-text-muted">{i + 1}</span>
                  <div>
                    <a
                      href={`/players/${i + 1}`}
                      className="text-sm font-medium text-text-primary hover:text-accent"
                    >
                      {player.name}
                    </a>
                    <p className="text-xs text-text-muted">{player.team}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
                    {player.streak}
                  </span>
                  <span className="font-stat text-sm font-bold text-emerald-400">
                    {player.lfi}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Injury Alerts */}
        <section>
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
              Injury Watch
            </h2>
          </div>
          <div className="rounded-xl border border-border bg-surface">
            {injuryAlerts.map((injury) => (
              <div
                key={injury.player}
                className="flex items-center justify-between border-b border-border px-4 py-3 last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{injury.player}</p>
                  <p className="text-xs text-text-muted">
                    {injury.team} — {injury.injury}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    injury.status === "OUT"
                      ? "bg-rose-500/15 text-rose-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}
                >
                  {injury.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Featured Insights */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-highlight" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Featured Insights
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "OKC is more dangerous than their record suggests",
              body: "Thunder's TSC of 81 is 3rd in the league despite a 5th-place record. Their LTFI of 71 shows surging recent form, and a Playoff Translation Score of 84 indicates their style is built for high-leverage games.",
            },
            {
              title: "De'Aaron Fox's hot streak looks sustainable",
              body: "Fox's LFI of 67 is driven by stable usage (31.2%), increased minutes, and efficient shot creation against average-quality opponents. Shot quality metrics remain consistent — this isn't luck-driven.",
            },
            {
              title: "Tonight: PHX pace forces MIA into uncomfortable territory",
              body: "Phoenix plays at 102.4 pace, 4th fastest in the league. Miami's defense drops from 4th to 18th in efficiency when pace exceeds 100. Style Clash Engine flags this as a key factor.",
            },
          ].map((insight) => (
            <div
              key={insight.title}
              className="rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent/30"
            >
              <h3 className="text-sm font-semibold text-text-primary">{insight.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-text-secondary">{insight.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
