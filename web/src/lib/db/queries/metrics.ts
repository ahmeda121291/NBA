import { eq, and, desc } from "drizzle-orm";
import { db } from "..";
import {
  playerMetricSnapshots,
  teamMetricSnapshots,
  explanations,
} from "../schema";

export async function getLatestPlayerMetrics(playerId: number, seasonId: number) {
  const [metrics] = await db
    .select()
    .from(playerMetricSnapshots)
    .where(
      and(
        eq(playerMetricSnapshots.playerId, playerId),
        eq(playerMetricSnapshots.seasonId, seasonId)
      )
    )
    .orderBy(desc(playerMetricSnapshots.asOfDate))
    .limit(1);
  return metrics ?? null;
}

export async function getPlayerMetricHistory(
  playerId: number,
  seasonId: number,
  limit = 30
) {
  return db
    .select()
    .from(playerMetricSnapshots)
    .where(
      and(
        eq(playerMetricSnapshots.playerId, playerId),
        eq(playerMetricSnapshots.seasonId, seasonId)
      )
    )
    .orderBy(desc(playerMetricSnapshots.asOfDate))
    .limit(limit);
}

export async function getLatestTeamMetrics(teamId: number, seasonId: number) {
  const [metrics] = await db
    .select()
    .from(teamMetricSnapshots)
    .where(
      and(
        eq(teamMetricSnapshots.teamId, teamId),
        eq(teamMetricSnapshots.seasonId, seasonId)
      )
    )
    .orderBy(desc(teamMetricSnapshots.asOfDate))
    .limit(1);
  return metrics ?? null;
}

export async function getExplanation(
  entityType: string,
  entityId: number,
  explanationType?: string
) {
  const conditions = [
    eq(explanations.entityType, entityType),
    eq(explanations.entityId, entityId),
  ];
  if (explanationType) {
    conditions.push(eq(explanations.explanationType, explanationType));
  }

  const [explanation] = await db
    .select()
    .from(explanations)
    .where(and(...conditions))
    .orderBy(desc(explanations.generatedAt))
    .limit(1);
  return explanation ?? null;
}

export async function getFeaturedInsights(limit = 10) {
  return db
    .select()
    .from(explanations)
    .where(eq(explanations.isFeatured, true))
    .orderBy(desc(explanations.generatedAt))
    .limit(limit);
}
