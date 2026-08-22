import { supabase } from "@/integrations/supabase/client";

export type ShareOutcome = "attempt" | "success" | "partial" | "failure";

export type ShareLogEntry = {
  actorId: string;
  url?: string;
  title?: string | null;
  kind?: string | null;
  isRetry?: boolean;
  recipientCount: number;
  successCount?: number;
  failureCount?: number;
  failureReasons?: string[];
  outcome: ShareOutcome;
};

/**
 * Best-effort logging of share attempts and their outcomes.
 * Never throws: analytics must not break the share flow.
 */
export async function logShareEvent(entry: ShareLogEntry): Promise<void> {
  try {
    const payload = {
      actor_id: entry.actorId,
      share_url: entry.url ?? null,
      share_title: entry.title ?? null,
      share_kind: entry.kind ?? null,
      is_retry: entry.isRetry ?? false,
      recipient_count: entry.recipientCount,
      success_count: entry.successCount ?? 0,
      failure_count: entry.failureCount ?? 0,
      failure_reasons: (entry.failureReasons ?? []).slice(0, 10).map((r) => String(r).slice(0, 300)),
      outcome: entry.outcome,
    };
    console.info("[share]", payload);
    const { error } = await supabase.from("share_events").insert(payload);
    if (error) console.warn("[share] log failed", error.message);
  } catch (e) {
    console.warn("[share] log threw", e);
  }
}
