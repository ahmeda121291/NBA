"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TickerGame {
  gameId: string;
  status: "scheduled" | "live" | "final";
  period: number;
  gameClock: string;
  minutesRemaining: number;
  homeTeam: { teamId: number; triCode: string; name: string; score: number; record: string };
  awayTeam: { teamId: number; triCode: string; name: string; score: number; record: string };
  homeWinProb: number;
  awayWinProb: number;
}

function getTeamLogo(triCode: string) {
  // NBA team tricode to team ID mapping for logo URLs
  const map: Record<string, number> = {
    ATL: 1610612737, BOS: 1610612738, BKN: 1610612751, CHA: 1610612766,
    CHI: 1610612741, CLE: 1610612739, DAL: 1610612742, DEN: 1610612743,
    DET: 1610612765, GSW: 1610612744, HOU: 1610612745, IND: 1610612754,
    LAC: 1610612746, LAL: 1610612747, MEM: 1610612763, MIA: 1610612748,
    MIL: 1610612749, MIN: 1610612750, NOP: 1610612740, NYK: 1610612752,
    OKC: 1610612760, ORL: 1610612753, PHI: 1610612755, PHX: 1610612756,
    POR: 1610612757, SAC: 1610612758, SAS: 1610612759, TOR: 1610612761,
    UTA: 1610612762, WAS: 1610612764,
  };
  const id = map[triCode] || 1610612737;
  return `https://cdn.nba.com/logos/nba/${id}/primary/L/logo.svg`;
}

function periodLabel(period: number, status: string): string {
  if (status === "final") return "Final";
  if (status === "scheduled") return "";
  if (period <= 4) return `Q${period}`;
  return `OT${period - 4}`;
}

function WinProbBar({ homeProb, awayProb, isLive }: { homeProb: number; awayProb: number; isLive: boolean }) {
  const homeWidth = Math.round(homeProb * 100);
  const awayWidth = 100 - homeWidth;

  return (
    <div className="flex h-[3px] w-full rounded-full overflow-hidden mt-1">
      <div
        className="h-full transition-all duration-1000"
        style={{
          width: `${awayWidth}%`,
          background: awayProb > homeProb
            ? (isLive ? "rgba(239,68,68,0.7)" : "rgba(129,140,248,0.5)")
            : "rgba(128,148,176,0.15)",
        }}
      />
      <div
        className="h-full transition-all duration-1000"
        style={{
          width: `${homeWidth}%`,
          background: homeProb > awayProb
            ? (isLive ? "rgba(16,185,129,0.7)" : "rgba(129,140,248,0.5)")
            : "rgba(128,148,176,0.15)",
        }}
      />
    </div>
  );
}

