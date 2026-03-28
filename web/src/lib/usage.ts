import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { auth, isPro } from "@/lib/auth";

// We'll track usage via a simple table. First, we need to create it.
// For now, use a simple approach: store usage counts in a lightweight table.

export type FeatureKey = "studio" | "compare";

const DAILY_LIMITS: Record<FeatureKey, number> = {
  studio: 1, // 1 studio creation per day for free users
  compare: 5, // 5 comparisons per day for free users
};

/**
 * Check if the user can use a feature. Returns { allowed, remaining, limit }.
 * Pro users always get unlimited.
 */
export async function checkUsage(feature: FeatureKey): Promise<{
  allowed: boolean;
  remaining: number;
  limit: number;
}> {
  const pro = await isPro();
  const limit = DAILY_LIMITS[feature];

  if (pro) return { allowed: true, remaining: Infinity, limit };

  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return { allowed: false, remaining: 0, limit };

  const rows = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM usage_logs
    WHERE user_id = ${userId}
      AND feature = ${feature}
      AND created_at >= CURRENT_DATE
  `);

  const used = Number(rows[0]?.count ?? 0);
  return {
    allowed: used < limit,
    remaining: Math.max(0, limit - used),
    limit,
  };
}

/**
 * Record a usage event. Call this AFTER the action succeeds.
 */
export async function recordUsage(feature: FeatureKey): Promise<void> {
  const session = await auth();
  const userId = (session?.user as any)?.id;
  if (!userId) return;

  await db.execute(sql`
    INSERT INTO usage_logs (user_id, feature, created_at)
    VALUES (${userId}, ${feature}, NOW())
  `);
}
