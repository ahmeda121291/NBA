// ============================================================
// CourtVision — Shared Formatting Utilities
// ============================================================
// Single source of truth for tier classes, streak badges, and
// number formatting used across all pages and components.

import type { ReactNode } from "react";

// ---- Tier Styling ----

/** Returns the CSS class for a metric score tier (uses globals.css stat-glow-* classes) */
export function tierClass(score: number | null): string {
  if (score == null || score === 0) return "text-text-muted";
  if (score >= 80) return "stat-glow-elite";
  if (score >= 65) return "stat-glow-high";
  if (score >= 50) return "stat-glow-mid";
  return "stat-glow-low";
}

/** Returns the tier label text for a score (0-99 scale) */
export function tierLabel(score: number | null): string {
  if (score == null || score === 0) return "N/A";
  if (score >= 80) return "Elite";
  if (score >= 65) return "Great";
  if (score >= 50) return "Good";
  if (score >= 35) return "Average";
  if (score >= 20) return "Below Avg";
  return "Poor";
}

/** Returns the metric-tier-N border class for cards */
export function tierBorder(score: number | null): string {
  if (!score) return "";
  if (score >= 80) return "metric-tier-1";
  if (score >= 65) return "metric-tier-2";
  if (score >= 50) return "metric-tier-3";
  if (score >= 35) return "metric-tier-4";
  return "metric-tier-5";
}

// ---- Number Helpers ----

/** Safely convert any value to number or null */
export function num(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** Format a number to fixed decimals, or "—" if null */
export function fmt(v: unknown, decimals = 1): string {
  if (v == null) return "—";
  const n = Number(v);
  return isNaN(n) ? "—" : n.toFixed(decimals);
}

/** Format a 0-1 fraction as a percentage string, or "—" if null */
export function pct(v: unknown, decimals = 1): string {
  if (v == null) return "—";
  const n = Number(v);
  return isNaN(n) ? "—" : (n * 100).toFixed(decimals);
}

// ---- Consistency / Reliability ----

export interface ConsistencyInfo {
  label: string;
  shortLabel: string;
  cls: string;       // badge CSS (bg + text + border)
  dotCls: string;    // just the text/dot color
}

/**
 * Given the standard deviation of a player's per-game pts over recent logs,
 * returns the consistency tier. Lower stddev = more consistent.
 * Thresholds tuned to NBA scoring distributions (~15-30 PPG starters).
 */
export function consistencyInfo(stddev: number | null, logCount: number | null): ConsistencyInfo {
  if (stddev == null || (logCount != null && logCount < 5)) {
    return { label: "N/A", shortLabel: "—", cls: "text-text-muted/40", dotCls: "text-text-muted/40" };
  }
  if (stddev < 4) {
    return { label: "Rock Solid", shortLabel: "SOLID", cls: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20", dotCls: "text-emerald-400" };
  }
  if (stddev < 7) {
    return { label: "Steady", shortLabel: "STEADY", cls: "text-sky-400 bg-sky-500/10 border-sky-500/20", dotCls: "text-sky-400" };
  }
  if (stddev < 11) {
    return { label: "Streaky", shortLabel: "STREAKY", cls: "text-amber-400 bg-amber-500/10 border-amber-500/20", dotCls: "text-amber-400" };
  }
  return { label: "Boom or Bust", shortLabel: "VOLATILE", cls: "text-rose-400 bg-rose-500/10 border-rose-500/20", dotCls: "text-rose-400" };
}

/** Convert pts_stddev to a 0-100 reliability score (100 = most consistent) */
export function consistencyScore(stddev: number | null): number | null {
  if (stddev == null) return null;
  // stddev 0 → 100, stddev 4 → 72, stddev 8 → 44, stddev 12 → 16
  return Math.max(0, Math.round(100 - stddev * 7));
}

// ---- Streak Badges ----

export interface StreakBadgeInfo {
  text: string;
  cls: string;
}

export const STREAK_BADGE_MAP: Record<string, StreakBadgeInfo> = {
  hot_likely_real: { text: "HOT — Real", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  hot_fragile: { text: "HOT — Fragile", cls: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  hot_opponent_driven: { text: "HOT — Opp Driven", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  cold_real: { text: "COLD", cls: "bg-rose-500/10 text-rose-400 border-rose-500/20" },
  cold_bouncing_back: { text: "Bouncing Back", cls: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  stable: { text: "Stable", cls: "bg-white/[0.04] text-text-muted border-white/[0.08]" },
  breakout_role_expansion: { text: "BREAKOUT", cls: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20" },
};

/** Returns streak badge CSS info, or null for empty labels */
export function getStreakBadge(label: string | null): StreakBadgeInfo | null {
  if (!label) return null;
  return STREAK_BADGE_MAP[label] ?? { text: label, cls: "bg-white/[0.04] text-text-muted border-white/[0.08]" };
}
