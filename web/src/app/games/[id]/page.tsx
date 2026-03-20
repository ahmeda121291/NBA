import { WinProbBar } from "@/components/shared/win-prob-bar";

// Placeholder — will be fetched from API
const game = {
  id: 1,
  time: "7:00 PM ET",
  date: "Mar 19, 2026",
  arena: "TD Garden",
  home: { abbr: "BOS", name: "Celtics", record: "42-20", tsc: 78, ltfi: 68 },
  away: { abbr: "LAL", name: "Lakers", record: "35-28", tsc: 65, ltfi: 52 },
  projection: {
    winner: "BOS",
    homeProb: 0.58,
    projScoreHome: "114",
    projScoreAway: "108",
    scoreRange: 6,
    pace: 100.2,
    confidence: 0.72,
    margin: 6,
    upsetRisk: "low" as const,
    keyReasons: [
      "BOS home court advantage (+3.8 pts)",
      "LAL on second night of back-to-back",
      "BOS stronger recent form (LTFI 68 vs 52)",
      "If AD plays, gap narrows to ~52% BOS",
    ],
  },
  styleClash: [
    { factor: "Pace", home: 101.4, away: 99.1, edge: "BOS", note: "BOS tempo likely" },
    { factor: "Paint scoring", home: 44.8, away: 52.1, edge: "LAL", note: "LAL paint advantage" },
    { factor: "3PT rate", home: 0.392, away: 0.34, edge: "BOS", note: "BOS perimeter volume" },
    { factor: "Transition", home: 16.1, away: 14.2, edge: "BOS", note: "BOS fast break edge" },
  ],
  injuries: [
    { player: "Anthony Davis", team: "LAL", status: "Questionable", impact: "-3.2 net rating if out" },
  ],
  matchups: [
    { away: "LeBron James", home: "Jayson Tatum", maiAway: 48, label: "Neutral" },
    { away: "Austin Reaves", home: "Derrick White", maiAway: 55, label: "Slight edge Reaves" },
    { away: "Anthony Davis", home: "Kristaps Porzingis", maiAway: 52, label: "Neutral" },
  ],
  projectedStats: [
    { name: "Jayson Tatum", team: "BOS", min: 36, pts: "27 (23-31)", reb: "8 (6-10)", ast: "5 (3-7)", usg: "30.1%" },
    { name: "Jaylen Brown", team: "BOS", min: 35, pts: "23 (19-27)", reb: "5 (3-7)", ast: "3 (2-5)", usg: "25.4%" },
    { name: "LeBron James", team: "LAL", min: 35, pts: "25 (21-29)", reb: "7 (5-9)", ast: "7 (5-9)", usg: "28.8%" },
    { name: "Anthony Davis", team: "LAL", min: 34, pts: "24 (20-28)", reb: "10 (8-13)", ast: "3 (2-5)", usg: "26.5%" },
    { name: "Kristaps Porzingis", team: "BOS", min: 30, pts: "19 (15-23)", reb: "7 (5-9)", ast: "2 (1-3)", usg: "21.2%" },
    { name: "Derrick White", team: "BOS", min: 32, pts: "15 (11-19)", reb: "4 (2-6)", ast: "4 (2-6)", usg: "18.5%" },
  ],
};

