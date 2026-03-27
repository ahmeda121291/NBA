// ============================================================
// CourtVision — Advanced Scouting Report Generator v2
// Scout-level narrative engine with specific, actionable insights
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
  projectionNote: string | null; // "If X improves, BIS projects to Y"
}

function tier(score: number): "elite" | "very_good" | "solid" | "below_avg" | "poor" {
  if (score >= 80) return "elite";       // dominant / league-leading
  if (score >= 65) return "very_good";   // high-level / above average
  if (score >= 50) return "solid";       // capable / average
  if (score >= 35) return "below_avg";   // limited / developing
  return "poor";                         // weak / significant weakness
}

function tierLabel(score: number): string {
  if (score >= 80) return "elite";
  if (score >= 65) return "above-average";
  if (score >= 50) return "average";
  if (score >= 35) return "below-average";
  return "poor";
}

function percentilePhrase(score: number): string {
  if (score >= 95) return "top 5% of the league";
  if (score >= 90) return "top 10% of the league";
  if (score >= 80) return "top 20% of the league";
  if (score >= 65) return "well above league average";
  if (score >= 50) return "right around league average";
  if (score >= 35) return "below league average";
  if (score >= 20) return "bottom quartile of the league";
  return "among the weakest in the league";
}

function posLabel(pos: string): string {
  const map: Record<string, string> = {
    PG: "point guard", SG: "shooting guard", SF: "small forward",
    PF: "power forward", C: "center", G: "guard", F: "forward",
    "G-F": "wing", "F-G": "wing", "F-C": "forward-center", "C-F": "big",
  };
  return map[pos] || "player";
}

function posArchetype(pos: string): string {
  const map: Record<string, string> = {
    PG: "floor general", SG: "off-ball scorer", SF: "versatile wing",
    PF: "stretch big", C: "rim anchor", G: "backcourt player", F: "frontcourt player",
    "G-F": "combo wing", "F-G": "swing player", "F-C": "versatile big", "C-F": "mobile big",
  };
  return map[pos] || "contributor";
}

// Shooting zone analysis based on available splits
function shootingAnalysis(p: PlayerData): string {
  const fg = (Number(p.fg_pct) * 100);
  const fg3 = (Number(p.fg3_pct) * 100);
  const ft = (Number(p.ft_pct) * 100);
  const ppg = Number(p.ppg);
  const pos = p.position;
  const firstName = p.full_name.split(" ")[0];

  const parts: string[] = [];

  // 3PT analysis with context
  if (fg3 >= 40) {
    parts.push(`${firstName} is a lethal perimeter shooter at ${fg3.toFixed(1)}% from three — defenses can't leave him open. This gravity opens driving lanes for teammates and forces closeouts that create advantage.`);
  } else if (fg3 >= 36) {
    parts.push(`Shooting ${fg3.toFixed(1)}% from three — reliable enough to keep defenses honest. Not a shot teams will live with if left open, which creates baseline spacing value.`);
  } else if (fg3 >= 30) {
    parts.push(`The three-point shot at ${fg3.toFixed(1)}% is functional but inconsistent. Defenses will go under screens and sag off, limiting his ability to collapse the defense as a primary ballhandler.`);
  } else if (fg3 > 0 && fg3 < 30) {
    if (pos === "PG" || pos === "SG" || pos === "G" || pos === "G-F") {
      parts.push(`At ${fg3.toFixed(1)}% from three, ${firstName} is a non-shooter by guard standards. This is a critical limitation — it allows defenders to pack the paint, clogs driving lanes, and reduces half-court offensive ceiling for the entire unit. If this number climbs even to 34-35%, his impact would rise significantly.`);
    } else if (pos === "C" || pos === "F-C" || pos === "C-F") {
      parts.push(`Shooting ${fg3.toFixed(1)}% from deep. For a big, perimeter shooting isn't required but would dramatically increase his value as a floor-spacer in modern NBA offenses.`);
    } else {
      parts.push(`The ${fg3.toFixed(1)}% three-point clip is a real weakness. Teams leave ${firstName} open beyond the arc, which shrinks the floor for the entire offense. Improving this to even league-average (36%) would transform his offensive ceiling.`);
    }
  }

  // FG% with position context
  if (fg >= 52 && (pos === "C" || pos === "PF" || pos === "F-C")) {
    parts.push(`Converts at ${fg.toFixed(1)}% from the field — elite finishing for a big, indicating strong touch around the rim and good shot selection in the paint.`);
  } else if (fg >= 48 && (pos === "PG" || pos === "SG" || pos === "G")) {
    parts.push(`Field goal percentage of ${fg.toFixed(1)}% is well above average for a perimeter player, suggesting efficient shot selection and strong finishing through contact.`);
  } else if (fg < 42) {
    parts.push(`The ${fg.toFixed(1)}% field goal clip is concerning — either the shot diet is too difficult, or finishing/touch needs work. This inefficiency costs the offense roughly ${((0.45 - fg/100) * ppg * 2).toFixed(0)}-${((0.45 - fg/100) * ppg * 3).toFixed(0)} points of production per game.`);
  }

  // Free throw shooting
  if (ft >= 85 && ppg >= 18) {
    parts.push(`At ${ft.toFixed(1)}% from the line, ${firstName} is a reliable closer — teams can't afford to foul him in crunch time.`);
  } else if (ft < 65 && ppg >= 15) {
    parts.push(`Free throw shooting at ${ft.toFixed(1)}% is a glaring issue. At his usage level, this costs roughly ${((0.75 - ft/100) * ppg * 0.3).toFixed(1)} points per game in missed free throws alone, and invites intentional fouling in close games.`);
  } else if (ft < 70 && ppg >= 10) {
    parts.push(`The ${ft.toFixed(1)}% free throw rate limits late-game reliability and suggests potential touch/mechanics issues that may also cap jumper improvement.`);
  }

  return parts.join(" ");
}

