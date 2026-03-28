import type { Metadata } from "next";
import { METRIC_LABELS, CONFIDENCE_LABELS } from "@/lib/constants";
import { GlassCard } from "@/components/ui/glass-card";

export const metadata: Metadata = {
  title: "Methodology | CourtVision AI",
  description:
    "How CourtVision's proprietary NBA metrics work — BIS, DRS, LFI, OIQ, PEM, and GOI explained.",
  openGraph: {
    title: "Methodology | CourtVision AI",
    description:
      "How CourtVision's proprietary NBA metrics work — BIS, DRS, LFI, OIQ, PEM, and GOI explained.",
    siteName: "CourtVision AI",
    url: "https://courtvisionai.io/methodology",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Methodology | CourtVision AI",
    description:
      "How CourtVision's proprietary NBA metrics work — BIS, DRS, LFI, OIQ, PEM, and GOI explained.",
  },
};
import { BookOpen, Layers, Shield, Activity, Clock, AlertTriangle, BarChart3, Target } from "lucide-react";

// Extended metric info with formulas, inputs, and tier descriptions
const PLAYER_METRIC_DETAILS: Record<string, { inputs: string; formula: string; tiers: string; example?: string }> = {
  bis: {
    inputs: "PER, BPM, VORP, WS/48, plus/minus data, usage rate",
    formula: "Weighted composite: 30% BPM + 25% VORP-adjusted + 20% WS/48 + 15% PER + 10% on/off differential. Normalized to 0-100 scale.",
    tiers: "90+ Elite MVP-tier | 75-89 All-Star caliber | 60-74 Quality starter | 45-59 Rotation player | <45 Below-average impact",
    example: "Jokic (BIS 85): Elite across all impact metrics — highest BPM, top-3 VORP, exceptional on/off swing.",
  },
  lfi: {
    inputs: "Last 5/10/15 game windows of PPG, FG%, plus/minus, usage trends",
    formula: "Rolling z-scores across 3 windows (5g, 10g, 15g) weighted 50/30/20. Streak classification via bayesian regression to filter noise.",
    tiers: "70+ Scorching hot, sustained | 55-69 Above-baseline form | 45-54 Normal fluctuation | 30-44 Cold stretch | <30 Deep slump",
  },
  drs: {
    inputs: "DBPM, steal/block rates, opponent FG% at rim, team DRTG on/off splits",
    formula: "40% DBPM + 25% on/off DRTG differential + 20% opponent shot quality impact + 15% steal+block volume adjusted for position.",
    tiers: "75+ Elite defender, moves the needle | 60-74 Plus defender | 45-59 Neutral | <45 Negative defensive value",
  },
  rda: {
    inputs: "Usage rate, assist ratio, pull-up vs catch-and-shoot split, creation frequency, TS% under high usage",
    formula: "Usage-adjusted efficiency: TS% × usage-difficulty multiplier. Higher scores = maintaining efficiency at high creation burden.",
    tiers: "80+ Creates AND converts at elite level | 65-79 High-burden, good efficiency | 50-64 Moderate role, solid | <50 Low creation or poor under volume",
  },
  sps: {
    inputs: "On/off with various lineups, teammate quality adjusted metrics, role versatility index",
    formula: "How much value persists when teammates change. Low variance across lineup contexts = high portability.",
    tiers: "75+ Value holds everywhere (franchise cornerstone) | 55-74 Mostly portable | <55 System-dependent or narrow role",
  },
  goi: {
    inputs: "Off-ball scoring frequency, gravity metrics (opponent help rate), screen assists, hockey assists",
    formula: "Off-ball points + teammate efficiency lift when player is on-court without the ball. Adjusted for minutes and role.",
    tiers: "70+ Elite off-ball value (spacing god) | 50-69 Positive off-ball impact | <50 Ball-dominant or limited off-ball",
  },
};

