import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

const redis = getRedis();

const limiters = new Map<string, Ratelimit>();

/** Matches @upstash/ratelimit `Duration` template type */
type RateWindow = `${number} s` | `${number} m` | `${number} h` | `${number} d`;

function msToDuration(ms: number): RateWindow {
  const seconds = Math.max(1, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s` as RateWindow;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} m` as RateWindow;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h` as RateWindow;
  const days = Math.round(hours / 24);
  return `${Math.max(1, days)} d` as RateWindow;
}

function getLimiter(limit: number, windowMs: number): Ratelimit | null {
  if (!redis) return null;
  const key = `${limit}:${windowMs}`;
  let rl = limiters.get(key);
  if (!rl) {
    rl = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, msToDuration(windowMs)),
      prefix: "appointment-ai:rl",
    });
    limiters.set(key, rl);
  }
  return rl;
}

/**
 * Distributed rate limit when UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set.
 * Falls back to in-process sliding window for local dev without Redis.
 */
export async function checkRateLimit(identifier: string, limit: number, windowMs: number): Promise<boolean> {
  const rl = getLimiter(limit, windowMs);
  if (rl) {
    const { success, pending } = await rl.limit(identifier);
    void pending;
    return success;
  }

  const now = Date.now();
  const bucket = memoryBuckets.get(identifier);
  if (!bucket || now > bucket.resetAt) {
    memoryBuckets.set(identifier, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}
