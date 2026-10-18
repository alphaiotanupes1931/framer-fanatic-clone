import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { getAdminToken, refreshAdminUnlocked } from "@/lib/admin-gate";
import { adminRpc } from "@/lib/admin-site.functions";
import { formatBytes, monthlyStorageCharge, FILE_STORAGE_CREDITS_PER_GB_HOUR } from "@/lib/usage-metrics";

// Pro plan base price per credit, and the monthly Cloud credits included on every plan.
const DOLLARS_PER_CREDIT = 0.25;
const MONTHLY_INCLUDED_CREDITS = 20;
import { DailyBars, StatCard } from "@/components/admin/usage-bits";

export const Route = createFileRoute("/admin/storage")({
  component: AdminStoragePage,
  head: () => ({ meta: [{ title: "Admin: Storage - Planet Baltimore" }] }),
});

type Month = { month: string; gb_hours: number; end_bytes: number; added_bytes: number };
type Summary = { bucket: string; kind: string; files: number; bytes: number };
type Daily = { day: string; files: number; bytes: number };
type Uploader = { user_id: string; display_name: string | null; username: string | null; files: number; bytes: number };

function fillDays(rows: Daily[], days: number) {
  const map = new Map(rows.map((r) => [r.day, r]));
  const out: { label: string; value: number; files: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toLocaleDateString("en-CA", { timeZone: "America/New_York" });
    const r = map.get(d);
    out.push({ label: d, value: Number(r?.bytes ?? 0), files: Number(r?.files ?? 0) });
  }
  return out;
}

