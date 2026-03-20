import { MetricCard } from "@/components/metrics/metric-card";
import { StreakTag } from "@/components/metrics/streak-tag";

const player = {
  id: 5,
  name: "Jayson Tatum",
  team: "BOS",
  position: "SF",
  number: "0",
  height: "6'8\"",
  weight: "210 lbs",
  age: 28,
  experience: "7th season",
  college: "Duke",
  status: "Active",
  nextGame: "vs LAL — Mar 19",
  seasonStats: {
    ppg: 27.2, rpg: 8.1, apg: 4.8, spg: 1.1, bpg: 0.7,
    fgPct: ".472", fg3Pct: ".371", ftPct: ".855", tsPct: ".602",
    usg: "29.8%", per: 24.8, bpm: 6.1, vorp: 4.2,
  },
  metrics: {
    bis: { score: 82, confidence: 0.88, trend: 1.5, label: "Elite" },
    rda: { score: 76, confidence: 0.82, trend: 0.5, label: "High-Burden Star" },
    drs: { score: 65, confidence: 0.75, trend: -0.8, label: "Solid" },
    lfi: { score: 68, confidence: 0.80, trend: 5.3, label: undefined },
    sps: { score: 74, confidence: 0.70, trend: 0, label: "Versatile Starter" },
    goi: { score: 58, confidence: 0.60, trend: 1.2, label: undefined },
  },
  streak: "hot_likely_real" as const,
  projection: {
    game: "vs LAL — Mar 19",
    mai: { score: 62, label: "Slight Advantage" },
    pts: "27 (23-31)",
    reb: "8 (6-10)",
    ast: "5 (3-7)",
    keyFactor: "Favorable size matchup, LAL B2B fatigue",
  },
  explanation: `Tatum's BIS of 82 reflects elite two-way impact, placing him in the 94th percentile among all active players. His RDA of 76 confirms a high-difficulty offensive role — 42% of shots unassisted, heavy late-clock creation burden, and significant defensive attention.

LFI is elevated at 68, driven by TS% up 4.2% over last 10 games against average-quality defense. Streak classified as "likely real" due to stable usage (29.8%) and consistent minutes (35.2 MPG).

Defensive Reality Score of 65 ("Solid") is above average for his position but below elite — primary value is on-ball containment and switchability rather than rim deterrence.`,
};

export default function PlayerDetailPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-[#007A33] text-2xl font-bold text-white">
          {player.number}
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{player.name}</h1>
          <p className="text-sm text-text-secondary">
            {player.position} — {player.team} — #{player.number}
          </p>
          <p className="text-xs text-text-muted">
            {player.height} {player.weight} | {player.experience} | {player.college}
          </p>
          <div className="mt-2">
            <StreakTag label={player.streak} score={player.metrics.lfi.score} />
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(player.metrics).map(([key, m]) => (
          <MetricCard
            key={key}
            metricKey={key}
            score={m.score}
            confidence={m.confidence}
            trend={m.trend}
            label={m.label}
          />
        ))}
      </div>

      {/* Season Stats */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Season Averages
        </h2>
        <div className="mt-3 grid grid-cols-5 gap-4 sm:grid-cols-7 lg:grid-cols-14">
          {Object.entries(player.seasonStats).map(([key, val]) => (
            <div key={key}>
              <p className="text-xs text-text-muted">{key.toUpperCase()}</p>
              <p className="font-stat text-lg font-bold">{val}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming Projection */}
        <section className="rounded-xl border border-accent/30 bg-accent/5 p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-accent">
            Upcoming Projection
          </h2>
          <p className="mt-1 text-xs text-text-muted">{player.projection.game}</p>

          <div className="mt-3 flex items-center gap-4">
            <div>
              <p className="text-xs text-text-muted">MAI</p>
              <p className="font-stat text-2xl font-bold text-accent">{player.projection.mai.score}</p>
              <p className="text-xs text-text-secondary">{player.projection.mai.label}</p>
            </div>
            <div className="h-12 w-px bg-border" />
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-text-muted">PTS</p>
                <p className="font-stat text-sm font-bold">{player.projection.pts}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">REB</p>
                <p className="font-stat text-sm font-bold">{player.projection.reb}</p>
              </div>
              <div>
                <p className="text-xs text-text-muted">AST</p>
                <p className="font-stat text-sm font-bold">{player.projection.ast}</p>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-text-secondary">
            Key: {player.projection.keyFactor}
          </p>
        </section>

        {/* Rolling Trends Placeholder */}
        <section className="rounded-xl border border-border bg-surface p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
            Rolling Trends
          </h2>
          <div className="flex gap-2 mt-2">
            {[3, 5, 10, 20].map((w) => (
              <button
                key={w}
                className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                  w === 10
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-text-secondary"
                }`}
              >
                Last {w}
              </button>
            ))}
          </div>
          <div className="mt-4 flex h-40 items-center justify-center rounded-lg border border-dashed border-border text-sm text-text-muted">
            Chart: Rolling 10-game PTS/REB/AST trends
          </div>
        </section>
      </div>

      {/* Explanation */}
      <section className="rounded-xl border border-border bg-surface p-5">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-text-secondary">
          Evaluation Explanation
        </h2>
        <div className="mt-3 space-y-3">
          {player.explanation.split("\n\n").map((paragraph, i) => (
            <p key={i} className="text-sm leading-relaxed text-text-secondary">
              {paragraph}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
