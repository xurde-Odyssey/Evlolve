import "server-only";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function allowCommunicationRequest(userId: string, operation: string, limit: number, windowMs = 60_000) {
  const key = `${userId}:${operation}`;
  const now = Date.now();
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= limit) return false;
  current.count += 1;
  return true;
}

export function clearCommunicationRateLimitForTests() {
  buckets.clear();
}
