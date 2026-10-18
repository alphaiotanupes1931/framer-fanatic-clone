import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { getAdminToken, refreshAdminUnlocked } from "@/lib/admin-gate";
import { adminRpc, saveSiteContent } from "@/lib/admin-site.functions";
import { supabase } from "@/integrations/supabase/client";
import { parseLimit } from "@/lib/usage-metrics";
import { DailyBars, StatCard, UsageBar } from "@/components/admin/usage-bits";
import { Button } from "@/components/ui/button";
import { EmailUsageCard } from "@/components/admin/email-usage-card";

export const Route = createFileRoute("/admin/email-usage")({
  component: AdminEmailUsagePage,
  head: () => ({ meta: [{ title: "Admin: Email Usage - Planet Baltimore" }] }),
});

const LIMIT_KEY = "admin_email_monthly_limit";
const PAGE = 50;
type Stat = { day: string; template_name: string; status: string; emails: number };
type LogRow = { message_id: string; template_name: string; recipient_email: string; status: string; error_message: string | null; created_at: string; total: number };

const STATUS_LABEL: Record<string, string> = { sent: "Sent", dlq: "Failed", failed: "Failed", suppressed: "Suppressed", pending: "Pending", bounced: "Bounced", complained: "Complained" };
const badge = (s: string) =>
  s === "sent" ? "bg-emerald-100 text-emerald-800" : s === "suppressed" ? "bg-amber-100 text-amber-800" : s === "pending" ? "bg-neutral-100 text-neutral-700" : "bg-red-100 text-red-800";
const pretty = (t: string) => t.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fmt = (n: number) => Math.round(n).toLocaleString();

