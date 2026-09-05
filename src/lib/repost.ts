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


/** The id of my repost row for a target, or null when I have not reposted it. */
export async function myRepostId(target: { postId?: string | null; eventId?: string | null }): Promise<string | null> {
  const uid = await currentUserId();
  if (!uid) return null;
  const col = target.eventId ? "repost_of_event_id" : "repost_of_post_id";
  const value = target.eventId ?? target.postId;
  if (!value) return null;
  const { data } = await supabase
    .from("posts")
    .select("id")
    .eq("user_id", uid)
    .eq("is_deleted", false)
    .eq(col, value)
    .maybeSingle();
  return data?.id ?? null;
}

/** Instagram style: reposting again removes the repost. Returns the new state. */
export async function toggleRepostPost(originalPostId: string): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to repost");
  const { data: original } = await supabase
    .from("posts")
    .select("id, repost_of_post_id, repost_of_event_id")
    .eq("id", originalPostId)
    .maybeSingle();
  const targetEventId = original?.repost_of_post_id ? null : original?.repost_of_event_id ?? null;
  const targetPostId = targetEventId ? null : original?.repost_of_post_id ?? originalPostId;

  const existingId = await myRepostId({ postId: targetPostId, eventId: targetEventId });
  if (existingId) {
    const { error } = await supabase.from("posts").delete().eq("id", existingId);
    if (error) throw error;
    return false;
  }
  await repostPost(originalPostId);
  return true;
}

export async function toggleRepostEvent(eventId: string): Promise<boolean> {
  const uid = await currentUserId();
  if (!uid) throw new Error("Sign in to repost");
  const existingId = await myRepostId({ eventId });
  if (existingId) {
    const { error } = await supabase.from("posts").delete().eq("id", existingId);
    if (error) throw error;
    return false;
  }
  await repostEvent(eventId);
  return true;
}
