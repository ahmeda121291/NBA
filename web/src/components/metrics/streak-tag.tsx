import { cn } from "@/lib/utils";
import type { StreakLabel } from "@/lib/types";
import { STREAK_DISPLAY } from "@/lib/types";
import { Flame, Snowflake, TrendingUp, Zap } from "lucide-react";

interface StreakTagProps {
  label: StreakLabel;
  score?: number;
  size?: "sm" | "md";
}

const colorMap: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.08)]",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.08)]",
  rose: "bg-rose-500/10 text-rose-400 border-rose-500/20 shadow-[0_0_12px_rgba(244,63,94,0.08)]",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.08)]",
  slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

function getStreakIcon(label: StreakLabel) {
  if (label.startsWith("hot")) return Flame;
  if (label.startsWith("cold")) return Snowflake;
  if (label === "breakout_role_expansion") return TrendingUp;
  return Zap;
}

export function StreakTag({ label, score, size = "md" }: StreakTagProps) {
  if (label === "neutral") return null;

  const display = STREAK_DISPLAY[label];
  const Icon = getStreakIcon(label);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-medium transition-all",
        colorMap[display.color],
        size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-3 py-1 text-xs"
      )}
    >
      <Icon className={cn(size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3")} />
      {display.text}
      {score !== undefined && (
        <span className="font-stat opacity-60 ml-0.5">
          {Math.round(score)}
        </span>
      )}
    </span>
  );
}