const TEAM_METRIC_DETAILS: Record<string, { inputs: string; formula: string; tiers: string }> = {
  tsc: {
    inputs: "Win%, top-5 player BIS, roster depth (BIS of players 6-10), SOS adjustment",
    formula: "35% win-pct-adjusted + 30% top-player-composite + 20% roster-depth + 15% SOS-adjusted net rating.",
    tiers: "80+ Championship contender | 65-79 Playoff team | 50-64 Fringe playoff | <50 Rebuilding",
  },
  ltfi: {
    inputs: "Last 5/10/15 game team record, point differential trend, home/away splits",
    formula: "Rolling team form: weighted game results with recency bias. Recent blowout wins count more than close losses.",
    tiers: "70+ Surging, on a run | 55-69 Playing well | 45-54 Baseline | <45 Struggling stretch",
  },
  lss: {
    inputs: "5-man lineup net ratings, minutes-weighted lineup combos, spacing metrics",
    formula: "Minutes-weighted average of top-8 lineup net ratings, penalized for over-reliance on one lineup.",
    tiers: "70+ Deep, versatile rotations | 55-69 Solid lineup options | <55 Limited or untested combinations",
  },
  pts: {
    inputs: "Playoff experience, crunch-time metrics, half-court offense efficiency, defensive switchability",
    formula: "50% half-court offense rating + 25% defensive scheme versatility + 15% experience factor + 10% crunch-time performance.",
    tiers: "75+ Built for playoffs | 55-74 Should translate | <55 Regular-season dependent",
  },
  drs_team: {
    inputs: "Top player's share of team value, backup quality, injury history, clutch dependency",
    formula: "Gap between team performance with vs without best player, adjusted for backup quality. Higher = MORE risk.",
    tiers: "75+ Extremely dependent (fragile) | 55-74 Moderate dependency | <55 Well-distributed (resilient)",
  },
  rp: {
    inputs: "Player skill overlaps, positional redundancy, shot-type distribution",
    formula: "Penalizes teams where multiple high-usage players operate in same zones. Lower = less redundancy (better).",
    tiers: "75+ Heavy overlap (poor construction) | 50-74 Some redundancy | <50 Well-diversified roster",
  },
};

const playerMetrics = ["bis", "lfi", "drs", "rda", "sps", "goi"];
const teamMetrics = ["tsc", "ltfi", "lss", "pts", "drs_team", "rp"];

