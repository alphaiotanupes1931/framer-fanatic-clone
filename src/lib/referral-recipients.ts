const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function parseReferralEmails(raw: string): string[] {
  return Array.from(new Set((raw.match(EMAIL_RE) ?? []).map((email) => email.toLowerCase())));
}

export function removeReferralEmails(raw: string, removed: string[]): string {
  const excluded = new Set(removed.map((email) => email.toLowerCase()));
  return parseReferralEmails(raw).filter((email) => !excluded.has(email)).join("\n");
}

export const referralRecipientsKey = (userId: string) => `planetbaltimore:referral-recipients:${userId}`;