function AdminStoragePage() {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);
  const [days, setDays] = useState(30);
  const [summary, setSummary] = useState<Summary[]>([]);
  const [daily, setDaily] = useState<Daily[]>([]);
  const [top, setTop] = useState<Uploader[]>([]);
  const [months, setMonths] = useState<Month[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { void refreshAdminUnlocked().then((u) => { setOk(u); if (!u) navigate({ to: "/admin/login" }); }); }, [navigate]);

  useEffect(() => {
    if (!ok) return;
    (async () => {
      setLoading(true);
      try {
        const t = getAdminToken();
        const [s, d, u, mo] = await Promise.all([
          adminRpc({ data: { name: "admin_storage_summary", adminToken: t } }),
          adminRpc({ data: { name: "admin_storage_daily", args: { _days: days }, adminToken: t } }),
          adminRpc({ data: { name: "admin_storage_top_uploaders", args: { _limit: 10 }, adminToken: t } }),
          adminRpc({ data: { name: "admin_storage_monthly", adminToken: t } }),
        ]);
        setMonths((mo.data as Month[]) ?? []);
        setSummary((s.data as Summary[]) ?? []);
        setDaily((d.data as Daily[]) ?? []);
        setTop((u.data as Uploader[]) ?? []);

      } catch (e) { toast.error((e as Error).message); }
      setLoading(false);
    })();
  }, [ok, days]);

  const total = summary.reduce((a, r) => a + Number(r.bytes), 0);
  const totalFiles = summary.reduce((a, r) => a + Number(r.files), 0);
  const byKind = useMemo(() => {
    const m = new Map<string, { files: number; bytes: number }>();
    for (const r of summary) { const c = m.get(r.kind) ?? { files: 0, bytes: 0 }; c.files += Number(r.files); c.bytes += Number(r.bytes); m.set(r.kind, c); }
    return [...m.entries()].sort((a, b) => b[1].bytes - a[1].bytes);
  }, [summary]);
  const filled = fillDays(daily, days);
  const periodBytes = filled.reduce((a, r) => a + r.value, 0);
  const today = filled[filled.length - 1];

  const monthRows = months.map((m) => {
    const start = new Date(m.month + "T00:00:00");
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const hours = (end.getTime() - start.getTime()) / 3600000;
    const includedGb = MONTHLY_INCLUDED_CREDITS / (FILE_STORAGE_CREDITS_PER_GB_HOUR * hours);
    const avgGb = Number(m.gb_hours) / hours;
    return { ...m, includedGb, overGb: Math.max(0, avgGb - includedGb), label: start.toLocaleDateString("en-US", { month: "long", year: "numeric" }), ...monthlyStorageCharge(Number(m.gb_hours), hours, includedGb, DOLLARS_PER_CREDIT) };
  });
  const includedNow = monthRows[0]?.includedGb ?? MONTHLY_INCLUDED_CREDITS / (FILE_STORAGE_CREDITS_PER_GB_HOUR * 720);
  const remainingBytes = Math.max(0, includedNow * 1024 ** 3 - total);

  return (
    <AdminShell title="Storage" subtitle="Space used by photos, videos, PDFs and other uploads">
      {loading ? <div className="p-8 text-sm text-neutral-500">Loading...</div> : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <StatCard label="Included storage" value={`${Math.round(includedNow)} GB`} hint={`Using ${formatBytes(total)} now`} />
            <StatCard label="Left before extra charges" value={formatBytes(remainingBytes)} hint="Resets on the 1st of each month" />
            <StatCard label="Additional storage cost this month" value={`$${(monthRows[0]?.dollars ?? 0).toFixed(2)}`} hint="Only storage above the included amount" />
          </div>
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="text-sm font-semibold text-neutral-900">Additional storage cost by month</h2>
            <p className="mt-1 text-xs text-neutral-500">Updates as people upload. Only storage above the included amount is charged.</p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-neutral-500"><tr><th className="py-2">Month</th><th>Stored at end</th><th>Added</th><th>Included</th><th>Over included</th><th className="text-right">Additional cost</th></tr></thead>
                <tbody className="divide-y divide-neutral-100">
                  {monthRows.map((m) => (
                    <tr key={m.month}>
                      <td className="py-2 font-medium text-neutral-900">{m.label}</td>
                      <td className="text-neutral-700">{formatBytes(Number(m.end_bytes))}</td>
                      <td className="text-neutral-700">{formatBytes(Number(m.added_bytes))}</td>
                      <td className="text-neutral-700">{Math.round(m.includedGb)} GB</td>
                      <td className="text-neutral-700">{m.overGb > 0 ? `${m.overGb.toFixed(2)} GB` : "None"}</td>
                      <td className="text-right font-semibold text-neutral-900">${m.dollars.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Total used" value={formatBytes(total)} hint={`${totalFiles.toLocaleString()} files`} />
            <StatCard label="Added today" value={formatBytes(today?.value ?? 0)} hint={`${today?.files ?? 0} files`} />
            <StatCard label={`Last ${days} days`} value={formatBytes(periodBytes)} />
            <StatCard label="Daily average" value={formatBytes(periodBytes / days)} />
          </div>
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900">Daily uploads</h2>
              <div className="flex gap-1">
                {[7, 30, 90].map((d) => (
                  <button key={d} onClick={() => setDays(d)} className={`rounded-full px-3 py-1 text-xs font-medium ${days === d ? "bg-rose-600 text-white" : "border border-rose-200 bg-white text-rose-700"}`}>{d} days</button>
                ))}
              </div>
            </div>
            <DailyBars rows={filled} format={formatBytes} />
          </section>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">By file type</h2>
              <ul className="space-y-2">
                {byKind.map(([k, v]) => (
                  <li key={k}>
                    <div className="flex justify-between text-sm"><span className="text-neutral-800">{k}</span><span className="text-neutral-600">{formatBytes(v.bytes)} · {v.files.toLocaleString()} files</span></div>
                    <div className="mt-1 h-1.5 rounded-full bg-neutral-100"><div className="h-full rounded-full bg-rose-500" style={{ width: `${total ? (v.bytes / total) * 100 : 0}%` }} /></div>
                  </li>
                ))}
              </ul>
            </section>
            <section className="rounded-xl border border-neutral-200 bg-white p-5">
              <h2 className="mb-3 text-sm font-semibold text-neutral-900">Biggest uploaders</h2>
              <ul className="divide-y divide-neutral-100">
                {top.map((u) => (
                  <li key={u.user_id} className="flex justify-between py-2 text-sm">
                    <span className="text-neutral-800">{u.display_name ?? u.username ?? "Unknown"}</span>
                    <span className="text-neutral-600">{formatBytes(Number(u.bytes))} · {Number(u.files).toLocaleString()} files</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