export default function GameDetailPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <p className="text-sm text-text-muted">
          {game.date} — {game.time} — {game.arena}
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {game.away.abbr} @ {game.home.abbr}
        </h1>
      </div>

      {/* Projection Hero */}
      <div className="rounded-xl border border-accent/30 bg-accent/5 p-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-accent">Projected Winner</span>
          <span className="text-2xl font-bold">{game.projection.winner}</span>
          <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-text-secondary">
            {game.projection.confidence >= 0.7 ? "High" : "Moderate"} confidence
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-text-muted">Win Probability</p>
            <div className="mt-1">
              <WinProbBar
                homeProb={game.projection.homeProb}
                homeLabel={game.home.abbr}
                awayLabel={game.away.abbr}
              />
            </div>
          </div>
          <div>
            <p className="text-xs text-text-muted">Projected Score</p>
            <p className="font-stat text-xl font-bold">
              {game.projection.projScoreAway}-{game.projection.projScoreHome}
              <span className="ml-1 text-sm text-text-muted">(±{game.projection.scoreRange})</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-text-muted">Projected Pace</p>
            <p className="font-stat text-xl font-bold">{game.projection.pace}</p>
          </div>
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-text-secondary">Key Factors</p>
          <ul className="mt-1 space-y-1">
            {game.projection.keyReasons.map((reason) => (
              <li key={reason} className="text-sm text-text-secondary">
                • {reason}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Style Clash */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Style Clash
          </h2>
          <div className="mt-3 space-y-3">
            {game.styleClash.map((item) => (
              <div key={item.factor} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-24 text-xs text-text-muted">{item.factor}</span>
                  <span className="font-stat text-sm">{game.away.abbr} {item.away}</span>
                </div>
                <span className="text-xs text-text-muted">vs</span>
                <div className="flex items-center gap-3">
                  <span className="font-stat text-sm">{item.home} {game.home.abbr}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      item.edge === game.home.abbr
                        ? "bg-accent/15 text-accent"
                        : "bg-amber-500/15 text-amber-400"
                    }`}
                  >
                    {item.note}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Injury Impact */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Injury Impact
          </h2>
          {game.injuries.length > 0 ? (
            <div className="mt-3 space-y-3">
              {game.injuries.map((inj) => (
                <div
                  key={inj.player}
                  className="flex items-center justify-between rounded-lg bg-background p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{inj.player}</p>
                    <p className="text-xs text-text-muted">{inj.team}</p>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                      {inj.status}
                    </span>
                    <p className="mt-1 text-xs text-text-muted">{inj.impact}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-text-muted">No significant injuries affecting this game.</p>
          )}
        </section>
      </div>

      {/* Key Player Matchups */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Key Player Matchups
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {game.matchups.map((m) => (
            <div key={m.away} className="rounded-lg bg-background p-4 text-center">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{m.away}</span>
                <span className="text-xs text-text-muted">vs</span>
                <span className="text-sm font-medium">{m.home}</span>
              </div>
              <div className="mt-2">
                <span className="font-stat text-lg font-bold text-accent">{m.maiAway}</span>
                <span className="ml-1 text-xs text-text-muted">MAI</span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">{m.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Projected Stat Lines */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Projected Stat Lines
        </h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-text-muted">
                <th className="pb-2 pr-4">Player</th>
                <th className="pb-2 pr-4">Team</th>
                <th className="pb-2 pr-4 text-right">MIN</th>
                <th className="pb-2 pr-4 text-right">PTS</th>
                <th className="pb-2 pr-4 text-right">REB</th>
                <th className="pb-2 pr-4 text-right">AST</th>
                <th className="pb-2 text-right">USG</th>
              </tr>
            </thead>
            <tbody>
              {game.projectedStats.map((player) => (
                <tr key={player.name} className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-medium">{player.name}</td>
                  <td className="pr-4 text-text-muted">{player.team}</td>
                  <td className="pr-4 text-right font-stat">{player.min}</td>
                  <td className="pr-4 text-right font-stat">{player.pts}</td>
                  <td className="pr-4 text-right font-stat">{player.reb}</td>
                  <td className="pr-4 text-right font-stat">{player.ast}</td>
                  <td className="text-right font-stat text-text-secondary">{player.usg}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Model Explanation */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Model Explanation
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-text-secondary">
          BOS is favored primarily due to home court advantage (+3.8 pts), LAL&apos;s
          back-to-back fatigue penalty, and BOS&apos;s stronger recent form (LTFI 68 vs 52).
          However, confidence is moderate — if AD plays, the gap narrows to ~52% BOS.
          LAL&apos;s paint dominance could disrupt BOS if Porzingis is in foul trouble. The
          pace projection of 100.2 slightly favors BOS who play better at higher tempo.
          Key swing factor: Anthony Davis&apos;s availability and foul trouble for Porzingis.
        </p>
      </section>
    </div>
  );
}
