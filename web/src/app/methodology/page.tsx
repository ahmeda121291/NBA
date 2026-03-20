import { METRIC_LABELS, CONFIDENCE_LABELS } from "@/lib/constants";

const playerMetrics = ["bis", "rda", "goi", "drs", "sps", "lfi", "mai", "gip"];
const teamMetrics = ["tsc", "lss", "rp", "pts", "drs_team", "ltfi", "sce", "gop"];

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Methodology</h1>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          CourtVision uses a layered metric architecture where no single number
          captures basketball truth. Each metric measures a specific dimension of
          value, and composite projections blend them with context-aware weighting.
          Everything is designed to be explainable and transparent about uncertainty.
        </p>
      </div>

      {/* Philosophy */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Design Philosophy</h2>
        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
          <li>• No single basketball metric captures truth — we use multiple lenses.</li>
          <li>• Existing advanced metrics are inputs, not gospel.</li>
          <li>• Context matters: role, matchup, teammates, system, fatigue, form.</li>
          <li>• Season averages are too slow — we track rolling windows.</li>
          <li>• We evaluate both level (how good) and velocity (how trending).</li>
          <li>• Ranges and confidence bands matter more than fake precision.</li>
          <li>• Every output must be explainable.</li>
        </ul>
      </section>

      {/* Player Metrics */}
      <section>
        <h2 className="text-lg font-semibold">Player Metrics</h2>
        <div className="mt-4 space-y-4">
          {playerMetrics.map((key) => {
            const info = METRIC_LABELS[key];
            if (!info) return null;
            return (
              <div key={key} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-baseline gap-2">
                  <span className="font-stat text-sm font-bold text-accent">{info.short}</span>
                  <span className="text-sm font-semibold text-text-primary">{info.name}</span>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{info.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Team Metrics */}
      <section>
        <h2 className="text-lg font-semibold">Team Metrics</h2>
        <div className="mt-4 space-y-4">
          {teamMetrics.map((key) => {
            const info = METRIC_LABELS[key];
            if (!info) return null;
            return (
              <div key={key} className="rounded-xl border border-border bg-surface p-5">
                <div className="flex items-baseline gap-2">
                  <span className="font-stat text-sm font-bold text-accent">{info.short}</span>
                  <span className="text-sm font-semibold text-text-primary">{info.name}</span>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{info.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Confidence Framework */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Confidence Framework</h2>
        <p className="mt-2 text-sm text-text-secondary">
          Every metric includes a confidence score (0.0-1.0) that reflects data quality,
          sample size, and input availability.
        </p>
        <div className="mt-4 space-y-3">
          {Object.entries(CONFIDENCE_LABELS).map(([level, desc]) => (
            <div key={level} className="flex items-center gap-3">
              <span className={`w-20 rounded-full px-2.5 py-0.5 text-center text-xs font-medium ${
                level === "high" ? "bg-emerald-500/15 text-emerald-400" :
                level === "moderate" ? "bg-blue-500/15 text-blue-400" :
                level === "low" ? "bg-amber-500/15 text-amber-400" :
                "bg-rose-500/15 text-rose-400"
              }`}>
                {level}
              </span>
              <span className="text-sm text-text-secondary">{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Data Sources */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Data Sources & Refresh</h2>
        <div className="mt-3 space-y-2 text-sm text-text-secondary">
          <p>• <strong>Full refresh:</strong> Nightly at 4:00 AM ET — all stats, metrics, and rolling windows</p>
          <p>• <strong>Pregame refresh:</strong> 2 hours before each tip-off — projections and injury adjustments</p>
          <p>• <strong>Postgame reconciliation:</strong> 1 hour after final — results ingested, accuracy tracked</p>
          <p>• <strong>Injury updates:</strong> Every 30 minutes during active hours</p>
        </div>
      </section>

      {/* Limitations */}
      <section className="rounded-xl border border-border bg-surface p-6">
        <h2 className="text-lg font-semibold">Known Limitations</h2>
        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
          <li>• Tracking data (defender distance, contest quality) may not be available for all players.</li>
          <li>• Early-season metrics (first 20 games) carry lower confidence.</li>
          <li>• Lineup data requires minimum minutes thresholds for stability.</li>
          <li>• Injury impacts are estimated from historical patterns, not medical evaluations.</li>
          <li>• Projections are probabilistic ranges — they are not predictions of exact outcomes.</li>
          <li>• All models contain irreducible uncertainty. Basketball is inherently unpredictable.</li>
        </ul>
      </section>
    </div>
  );
}