// Defensive archetype analysis
function defensiveAnalysis(p: PlayerData, drs: number): string {
  const firstName = p.full_name.split(" ")[0];
  const pos = p.position;
  const spg = Number(p.spg);
  const bpg = Number(p.bpg);
  const rpg = Number(p.rpg);
  const parts: string[] = [];

  // Determine defensive archetype
  if (pos === "C" || pos === "F-C" || pos === "C-F") {
    if (bpg >= 2.0 && drs >= 70) {
      parts.push(`${firstName} is an elite rim protector — ${bpg.toFixed(1)} blocks per game signals a defensive anchor who changes shots at the basket. Opposing drivers alter their approach knowing he's in the paint.`);
      if (spg >= 1.0) {
        parts.push(`Adding ${spg.toFixed(1)} steals per game shows he's not just a stationary shot-blocker — he has active hands and anticipation in passing lanes, making him a switchable modern big.`);
      } else {
        parts.push(`The limitation: he's primarily a drop-coverage defender. Against teams that pull bigs to the perimeter or run switch-heavy schemes, his impact diminishes. Versatility on the perimeter is the unlock for the next tier.`);
      }
    } else if (bpg >= 1.0 && drs >= 50) {
      parts.push(`Provides solid rim protection (${bpg.toFixed(1)} BPG) and functions as a competent anchor in traditional drop coverage. Not a scheme-changer defensively, but he won't be a liability at the rim.`);
    } else if (drs < 40) {
      parts.push(`Defensive impact is limited for a big — ${bpg.toFixed(1)} BPG and a DRS of ${drs.toFixed(0)} suggests poor positioning, slow rotations, or inability to contest without fouling. This is a critical weakness that likely costs his team 3-5 points per game on the defensive end.`);
    }
  } else if (pos === "PG" || pos === "SG" || pos === "G") {
    if (drs >= 70 && spg >= 1.5) {
      parts.push(`${firstName} is a lockdown perimeter defender — ${spg.toFixed(1)} steals per game reflects active hands and elite anticipation. He can be deployed on the opposing team's best guard without concern.`);
    } else if (drs >= 55) {
      parts.push(`Capable perimeter defender who holds his own against starting-caliber guards. Not a stopper, but won't be hunted in pick-and-roll or isolation.`);
    } else if (drs < 40) {
      parts.push(`Perimeter defense is a clear weakness (DRS ${drs.toFixed(0)}). ${firstName} gets targeted in pick-and-roll, struggles to fight over screens, and is a minus on that end. This limits his playoff viability — opponents will attack him relentlessly in a 7-game series.`);
    }
  } else {
    // Wings
    if (drs >= 70) {
      parts.push(`${firstName} is a premier wing defender — versatile enough to guard 1-through-4 with length, lateral quickness, and instincts. ${spg.toFixed(1)} steals and ${bpg.toFixed(1)} blocks per game barely capture the full impact. He disrupts passing lanes, contests jumpers, and recovers on drives.`);
    } else if (drs >= 50) {
      parts.push(`Functional wing defender who can hold up against most matchups. Not a stopper but won't be a liability. ${spg.toFixed(1)} SPG and ${bpg.toFixed(1)} BPG.`);
    } else if (drs < 40) {
      parts.push(`Defensive effort and ability are below average for a wing (DRS ${drs.toFixed(0)}). Gets caught on screens, struggles in isolation against quicker guards, and provides minimal weak-side help. Improving lateral quickness and defensive effort would have an outsized impact on his overall value.`);
    }
  }

  // Rebounding context for defense
  if ((pos === "C" || pos === "PF" || pos === "F-C") && rpg >= 10) {
    parts.push(`The ${rpg.toFixed(1)} rebounds per game include strong defensive glass work, limiting second-chance opportunities — a quiet but valuable defensive contribution.`);
  } else if ((pos === "PG" || pos === "SG") && rpg >= 5) {
    parts.push(`${rpg.toFixed(1)} RPG from a guard is exceptional — creates transition opportunities and takes rebounding burden off bigs.`);
  }

  return parts.join(" ");
}

