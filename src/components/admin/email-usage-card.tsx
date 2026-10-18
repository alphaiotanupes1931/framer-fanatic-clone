import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { getAdminToken } from "@/lib/admin-gate";

export function EmailUsageCard() {
  const [u, setU] = useState<null | { sentMonth: number; sentToday: number; monthlyCap: number; leftMonth: number }>(null);
  useEffect(() => {
    (async () => {
      try {
        const { getEmailUsage } = await import("@/lib/admin-email-groups.functions");
        setU(await getEmailUsage({ data: { adminToken: getAdminToken() } }));
      } catch (e) { toast.error((e as Error).message); }
    })();
  }, []);
  return (
    <section className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">Emails this month</div>
      {!u ? <Loader2 className="mt-2 h-4 w-4 animate-spin text-neutral-400" /> : (
        <>
          <div className="mt-2 grid grid-cols-3 gap-3">
            <div><div className="text-2xl font-semibold text-neutral-900">{u.leftMonth.toLocaleString()}</div><div className="text-xs text-neutral-500">left this month (of {u.monthlyCap.toLocaleString()})</div></div>
            <div><div className="text-2xl font-semibold text-neutral-900">{u.sentMonth.toLocaleString()}</div><div className="text-xs text-neutral-500">sent this month</div></div>
            <div><div className="text-2xl font-semibold text-neutral-900">{u.sentToday.toLocaleString()}</div><div className="text-xs text-neutral-500">sent today</div></div>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-neutral-100">
            <div className="h-1.5 rounded-full bg-orange" style={{ width: `${Math.min(100, (u.sentMonth / u.monthlyCap) * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-neutral-500">No daily or hourly limit. Resets on the 1st of each month.</p>
        </>
      )}
    </section>
  );
}
