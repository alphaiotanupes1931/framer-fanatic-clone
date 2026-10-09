import { useCallback, useEffect, useState } from "react";
import { Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EMAIL_BATCH_LIMIT, EMAIL_WINDOW_MINUTES, formatWait, type EmailQuota } from "@/lib/email-quota";

/** Reads the signed-in person's invite allowance and ticks a live countdown. */
export function useEmailQuota(active = true) {
  const [quota, setQuota] = useState<EmailQuota>({ remaining: EMAIL_BATCH_LIMIT, waitSeconds: 0, limit: EMAIL_BATCH_LIMIT });

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    const res = await fetch("/lovable/email/transactional/send", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => null);
    if (res?.ok) setQuota(await res.json());
  }, []);

  useEffect(() => { if (active) void refresh(); }, [active, refresh]);

  useEffect(() => {
    if (quota.waitSeconds <= 0) return;
    const id = setInterval(() => {
      setQuota((q) => {
        const w = q.waitSeconds - 1;
        if (w <= 0) { void refresh(); return { ...q, waitSeconds: 0 }; }
        return { ...q, waitSeconds: w };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [quota.waitSeconds > 0, refresh]);

  return { quota, refresh };
}

export function EmailQuotaNotice({ quota }: { quota: EmailQuota }) {
  const waiting = quota.remaining <= 0 && quota.waitSeconds > 0;
  if (!waiting) return null;
  return (
    <div className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-xs ${waiting ? "border-primary/40 bg-primary/5 text-foreground" : "border-border text-muted-foreground"}`}>
      <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {waiting ? (
        <span>
          You've sent your batch of {quota.limit}. You can send more in{" "}
          <strong className="tabular-nums">{formatWait(quota.waitSeconds)}</strong>.
        </span>
      ) : (
        <span>
          You can send up to {quota.limit} emails every {EMAIL_WINDOW_MINUTES} minutes. {quota.remaining} left right now.
        </span>
      )}
    </div>
  );
}
