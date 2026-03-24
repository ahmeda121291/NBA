"use client";

import { cn } from "@/lib/utils";

interface ScoreOrbProps {
  score: number;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

function getOrbColor(score: number) {
  if (score >= 80) return { ring: "#10b981", glow: "rgba(16, 185, 129, 0.2)", text: "text-emerald-400" };
  if (score >= 65) return { ring: "#3b82f6", glow: "rgba(59, 130, 246, 0.2)", text: "text-blue-400" };
  if (score >= 50) return { ring: "#f59e0b", glow: "rgba(245, 158, 11, 0.2)", text: "text-amber-400" };
  if (score >= 35) return { ring: "#f97316", glow: "rgba(249, 115, 22, 0.2)", text: "text-orange-400" };
  return { ring: "#f43f5e", glow: "rgba(244, 63, 94, 0.2)", text: "text-rose-400" };
}

export function ScoreOrb({ score, size = "md", label, className }: ScoreOrbProps) {
  const color = getOrbColor(score);
  const pct = Math.min(score / 100, 1);
  const circumference = 2 * Math.PI * 42;
  const strokeDashoffset = circumference * (1 - pct);

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const textSizes = {
    sm: "text-lg",
    md: "text-3xl",
    lg: "text-4xl",
  };

  return (
    <div className={cn("relative inline-flex flex-col items-center", className)}>
      <div className={cn("relative", sizeClasses[size])}>
        <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
          {/* Background ring */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke="rgba(26, 39, 68, 0.4)"
            strokeWidth="6"
          />
          {/* Score ring */}
          <circle
            cx="50"
            cy="50"
            r="42"
            fill="none"
            stroke={color.ring}
            strokeWidth="6"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 6px ${color.glow})`,
            }}
          />
        </svg>
        {/* Center number */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={cn("font-stat font-bold", textSizes[size], color.text)}>
            {Math.round(score)}
          </span>
        </div>
      </div>
      {label && (
        <span className="mt-1 text-xs font-medium text-text-secondary">{label}</span>
      )}
    </div>
  );
}
