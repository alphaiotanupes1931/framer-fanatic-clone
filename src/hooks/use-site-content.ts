import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

const CACHE_KEY = "pb_site_content_v1";

// Default fallback values so the site renders before/without any DB rows.
export const SITE_CONTENT_DEFAULTS: Record<string, string> = {
  "hero.line1": "Baltimore is",
  "hero.line2": "extraordinary",
  "hero.subtitle": "We all deserve to experience more of it.",
  "hero.cta": "Get Started",
  "quote.text":
    "Planet Baltimore provides a space for artists to sustain ourselves by connecting us directly to our own communities.",
  "quote.author": "Terrell Speaks",
  "creators.headline.line1": "Turning passions",
  "creators.headline.line2": "into communities",
  "creators.card1.title": "Build Your Community",
  "creators.card1.body":
    "Connect directly with Baltimore. No algorithms. No middlemen. Just you and the people who support what you do.",
  "creators.card1.cta": "Start Building",
  "creators.card2.title": "Everything in One Place",
  "creators.card2.body":
    "Artists, businesses, neighborhoods, events. Follow what moves you. Support what matters. All of Baltimore, together.",
  "creators.card2.cta": "Explore",
  "features.heading": "Meet today's Baltimore.",
  "features.subtitle": "Three creators from the platform, refreshed every day.",
  "cta.line1": "Start free.",
  "cta.line2": "Get paid tomorrow.",
  "cta.button": "Get Started",
  "about.hero.title": "A platform for Baltimore's",
  "about.hero.italic": "artists and makers.",
  "about.story.heading": "Our Story",
  "about.story.p1":
    "Planet Baltimore was made so artists could finally have a platform of their own. A place that isn't an algorithm chasing strangers in another city, but a corner of the internet that actually belongs to the painters, rappers, photographers, chefs, DJs, poets, and organizers shaping this city block by block.",
  "about.story.p2":
    "Baltimore runs on creativity. From the murals in Station North to the line cooks in Hampden, the harbor stages and the basement shows, the Sunday cookouts and the Saturday markets, this city is made by people who make things. Planet Baltimore exists so those people can find each other, hire each other, support each other, and get paid without a middleman taking the cut.",
  "about.story.p3":
    "One platform. One city. Every creator on it lives here, works here, and gets to keep what they earn here.",
  "about.cta.heading": "Join the platform built for Baltimore.",
  "about.cta.primary": "Get Started",
  "about.cta.secondary": "Baltimore 100",
  // Landing / About color tokens. Hex values. Applied live via CSS variables.
  "colors.blue": "#1E3A5F",
  "colors.blueDeep": "#152C48",
  "colors.ink": "#1A1A1A",
  "colors.paper": "#FCFCFA",
  // Hero-specific overrides. Leave heroBg empty to keep the photo/video background.
  "colors.heroBg": "",
  "colors.heroText": "#FCFCFA",
  "hero.line1.color": "#FFFFFF",
  "hero.line2.color": "#FFFFFF",
  "creators.headline.line1.color": "#FFFFFF",
  "creators.headline.line2.color": "#FFFFFF",
  "creators.card1.title.color": "#FFFFFF",
  "creators.card1.body.color": "#FFFFFF",
  "creators.card1.cta.color": "#FFFFFF",
  "creators.card2.title.color": "#FFFFFF",
  "creators.card2.body.color": "#FFFFFF",
  "creators.card2.cta.color": "#FFFFFF",
  "features.heading.color": "#FFFFFF",
  "features.subtitle.color": "#FFFFFF",
  "colors.textOnBlue": "",
  "colors.textOnBlueDeep": "",
  "colors.textOnPaper": "",
};

export const SITE_CONTENT_KEYS = Object.keys(SITE_CONTENT_DEFAULTS);

export function useSiteContent() {
  // Always start from defaults so SSR and first client render match.
  // Cached values are merged in a post-hydration effect.
  const [content, setContent] = useState<Record<string, string>>(SITE_CONTENT_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Hydrate from localStorage after mount to avoid SSR/CSR mismatch.
    try {
      const raw = window.localStorage.getItem(CACHE_KEY);
      if (raw) setContent((prev) => ({ ...prev, ...JSON.parse(raw) }));
    } catch {}
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("site_content").select("key, value");
      if (cancelled) return;
      const merged = { ...SITE_CONTENT_DEFAULTS };
      (data || []).forEach((row: { key: string; value: unknown }) => {
        if (typeof row.value === "string") merged[row.key] = row.value;
        else if (row.value != null) merged[row.key] = String(row.value);
      });
      setContent(merged);
      setLoading(false);
      try { window.localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  return { content, loading };
}

export function siteText(content: Record<string, string>, key: string): string {
  return content[key] ?? SITE_CONTENT_DEFAULTS[key] ?? "";
}

/**
 * Returns the admin-set color override for a text key (stored under
 * `<key>.color`), or an empty string when no override is set. Consumers
 * should pass the return value through `style={{ color: value || undefined }}`
 * so the default token color still applies when empty.
 */
export function siteColor(content: Record<string, string>, key: string): string {
  const v = content[`${key}.color`];
  return typeof v === "string" ? v.trim() : "";
}