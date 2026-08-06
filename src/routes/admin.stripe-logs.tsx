import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin-shell";
import { getAdminToken, refreshAdminUnlocked } from "@/lib/admin-gate";
import { adminRpc } from "@/lib/admin-site.functions";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowLeft, Loader2, RefreshCw, Search as SearchIcon, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/admin/stripe-logs")({
  component: AdminStripeLogsPage,
  head: () => ({ meta: [{ title: "Admin: Payment logs - Planet Baltimore" }] }),
});

type LogRow = {
  id: string;
  source: "webhook" | "api" | string;
  event_type: string;
  event_id: string | null;
  status: "ok" | "error" | string;
  message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

function AdminStripeLogsPage() {
  const navigate = useNavigate();
  const [gateChecked, setGateChecked] = useState(false);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "error" | "ok">("all");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    (async () => {
      const ok = await refreshAdminUnlocked();
      setGateChecked(true);
      if (!ok) navigate({ to: "/admin/login" });
    })();
  }, [navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const res = await adminRpc({
        data: { name: "admin_list_stripe_logs", args: { _limit: 300 }, adminToken: getAdminToken() },
      });
      setRows((res.data as LogRow[]) ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (gateChecked) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gateChecked]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!needle) return true;
      return [r.event_type, r.event_id, r.message, r.source, JSON.stringify(r.details ?? {})]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [rows, q, statusFilter]);

  const errorCount = rows.filter((r) => r.status === "error").length;

  const clearAll = async () => {
    try {
      await adminRpc({ data: { name: "admin_clear_stripe_logs", adminToken: getAdminToken() } });
      toast.success("Payment logs cleared");
      setRows([]);
    } catch (e) {
      toast.error((e as Error).message);
    }
    setConfirmClear(false);
  };

  return (
    <AdminShell title="Payment logs" subtitle="Live record of payment webhooks and payout account errors.">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh
        </button>
        <button
          onClick={() => setConfirmClear(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> Clear log
        </button>
        <span className="text-xs text-neutral-500">
          {rows.length} entries, {errorCount} with errors
        </span>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2">
          <SearchIcon className="h-4 w-4 text-neutral-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search event type, message, or reference"
            className="h-7 border-0 p-0 shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="flex items-center gap-1 rounded-full border border-neutral-200 bg-white p-1">
          {(["all", "error", "ok"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
                statusFilter === s ? "bg-neutral-900 text-white" : "text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {s === "ok" ? "Success" : s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 py-16 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading payment logs
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500">
          No payment activity recorded yet. Entries appear here as soon as a payment webhook arrives or a payout account
          setup fails.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
          {filtered.map((r) => {
            const isError = r.status === "error";
            const open = expanded === r.id;
            return (
              <div key={r.id} className="border-b border-neutral-100 last:border-b-0">
                <button
                  onClick={() => setExpanded(open ? null : r.id)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-neutral-50"
                >
                  {isError ? (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-neutral-900">{r.event_type}</span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                        {r.source}
                      </span>
                    </div>
                    {r.message && (
                      <p className={`mt-0.5 text-xs ${isError ? "text-rose-600" : "text-neutral-500"}`}>{r.message}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-[11px] text-neutral-400">
                    {new Date(r.created_at).toLocaleString()}
                  </span>
                </button>
                {open && (
                  <pre className="overflow-x-auto border-t border-neutral-100 bg-neutral-50 px-4 py-3 text-[11px] leading-relaxed text-neutral-700">
{JSON.stringify({ event_id: r.event_id, details: r.details }, null, 2)}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all payment logs?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes every recorded entry. New activity will still be logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void clearAll()}>Clear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminShell>
  );
}