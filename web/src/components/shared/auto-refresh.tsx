"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";

interface AutoRefreshProps {
  /** Refresh interval in seconds */
  intervalSeconds: number;
  /** Whether auto-refresh is active */
  enabled: boolean;
  /** Label shown next to the indicator */
  label?: string;
}

/**
 * Auto-refreshes the current page via router.refresh() (server components re-render).
 * Shows a subtle indicator with countdown and manual refresh button.
 */
export function AutoRefresh({ intervalSeconds, enabled, label }: AutoRefreshProps) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(intervalSeconds);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!enabled || paused) return;

    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRefreshing(true);
          router.refresh();
          setTimeout(() => setIsRefreshing(false), 1500);
          return intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(tick);
  }, [enabled, paused, intervalSeconds, router]);

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    router.refresh();
    setSecondsLeft(intervalSeconds);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  if (!enabled) return null;

  return (
    <div className="flex items-center gap-2 text-[10px] font-stat text-text-muted/50">
      {label && <span className="uppercase tracking-wider">{label}</span>}
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-sm border border-white/[0.06] bg-white/[0.02]">
        <div className={`h-1.5 w-1.5 rounded-full ${isRefreshing ? "bg-indigo-400 animate-pulse" : "bg-emerald-400/60"}`} />
        <span>{paused ? "Paused" : `${secondsLeft}s`}</span>
        <button
          onClick={handleManualRefresh}
          className="hover:text-indigo-400 transition-colors ml-0.5"
          title="Refresh now"
        >
          <RefreshCw className={`h-2.5 w-2.5 ${isRefreshing ? "animate-spin" : ""}`} />
        </button>
        <button
          onClick={() => setPaused(!paused)}
          className="hover:text-indigo-400 transition-colors"
          title={paused ? "Resume auto-refresh" : "Pause auto-refresh"}
        >
          {paused ? "▶" : "⏸"}
        </button>
      </div>
    </div>
  );
}
