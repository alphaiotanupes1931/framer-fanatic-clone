import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicEventMeta = {
  id: string;
  title: string;
  description: string | null;
  venueName: string | null;
  address: string | null;
  location: string | null;
  neighborhood: string | null;
  imageUrl: string | null;
  startsAt: string;
  endsAt: string | null;
  priceCents: number | null;
  isPublished: boolean;
  status: string | null;
  hostName: string | null;
  hostUsername: string | null;
} | null;

/**
 * Public, unauthenticated read used by the event route loader so crawlers get
 * real title/description/JSON-LD on first paint.
 */
export const getPublicEvent = createServerFn({ method: "GET" })
  .inputValidator((input: { eventId: string }) => {
    if (!input?.eventId) throw new Error("eventId is required");
    return input;
  })
  .handler(async ({ data }): Promise<PublicEventMeta> => {
    const supabasePublic = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: evt } = await supabasePublic
      .from("events")
      .select("id, user_id, title, description, venue_name, address, location, neighborhood, image_url, starts_at, ends_at, price_cents, is_published, status")
      .eq("id", data.eventId)
      .maybeSingle();
    if (!evt) return null;

    const { data: host } = await supabasePublic
      .from("profiles_public" as never)
      .select("display_name, username")
      .eq("id", evt.user_id)
      .maybeSingle();

    const h = (host ?? null) as { display_name: string | null; username: string | null } | null;

    return {
      id: evt.id,
      title: evt.title,
      description: evt.description ?? null,
      venueName: evt.venue_name ?? null,
      address: evt.address ?? null,
      location: evt.location ?? null,
      neighborhood: evt.neighborhood ?? null,
      imageUrl: evt.image_url ?? null,
      startsAt: evt.starts_at,
      endsAt: evt.ends_at ?? null,
      priceCents: evt.price_cents ?? null,
      isPublished: evt.is_published !== false,
      status: evt.status ?? null,
      hostName: h?.display_name ?? null,
      hostUsername: h?.username ?? null,
    };
  });
