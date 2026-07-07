import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Default fallback values so the site renders before/without any DB rows.
export const SITE_CONTENT_DEFAULTS: Record<string, string> = {
  "hero.line1": "Baltimore is",
  "hero.line2": "extraordinary",
  "hero.subtitle": "We all deserve to experience more of it.",
  "hero.cta": "Get Started",
  "quote.text":
    "Planet Baltimore provides a space for artists to sustain ourselves by connecting us directly to our own communities.",
  "quote.author": "Terrell Speaks",
};

export const SITE_CONTENT_KEYS = Object.keys(SITE_CONTENT_DEFAULTS);

export function useSiteContent() {
  const [content, setContent] = useState<Record<string, string>>(SITE_CONTENT_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    })();
    return () => { cancelled = true; };
  }, []);

  return { content, loading };
}

export function siteText(content: Record<string, string>, key: string): string {
  return content[key] ?? SITE_CONTENT_DEFAULTS[key] ?? "";
}