// Playmaking analysis
function playmakingAnalysis(p: PlayerData): string {
  const firstName = p.full_name.split(" ")[0];
  const apg = Number(p.apg);
  const topg = Number(p.topg);
  const ppg = Number(p.ppg);
  const pos = p.position;
  const parts: string[] = [];

  const astToRatio = topg > 0 ? apg / topg : apg;

  if (apg >= 8) {
    parts.push(`${firstName} is a primary playmaker distributing ${apg.toFixed(1)} assists per game. He reads the floor, finds cutters, and creates advantage for teammates at an elite level.`);
  } else if (apg >= 5 && (pos === "SF" || pos === "PF" || pos === "C" || pos === "F")) {
    parts.push(`The ${apg.toFixed(1)} assists per game from a ${posLabel(pos)} signals genuine point-forward ability — he can run the offense from the post or short roll and doesn't need the ball in his hands to create for others.`);
  } else if (apg >= 5) {
    parts.push(`${apg.toFixed(1)} assists per game shows solid playmaking ability. He can run pick-and-roll, find the open man, and create looks for teammates.`);
  } else if (apg < 2 && ppg >= 18) {
    parts.push(`Limited as a playmaker at just ${apg.toFixed(1)} APG despite high usage. This one-dimensional scoring profile makes him easier to game-plan for — help can rotate without fear of skip passes or pocket feeds.`);
  }

  // Turnover analysis
  if (astToRatio >= 3.0 && apg >= 4) {
    parts.push(`Excellent ball security with a ${astToRatio.toFixed(1)} AST/TO ratio — he values the basketball and makes efficient decisions with it.`);
  } else if (topg >= 3.5 && ppg < 22) {
    parts.push(`The ${topg.toFixed(1)} turnovers per game are elevated relative to production. At his usage level, this represents careless possessions that directly cost his team — tighter decision-making would meaningfully raise his overall impact.`);
  } else if (topg >= 4.0 && ppg >= 25) {
    parts.push(`${topg.toFixed(1)} turnovers per game is the cost of his high-creation role. Acceptable given his ${ppg.toFixed(1)} PPG and ${apg.toFixed(1)} APG output, but reducing to 3.0 would add roughly 2-3 net points to his impact.`);
  }

  return parts.join(" ");
}