export function LiveTicker() {
  const [games, setGames] = useState<TickerGame[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasLive = games.some((g) => g.status === "live");

  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function fetchLive() {
      try {
        const resp = await fetch("/api/live", { cache: "no-store" });
        if (resp.ok) {
          const data = await resp.json();
          setGames(data.games || []);
        }
      } catch {} finally {
        setLoading(false);
      }
    }

    fetchLive();
    // Poll every 30s if live games, 5min otherwise
    interval = setInterval(fetchLive, hasLive ? 30_000 : 300_000);
    return () => clearInterval(interval);
  }, [hasLive]);

  function scrollLeft() {
    scrollRef.current?.scrollBy({ left: -240, behavior: "smooth" });
  }
  function scrollRight() {
    scrollRef.current?.scrollBy({ left: 240, behavior: "smooth" });
  }

  if (loading || games.length === 0) return null;

  return (
    <div className="relative bg-[#0d1017] border-b border-white/[0.04] select-none">
      {/* Scroll buttons */}
      <button
        onClick={scrollLeft}
        className="absolute left-0 top-0 bottom-0 z-10 w-8 flex items-center justify-center bg-gradient-to-r from-[#0d1017] to-transparent hover:from-[#0d1017]/90"
      >
        <ChevronLeft className="h-3.5 w-3.5 text-text-muted/40" />
      </button>
      <button
        onClick={scrollRight}
        className="absolute right-0 top-0 bottom-0 z-10 w-8 flex items-center justify-center bg-gradient-to-l from-[#0d1017] to-transparent hover:from-[#0d1017]/90"
      >
        <ChevronRight className="h-3.5 w-3.5 text-text-muted/40" />
      </button>

      {/* Scrollable ticker */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto scrollbar-none px-8 py-1.5 gap-0"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
      >
        {games.map((g) => {
          const isLive = g.status === "live";
          const isFinal = g.status === "final";
          const homeLeading = g.homeTeam.score > g.awayTeam.score;
          const awayLeading = g.awayTeam.score > g.homeTeam.score;

          return (
            <a
              key={g.gameId}
              href={`/games`}
              className={`flex-shrink-0 w-[200px] px-3 py-1.5 border-r border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                isLive ? "bg-white/[0.01]" : ""
              }`}
            >
              {/* Status line */}
              <div className="flex items-center justify-between mb-1">
                {isLive ? (
                  <span className="flex items-center gap-1 text-[8px] font-bold text-red-400 uppercase tracking-widest">
                    <span className="h-1 w-1 rounded-full bg-red-400 animate-pulse" />
                    {periodLabel(g.period, g.status)} {g.gameClock}
                  </span>
                ) : isFinal ? (
                  <span className="text-[8px] font-bold text-text-muted/40 uppercase tracking-widest">Final</span>
                ) : (
                  <span className="text-[8px] font-bold text-blue-400/50 uppercase tracking-widest">Pre</span>
                )}
                {/* Live win prob percentage */}
                {(isLive || isFinal) && (
                  <span className="text-[8px] font-stat text-text-muted/30">
                    {Math.round(Math.max(g.homeWinProb, g.awayWinProb) * 100)}%
                  </span>
                )}
              </div>

              {/* Away team */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="relative h-3.5 w-3.5 shrink-0">
                    <Image src={getTeamLogo(g.awayTeam.triCode)} alt={g.awayTeam.triCode} fill className="object-contain" unoptimized />
                  </div>
                  <span className={`text-[11px] font-semibold ${
                    isFinal && awayLeading ? "text-text-primary" :
                    isLive && awayLeading ? "text-text-primary" :
                    "text-text-muted/60"
                  }`}>
                    {g.awayTeam.triCode}
                  </span>
                </div>
                <span className={`font-stat text-[12px] font-bold ${
                  isFinal && awayLeading ? "text-text-primary" :
                  isLive && awayLeading ? "text-emerald-400" :
                  (isLive || isFinal) ? "text-text-muted/50" :
                  "text-text-muted/30"
                }`}>
                  {(isLive || isFinal) ? g.awayTeam.score : "—"}
                </span>
              </div>

              {/* Home team */}
              <div className="flex items-center justify-between mt-0.5">
                <div className="flex items-center gap-1.5">
                  <div className="relative h-3.5 w-3.5 shrink-0">
                    <Image src={getTeamLogo(g.homeTeam.triCode)} alt={g.homeTeam.triCode} fill className="object-contain" unoptimized />
                  </div>
                  <span className={`text-[11px] font-semibold ${
                    isFinal && homeLeading ? "text-text-primary" :
                    isLive && homeLeading ? "text-text-primary" :
                    "text-text-muted/60"
                  }`}>
                    {g.homeTeam.triCode}
                  </span>
                </div>
                <span className={`font-stat text-[12px] font-bold ${
                  isFinal && homeLeading ? "text-text-primary" :
                  isLive && homeLeading ? "text-emerald-400" :
                  (isLive || isFinal) ? "text-text-muted/50" :
                  "text-text-muted/30"
                }`}>
                  {(isLive || isFinal) ? g.homeTeam.score : "—"}
                </span>
              </div>

              {/* Win probability bar */}
              {(isLive || isFinal) && (
                <WinProbBar homeProb={g.homeWinProb} awayProb={g.awayWinProb} isLive={isLive} />
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
