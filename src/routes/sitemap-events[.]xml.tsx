import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SITE = "https://planetbaltimore.com";

/** Dynamic sitemap listing every upcoming published event detail page. */
export const Route = createFileRoute("/sitemap-events/xml")({
  server: {
    handlers: {
      GET: async () => {
        const supabasePublic = createClient<Database>(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_PUBLISHABLE_KEY"]!,
          { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
        );
        const { data } = await supabasePublic
          .from("events")
          .select("id, updated_at, starts_at")
          .eq("is_published", true)
          .gte("starts_at", new Date(Date.now() - 30 * 864e5).toISOString())
          .order("starts_at", { ascending: true })
          .limit(2000);

        const urls = (data ?? [])
          .map(
            (e) =>
              `  <url>\n    <loc>${SITE}/events/${e.id}</loc>\n    <lastmod>${new Date(e.updated_at ?? e.starts_at).toISOString().slice(0, 10)}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>0.7</priority>\n  </url>`,
          )
          .join("\n");

        const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`;
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
