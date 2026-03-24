import { redis } from "./redis";

interface CacheOptions {
  ttlSeconds: number;
  staleWhileRevalidateSeconds?: number;
}

const DEFAULT_TTL: Record<string, number> = {
  teams: 86400,        // 24h
  players: 86400,      // 24h
  seasonStats: 7200,   // 2h
  gameProjections: 7200, // 2h — refreshed before tip
  metrics: 14400,      // 4h
  rollingWindows: 14400, // 4h
  leaderboards: 3600,  // 1h
  explanations: 14400, // 4h
  schedule: 43200,     // 12h
  injuries: 1800,      // 30min
  search: 3600,        // 1h
};

export async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: CacheOptions
): Promise<T> {
  const ttl = options?.ttlSeconds ?? 3600;

  const cached = await redis.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  const fresh = await fetcher();
  await redis.set(key, fresh, { ex: ttl });
  return fresh;
}

export async function invalidateCache(pattern: string): Promise<void> {
  // For Upstash, we delete specific keys rather than pattern-scan
  await redis.del(pattern);
}

export async function invalidateCacheByPrefix(prefix: string): Promise<void> {
  // Scan for keys with prefix and delete them
  let cursor = 0;
  do {
    const result = await redis.scan(cursor, { match: `${prefix}*`, count: 100 });
    cursor = Number(result[0]);
    const keys = result[1];
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } while (cursor !== 0);
}

export function cacheKey(...parts: (string | number)[]): string {
  return `cv:${parts.join(":")}`;
}

export { DEFAULT_TTL };
