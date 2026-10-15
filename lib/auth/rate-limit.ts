const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

type Bucket = { count: number; until: number };

/**
 * Per-instance lockout, same model as SOLVED Studio's middleware.
 * Serverless isolates do not share this map, so it is best-effort per process.
 */
const attempts = new Map<string, Bucket>();

function prune(now: number) {
  for (const [key, value] of attempts) {
    if (now > value.until) attempts.delete(key);
  }
}

export function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

export function loginAttemptAllowed(
  ip: string,
): { ok: true } | { ok: false; retryAfter: number } {
  const now = Date.now();
  prune(now);
  const bucket = attempts.get(ip);
  if (bucket && bucket.count >= MAX_ATTEMPTS) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((bucket.until - now) / 1000)),
    };
  }
  return { ok: true };
}

export function recordFailedLogin(ip: string) {
  const now = Date.now();
  prune(now);
  const existing = attempts.get(ip);
  const bucket =
    existing && now <= existing.until
      ? existing
      : { count: 0, until: now + WINDOW_MS };
  bucket.count += 1;
  attempts.set(ip, bucket);
}

export function clearFailedLogins(ip: string) {
  attempts.delete(ip);
}
