// ============================================================
// CourtVision — AI Scouting Report Generator
// Template-based narrative engine using player metrics & stats
// ============================================================

interface PlayerData {
  full_name: string;
  position: string;
  team_abbr: string;
  team_name: string;
  games_played: number;
  ppg: number;
  rpg: number;
  apg: number;
  spg: number;
  bpg: number;
  topg: number;
  mpg: number;
  fg_pct: number;
  fg3_pct: number;
  ft_pct: number;
  bis_score: number | null;
  bis_percentile: number | null;
  lfi_score: number | null;
  lfi_delta: number | null;
  lfi_streak_label: string | null;
  drs_score: number | null;
  rda_score: number | null;
  sps_score: number | null;
  goi_score: number | null;
}

interface ScoutingReport {
  headline: string;
  sections: { title: string; content: string }[];
  tags: string[];
}

function pctl(score: number): string {
  if (score >= 90) return "elite (top 10%)";
  if (score >= 80) return "excellent (top 20%)";
  if (score >= 70) return "strong (top 30%)";
  if (score >= 60) return "above average";
  if (score >= 50) return "average";
  if (score >= 40) return "below average";
  if (score >= 30) return "limited";
  return "poor";
}

function tier(score: number): "elite" | "great" | "good" | "average" | "below" {
  if (score >= 80) return "elite";
  if (score >= 65) return "great";
  if (score >= 50) return "good";
  if (score >= 35) return "average";
  return "below";
}

function posLabel(pos: string): string {
  const map: Record<string, string> = {
    PG: "point guard", SG: "shooting guard", SF: "small forward",
    PF: "power forward", C: "center", "G": "guard", "F": "forward",
    "G-F": "wing", "F-G": "wing", "F-C": "forward-center", "C-F": "big",
  };
  return map[pos] || "player";
}

function streakNarrative(label: string | null, delta: number | null): string {
  if (!label || !delta) return "";
  const d = Math.abs(delta).toFixed(1);
  const map: Record<string, string> = {
    hot_likely_real: `Currently on a verified hot streak — LFI surged +${d} points, backed by genuine production gains rather than noise.`,
    hot_fragile: `Riding a hot streak (+${d} LFI) that shows some fragility. The elevated production may partly reflect matchup softness or unsustainable shot-making.`,
    hot_opponent_driven: `Recent surge (+${d} LFI) appears largely opponent-driven — production spiked against weaker defenses.`,
    cold_real: `In a confirmed cold stretch, LFI has dropped ${d} points. The decline is broad-based and not just variance.`,
    cold_bouncing_back: `Coming off a cold stretch but showing signs of recovery. LFI dipped ${d} points but underlying indicators are stabilizing.`,
    stable: "Performance has been remarkably stable — no significant deviation from season baseline.",
    breakout_role_expansion: `Experiencing a breakout stretch (+${d} LFI) coinciding with expanded role or usage. This looks like real development.`,
  };
  return map[label] || "";
}