function streakNarrative(label: string | null, delta: number | null, firstName: string, bis: number): string {
  if (!label || !delta) return "";
  const d = Math.abs(delta).toFixed(1);

  const map: Record<string, string> = {
    hot_likely_real: `${firstName} is on a verified hot streak — LFI has surged +${d} points, backed by genuine efficiency gains rather than inflated volume or soft matchups. The production increase is sustainable and reflects real development or peak performance.`,
    hot_fragile: `Currently riding a hot streak (+${d} LFI) that shows fragility markers. The elevated production may partly reflect favorable matchups or unsustainable shot-making luck (high-difficulty shots falling at above-expected rates). Worth monitoring over the next 5-10 games for regression.`,
    hot_opponent_driven: `Recent surge (+${d} LFI) correlates heavily with opponent quality — production spiked against weaker defenses. The numbers look great on paper but discount for schedule strength before projecting this forward.`,
    cold_real: `In a confirmed cold stretch — LFI has dropped ${d} points with the decline showing across multiple production categories, not just shooting variance. This isn't bad luck; something is mechanically or situationally off. Look for minutes reduction, nagging injury, or lineup changes as potential causes.`,
    cold_bouncing_back: `Coming off a cold stretch but showing recovery signals. LFI dipped ${d} points but underlying shot quality and usage patterns are stabilizing. The worst appears behind him.`,
    stable: `Performance has been remarkably consistent — no significant deviation from season baseline. ${firstName} is doing exactly what he's done all year, no more, no less. Predictable and reliable.`,
    breakout_role_expansion: `Experiencing a genuine breakout (+${d} LFI) coinciding with expanded role or usage increase. This isn't just a hot streak — the opportunity has grown and ${firstName} is responding to it. If the role holds, the higher production level may become the new baseline.`,
  };

  let text = map[label] || "";

  // Add projection note for hot/cold
  if (label.includes("hot") && bis < 70) {
    text += ` If this form sustains for another 10+ games, his BIS projects to rise from ${bis.toFixed(0)} into the ${Math.min(bis + 12, 95).toFixed(0)}-${Math.min(bis + 18, 99).toFixed(0)} range.`;
  }
  if (label.includes("cold") && bis >= 60) {
    text += ` Historical regression suggests a return to baseline (BIS ${bis.toFixed(0)}) within 2-3 weeks if no structural change has occurred.`;
  }

  return text;
}

// Build projection note: "if X improves, BIS projects to Y"
function buildProjectionNote(p: PlayerData, bis: number, drs: number | null, sps: number | null): string | null {
  const firstName = p.full_name.split(" ")[0];
  const fg3 = Number(p.fg3_pct) * 100;
  const notes: string[] = [];

  // 3PT improvement projection
  if (fg3 < 32 && fg3 > 0 && bis < 80) {
    const projectedBIS = Math.min(bis + 8 + (32 - fg3) * 0.3, 95);
    notes.push(`If ${firstName}'s three-point shooting improves from ${fg3.toFixed(0)}% to league-average (36%), his BIS projects to jump from ${bis.toFixed(0)} to approximately ${projectedBIS.toFixed(0)}.`);
  }

  // Defense improvement projection
  if (drs !== null && drs < 40 && bis >= 55 && bis < 85) {
    const projectedBIS = Math.min(bis + 10 + (40 - drs) * 0.15, 95);
    notes.push(`Raising his defensive impact from ${drs.toFixed(0)} to even average (50) would push his BIS from ${bis.toFixed(0)} to the ${projectedBIS.toFixed(0)}-${Math.min(projectedBIS + 5, 99).toFixed(0)} range — that's the difference between a good starter and an All-Star caliber player.`);
  }

  // Turnover improvement
  if (Number(p.topg) >= 3.5 && Number(p.ppg) >= 15 && bis < 80) {
    const projectedBIS = Math.min(bis + 4, 95);
    notes.push(`Cutting turnovers from ${Number(p.topg).toFixed(1)} to 2.5 per game would add approximately ${(Number(p.topg) - 2.5).toFixed(0)}-${((Number(p.topg) - 2.5) * 1.5).toFixed(0)} points to his net impact, projecting BIS to around ${projectedBIS.toFixed(0)}.`);
  }

  return notes.length > 0 ? notes.join(" ") : null;
}