export default function MethodologyPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-10 animate-fade-in">
      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent rounded-3xl" />
        <div className="relative px-1 py-2">
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Methodology</h1>
          <p className="mt-3 text-[14px] leading-relaxed text-text-secondary max-w-2xl">
            CourtVision uses a layered metric architecture where no single number
            captures basketball truth. Each metric measures a specific dimension of
            value, and composite projections blend them with context-aware weighting.
            Everything is designed to be explainable and transparent about uncertainty.
          </p>
        </div>
      </div>

      {/* Philosophy */}
      <GlassCard variant="accent" padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-4 w-4 text-blue-400" />
          <h2 className="text-lg font-bold">Design Philosophy</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
          {[
            "No single basketball metric captures truth — we use multiple lenses.",
            "Existing advanced metrics are inputs, not gospel.",
            "Context matters: role, matchup, teammates, system, fatigue, form.",
            "Season averages are too slow — we track rolling windows.",
            "We evaluate both level (how good) and velocity (how trending).",
            "Ranges and confidence bands matter more than fake precision.",
            "Every output must be explainable.",
          ].map((point) => (
            <div key={point} className="flex items-start gap-2.5 rounded-xl bg-white/[0.02] px-3.5 py-2.5">
              <div className="h-1.5 w-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <span className="text-[13px] text-text-secondary">{point}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Rolling Windows */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="h-4 w-4 text-indigo-400" />
          <h2 className="text-lg font-bold">Rolling Windows</h2>
        </div>
        <p className="text-[13px] text-text-secondary mb-4">
          Season averages mask what's happening <em>now</em>. CourtVision uses three overlapping rolling windows
          to balance recency with stability:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { window: "5 Games", weight: "50%", desc: "Captures hot/cold streaks and immediate form changes. High signal, high noise." },
            { window: "10 Games", weight: "30%", desc: "Smooths single-game variance. Detects sustained performance shifts." },
            { window: "15 Games", weight: "20%", desc: "Baseline stabilizer. Separates real trends from small-sample flukes." },
          ].map((w) => (
            <div key={w.window} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <div className="flex items-center justify-between mb-2">
                <span className="font-stat text-sm font-bold text-indigo-400">{w.window}</span>
                <span className="text-[10px] font-bold text-text-muted/60 uppercase">Weight: {w.weight}</span>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">{w.desc}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Player Metrics — Expanded */}
      <section>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Layers className="h-4 w-4 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold">Player Metrics</h2>
          <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-stat text-text-muted">
            {playerMetrics.length} metrics
          </span>
        </div>
        <div className="space-y-4 stagger-children">
          {playerMetrics.map((key) => {
            const info = METRIC_LABELS[key];
            const details = PLAYER_METRIC_DETAILS[key];
            if (!info) return null;
            return (
              <GlassCard key={key} padding="md">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-stat text-sm font-bold text-blue-400 bg-blue-500/10 rounded-lg px-2.5 py-1 border border-blue-500/15">
                    {info.short}
                  </span>
                  <span className="text-[14px] font-semibold text-text-primary">{info.name}</span>
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">{info.description}</p>

                {details && (
                  <div className="space-y-2.5 pt-2 border-t border-white/[0.04]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/60">Inputs</span>
                      <p className="text-[12px] text-text-muted mt-0.5">{details.inputs}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/60">Formula</span>
                      <p className="text-[12px] text-text-muted mt-0.5">{details.formula}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/60">Scoring Tiers</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {details.tiers.split(" | ").map((tier) => (
                          <span key={tier} className="text-[10px] text-text-muted bg-white/[0.03] border border-white/[0.04] px-2 py-0.5 rounded">
                            {tier}
                          </span>
                        ))}
                      </div>
                    </div>
                    {details.example && (
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400/60">Example</span>
                        <p className="text-[12px] text-text-muted mt-0.5 italic">{details.example}</p>
                      </div>
                    )}
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Team Metrics — Expanded */}
      <section>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="h-4 w-4 text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold">Team Metrics</h2>
          <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] font-stat text-text-muted">
            {teamMetrics.length} metrics
          </span>
        </div>
        <div className="space-y-4 stagger-children">
          {teamMetrics.map((key) => {
            const info = METRIC_LABELS[key];
            const details = TEAM_METRIC_DETAILS[key];
            if (!info) return null;
            return (
              <GlassCard key={key} padding="md">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="font-stat text-sm font-bold text-emerald-400 bg-emerald-500/10 rounded-lg px-2.5 py-1 border border-emerald-500/15">
                    {info.short}
                  </span>
                  <span className="text-[14px] font-semibold text-text-primary">{info.name}</span>
                </div>
                <p className="text-[13px] text-text-secondary leading-relaxed mb-3">{info.description}</p>

                {details && (
                  <div className="space-y-2.5 pt-2 border-t border-white/[0.04]">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">Inputs</span>
                      <p className="text-[12px] text-text-muted mt-0.5">{details.inputs}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">Formula</span>
                      <p className="text-[12px] text-text-muted mt-0.5">{details.formula}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/60">Scoring Tiers</span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {details.tiers.split(" | ").map((tier) => (
                          <span key={tier} className="text-[10px] text-text-muted bg-white/[0.03] border border-white/[0.04] px-2 py-0.5 rounded">
                            {tier}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Projection System */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Target className="h-4 w-4 text-indigo-400" />
          <h2 className="text-lg font-bold">Game Projection System</h2>
        </div>
        <p className="text-[13px] text-text-secondary mb-4">
          CourtVision generates win probabilities and projected scores for every game using a multi-factor model:
        </p>
        <div className="space-y-2 stagger-children">
          {[
            { label: "Elo Rating", desc: "FiveThirtyEight-style power rating, updated after every game with margin-of-victory adjustment. Best single predictor of future wins.", weight: "40%" },
            { label: "Rolling Efficiency", desc: "Point-in-time ORTG/DRTG from last 15 games (weighted-recency). 70% rolling / 30% season blend prevents overfitting.", weight: "25%" },
            { label: "Home Court", desc: "Team-specific home advantage derived from home vs away win rate differential. Ranges 1-6 pts (not flat 3.2).", weight: "15%" },
            { label: "Rest & B2Bs", desc: "Back-to-back teams penalized -4 pts. Rest advantage computed from days between games for each team.", weight: "8%" },
            { label: "Injury Impact", desc: "Star players (BIS 75+) missing = -3.5 pts. Starters (BIS 55+) missing = -1.5 pts. Capped at -12 total.", weight: "7%" },
            { label: "CourtVision Metrics", desc: "TSC differential (0.15 pts/point) and LTFI momentum (0.08 pts/point) for roster quality and form.", weight: "5%" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-3 rounded-xl bg-white/[0.02] px-4 py-3">
              <span className="text-[10px] font-bold text-indigo-400/70 w-10 shrink-0">{item.weight}</span>
              <div>
                <span className="text-[13px] font-semibold text-text-primary">{item.label}</span>
                <p className="text-[11px] text-text-muted mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Confidence Framework */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="h-4 w-4 text-text-secondary" />
          <h2 className="text-lg font-bold">Confidence Framework</h2>
        </div>
        <p className="text-[13px] text-text-secondary mb-5">
          Every metric includes a confidence score (0.0-1.0) that reflects data quality,
          sample size, and input availability.
        </p>
        <div className="space-y-2 stagger-children">
          {Object.entries(CONFIDENCE_LABELS).map(([level, desc]) => (
            <div key={level} className="flex items-center gap-4 rounded-xl bg-white/[0.02] px-4 py-3">
              <span className={`w-20 rounded-full px-2.5 py-1 text-center text-[10px] font-bold uppercase tracking-wider border ${
                level === "high" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                level === "moderate" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                level === "low" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                "bg-rose-500/10 text-rose-400 border-rose-500/20"
              }`}>
                {level}
              </span>
              <span className="text-[13px] text-text-secondary">{desc}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Data Sources */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-4 w-4 text-text-secondary" />
          <h2 className="text-lg font-bold">Data Sources & Refresh</h2>
        </div>
        <div className="space-y-2 stagger-children">
          {[
            { label: "Full refresh", desc: "Nightly at 4:00 AM ET — all stats, metrics, and rolling windows", color: "blue" },
            { label: "Pregame refresh", desc: "2 hours before each tip-off — projections and injury adjustments", color: "emerald" },
            { label: "Postgame reconciliation", desc: "1 hour after final — results ingested, accuracy tracked", color: "amber" },
            { label: "Injury updates", desc: "Every 30 minutes during active hours", color: "rose" },
          ].map((item) => (
            <div key={item.label} className="flex items-start gap-3 rounded-xl bg-white/[0.02] px-4 py-3">
              <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                item.color === "blue" ? "bg-blue-400" :
                item.color === "emerald" ? "bg-emerald-400" :
                item.color === "amber" ? "bg-amber-400" :
                "bg-rose-400"
              }`} />
              <div>
                <span className="text-[13px] font-semibold text-text-primary">{item.label}:</span>{" "}
                <span className="text-[13px] text-text-secondary">{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Limitations */}
      <GlassCard padding="lg">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <h2 className="text-lg font-bold">Known Limitations</h2>
        </div>
        <div className="space-y-2 stagger-children">
          {[
            "Tracking data (defender distance, contest quality) may not be available for all players.",
            "Early-season metrics (first 20 games) carry lower confidence.",
            "Lineup data requires minimum minutes thresholds for stability.",
            "Injury impacts are estimated from historical patterns, not medical evaluations.",
            "Projections are probabilistic ranges — they are not predictions of exact outcomes.",
            "All models contain irreducible uncertainty. Basketball is inherently unpredictable.",
          ].map((point) => (
            <div key={point} className="flex items-start gap-2.5 rounded-xl bg-white/[0.02] px-4 py-3">
              <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
              <span className="text-[13px] text-text-secondary">{point}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
