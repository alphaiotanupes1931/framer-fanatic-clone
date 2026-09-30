import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { getAdminToken } from "@/lib/admin-gate";
import { Loader2, MailX, Search as SearchIcon, Download } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/blocked-emails")({
  component: AdminBlockedEmailsPage,
  head: () => ({ meta: [{ title: "Blocked emails - Admin - Planet Baltimore" }] }),
});

type BlockedEmail = {
  id: string;
  email: string;
  reason: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

const REASON_STYLES: Record<string, string> = {
  unsubscribe: "bg-amber-100 text-amber-800",
  bounce: "bg-rose-100 text-rose-700",
  complaint: "bg-red-100 text-red-700",
  provider_suppressed: "bg-neutral-200 text-neutral-700",
};

function reasonLabel(reason: string) {
  switch (reason) {
    case "unsubscribe":
      return "Unsubscribed";
    case "bounce":
      return "Bounced";
    case "complaint":
      return "Marked as spam";
    case "provider_suppressed":
      return "Rejected by email service";
    default:
      return reason;
  }
}

function AdminBlockedEmailsPage() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [gateChecked, setGateChecked] = useState(false);
  const [rows, setRows] = useState<BlockedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [reasonFilter, setReasonFilter] = useState<string>("all");

  useEffect(() => {
    (async () => {
      const { refreshAdminUnlocked } = await import("@/lib/admin-gate");
      const ok = await refreshAdminUnlocked();
      setUnlocked(ok);
      setGateChecked(true);
      if (!ok) navigate({ to: "/admin/login" });
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("suppressed_emails")
      .select("id, email, reason, created_at, metadata")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as BlockedEmail[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (unlocked) void load();
  }, [unlocked]);

  const reasons = useMemo(() => Array.from(new Set(rows.map((r) => r.reason))), [rows]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (reasonFilter !== "all" && r.reason !== reasonFilter) return false;
      if (!s) return true;
      return r.email.toLowerCase().includes(s);
    });
  }, [rows, q, reasonFilter]);

  if (!gateChecked || !unlocked) {
    return (
      <AdminShell title="Blocked emails">
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Redirecting to admin login...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      title="Blocked emails"
      subtitle="People who unsubscribed, whose address bounces, or who marked Planet Baltimore email as spam. We no longer send email to these addresses."
    >
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Stat label="Total blocked" value={rows.length} />
        <Stat label="Unsubscribed" value={rows.filter((r) => r.reason === "unsubscribe").length} accent="bg-amber-500" />
        <Stat label="Bounced" value={rows.filter((r) => r.reason === "bounce").length} accent="bg-rose-500" />
        <Stat label="Marked as spam" value={rows.filter((r) => r.reason === "complaint").length} accent="bg-red-500" />
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-3 rounded-full border border-neutral-200 bg-white px-4 py-2.5">
          <SearchIcon className="h-4 w-4 text-neutral-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email address"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-neutral-400"
          />
          <button
            onClick={load}
            className="rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Refresh
          </button>
        </div>
        <select
          value={reasonFilter}
          onChange={(e) => setReasonFilter(e.target.value)}
          className="rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-xs font-medium text-neutral-700"
        >
          <option value="all">All reasons</option>
          {reasons.map((r) => (
            <option key={r} value={r}>
              {reasonLabel(r)}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            const csv = [["Email", "Reason", "Blocked on"]]
              .concat(filtered.map((r) => [r.email, reasonLabel(r.reason), new Date(r.created_at).toLocaleString()]))
              .map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
              .join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "planet-baltimore-blocked-emails.csv";
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Exported " + filtered.length + " blocked emails");
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <Download className="h-3.5 w-3.5" /> Export
        </button>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <div className="grid grid-cols-[1.6fr_1fr_1fr] gap-3 border-b border-neutral-100 bg-neutral-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
          <div>Email</div>
          <div>Reason</div>
          <div className="text-right">Blocked on</div>
        </div>
        {loading ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-500">
            <Loader2 className="mx-auto h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-neutral-500">
            <MailX className="mx-auto mb-2 h-5 w-5 text-neutral-300" />
            No blocked emails found.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {filtered.map((r) => (
              <li key={r.id} className="grid grid-cols-[1.6fr_1fr_1fr] items-center gap-3 px-4 py-3 text-sm">
                <div className="min-w-0 truncate font-medium text-neutral-900">{r.email}</div>
                <div>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                      REASON_STYLES[r.reason] ?? "bg-neutral-100 text-neutral-600"
                    }`}
                  >
                    {reasonLabel(r.reason)}
                  </span>
                </div>
                <div className="text-right text-[11px] text-neutral-500">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AdminShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2">
        {accent && <span className={`h-2 w-2 rounded-full ${accent}`} />}
        <div className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{label}</div>
      </div>
      <div className="mt-1 text-2xl font-semibold text-neutral-900">{value}</div>
    </div>
  );
}
