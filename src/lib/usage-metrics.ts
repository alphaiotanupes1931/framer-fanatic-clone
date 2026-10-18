export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  let v = bytes;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v >= 100 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

export const GB = 1024 ** 3;

/** Usage against an admin-entered limit. Warn at 80%, over at 100%. */
export function usageLevel(used: number, limit: number | null) {
  if (!limit || limit <= 0) return { percent: null as number | null, remaining: null as number | null, state: "unset" as const };
  const percent = (used / limit) * 100;
  const remaining = Math.max(limit - used, 0);
  const state = percent >= 100 ? ("over" as const) : percent >= 80 ? ("warn" as const) : ("ok" as const);
  return { percent, remaining, state };
}

export function parseLimit(v: unknown): number | null {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Current Cloud file storage rate, in credits per GB-hour. */
export const FILE_STORAGE_CREDITS_PER_GB_HOUR = 0.00014384;

/** Storage charge for one month: only GB-hours above the free GB line are billed. */
export function monthlyStorageCharge(gbHours: number, hoursInMonth: number, freeGb: number, dollarsPerCredit: number) {
  const billableGbHours = Math.max(0, gbHours - Math.max(0, freeGb) * hoursInMonth);
  const credits = billableGbHours * FILE_STORAGE_CREDITS_PER_GB_HOUR;
  return { billableGbHours, credits, dollars: credits * Math.max(0, dollarsPerCredit) };
}
