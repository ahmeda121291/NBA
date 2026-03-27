"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Check, TrendingUp } from "lucide-react";
import { getTeamLogoByAbbr } from "@/lib/nba-data";

interface PickGame {
  id: number;
  away_abbr: string;
  home_abbr: string;
  away_city: string;
  home_city: string;
  win_prob_home: number;
  proj_score_home: number | null;
  proj_score_away: number | null;
  pick_abbr: string;
  confidence: number | null;
  key_reasons: string[] | null;
}

interface Props {
  games: PickGame[];
  slateDate: string;
}

function confidenceTier(winProb: number): { label: string; cls: string } {
  const edge = Math.abs(winProb - 0.5);
  if (edge >= 0.15) return { label: "STRONG PICK", cls: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" };
  if (edge >= 0.07) return { label: "LEAN", cls: "text-sky-400 border-sky-500/30 bg-sky-500/10" };
  return { label: "COIN FLIP", cls: "text-amber-400 border-amber-500/30 bg-amber-500/10" };
}

export function PicksCard({ games, slateDate }: Props) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const picks = games.filter((g) => g.win_prob_home != null);
  if (picks.length === 0) return null;

  async function handleSave() {
    if (!cardRef.current) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        backgroundColor: "#0d1117",
        pixelRatio: 2,
      });
      const link = document.createElement("a");
      link.download = `courtvision-picks-${slateDate.replace(/\s/g, "-")}.png`;
      link.href = dataUrl;
      link.click();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error("Failed to save image", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-2">
      {/* Card to export */}
      <div ref={cardRef} className="rounded-xl overflow-hidden" style={{ background: "linear-gradient(135deg, #0d1117 0%, #111827 50%, #0f172a 100%)", border: "1px solid rgba(99,102,241,0.2)", padding: "20px" }}>
        {/* Card Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-indigo-400" />
              <span className="text-sm font-bold uppercase tracking-widest" style={{ color: "#818cf8" }}>CourtVision Picks</span>
            </div>
            <p className="text-[11px] mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>{slateDate} slate · {picks.length} game{picks.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="text-right">
            <p className="text-[9px] uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.3)" }}>courtvision.app</p>
          </div>
        </div>

        {/* Picks List */}
        <div className="space-y-2">
          {picks.map((g) => {
            const homeProb = Number(g.win_prob_home);
            const awayProb = 1 - homeProb;
            const favProb = Math.max(homeProb, awayProb);
            const tier = confidenceTier(homeProb);
            const projH = g.proj_score_home ? Math.round(Number(g.proj_score_home)) : null;
            const projA = g.proj_score_away ? Math.round(Number(g.proj_score_away)) : null;

            return (
              <div key={g.id} style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: "8px", padding: "10px 12px" }}>
                <div className="flex items-center gap-3">
                  {/* Away team */}
                  <div className="flex items-center gap-1.5 w-20 shrink-0">
                    <div style={{ position: "relative", height: 20, width: 20 }}>
                      <Image src={getTeamLogoByAbbr(g.away_abbr)} alt={g.away_abbr} fill className="object-contain" unoptimized />
                    </div>
                    <span className="text-[11px] font-bold" style={{ color: g.pick_abbr === g.away_abbr ? "#e2e8f0" : "rgba(148,163,184,0.5)" }}>{g.away_abbr}</span>
                  </div>

                  {/* Score split / bar */}
                  <div className="flex-1 min-w-0">
                    <div style={{ height: 3, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden", marginBottom: 4 }}>
                      <div style={{ height: "100%", width: `${awayProb * 100}%`, background: g.pick_abbr === g.away_abbr ? "#818cf8" : "rgba(148,163,184,0.2)", float: "left" }} />
                      <div style={{ height: "100%", width: `${homeProb * 100}%`, background: g.pick_abbr === g.home_abbr ? "#818cf8" : "rgba(148,163,184,0.2)" }} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[9px]" style={{ color: "rgba(148,163,184,0.4)" }}>
                        {projA && projH ? `${projA}-${projH}` : `${(awayProb * 100).toFixed(0)}-${(homeProb * 100).toFixed(0)}`}
                      </span>
                      <span className={`text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border ${tier.cls}`}>{tier.label}</span>
                    </div>
                  </div>

                  {/* Home team */}
                  <div className="flex items-center gap-1.5 w-20 justify-end shrink-0">
                    <span className="text-[11px] font-bold" style={{ color: g.pick_abbr === g.home_abbr ? "#e2e8f0" : "rgba(148,163,184,0.5)" }}>{g.home_abbr}</span>
                    <div style={{ position: "relative", height: 20, width: 20 }}>
                      <Image src={getTeamLogoByAbbr(g.home_abbr)} alt={g.home_abbr} fill className="object-contain" unoptimized />
                    </div>
                  </div>
                </div>

                {/* Pick label */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span className="text-[9px] uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.3)" }}>Pick:</span>
                  <span className="text-[10px] font-bold" style={{ color: "#818cf8" }}>{g.pick_abbr}</span>
                  <span className="text-[9px] font-stat" style={{ color: "rgba(148,163,184,0.4)" }}>{(favProb * 100).toFixed(0)}%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <span className="text-[8px] uppercase tracking-widest" style={{ color: "rgba(148,163,184,0.2)" }}>Model-generated predictions · not financial advice</span>
          <span className="text-[8px]" style={{ color: "rgba(148,163,184,0.2)" }}>CourtVision</span>
        </div>
      </div>

      {/* Save button — outside the exported card */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="flex items-center gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider rounded border transition-all disabled:opacity-50"
        style={{
          border: "1px solid rgba(99,102,241,0.3)",
          background: "rgba(99,102,241,0.08)",
          color: "#818cf8",
        }}
      >
        {saved ? (
          <>
            <Check className="h-3.5 w-3.5" /> Saved!
          </>
        ) : (
          <>
            <Camera className="h-3.5 w-3.5" /> {saving ? "Saving…" : "Save as Image"}
          </>
        )}
      </button>
    </div>
  );
}
