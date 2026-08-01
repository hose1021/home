const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 5;
const MAX_TRACKED_KEYS = 10_000;

type Attempt = { count: number; resetAt: number };
const attempts = new Map<string, Attempt>();

function key(ip: string | undefined, username: string): string {
  return `${ip ?? "unknown"}:${username}`;
}

export function isLoginRateLimited(ip: string | undefined, username: string, now = Date.now()): boolean {
  const attempt = attempts.get(key(ip, username));
  if (!attempt || attempt.resetAt <= now) {
    if (attempt) attempts.delete(key(ip, username));
    return false;
  }
  return attempt.count >= MAX_FAILURES;
}

export function recordLoginFailure(ip: string | undefined, username: string, now = Date.now()): void {
  if (attempts.size >= MAX_TRACKED_KEYS) {
    for (const [storedKey, attempt] of attempts) {
      if (attempt.resetAt <= now) attempts.delete(storedKey);
    }
  }
  const attemptKey = key(ip, username);
  const current = attempts.get(attemptKey);
  if (!current || current.resetAt <= now) {
    attempts.set(attemptKey, {count: 1, resetAt: now + WINDOW_MS});
    return;
  }
  current.count += 1;
}

export function clearLoginFailures(ip: string | undefined, username: string): void {
  attempts.delete(key(ip, username));
}
