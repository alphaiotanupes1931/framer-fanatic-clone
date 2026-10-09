// Shared limits for emails a person sends to other people (invites).
// Keeps one sender from burning through the monthly email allowance.
export const EMAIL_BATCH_LIMIT = 50_000; // effectively no cap; matches the monthly allowance
export const EMAIL_WINDOW_MINUTES = 15;
export const QUOTA_TEMPLATES = new Set(["referral-invite", "event-invitation"]);

export type EmailQuota = { remaining: number; waitSeconds: number; limit: number };

/** Given send times inside the window, how many remain and how long to wait. */
export function computeQuota(sentAtMs: number[], nowMs: number): EmailQuota {
  const windowMs = EMAIL_WINDOW_MINUTES * 60_000;
  const recent = sentAtMs.filter((t) => nowMs - t < windowMs).sort((a, b) => a - b);
  const remaining = Math.max(0, EMAIL_BATCH_LIMIT - recent.length);
  const waitSeconds = remaining > 0 ? 0 : Math.ceil((recent[0] + windowMs - nowMs) / 1000);
  return { remaining, waitSeconds, limit: EMAIL_BATCH_LIMIT };
}

export function formatWait(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${String(s).padStart(2, "0")}s` : `${s}s`;
}
