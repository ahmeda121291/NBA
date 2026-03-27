"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import Image from "next/image";
import { GlassCard } from "@/components/ui/glass-card";
import { RadarChart } from "@/components/ui/radar-chart";
import { ScoreOrb } from "@/components/ui/score-orb";
import { MetricTooltip } from "@/components/shared/metric-tooltip";
import { Search, X, User, Filter, Trophy, Download } from "lucide-react";
import { toPng } from "html-to-image";
import { getPlayerHeadshotUrl, getTeamLogoByAbbr } from "@/lib/nba-data";
import { tierClass, num } from "@/lib/formatting";

interface PlayerOption {
  id: number;
  full_name: string;
  position: string | null;
  external_id: number | null;
  team_abbr: string;
  bis_score: number | null;
}

const POSITIONS = ["All", "PG", "SG", "SF", "PF", "C"];

function PlayerSearch({ onSelect, selected, slot, color }: {
  onSelect: (id: number) => void;
  selected: any;
  slot: number;
  color: string;
}) {
  const [query, setQuery] = useState("");
  const [posFilter, setPosFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch whenever query or posFilter changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setLoading(true);
      const params = new URLSearchParams();
      if (query) params.set("q", query);
      if (posFilter !== "All") params.set("pos", posFilter);
      fetch(`/api/players?${params}`)
        .then((r) => r.json())
        .then((json) => setPlayers(json.players ?? []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 150);
  }, [query, posFilter]);

  const displayed = players.slice(0, 40);

  return (
    <GlassCard className="relative" style={{ borderColor: open ? `${color}30` : undefined }}>
      {/* Search input */}
      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder={selected ? `Change player ${slot}…` : `Search player ${slot}…`}
          className="w-full border-0 border-b border-[rgba(129,140,248,0.12)] bg-transparent pl-9 pr-10 py-2.5 text-[13px] font-mono text-text-primary placeholder-text-muted/50 focus:border-[rgba(129,140,248,0.5)] focus:outline-none transition-all"
        />
        <button
          onClick={() => { setShowFilters(!showFilters); setOpen(true); }}
          className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${showFilters ? "text-indigo-400" : "text-text-muted/40 hover:text-text-muted"}`}
        >
          <Filter className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Position filter chips */}
      {showFilters && (
        <div className="flex flex-wrap items-center gap-1 mb-3">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              onClick={() => { setPosFilter(pos); setOpen(true); }}
              className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider transition-all rounded-sm ${
                posFilter === pos
                  ? "bg-[rgba(129,140,248,0.1)] text-indigo-400 border border-[rgba(129,140,248,0.2)]"
                  : "text-text-muted/50 border border-transparent hover:text-text-muted"
              }`}
            >
              {pos}
            </button>
          ))}
        </div>
      )}

      {/* Results dropdown */}
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div
            className="absolute left-0 right-0 z-30 border border-[rgba(129,140,248,0.15)] max-h-72 overflow-y-auto rounded-md"
            style={{ top: showFilters ? "86px" : "54px", background: "rgba(10, 14, 26, 0.99)" }}
          >
            {loading && (
              <div className="px-4 py-3 text-[11px] text-text-muted/40">Loading…</div>
            )}
            {!loading && displayed.length === 0 && (
              <div className="px-4 py-3 text-[11px] text-text-muted/40">No players found</div>
            )}
            {!loading && displayed.map((p) => (
              <button
                key={p.id}
                onClick={() => { onSelect(p.id); setQuery(""); setOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-[rgba(129,140,248,0.06)] transition-colors border-b border-white/[0.03] last:border-0"
              >
                <div className="relative h-8 w-8 rounded-sm overflow-hidden bg-white/[0.04] shrink-0">
                  {p.external_id ? (
                    <Image
                      src={getPlayerHeadshotUrl(Number(p.external_id))}
                      alt={p.full_name}
                      fill
                      className="object-cover object-top scale-[1.3] translate-y-[1px]"
                      unoptimized
                    />
                  ) : (
                    <User className="h-4 w-4 m-auto text-text-muted/20" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-text-primary truncate">{p.full_name}</p>
                  <p className="text-[10px] text-text-muted/60">{p.team_abbr} · {p.position ?? "—"}</p>
                </div>
                {p.bis_score != null && (
                  <span className={`font-stat text-[11px] font-bold shrink-0 ${tierClass(Number(p.bis_score))}`}>
                    {Number(p.bis_score).toFixed(0)}
                  </span>
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Selected player display */}
      {selected ? (
        <div className="text-center mt-2">
          <button
            onClick={() => { onSelect(0); setQuery(""); }}
            className="absolute top-3 right-3 text-text-muted/30 hover:text-rose-400 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
          <div className="flex justify-center mb-3">
            <div
              className="relative h-20 w-20 rounded-lg overflow-hidden bg-white/[0.04] border"
              style={{ borderColor: `${color}30` }}
            >
              <Image
                src={getPlayerHeadshotUrl(Number(selected.external_id))}
                alt={selected.full_name}
                fill
                className="object-cover object-top scale-[1.4] translate-y-[2px]"
                unoptimized
              />
            </div>
          </div>
          <p className="text-lg font-bold">{selected.full_name}</p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <div className="relative h-4 w-4">
              <Image src={getTeamLogoByAbbr(selected.team_abbr)} alt={selected.team_abbr} fill className="object-contain" unoptimized />
            </div>
            <span className="text-[11px] text-text-muted">{selected.team_abbr} · {selected.position}</span>
          </div>
          <div className="mt-3">
            <ScoreOrb score={num(selected.bis_score) ?? 0} size="sm" label="BIS" />
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div
            className="h-14 w-14 rounded-full border-2 border-dashed mx-auto mb-3 flex items-center justify-center"
            style={{ borderColor: `${color}30` }}
          >
            <User className="h-6 w-6" style={{ color: `${color}50` }} />
          </div>
          <p className="text-[12px] text-text-muted/50">Click to search or browse</p>
          <p className="text-[10px] text-text-muted/30 mt-1">Top players shown by default</p>
        </div>
      )}
    </GlassCard>
  );
}

function buildVerdict(p1: any, p2: any): { headline: string; paragraphs: string[]; p1Wins: number; p2Wins: number } {
  const n = (k: string, p: any) => num(p[`${k}_score`]) ?? 0;
  const metricKeys = ["bis", "rda", "drs", "lfi", "sps", "goi"];

  const bis1 = n("bis", p1); const bis2 = n("bis", p2);
  const oiq1 = n("rda", p1); const oiq2 = n("rda", p2);
  const drs1 = n("drs", p1); const drs2 = n("drs", p2);
  const lfi1 = n("lfi", p1); const lfi2 = n("lfi", p2);
  const pem1 = n("sps", p1); const pem2 = n("sps", p2);
  const goi1 = n("goi", p1); const goi2 = n("goi", p2);

  const ppg1 = num(p1.ppg) ?? 0; const ppg2 = num(p2.ppg) ?? 0;
  const apg1 = num(p1.apg) ?? 0; const apg2 = num(p2.apg) ?? 0;
  const rpg1 = num(p1.rpg) ?? 0; const rpg2 = num(p2.rpg) ?? 0;
  const fg1 = (num(p1.fg_pct) ?? 0) * 100; const fg2 = (num(p2.fg_pct) ?? 0) * 100;
  const fg3_1 = (num(p1.fg3_pct) ?? 0) * 100; const fg3_2 = (num(p2.fg3_pct) ?? 0) * 100;
  const ft1 = (num(p1.ft_pct) ?? 0) * 100; const ft2 = (num(p2.ft_pct) ?? 0) * 100;

  const p1Wins = metricKeys.filter((k) => n(k, p1) > n(k, p2)).length;
  const p2Wins = metricKeys.filter((k) => n(k, p2) > n(k, p1)).length;

  const w = bis1 >= bis2 ? p1 : p2;
  const l = bis1 >= bis2 ? p2 : p1;
  const bisW = Math.max(bis1, bis2); const bisL = Math.min(bis1, bis2);
  const margin = bisW - bisL;

  const fn1 = p1.full_name; const fn2 = p2.full_name;
  const ln1 = fn1.split(" ").slice(1).join(" ") || fn1;
  const ln2 = fn2.split(" ").slice(1).join(" ") || fn2;
  const wLn = w.full_name.split(" ").slice(1).join(" ") || w.full_name;
  const lLn = l.full_name.split(" ").slice(1).join(" ") || l.full_name;

  // Headline
  let headline: string;
  if (margin < 3) {
    headline = "Too close to call";
  } else if (margin < 8) {
    headline = `${wLn} has the edge`;
  } else if (margin < 18) {
    headline = `${wLn} wins this one`;
  } else {
    headline = `${wLn} is a clear tier above`;
  }

  const paragraphs: string[] = [];

  // P1: Overall picture
  if (margin < 3) {
    paragraphs.push(
      `${fn1} and ${fn2} are essentially identical on paper — their BIS scores (${bis1.toFixed(0)} vs ${bis2.toFixed(0)}) sit within statistical noise. ` +
      `Both are winning ${p1Wins} metric categories apiece, meaning there's no clear edge anywhere across CourtVision's six analytical dimensions. ` +
      `In a matchup this tight, context matters more than the numbers: roster fit, style of play, and role are going to be the actual deciding factors.`
    );
  } else {
    const winsStr = `${Math.max(p1Wins, p2Wins)}-${Math.min(p1Wins, p2Wins)} across six CourtVision metrics`;
    if (margin < 8) {
      paragraphs.push(
        `${w.full_name} takes this comparison, but it's far from a blowout. ${wLn} edges out ${lLn} ${winsStr} and carries a BIS of ${bisW.toFixed(0)} vs ${bisL.toFixed(0)} — a gap that's real but not conclusive. ` +
        `If you're building a roster, ${wLn} is the more complete player right now, but ${lLn} brings enough value that the argument is still worth having.`
      );
    } else if (margin < 18) {
      paragraphs.push(
        `${w.full_name} wins this matchup with a BIS of ${bisW.toFixed(0)} compared to ${lLn}'s ${bisL.toFixed(0)} — a ${margin.toFixed(0)}-point gap that CourtVision considers meaningful. ` +
        `${wLn} wins ${winsStr}, demonstrating broader dominance rather than strength in just one area. ` +
        `${lLn} is a quality player, but right now ${wLn} is operating at a higher level across the board.`
      );
    } else {
      paragraphs.push(
        `This isn't close. ${w.full_name}'s BIS of ${bisW.toFixed(0)} puts ${wLn} in a different tier from ${lLn} (${bisL.toFixed(0)}), a ${margin.toFixed(0)}-point gulf that reflects systematic dominance rather than one-stat padding. ` +
        `${wLn} wins ${winsStr} and the gap in several categories is wide enough to be decisive on its own. ` +
        `For context, a BIS difference of 15+ typically separates All-Star-caliber players from rotation contributors.`
      );
    }
  }

  // P2: Offensive profile
  const offWinner = (ppg1 + apg1 * 1.5) >= (ppg2 + apg2 * 1.5) ? p1 : p2;
  const offLn = offWinner === p1 ? ln1 : ln2;
  const offOppLn = offWinner === p1 ? ln2 : ln1;
  const offPpg = offWinner === p1 ? ppg1 : ppg2;
  const offApp = offWinner === p1 ? apg1 : apg2;
  const defPpg = offWinner === p1 ? ppg2 : ppg1;
  const defApp = offWinner === p1 ? apg2 : apg1;
  const offOiq = offWinner === p1 ? oiq1 : oiq2;
  const defOiq = offWinner === p1 ? oiq2 : oiq1;
  const offPem = offWinner === p1 ? pem1 : pem2;
  const defPem = offWinner === p1 ? pem2 : pem1;

  let offPara = `**Offensively**, ${offLn} is the more dangerous creator — ${offPpg.toFixed(1)} PPG and ${offApp.toFixed(1)} APG vs ${defPpg.toFixed(1)}/${defApp.toFixed(1)} for ${offOppLn}. `;
  if (Math.abs(oiq1 - oiq2) > 8) {
    offPara += `The OIQ gap (${offOiq.toFixed(0)} vs ${defOiq.toFixed(0)}) reinforces this: ${offLn} is reading defenses and making the right play at a higher rate. `;
  }
  if (Math.abs(pem1 - pem2) > 8) {
    offPara += `PEM — which captures playmaking efficiency beyond raw assist numbers — favors ${offLn} by ${Math.abs(offPem - defPem).toFixed(0)} points (${offPem.toFixed(0)} vs ${defPem.toFixed(0)}). `;
  }
  if (Math.abs(fg1 - fg2) > 3) {
    const efWinner = fg1 > fg2 ? ln1 : ln2;
    const efVal = Math.max(fg1, fg2); const efOpp = Math.min(fg1, fg2);
    offPara += `${efWinner} is also the more efficient scorer, converting at ${efVal.toFixed(1)}% from the field vs ${efOpp.toFixed(1)}%.`;
  }
  if (Math.abs(fg3_1 - fg3_2) > 4) {
    const thrWinner = fg3_1 > fg3_2 ? ln1 : ln2;
    const thrVal = Math.max(fg3_1, fg3_2).toFixed(1); const thrOpp = Math.min(fg3_1, fg3_2).toFixed(1);
    offPara += ` From three, ${thrWinner} is noticeably sharper (${thrVal}% vs ${thrOpp}%), which adds a spacing dimension that compounds over a full game.`;
  }
  paragraphs.push(offPara);

  // P3: Defensive profile
  const drsGap = Math.abs(drs1 - drs2);
  const defWinner = drs1 > drs2 ? p1 : p2;
  const defLn = defWinner === p1 ? ln1 : ln2;
  const defOppLn = defWinner === p1 ? ln2 : ln1;
  const defDrs = Math.max(drs1, drs2); const oppDrs = Math.min(drs1, drs2);

  let defPara = `**Defensively**, `;
  if (drsGap < 5) {
    defPara += `these two are evenly matched — DRS scores of ${drs1.toFixed(0)} and ${drs2.toFixed(0)} indicate similar defensive output. Neither player jumps out as a switchable stopper or liability on this end.`;
  } else if (drsGap < 15) {
    defPara += `${defLn} holds a moderate edge (DRS ${defDrs.toFixed(0)} vs ${oppDrs.toFixed(0)}). It's not a massive gap, but it's consistent enough to show in real games — ${defLn} is getting more stops and forcing more mistakes over the course of a season.`;
  } else {
    defPara += `this is where the gap really opens up. ${defLn}'s DRS of ${defDrs.toFixed(0)} vs ${defOppLn}'s ${oppDrs.toFixed(0)} is a significant defensive disparity. `;
    if (defDrs > 75) {
      defPara += `A DRS above 75 puts ${defLn} in elite-defender territory — they're generating real stops, not just avoiding mistakes.`;
    } else {
      defPara += `${defLn} is protecting the paint, contesting shots, and limiting secondaries in a way ${defOppLn} simply isn't matching.`;
    }
  }
  paragraphs.push(defPara);

  // P4: Form & momentum
  const lfiGap = Math.abs(lfi1 - lfi2);
  const formWinner = lfi1 > lfi2 ? p1 : p2;
  const formLn = formWinner === p1 ? ln1 : ln2;
  const formOppLn = formWinner === p1 ? ln2 : ln1;
  const formVal = Math.max(lfi1, lfi2); const formOpp = Math.min(lfi1, lfi2);

  let formPara = `**Recent form (LFI)**: `;
  if (lfiGap < 5) {
    formPara += `Both players are trending at a similar trajectory right now — LFI scores of ${lfi1.toFixed(0)} and ${lfi2.toFixed(0)} show no significant momentum divergence. Neither is running especially hot or cold.`;
  } else if (lfiGap < 15) {
    formPara += `${formLn} is playing slightly better basketball right now (LFI ${formVal.toFixed(0)} vs ${formOpp.toFixed(0)}). The gap isn't massive, but it suggests ${formLn} has a bit more wind in the sails heading into any near-term matchup.`;
  } else {
    formPara += `${formLn} is the hotter player by a clear margin — LFI of ${formVal.toFixed(0)} vs ${formOpp.toFixed(0)} is a meaningful form gap. `;
    if (formVal > 75) {
      formPara += `An LFI above 75 signals a genuine hot streak, not a blip. ${formLn} is playing some of the best basketball of the season right now.`;
    } else {
      formPara += `${formOppLn}'s lower LFI warrants monitoring — whether it's fatigue, injury management, or a rough stretch, the drop-off in recent games is real.`;
    }
  }
  paragraphs.push(formPara);

  // P5: Clutch / impact
  const goiGap = Math.abs(goi1 - goi2);
  const clutchWinner = goi1 > goi2 ? p1 : p2;
  const clutchLn = clutchWinner === p1 ? ln1 : ln2;
  const clutchOppLn = clutchWinner === p1 ? ln2 : ln1;
  const clutchVal = Math.max(goi1, goi2); const clutchOpp = Math.min(goi1, goi2);

  let clutchPara = `**Game-changing impact (GOI)**: `;
  if (goiGap < 5) {
    clutchPara += `Nearly identical clutch profiles — ${goi1.toFixed(0)} vs ${goi2.toFixed(0)}. Both players are bringing similar levels of high-leverage impact when games are on the line.`;
  } else {
    clutchPara += `${clutchLn} is the more game-changing presence at ${clutchVal.toFixed(0)} vs ${clutchOppLn}'s ${clutchOpp.toFixed(0)}. `;
    if (clutchVal > 70) {
      clutchPara += `A GOI above 70 marks a player who genuinely moves the needle in close games — the kind of player a coaching staff builds late-game sets around.`;
    } else {
      clutchPara += `It's not a franchise-altering gap, but in playoff-style situations where every possession matters, this difference will show.`;
    }
  }
  paragraphs.push(clutchPara);

  // P6: Bottom line
  let bottomLine = `**Bottom line**: `;
  if (margin < 3) {
    bottomLine += `Pick whichever fits your system. Metrics can't separate them — scheme and chemistry will.`;
  } else {
    const teamFitNote = ppg1 > 25 || ppg2 > 25 ? ` Both carry significant usage, so roster construction matters — you'd want to build around whoever you choose.` : "";
    bottomLine += `${w.full_name} is the call here, and it's not just one area — it's across the board. `;
    if (margin >= 18) {
      bottomLine += `At this level of BIS separation, it's genuinely hard to make the case for ${lLn} unless there's a specific positional or contract reason.${teamFitNote}`;
    } else {
      bottomLine += `That said, ${lLn} is not a bad player — this is a comparison between two quality contributors, and the loser in this matchup would start on plenty of rosters.${teamFitNote}`;
    }
  }
  paragraphs.push(bottomLine);

  return { headline, paragraphs, p1Wins, p2Wins };
}

function VerdictParagraph({ text }: { text: string }) {
  // Render **bold** segments inline
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className="text-[12px] text-text-secondary leading-relaxed">
      {parts.map((part, i) =>
        part.startsWith("**") && part.endsWith("**") ? (
          <span key={i} className="font-semibold text-text-primary">{part.slice(2, -2)}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </p>
  );
}

export default function ComparePage() {
  const [player1, setPlayer1] = useState<any>(null);
  const [player2, setPlayer2] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const compareRef = useRef<HTMLDivElement>(null);
  const hasComparison = player1 && player2;

  const metricKeys = ["bis", "rda", "drs", "lfi", "sps", "goi"];
  const metricLabels = ["BIS", "OIQ", "DRS", "LFI", "PEM", "GOI"];

  const statComparisons = [
    { key: "ppg", label: "PPG" },
    { key: "rpg", label: "RPG" },
    { key: "apg", label: "APG" },
    { key: "spg", label: "SPG" },
    { key: "bpg", label: "BPG" },
    { key: "fg_pct", label: "FG%", isPct: true },
    { key: "fg3_pct", label: "3P%", isPct: true },
    { key: "ft_pct", label: "FT%", isPct: true },
    { key: "mpg", label: "MPG" },
  ];

  const loadPlayer = useCallback(async (id: number, slot: 1 | 2) => {
    if (id === 0) {
      if (slot === 1) setPlayer1(null);
      else setPlayer2(null);
      return;
    }
    setLoading(true);
    try {
      const other = slot === 1 ? player2?.id : player1?.id;
      const p1Id = slot === 1 ? id : (other ?? id);
      const p2Id = slot === 2 ? id : (other ?? id);
      const res = await fetch(`/api/compare?p1=${p1Id}&p2=${p2Id}`);
      const json = await res.json();
      if (slot === 1) setPlayer1(json.player1);
      else setPlayer2(json.player2);
      // If both are now loaded, refresh both
      if (other) {
        if (slot === 1) setPlayer2(json.player2);
        else setPlayer1(json.player1);
      }
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  }, [player1?.id, player2?.id]);

  const verdict = useMemo(() => {
    if (!hasComparison) return null;
    return buildVerdict(player1, player2);
  }, [hasComparison, player1, player2]);

  const handleDownload = useCallback(async () => {
    if (!compareRef.current) return;
    try {
      const dataUrl = await toPng(compareRef.current, { backgroundColor: "#0a0e1a", pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `courtvision-compare-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) { console.error(err); }
  }, []);

  const radarDatasets: any[] = [];
  if (player1) {
    radarDatasets.push({
      label: player1.full_name,
      data: metricKeys.map((k) => num(player1[`${k}_score`]) ?? 0),
      color: "#818cf8",
    });
  }
  if (player2) {
    radarDatasets.push({
      label: player2.full_name,
      data: metricKeys.map((k) => num(player2[`${k}_score`]) ?? 0),
      color: "#f0a500",
    });
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Compare</h1>
        <p className="text-sm text-text-muted mt-1">Side-by-side player evaluation — filter by position and metrics</p>
      </div>

      {/* Player selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PlayerSearch onSelect={(id) => loadPlayer(id, 1)} selected={player1} slot={1} color="#818cf8" />
        <PlayerSearch onSelect={(id) => loadPlayer(id, 2)} selected={player2} slot={2} color="#f0a500" />
      </div>

      {!hasComparison && (
        <div className="text-center py-12">
          <User className="h-10 w-10 text-text-muted/15 mx-auto mb-3" />
          <p className="text-sm text-text-muted/50">Select two players to compare</p>
          <p className="text-[11px] text-text-muted/30 mt-1.5">Click a search box — top players load instantly</p>
        </div>
      )}

      {loading && (
        <div className="text-center py-4">
          <p className="text-[12px] text-text-muted/40 animate-pulse">Loading player data…</p>
        </div>
      )}

      {hasComparison && verdict && (
        <>
          {/* Verdict */}
          <GlassCard variant="accent">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-400 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">The Verdict</span>
              </div>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1 text-[10px] text-text-muted hover:text-indigo-400 transition-colors border border-white/[0.08] rounded px-2 py-1 shrink-0"
              >
                <Download className="h-3 w-3" /> Download PNG
              </button>
            </div>

            <p className="text-xl font-bold text-text-primary mb-4">{verdict.headline}</p>

            <div className="space-y-3">
              {verdict.paragraphs.map((para, i) => (
                <VerdictParagraph key={i} text={para} />
              ))}
            </div>

            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/[0.06]">
              <span className="text-[10px] text-indigo-400 font-stat font-bold">{player1.full_name.split(" ").pop()}: {verdict.p1Wins} metric wins</span>
              <span className="text-[10px] text-amber-400 font-stat font-bold">{player2.full_name.split(" ").pop()}: {verdict.p2Wins} metric wins</span>
              <span className="text-[10px] text-text-muted/40 font-stat">{6 - verdict.p1Wins - verdict.p2Wins} ties</span>
            </div>
          </GlassCard>

          {/* Downloadable section */}
          <div ref={compareRef}>
            <GlassCard>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-2">Metric Overlay</h2>
              <div className="flex items-center justify-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-indigo-400" />
                  <span className="text-xs text-text-secondary">{player1.full_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-xs text-text-secondary">{player2.full_name}</span>
                </div>
              </div>
              <RadarChart labels={metricLabels} datasets={radarDatasets} maxValue={100} size={300} />
            </GlassCard>

            {/* Metric Comparison Table */}
            <GlassCard>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">CourtVision Metrics</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">
                      <th className="pb-3 text-left">Metric</th>
                      <th className="pb-3 text-right">{player1.full_name.split(" ").pop()}</th>
                      <th className="pb-3 text-center w-24">VS</th>
                      <th className="pb-3 text-left">{player2.full_name.split(" ").pop()}</th>
                      <th className="pb-3 text-right">Edge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metricKeys.map((key, i) => {
                      const v1 = num(player1[`${key}_score`]) ?? 0;
                      const v2 = num(player2[`${key}_score`]) ?? 0;
                      const diff = v1 - v2;
                      const total = v1 + v2 || 1;
                      return (
                        <tr key={key} className="border-b border-white/[0.03] table-row-hover">
                          <td className="py-3 text-[12px] font-medium">
                            <MetricTooltip metricKey={key}>
                              <span className="text-text-secondary">{metricLabels[i]}</span>
                            </MetricTooltip>
                          </td>
                          <td className="py-3 text-right">
                            <span className={`font-stat font-bold ${diff > 0 ? tierClass(v1) : "text-text-muted"}`}>{v1.toFixed(0)}</span>
                          </td>
                          <td className="py-3 px-2">
                            <div className="flex h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                              <div className="h-full rounded-l-full" style={{ width: `${(v1 / total) * 100}%`, background: "#818cf8" }} />
                              <div className="h-full rounded-r-full" style={{ width: `${(v2 / total) * 100}%`, background: "#f0a500" }} />
                            </div>
                          </td>
                          <td className="py-3">
                            <span className={`font-stat font-bold ${diff < 0 ? tierClass(v2) : "text-text-muted"}`}>{v2.toFixed(0)}</span>
                          </td>
                          <td className="py-3 text-right">
                            <span className={`font-stat text-[11px] font-semibold ${
                              diff > 0 ? "text-indigo-400" : diff < 0 ? "text-amber-400" : "text-text-muted"
                            }`}>
                              {diff > 0 ? `+${diff.toFixed(0)}` : diff < 0 ? `+${Math.abs(diff).toFixed(0)}` : "Even"}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            {/* Traditional Stats */}
            <GlassCard>
              <h2 className="text-xs font-semibold uppercase tracking-widest text-text-muted mb-4">Season Stats</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-[10px] uppercase tracking-wider font-semibold text-text-muted/50">
                      <th className="pb-3 text-left">Stat</th>
                      <th className="pb-3 text-right">{player1.full_name.split(" ").pop()}</th>
                      <th className="pb-3 text-right">{player2.full_name.split(" ").pop()}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {statComparisons.map((s) => {
                      const v1 = num(player1[s.key]) ?? 0;
                      const v2 = num(player2[s.key]) ?? 0;
                      const d1 = s.isPct ? (v1 * 100).toFixed(1) : v1.toFixed(1);
                      const d2 = s.isPct ? (v2 * 100).toFixed(1) : v2.toFixed(1);
                      const raw1 = s.isPct ? v1 * 100 : v1;
                      const raw2 = s.isPct ? v2 * 100 : v2;
                      return (
                        <tr key={s.key} className="border-b border-white/[0.03] table-row-hover">
                          <td className="py-3 text-[12px] font-medium text-text-secondary">{s.label}</td>
                          <td className={`py-3 text-right font-stat font-bold ${raw1 > raw2 ? "text-text-primary" : "text-text-muted"}`}>{d1}</td>
                          <td className={`py-3 text-right font-stat font-bold ${raw2 > raw1 ? "text-text-primary" : "text-text-muted"}`}>{d2}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            <div className="text-right py-1">
              <span className="text-[9px] text-text-muted/20 font-stat">courtvisionai.io</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
