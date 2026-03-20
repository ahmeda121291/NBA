import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ConfidenceLevel, StatRange } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Metric Helpers ---

export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return "high";
  if (confidence >= 0.6) return "moderate";
  if (confidence >= 0.4) return "low";
  return "very_low";
}

export function getMetricColor(score: number): string {
  if (score >= 80) return "text-emerald-400";
  if (score >= 65) return "text-blue-400";
  if (score >= 50) return "text-amber-400";
  if (score >= 35) return "text-orange-400";
  return "text-rose-400";
}

export function getMetricBgColor(score: number): string {
  if (score >= 80) return "bg-emerald-500/15 border-emerald-500/30";
  if (score >= 65) return "bg-blue-500/15 border-blue-500/30";
  if (score >= 50) return "bg-amber-500/15 border-amber-500/30";
  if (score >= 35) return "bg-orange-500/15 border-orange-500/30";
  return "bg-rose-500/15 border-rose-500/30";
}

export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case "high":
      return "text-emerald-400";
    case "moderate":
      return "text-blue-400";
    case "low":
      return "text-amber-400";
    case "very_low":
      return "text-rose-400";
  }
}

export function formatStatRange(range: StatRange): string {
  return `${range.center} (${range.low}-${range.high})`;
}

export function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`;
}

export function formatWinProb(prob: number): string {
  return `${Math.round(prob * 100)}%`;
}

export function formatScore(score: number): string {
  return score.toFixed(0);
}

export function formatTrend(delta: number): { text: string; direction: "up" | "down" | "flat" } {
  if (Math.abs(delta) < 0.5) return { text: "—", direction: "flat" };
  if (delta > 0) return { text: `+${delta.toFixed(1)}`, direction: "up" };
  return { text: delta.toFixed(1), direction: "down" };
}

// --- Date Helpers ---

export function formatGameDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatGameTime(timeStr: string): string {
  const date = new Date(timeStr);
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

export function isToday(dateStr: string): boolean {
  const date = new Date(dateStr);
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

// --- Injury Status ---

export function getInjuryStatusColor(status: string): string {
  switch (status) {
    case "out":
      return "text-rose-400 bg-rose-500/15";
    case "doubtful":
      return "text-orange-400 bg-orange-500/15";
    case "questionable":
      return "text-amber-400 bg-amber-500/15";
    case "probable":
      return "text-blue-400 bg-blue-500/15";
    default:
      return "text-emerald-400 bg-emerald-500/15";
  }
}

export function getInjuryStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

// --- General ---

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}