function AdminEmailUsagePage() {
  const navigate = useNavigate();
  const [ok, setOk] = useState(false);
  const [preset, setPreset] = useState<"1" | "7" | "30" | "custom">("7");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [template, setTemplate] = useState("");
  const [status, setStatus] = useState("");
  const [templates, setTemplates] = useState<string[]>([]);
  const [stats, setStats] = useState<Stat[]>([]);
  const [month, setMonth] = useState<Stat[]>([]);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState<number | null>(null);

  useEffect(() => { void refreshAdminUnlocked().then((u) => { setOk(u); if (!u) navigate({ to: "/admin/login" }); }); }, [navigate]);

  const range = useMemo(() => {
    if (preset === "custom" && from && to) return { start: new Date(from + "T00:00:00"), end: new Date(new Date(to + "T00:00:00").getTime() + 86400000) };
    const days = preset === "custom" ? 7 : Number(preset);
    return { start: new Date(Date.now() - days * 86400000), end: new Date(Date.now() + 60000) };
  }, [preset, from, to]);

  useEffect(() => {
    if (!ok) return;
    const t = getAdminToken();
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    void Promise.all([
      adminRpc({ data: { name: "admin_email_templates", adminToken: t } }),
      adminRpc({ data: { name: "admin_email_stats", args: { _start: monthStart.toISOString(), _end: new Date(Date.now() + 60000).toISOString() }, adminToken: t } }),
      supabase.from("site_content").select("value").eq("key", LIMIT_KEY).maybeSingle(),
    ]).then(([tp, m, lim]) => {
      setTemplates(((tp.data as { template_name: string }[]) ?? []).map((r) => r.template_name));
      setMonth((m.data as Stat[]) ?? []);
      setLimit(parseLimit(lim.data?.value));
    }).catch((e) => toast.error((e as Error).message));
  }, [ok]);

  useEffect(() => {
    if (!ok) return;
    const t = getAdminToken();
    const args = { _start: range.start.toISOString(), _end: range.end.toISOString(), _template: template || null };
    void adminRpc({ data: { name: "admin_email_stats", args, adminToken: t } }).then((r) => setStats((r.data as Stat[]) ?? [])).catch((e) => toast.error((e as Error).message));
  }, [ok, range, template]);

  useEffect(() => {
    if (!ok) return;
    const args = { _start: range.start.toISOString(), _end: range.end.toISOString(), _template: template || null, _status: status || null, _limit: PAGE, _offset: page * PAGE };
    void adminRpc({ data: { name: "admin_email_log", args, adminToken: getAdminToken() } }).then((r) => setRows((r.data as LogRow[]) ?? [])).catch((e) => toast.error((e as Error).message));
  }, [ok, range, template, status, page]);

  useEffect(() => { setPage(0); }, [range, template, status]);

  const sum = (list: Stat[], pred: (s: string) => boolean) => list.filter((r) => pred(r.status)).reduce((a, r) => a + Number(r.emails), 0);
  const total = sum(stats, () => true);
  const sent = sum(stats, (s) => s === "sent");
  const failed = sum(stats, (s) => ["dlq", "failed", "bounced", "complained"].includes(s));
  const suppressed = sum(stats, (s) => s === "suppressed");
  const monthSent = sum(month, (s) => s !== "suppressed");

  const daily = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of stats) if (r.status === "sent") m.set(r.day, (m.get(r.day) ?? 0) + Number(r.emails));
    const out: { label: string; value: number }[] = [];
    for (let d = new Date(range.start); d < range.end; d = new Date(d.getTime() + 86400000)) {
      const k = d.toLocaleDateString("en-CA", { timeZone: "America/New_York" });
      if (!out.some((o) => o.label === k)) out.push({ label: k, value: m.get(k) ?? 0 });
    }
    return out;
  }, [stats, range]);

  const byType = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of stats) m.set(r.template_name, (m.get(r.template_name) ?? 0) + Number(r.emails));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [stats]);

  const totalRows = Number(rows[0]?.total ?? 0);

  const saveLimit = async (v: string) => {
    const n = parseLimit(v);
    await saveSiteContent({ data: { rows: [{ key: LIMIT_KEY, value: n ? String(n) : "" }], adminToken: getAdminToken() } });
    setLimit(n); toast.success("Plan limit saved");
  };

  const chip = (active: boolean) => `rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-rose-600 text-white" : "border border-rose-200 bg-white text-rose-700"}`;

  return (
    <AdminShell title="Email usage" subtitle="Emails sent this month and delivery results">
      <div className="space-y-6">
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">Client charge</div>
          <div className="mt-1 text-2xl font-bold text-neutral-900">$20 / month</div>
          <div className="mt-1 text-xs text-neutral-500">Email service on the upgraded plan</div>
        </div>
        <EmailUsageCard />
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">This month</div>
          <UsageBar used={monthSent} limit={limit} format={fmt} unitLabel="emails per month" onSaveLimit={saveLimit} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className={chip(preset === "1")} onClick={() => setPreset("1")}>Last 24h</button>
          <button className={chip(preset === "7")} onClick={() => setPreset("7")}>7 days</button>
          <button className={chip(preset === "30")} onClick={() => setPreset("30")}>30 days</button>
          <button className={chip(preset === "custom")} onClick={() => setPreset("custom")}>Custom</button>
          {preset === "custom" && (
            <>
              <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-8 rounded-md border border-neutral-300 px-2 text-xs" />
              <span className="text-xs text-neutral-500">to</span>
              <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-8 rounded-md border border-neutral-300 px-2 text-xs" />
            </>
          )}
          <select value={template} onChange={(e) => setTemplate(e.target.value)} className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-xs">
            <option value="">All email types</option>
            {templates.map((t) => <option key={t} value={t}>{pretty(t)}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-8 rounded-md border border-neutral-300 bg-white px-2 text-xs">
            <option value="">All statuses</option>
            <option value="sent">Sent</option>
            <option value="dlq">Failed</option>
            <option value="suppressed">Suppressed</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Total emails" value={fmt(total)} />
          <StatCard label="Sent" value={fmt(sent)} />
          <StatCard label="Failed" value={fmt(failed)} />
          <StatCard label="Suppressed" value={fmt(suppressed)} />
        </div>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">Emails sent per day</h2>
          <DailyBars rows={daily} format={(n) => `${fmt(n)} emails`} />
        </section>

        <section className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-semibold text-neutral-900">By email type</h2>
          <ul className="divide-y divide-neutral-100">
            {byType.map(([k, v]) => <li key={k} className="flex justify-between py-2 text-sm"><span className="text-neutral-800">{pretty(k)}</span><span className="text-neutral-600">{fmt(v)}</span></li>)}
          </ul>
        </section>

        <section className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-neutral-50 text-xs uppercase text-neutral-500">
                <tr><th className="px-4 py-2">Type</th><th className="px-4 py-2">Recipient</th><th className="px-4 py-2">Status</th><th className="px-4 py-2">Time</th><th className="px-4 py-2">Error</th></tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => (
                  <tr key={r.message_id}>
                    <td className="px-4 py-2 text-neutral-800">{pretty(r.template_name)}</td>
                    <td className="px-4 py-2 text-neutral-700">{r.recipient_email}</td>
                    <td className="px-4 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge(r.status)}`}>{STATUS_LABEL[r.status] ?? r.status}</span></td>
                    <td className="whitespace-nowrap px-4 py-2 text-neutral-600">{new Date(r.created_at).toLocaleString()}</td>
                    <td className="max-w-xs truncate px-4 py-2 text-xs text-red-700" title={r.error_message ?? ""}>{r.status !== "sent" ? r.error_message ?? "" : ""}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-500">No emails in this period.</td></tr>}
              </tbody>
            </table>
          </div>
          {totalRows > PAGE && (
            <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-2 text-xs text-neutral-600">
              <span>Page {page + 1} of {Math.ceil(totalRows / PAGE)}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Previous</Button>
                <Button size="sm" variant="outline" disabled={(page + 1) * PAGE >= totalRows} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