export function generateScoutingReport(player: PlayerData): ScoutingReport {
  const p = player;
  const firstName = p.full_name.split(" ")[0];
  const lastName = p.full_name.split(" ").slice(1).join(" ");
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
      projectionNote: null,
    };
  }

  const bis = scores.bis!;
  const bisTier = tier(bis);
  const tags: string[] = [p.position, p.team_abbr];

  // === HEADLINE — more specific, less generic ===
  let headline = "";
  if (bisTier === "elite" && ppg >= 25) {
    headline = `${p.full_name} is a franchise cornerstone — ${ppg.toFixed(0)} PPG with a dominant BIS of ${bis.toFixed(0)} (${percentilePhrase(bis)})`;
  } else if (bisTier === "elite") {
    headline = `${p.full_name} is one of the league's most impactful players — BIS ${bis.toFixed(0)} (${p.bis_percentile ? "top " + (100 - Number(p.bis_percentile)).toFixed(0) + "%" : percentilePhrase(bis)})`;
  } else if (bisTier === "very_good" && scores.drs && scores.drs >= 70) {
    headline = `${p.full_name} is a high-level two-way force — ${ppg.toFixed(0)}/${rpg.toFixed(0)}/${apg.toFixed(0)} with league-leading defense (DRS ${scores.drs.toFixed(0)})`;
  } else if (bisTier === "very_good") {
    headline = `${p.full_name} is an above-average ${posArchetype(p.position)} — BIS ${bis.toFixed(0)} puts him ${percentilePhrase(bis)}`;
  } else if (bisTier === "solid" && scores.lfi && scores.lfi >= 70) {
    headline = `${p.full_name} is surging — BIS ${bis.toFixed(0)} with elite recent form (LFI ${scores.lfi.toFixed(0)})`;
  } else if (bisTier === "solid") {
    headline = `${p.full_name} is a capable ${posArchetype(p.position)} with room to grow — BIS ${bis.toFixed(0)}`;
  } else if (bisTier === "below_avg") {
    headline = `${p.full_name} is a limited contributor for ${p.team_abbr} — BIS ${bis.toFixed(0)} ranks ${percentilePhrase(bis)}`;
  } else {
    headline = `${p.full_name} is a significant weakness this season — BIS ${bis.toFixed(0)} places him ${percentilePhrase(bis)}`;
  }

  const sections: { title: string; content: string }[] = [];

  // === 1. EXECUTIVE SUMMARY (not generic "overview") ===
  let summary = `${p.full_name} is a ${posLabel(p.position)} for the ${p.team_name}`;
  if (p.bis_percentile) {
    summary += `, ranking in the ${Number(p.bis_percentile).toFixed(0)}th percentile league-wide by Baseline Impact Score (${bis.toFixed(0)})`;
  }
  summary += `. In ${mpg.toFixed(0)} minutes per game across ${p.games_played} starts, ${firstName} produces ${ppg.toFixed(1)}/${rpg.toFixed(1)}/${apg.toFixed(1)} (pts/reb/ast).`;

  // Add the "so what" — what makes this player interesting
  if (bisTier === "elite" && scores.lfi && scores.lfi >= 65) {
    summary += ` Both his established baseline and current trajectory are dominant — he's performing in the ${percentilePhrase(bis)} and the form (LFI ${scores.lfi.toFixed(0)}) is verified. This is MVP-caliber basketball.`;
    tags.push("MVP Caliber");
  } else if (bis >= 65 && scores.drs && scores.drs < 35) {
    summary += ` The offensive production is high-level, but his defensive weakness (DRS ${scores.drs.toFixed(0)}, ${percentilePhrase(scores.drs)}) creates a hard ceiling — he gives back on one end what he creates on the other.`;
    tags.push("Offense Only");
  } else if (bis < 50 && scores.lfi && scores.lfi >= 70) {
    summary += ` His season baseline is limited (BIS ${bis.toFixed(0)}), but recent form has been dramatically better (LFI ${scores.lfi.toFixed(0)}) — either a breakout is happening or this is a hot stretch that will cool.`;
    tags.push("Breakout Watch");
  } else if (bis >= 60 && scores.lfi && scores.lfi < 35) {
    summary += ` His established talent level is above-average (BIS ${bis.toFixed(0)}), but current form is poor (LFI ${scores.lfi.toFixed(0)}). This disconnect suggests fatigue, injury, or tactical changes worth investigating.`;
    tags.push("Buy Low?");
  }
  sections.push({ title: "Executive Summary", content: summary });

  // === 2. CURRENT FORM ===
  if (scores.lfi !== null) {
    const lfi = scores.lfi!;
    let form = `Live Form Index: ${lfi.toFixed(0)} — ${tierLabel(lfi)} recent performance, ranking ${percentilePhrase(lfi)}.`;
    const streakText = streakNarrative(p.lfi_streak_label, lfiDelta, firstName, bis);
    if (streakText) {
      form += ` ${streakText}`;
    } else if (lfiDelta !== 0) {
      const dir = lfiDelta > 0 ? "trending up" : "trending down";
      form += ` Form is ${dir} — LFI has shifted ${lfiDelta > 0 ? "+" : ""}${Math.abs(lfiDelta).toFixed(1)} points from last snapshot. ${lfiDelta > 0 ? "The trajectory suggests sustained improvement rather than noise." : "This decline may reflect fatigue, lineup changes, or tougher recent matchups."}`;
    }

    // Actionable context
    if (lfi >= 75 && bis >= 70) {
      tags.push("Peak Mode");
    } else if (lfi >= 70 && bis < 55) {
      tags.push("Surging");
    } else if (lfi < 35 && bis >= 55) {
      tags.push("Slumping");
    }
    sections.push({ title: "Current Form & Trajectory", content: form });
  }

  // === 3. SCORING & SHOOTING (zone-specific) ===
  const shootingText = shootingAnalysis(p);
  if (shootingText) {
    // Add scoring context with metric references
    let scoringContext = "";
    if (ppg >= 25 && scores.rda && scores.rda >= 70) {
      scoringContext = `${firstName}'s offensive production (OIQ ${scores.rda.toFixed(0)}) is historically dominant — he shoulders a massive scoring load as the primary option at ${ppg.toFixed(1)} PPG with a high-difficulty shot diet, forcing defenses into impossible pick-your-poison situations. `;
      tags.push("Alpha Scorer");
    } else if (ppg >= 20 && scores.rda) {
      scoringContext = `Averaging ${ppg.toFixed(1)} points per game as a core scorer. His offensive burden (OIQ ${scores.rda.toFixed(0)}) ranks ${percentilePhrase(scores.rda)}, meaning ${scores.rda >= 65 ? "he creates most of his own looks under duress" : scores.rda >= 50 ? "he handles a moderate creation load" : "much of his scoring comes from system-generated looks"}. `;
    } else if (ppg >= 20) {
      scoringContext = `Averaging ${ppg.toFixed(1)} points per game as a core scorer. `;
    } else if (ppg >= 12 && scores.rda) {
      scoringContext = `Provides ${ppg.toFixed(1)} PPG as a secondary scoring option (OIQ ${scores.rda.toFixed(0)}). ${scores.rda >= 60 ? "He creates at a level above his usage — there may be untapped upside if given more touches." : "His scoring mostly flows from the system rather than self-creation."} `;
    } else if (ppg >= 12) {
      scoringContext = `Provides ${ppg.toFixed(1)} PPG as a secondary scoring option. `;
    }

    // Add SPS/PEM context if available
    if (scores.sps !== null) {
      const sps = scores.sps!;
      if (sps >= 70) {
        scoringContext += `His playmaking efficiency (PEM ${sps.toFixed(0)}) is ${tierLabel(sps)} — he makes teammates measurably better, and his value transfers across different lineups and contexts. `;
      } else if (sps < 35) {
        scoringContext += `His playmaking efficiency (PEM ${sps.toFixed(0)}) is a limitation — his value is context-dependent and drops when the supporting cast changes. `;
      }
    }
    sections.push({ title: "Scoring & Shot Profile", content: scoringContext + shootingText });
  }

  // === 4. PLAYMAKING ===
  const playmakingText = playmakingAnalysis(p);
  if (playmakingText) {
    sections.push({ title: "Playmaking & Decision-Making", content: playmakingText });
  }

  // === 5. DEFENSIVE SCOUTING REPORT ===
  if (scores.drs !== null) {
    const drsVal = scores.drs!;
    let defHeader = `Defensive Reality Score (DRS ${drsVal.toFixed(0)}) ranks ${percentilePhrase(drsVal)} among ${posLabel(p.position)}s. `;
    const defText = defensiveAnalysis(p, drsVal);
    if (defText) {
      if (drsVal >= 70) tags.push("Elite Defender");
      else if (drsVal < 35) tags.push("Defensive Liability");
      sections.push({ title: "Defensive Scouting Report", content: defHeader + defText });
    }
  }

  // === 6. OFF-BALL VALUE & GRAVITY ===
  if (scores.goi !== null) {
    const goi = scores.goi!;
    let offball = `Gravity & Off-Ball Impact (GOI ${goi.toFixed(0)}) ranks ${percentilePhrase(goi)} among ${posLabel(p.position)}s. `;
    if (goi >= 75 && Number(p.fg3_pct) * 100 >= 36) {
      offball += `${firstName} is a gravitational force off the ball — his shooting threat pulls defenders out of help position, creating driving lanes and cutting opportunities for teammates. The consequence: his team's offensive rating jumps even in possessions where he never touches the ball.`;
      tags.push("Gravity");
    } else if (goi >= 60) {
      offball += `He contributes meaningful off-ball value through cutting, screening actions, and movement. The result is that ${firstName} doesn't need the ball to positively impact the offense — lineups with him space the floor better than his usage numbers suggest.`;
    } else if (goi < 35 && ppg >= 15) {
      offball += `This is a significant limitation despite high on-ball usage — ${firstName} tends to stand and watch when not directly involved in the action. The consequence: the offense essentially plays 4-on-5 when the ball isn't in his hands, reducing overall team efficiency.`;
    } else if (goi < 35) {
      offball += `Minimal off-ball presence means defenses ignore him when he doesn't have the basketball, allowing them to load up help defense on ${firstName}'s teammates.`;
    }
    sections.push({ title: "Off-Ball Value", content: offball });
  }

  // === 7. WHAT WOULD MAKE HIM BETTER (specific, actionable) ===
  const improvements: string[] = [];
  const fg3 = Number(p.fg3_pct) * 100;

  if (fg3 < 33 && fg3 > 0 && (p.position === "PG" || p.position === "SG" || p.position === "SF" || p.position === "G" || p.position === "G-F")) {
    improvements.push(`Three-point shooting (${fg3.toFixed(0)}%) is the #1 unlock. Getting to 35-36% would transform his offensive gravity and open up driving lanes.`);
  }
  if (scores.drs && scores.drs < 40 && bis >= 55) {
    improvements.push(`Defensive improvement (DRS ${scores.drs.toFixed(0)}, ${percentilePhrase(scores.drs)}) would be transformational. Raising DRS to even 55 would push him into All-Star conversation — the gap between his offense and defense is the single biggest constraint on his value.`);
  }
  if (Number(p.topg) >= 3.5 && ppg < 24) {
    improvements.push(`Ball security — ${Number(p.topg).toFixed(1)} turnovers per game is too high for his role. Tighter decisions in traffic would add 2-3 net points of impact.`);
  }
  if (Number(p.ft_pct) * 100 < 70 && ppg >= 15) {
    improvements.push(`Free throw shooting (${(Number(p.ft_pct) * 100).toFixed(0)}%) caps his late-game value. A 10-point improvement here would be worth roughly ${(0.1 * ppg * 0.25).toFixed(1)} PPG.`);
  }
  if (scores.goi && scores.goi < 40 && ppg >= 15) {
    improvements.push(`Off-ball movement and screening. He's a standing observer when he doesn't have the ball — adding activity would help both him and his teammates.`);
  }
  if (apg < 2 && ppg >= 20) {
    improvements.push(`Passing out of double teams and creating for others. At ${apg.toFixed(1)} APG with ${ppg.toFixed(1)} PPG, he's too predictable — adding playmaking would make his scoring even more dangerous.`);
  }

  if (improvements.length > 0) {
    sections.push({ title: "Development Priorities", content: improvements.join(" ") });
  }

  // === 8. KEY MATCHUP INSIGHT ===
  {
    const matchupParts: string[] = [];
    const oiq = scores.rda;   // Offensive Impact Quotient
    const pem = scores.sps;   // Playmaking Efficiency Metric
    const drs = scores.drs;   // Defensive Reality Score
    const goi = scores.goi;

    // Determine player archetype from metric profile
    const isDefensiveSpecialist = drs !== null && drs >= 65 && (oiq === null || oiq < 50);
    const isFacilitator = pem !== null && pem >= 65 && (oiq === null || oiq < 55);
    const isScorerOnly = oiq !== null && oiq >= 65 && (drs === null || drs < 40);
    const isTwoWayStar = oiq !== null && oiq >= 65 && drs !== null && drs >= 65;
    const isGravityPlayer = goi !== null && goi >= 70 && Number(p.fg3_pct) * 100 >= 36;

    if (isTwoWayStar) {
      matchupParts.push(`${firstName} is matchup-proof — elite offense (OIQ ${oiq!.toFixed(0)}) combined with elite defense (DRS ${drs!.toFixed(0)}) means there's no scheme that neutralizes him. Against top defenses, he maintains production while simultaneously disrupting the opponent's best players.`);
    } else if (isScorerOnly) {
      matchupParts.push(`Against elite defenses (DRS 75+), ${firstName}'s scoring typically drops 15-20% from his baseline because his defensive weakness (DRS ${drs ? drs.toFixed(0) : "N/A"}) forces coaches into net-negative lineup math. In those matchups, he's a high-volume scorer who gets hunted on the other end — his team must outscore the problem.`);
    } else if (isDefensiveSpecialist) {
      matchupParts.push(`${firstName}'s value peaks in playoff-style matchups against high-usage scorers. His defense (DRS ${drs!.toFixed(0)}) is his calling card, but limited offensive creation (OIQ ${oiq ? oiq.toFixed(0) : "N/A"}) means his team needs other shot-creators around him. He's the perfect 3rd or 4th option on a contender, not a lead.`);
    } else if (isFacilitator) {
      matchupParts.push(`${firstName}'s value shifts in tough matchups — against elite defenses, his scoring may dip, but his playmaking efficiency (PEM ${pem!.toFixed(0)}) ensures he still creates value through ball movement and teammate involvement. He's the connective tissue that keeps an offense functional when individual scoring gets harder.`);
    } else if (isGravityPlayer) {
      matchupParts.push(`${firstName}'s off-ball gravity (GOI ${goi!.toFixed(0)}) makes him uniquely valuable in playoff matchups where half-court execution matters most. His shooting threat forces defenses to account for him even without the ball, opening up actions for primary creators.`);
    } else if (bis >= 50 && bis < 65) {
      // Average players — give a general matchup note
      if (ppg >= 15 && (drs === null || drs < 50)) {
        matchupParts.push(`In matchups against top-tier competition, ${firstName}'s production tends to compress toward his floor rather than his ceiling. His average overall profile (BIS ${bis.toFixed(0)}) means he's scheme-dependent — he'll look good in favorable matchups and disappear in tough ones.`);
      }
    }

    if (matchupParts.length > 0) {
      sections.push({ title: "Key Matchup Insight", content: matchupParts.join(" ") });
    }
  }

  // === 9. BOTTOM LINE (specific, not generic) ===
  let bottom = "";
  if (bisTier === "elite" && scores.lfi && scores.lfi >= 60) {
    bottom = `${p.full_name} is a franchise-caliber talent operating at peak level (BIS ${bis.toFixed(0)}, LFI ${scores.lfi.toFixed(0)}). The combination of dominant baseline and verified current form makes him one of the most dangerous players in basketball right now. Any team built around ${firstName} has legitimate championship equity.`;
  } else if (bisTier === "elite" && scores.lfi && scores.lfi < 45) {
    bottom = `${firstName}'s talent base is league-leading (BIS ${bis.toFixed(0)}), but current form is poor (LFI ${scores.lfi.toFixed(0)}). This creates a buy-low window — the underlying skills haven't diminished, and regression to his dominant mean is likely. Bet on the baseline, not the slump.`;
  } else if (bisTier === "very_good" && improvements.length <= 1) {
    bottom = `${firstName} is a near-complete player at the ${posLabel(p.position)} position (BIS ${bis.toFixed(0)}, ${percentilePhrase(bis)}). He's a clear-cut starter on a contender and provides above-average impact across multiple dimensions. The gap between high-level and elite is narrow for him.`;
  } else if (bisTier === "very_good") {
    bottom = `${firstName} is a high-level starter who makes his team meaningfully better (BIS ${bis.toFixed(0)}). With ${improvements.length} clear development areas identified, there's a realistic path to elite status if the improvements come.`;
  } else if (bisTier === "solid" && scores.lfi && scores.lfi >= 65) {
    bottom = `${firstName} is playing above his season baseline (BIS ${bis.toFixed(0)}) with above-average recent form (LFI ${scores.lfi.toFixed(0)}). If the trajectory holds, he's on a path from capable rotation player to legitimate starter.`;
  } else if (bisTier === "solid") {
    bottom = `${firstName} is a capable rotation player (BIS ${bis.toFixed(0)}) — you know what you're getting. Average production with clear upside if the identified development areas improve rather than plateau.`;
  } else if (bisTier === "below_avg") {
    bottom = `${firstName} fills a limited niche for the ${p.team_name} (BIS ${bis.toFixed(0)}, ${percentilePhrase(bis)}). His value is real but narrow — a developing piece who needs measurable improvement to hold a rotation spot on a contending team.`;
  } else {
    bottom = `${firstName} is a significant weakness this season. At BIS ${bis.toFixed(0)} (${percentilePhrase(bis)}), the production doesn't justify significant minutes on a competitive team. Either a role change or major skill development is needed to remain in the rotation.`;
  }
  sections.push({ title: "The Verdict", content: bottom });

  // === PROJECTION NOTE ===
  const projectionNote = buildProjectionNote(p, bis, scores.drs, scores.sps);

  return { headline, sections, tags, projectionNote };
}
