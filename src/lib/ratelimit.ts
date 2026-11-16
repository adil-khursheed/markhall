/**
 * In-memory sliding-window rate limiter, the same pattern as the sandbox's
 * own limiter. shortcut: per-process only, so limits reset on restart and do
 * not add up across replicas; switch the Map to Redis (REDIS_URL is already
 * wired through Compose) when the app runs on more than one instance.
 */

type Bucket = number[]

const buckets = new Map<string, Bucket>()

/** Returns true when allowed, false when the window is full. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const windowStart = now - windowMs
  const hits = (buckets.get(key) ?? []).filter((time) => time > windowStart)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  if (buckets.size > 5000) {
    // Drop stale buckets so the map cannot grow forever.
    for (const [bucketKey, times] of buckets) {
      if (times.every((time) => time <= windowStart)) buckets.delete(bucketKey)
    }
  }
  return true
}

/** Test hook: forget every window. */
export function clearRateLimits() {
  buckets.clear()
}
