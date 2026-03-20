import { cn } from "@/lib/utils";
import type { StreakLabel } from "@/lib/types";
import { STREAK_DISPLAY } from "@/lib/types";

interface StreakTagProps {
  label: StreakLabel;
  score?: number;
}

const colorMap: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  amber: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  rose: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  blue: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  slate: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

export function StreakTag({ label, score }: StreakTagProps) {
  if (label === "neutral") return null;

  const display = STREAK_DISPLAY[label];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
        colorMap[display.color]
      )}
    >
      {display.text}
      {score !== undefined && (
        <span className="font-stat text-[10px] opacity-70">LFI {Math.round(score)}</span>
      )}
    </span>
  );
}
