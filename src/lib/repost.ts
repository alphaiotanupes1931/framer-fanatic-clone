import { supabase } from "@/integrations/supabase/client";

/**
 * Reposting: a repost is a normal post row on the reposter's page that points
 * at the original post or event. The original author is always shown on the
 * embedded card, so credit stays with them.
 */

async function currentUserId(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function repostPost(originalPostId: string, note = "") {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to repost");

  // Never nest reposts: repost the underlying original instead.
  const { data: original } = await supabase
    .from("posts")
    .select("id, repost_of_post_id, repost_of_event_id")
    .eq("id", originalPostId)
    .maybeSingle();
  const targetPostId = original?.repost_of_post_id ?? originalPostId;
  const targetEventId = original?.repost_of_post_id ? null : original?.repost_of_event_id ?? null;

  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("user_id", uid)
    .eq("is_deleted", false)
    .eq(targetEventId ? "repost_of_event_id" : "repost_of_post_id", targetEventId ?? targetPostId)
    .maybeSingle();
  if (existing) throw new Error("You already reposted this");

  const { error } = await supabase.from("posts").insert({
    user_id: uid,
    content: note.trim(),
    post_type: "text",
    visibility: "public",
    media_urls: [],
    repost_of_post_id: targetEventId ? null : targetPostId,
    repost_of_event_id: targetEventId,
  });
  if (error) throw error;
}

export async function repostEvent(eventId: string, note = "") {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to repost");

  const { data: existing } = await supabase
    .from("posts")
    .select("id")
    .eq("user_id", uid)
    .eq("is_deleted", false)
    .eq("repost_of_event_id", eventId)
    .maybeSingle();
  if (existing) throw new Error("You already reposted this event");

  const { error } = await supabase.from("posts").insert({
    user_id: uid,
    content: note.trim(),
    post_type: "text",
    visibility: "public",
    media_urls: [],
    repost_of_event_id: eventId,
  });
  if (error) throw error;
}
