import { cn } from "@/lib/utils";

interface WinProbBarProps {
  homeProb: number;
  homeLabel: string;
  awayLabel: string;
  homeColor?: string;
  awayColor?: string;
}

export function WinProbBar({
  homeProb,
  homeLabel,
  awayLabel,
  homeColor = "bg-accent",
  awayColor = "bg-slate-600",
}: WinProbBarProps) {
  const homePct = Math.round(homeProb * 100);
  const awayPct = 100 - homePct;

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs font-medium">
        <span className="text-text-secondary">
          {homeLabel}{" "}
          <span className="font-stat text-text-primary">{homePct}%</span>
        </span>
        <span className="text-text-secondary">
          <span className="font-stat text-text-primary">{awayPct}%</span>{" "}
          {awayLabel}
        </span>
      </div>
      <div className="flex h-2 overflow-hidden rounded-full bg-border">
        <div
          className={cn("transition-all duration-500", homeColor)}
          style={{ width: `${homePct}%` }}
        />
        <div
          className={cn("transition-all duration-500", awayColor)}
          style={{ width: `${awayPct}%` }}
        />
      </div>
    </div>
  );
}
