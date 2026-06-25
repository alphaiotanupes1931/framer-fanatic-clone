import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Lovable-hosted assets are served from /__l5e/... only on lovable.app deployments.
// On other hosts (Vercel, custom domains) we must hit the absolute Lovable URL.
const LOVABLE_ASSET_ORIGIN = "https://framer-fanatic-clone.lovable.app";
export function assetUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("/__l5e/")) return `${LOVABLE_ASSET_ORIGIN}${url}`;
  return url;
}
