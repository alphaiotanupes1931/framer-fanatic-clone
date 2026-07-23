import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Hosted assets need an absolute project URL on external deployments.
const ASSET_ORIGIN = "https://project--16fbc371-fc48-45be-a38e-cfde7916c8b6-dev.lovable.app";
export function assetUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith("/__l5e/")) return `${ASSET_ORIGIN}${url}`;
  return url;
}
