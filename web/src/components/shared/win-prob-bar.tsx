import { cn } from "@/lib/utils";

interface WinProbBarProps {
  homeProb: number;
  homeLabel: string;
  awayLabel: string;
  homeColor?: string;
  awayColor?: string;
  size?: "sm" | "md" | "lg";
}

export function WinProbBar({
  homeProb,
  homeLabel,
  awayLabel,
  homeColor = "from-blue-500 to-blue-400",
  awayColor = "from-slate-600 to-slate-500",
  size = "md",
}: WinProbBarProps) {
  const homePct = Math.round(homeProb * 100);
  const awayPct = 100 - homePct;

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-text-secondary">
          {homeLabel}{" "}
          <span className="font-stat font-bold text-text-primary">{homePct}%</span>
        </span>
        <span className="text-text-secondary">
          <span className="font-stat font-bold text-text-primary">{awayPct}%</span>{" "}
          {awayLabel}
        </span>
      </div>
      <div className={cn(
        "flex overflow-hidden rounded-full bg-white/[0.04]",
        size === "sm" && "h-1.5",
        size === "md" && "h-2.5",
        size === "lg" && "h-3.5",
      )}>
        <div
          className={cn(
            "bg-gradient-to-r transition-all duration-700 ease-out rounded-l-full animate-bar-fill",
            homeColor
          )}
          style={{ width: `${homePct}%` }}
        />
        <div
          className={cn(
            "bg-gradient-to-r transition-all duration-700 ease-out rounded-r-full",
            awayColor
          )}
          style={{ width: `${awayPct}%` }}
        />
      </div>
    </div>
  );
}