export function generateScoutingReport(player: PlayerData): ScoutingReport {
  const p = player;
  const firstName = p.full_name.split(" ")[0];
  const scores = {
    bis: p.bis_score ? Number(p.bis_score) : null,
    lfi: p.lfi_score ? Number(p.lfi_score) : null,
    drs: p.drs_score ? Number(p.drs_score) : null,
    rda: p.rda_score ? Number(p.rda_score) : null,
    sps: p.sps_score ? Number(p.sps_score) : null,
    goi: p.goi_score ? Number(p.goi_score) : null,
  };

  const ppg = Number(p.ppg);
  const rpg = Number(p.rpg);
  const apg = Number(p.apg);
  const fgPct = (Number(p.fg_pct) * 100);
  const fg3Pct = (Number(p.fg3_pct) * 100);
  const ftPct = (Number(p.ft_pct) * 100);
  const mpg = Number(p.mpg);
  const lfiDelta = p.lfi_delta ? Number(p.lfi_delta) : 0;

  // No metrics → minimal report
  if (!scores.bis) {
    return {
      headline: `${p.full_name} — ${p.team_abbr} ${posLabel(p.position)}`,
      sections: [{
        title: "Overview",
        content: `${p.full_name} is a ${posLabel(p.position)} for the ${p.team_name}, averaging ${ppg.toFixed(1)} PPG, ${rpg.toFixed(1)} RPG, and ${apg.toFixed(1)} APG across ${p.games_played} games. CourtVision metrics are not yet available — insufficient sample size or data.`,
      }],
      tags: [p.position, p.team_abbr],
    };
  }

  const bis = scores.bis!;
  const bisTier = tier(bis);
  const tags: string[] = [p.position, p.team_abbr];

  // === HEADLINE ===
  const headlineMap: Record<string, string> = {
    elite: `${p.full_name} operates at elite level — BIS ${bis.toFixed(0)}`,
    great: `${p.full_name} is a high-impact ${posLabel(p.position)} — BIS ${bis.toFixed(0)}`,
    good: `${p.full_name} is a solid contributor — BIS ${bis.toFixed(0)}`,
    average: `${p.full_name} fills a role for the ${p.team_name} — BIS ${bis.toFixed(0)}`,
    below: `${p.full_name} has limited impact this season — BIS ${bis.toFixed(0)}`,
  };
  const headline = headlineMap[bisTier];

  // === SECTIONS ===
  const sections: { title: string; content: string }[] = [];

  // 1. OVERVIEW
  let overview = `${p.full_name} is a ${posLabel(p.position)} for the ${p.team_name}, carrying a Baseline Impact Score of ${bis.toFixed(0)}`;
  if (p.bis_percentile) {
    overview += ` (${Number(p.bis_percentile).toFixed(0)}th percentile)`;
  }
  overview += `. Across ${p.games_played} games this season, ${firstName} is averaging ${ppg.toFixed(1)} points, ${rpg.toFixed(1)} rebounds, and ${apg.toFixed(1)} assists in ${mpg.toFixed(1)} minutes per game.`;

  if (bisTier === "elite") {
    overview += ` This places him among the league's most impactful players on a per-game basis.`;
  } else if (bisTier === "great") {
    overview += ` He's been a consistent positive-impact player for this ${p.team_name} squad.`;
  }
  sections.push({ title: "Overview", content: overview });

  // 2. CURRENT FORM
  if (scores.lfi !== null) {
    const lfi = scores.lfi!;
    let form = `Live Form Index sits at ${lfi.toFixed(0)}, rated ${pctl(lfi)}.`;
    const streakText = streakNarrative(p.lfi_streak_label, lfiDelta);
    if (streakText) {
      form += ` ${streakText}`;
    } else if (lfiDelta !== 0) {
      const dir = lfiDelta > 0 ? "up" : "down";
      form += ` LFI has moved ${dir} ${Math.abs(lfiDelta).toFixed(1)} points from last snapshot.`;
    }
    if (lfi >= 75 && bis >= 70) {
      form += ` ${firstName} is playing his best basketball right now — both baseline and form are elevated.`;
      tags.push("Hot");
    } else if (lfi >= 70 && bis < 50) {
      form += ` Interestingly, current form significantly exceeds baseline — a potential breakout or hot stretch worth monitoring.`;
      tags.push("Surging");
    } else if (lfi < 40 && bis >= 60) {
      form += ` Current form is well below his season baseline — could be a buy-low window or sign of fatigue.`;
      tags.push("Cold");
    }
    sections.push({ title: "Current Form", content: form });
  }

  // 3. OFFENSIVE PROFILE
  let offense = "";
  if (scores.rda !== null) {
    const rda = scores.rda!;
    offense += `Role Difficulty Adjustment: ${rda.toFixed(0)} (${pctl(rda)}). `;
    if (rda >= 75) {
      offense += `${firstName} handles a heavy offensive burden — high usage, creation responsibility, and difficult shot diet. `;
      tags.push("Shot Creator");
    } else if (rda >= 55) {
      offense += `Carries a moderate offensive load with a mix of creation and catch-and-shoot opportunities. `;
    } else {
      offense += `Operates primarily in a complementary offensive role — catch-and-shoot, cuts, and putbacks. `;
    }
  }

  if (scores.sps !== null) {
    const sps = scores.sps!;
    offense += `Shot Profile Score: ${sps.toFixed(0)} (${pctl(sps)}). `;
    if (sps >= 75) {
      offense += `Efficient across all zones with a versatile, high-difficulty shot profile. `;
      tags.push("Efficient");
    } else if (sps >= 50) {
      offense += `Reasonable shot selection with room for improvement in shot quality or efficiency. `;
    } else {
      offense += `Shot profile has clear weaknesses — may be taking difficult or low-value shots. `;
    }
  }

  // Shooting splits
  offense += `Shooting: ${fgPct.toFixed(1)}% FG, ${fg3Pct.toFixed(1)}% 3P, ${ftPct.toFixed(1)}% FT.`;
  if (fgPct >= 50 && fg3Pct >= 38) {
    offense += ` Elite efficiency from both inside and beyond the arc.`;
  } else if (fg3Pct >= 38) {
    offense += ` Reliable three-point threat.`;
  } else if (fg3Pct < 30 && fg3Pct > 0) {
    offense += ` Three-point shooting is a weakness teams can exploit.`;
  }

  if (offense) sections.push({ title: "Offensive Profile", content: offense.trim() });

  // 4. DEFENSIVE IMPACT
  if (scores.drs !== null) {
    const drs = scores.drs!;
    let defense = `Defensive Reality Score: ${drs.toFixed(0)} (${pctl(drs)}). `;
    if (drs >= 75) {
      defense += `${firstName} is a genuine defensive anchor. Impact goes well beyond steals (${Number(p.spg).toFixed(1)}) and blocks (${Number(p.bpg).toFixed(1)}) — he makes teammates better on that end.`;
      tags.push("Elite Defender");
    } else if (drs >= 55) {
      defense += `Solid defensive contributor. Not a liability and shows awareness, though not a primary stopper.`;
    } else if (drs >= 40) {
      defense += `Neutral defensively — neither helps nor hurts significantly. Averages ${Number(p.spg).toFixed(1)} SPG and ${Number(p.bpg).toFixed(1)} BPG.`;
    } else {
      defense += `Defensive impact is limited. Teams may target ${firstName} in mismatches. ${Number(p.spg).toFixed(1)} SPG and ${Number(p.bpg).toFixed(1)} BPG.`;
      tags.push("Defensive Liability");
    }
    sections.push({ title: "Defensive Impact", content: defense });
  }

  // 5. GRAVITY & OFF-BALL
  if (scores.goi !== null) {
    const goi = scores.goi!;
    let offball = `Gravity & Off-Ball Impact: ${goi.toFixed(0)} (${pctl(goi)}). `;
    if (goi >= 75) {
      offball += `${firstName} creates significant value without the ball — his spacing, movement, and gravitational pull open opportunities for teammates. High-value presence even when not touching the ball.`;
      tags.push("Spacer");
    } else if (goi >= 55) {
      offball += `Contributes meaningfully off-ball through movement and spacing. Functional gravity that keeps defenses honest.`;
    } else if (goi >= 40) {
      offball += `Average off-ball impact. Doesn't significantly bend defenses away from the ball.`;
    } else {
      offball += `Limited off-ball value. Tends to be stationary or doesn't command defensive attention without the ball.`;
    }
    sections.push({ title: "Off-Ball Value", content: offball });
  }

  // 6. PORTABILITY & SCALABILITY
  if (scores.sps !== null && scores.sps! >= 70) {
    const sps = scores.sps!;
    let port = `Scalability & Portability Score: ${sps.toFixed(0)}. `;
    port += `${firstName}'s skillset should translate well across different lineups and systems. `;
    if (scores.rda && scores.rda! >= 65) {
      port += `Combined with a high creation burden (RDA ${scores.rda!.toFixed(0)}), this suggests genuine star-level transferability — value isn't system-dependent.`;
      tags.push("Portable Star");
    } else {
      port += `While his role may be specialized, the underlying skills transfer.`;
    }
    sections.push({ title: "Portability", content: port });
  }

  // 7. KEY CONCERNS
  const concerns: string[] = [];
  if (Number(p.topg) >= 3.5 && ppg < 25) {
    concerns.push(`Turnover rate is elevated (${Number(p.topg).toFixed(1)} per game) relative to production.`);
  }
  if (scores.drs !== null && scores.drs! < 35 && bisTier !== "below") {
    concerns.push(`Defensive limitations (DRS ${scores.drs!.toFixed(0)}) are a real concern and may reduce playoff viability.`);
  }
  if (ftPct < 65 && ppg >= 15) {
    concerns.push(`Free throw shooting (${ftPct.toFixed(1)}%) is a liability in close games and could be exploited via Hack-a-${firstName}.`);
  }
  if (scores.lfi !== null && scores.lfi! < 35 && bis >= 55) {
    concerns.push(`Current form (LFI ${scores.lfi!.toFixed(0)}) is well below his established baseline — monitor for injury or fatigue.`);
  }
  if (concerns.length > 0) {
    sections.push({ title: "Key Concerns", content: concerns.join(" ") });
  }

  // 8. BOTTOM LINE
  let bottom = "";
  if (bisTier === "elite") {
    bottom = `${p.full_name} is a franchise-caliber talent operating at the highest level. `;
    if (scores.lfi && scores.lfi! >= 65) {
      bottom += `With form matching baseline, he's one of the most dangerous players in the league right now.`;
    } else if (scores.lfi && scores.lfi! < 45) {
      bottom += `A dip in current form creates a potential opportunity — the talent base is still elite.`;
    }
  } else if (bisTier === "great") {
    bottom = `${firstName} is a high-quality starter who meaningfully moves the needle for the ${p.team_name}. `;
    if (scores.sps && scores.sps! >= 70) {
      bottom += `His skill portability suggests he'd be an impact player on any roster.`;
    }
  } else if (bisTier === "good") {
    bottom = `${firstName} is a solid rotation player who contributes across ${ppg >= 15 ? "scoring and " : ""}${rpg >= 5 ? "rebounding and " : ""}${apg >= 4 ? "passing" : "multiple areas"}.`;
  } else if (bisTier === "average") {
    bottom = `${firstName} fills a specific niche for the ${p.team_name}. Value is real but limited in scope.`;
  } else {
    bottom = `${firstName} is on the fringe of the rotation. Impact metrics suggest minimal positive contribution at this stage.`;
  }
  sections.push({ title: "Bottom Line", content: bottom.trim() });

  return { headline, sections, tags };
}
