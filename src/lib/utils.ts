import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Hosted assets need an absolute project URL on external deployments.
const ASSET_ORIGIN = "https://project--16fbc371-fc48-45be-a38e-cfde7916c8b6-dev.lovable.app";

// Canonical public site. Auth links (password reset, email confirm) should land
// on our own domain, not a builder/preview URL.
const CANONICAL_SITE_URL = "https://www.planetbaltimore.com";

export function siteUrl(path = "/"): string {
  const suffix = path.startsWith("/") ? path : `/${path}`;
  if (typeof window === "undefined") return `${CANONICAL_SITE_URL}${suffix}`;
  const host = window.location.hostname;
  const isLocal = host === "localhost" || host === "127.0.0.1" || host.endsWith(".local");
  // Only local development stays on its own origin; every shared/public link
  // must use the canonical domain.
  if (isLocal) return `${window.location.origin}${suffix}`;
  return `${CANONICAL_SITE_URL}${suffix}`;
}

export function assetUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("/__l5e/")) return `${ASSET_ORIGIN}${url}`;
  return url;
}

// Strip any accidental "Lovable" branding from error messages surfaced to users,
// and hide payment-processor internals (dashboard links, platform-profile setup
// notices) that customers should never see.
export function sanitizeErrorMessage(input: unknown, fallback = "Something went wrong"): string {
  const raw = input instanceof Error ? input.message : typeof input === "string" ? input : "";
  if (!raw) return fallback;
  const lower = raw.toLowerCase();
  if (
    lower.includes("platform-profile") ||
    lower.includes("responsibilities of managing losses") ||
    lower.includes("connected accounts at")
  ) {
    return "Payouts are being finalized on our end. Please try again shortly or email help@planetbaltimore.com.";
  }
  return raw
    .replace(/https?:\/\/[^\s]*lovable\.app[^\s]*/gi, "Planet Baltimore")
    .replace(/lovable\s+cloud/gi, "Planet Baltimore")
    .replace(/lovable/gi, "Planet Baltimore")
    .replace(/https?:\/\/(dashboard|api)\.stripe\.com[^\s]*/gi, "")
    .replace(/\bstripe\b/gi, "our payments partner")
    .replace(/\s{2,}/g, " ")
    .trim();
}
