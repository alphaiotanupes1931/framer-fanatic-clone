import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin-shell";
import { getAdminToken } from "@/lib/admin-gate";
import type { EmailGroupKey, GroupRecipient } from "@/lib/admin-email-groups.functions";

export const Route = createFileRoute("/admin/email-groups")({
  component: EmailGroupsPage,
  head: () => ({ meta: [{ title: "Email groups - Admin - Planet Baltimore" }] }),
});

const GROUPS: { key: EmailGroupKey; label: string }[] = [
  { key: "business", label: "Businesses" },
  { key: "arts_org", label: "Arts Organizations" },
  { key: "artist", label: "Artists" },
  { key: "community_assoc", label: "Community Associations" },
  { key: "group", label: "Groups" },
  { key: "resident_members", label: "Residents" },
  { key: "visitor_members", label: "Visitors" },
];

function EmailGroupsPage() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [all, setAll] = useState<GroupRecipient[]>([]);
  const [selected, setSelected] = useState<Set<EmailGroupKey>>(new Set());
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { refreshAdminUnlocked } = await import("@/lib/admin-gate");
      const ok = await refreshAdminUnlocked();
      setUnlocked(ok);
      if (!ok) navigate({ to: "/admin/login" });
    })();
  }, [navigate]);

  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      try {
        const { listEmailGroupRecipients } = await import("@/lib/admin-email-groups.functions");
        const res = await listEmailGroupRecipients({ data: { adminToken: getAdminToken() } });
        setAll(res.recipients);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not load email groups");
      }
      setLoading(false);
    })();
  }, [unlocked]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of all) for (const g of r.groups) c[g] = (c[g] ?? 0) + 1;
    return c;
  }, [all]);

  const list = useMemo(() => all.filter((r) => r.groups.some((g) => selected.has(g))), [all, selected]);
  const sendable = list.filter((r) => !r.blocked && !excluded.has(r.email));

  const toggleGroup = (k: EmailGroupKey) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  const toggleEmail = (e: string) =>
    setExcluded((s) => {
      const n = new Set(s);
      n.has(e) ? n.delete(e) : n.add(e);
      return n;
    });

  const send = async () => {
    if (!subject.trim() || !message.trim() || sendable.length === 0) return;
    if (!window.confirm(`Send this email to ${sendable.length} people?`)) return;
    setSending(true);
    try {
      const { sendEmailBlast } = await import("@/lib/admin-email-groups.functions");
      const res = await sendEmailBlast({
        data: { adminToken: getAdminToken(), subject, message, recipients: sendable.map((r) => r.email) },
      });
      toast.success(`Queued ${res.sent} emails${res.skipped ? `, ${res.skipped} skipped` : ""}`);
      setSubject("");
      setMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send");
    }
    setSending(false);
  };

  return (
    <AdminShell title="Email groups" subtitle="Pick the groups you want to reach, write your email, and send it to everyone at once.">
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
          <div className="space-y-4">
            <section className="rounded-2xl border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-neutral-900">1. Choose groups</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {GROUPS.map((g) => {
                  const on = selected.has(g.key);
                  return (
                    <button
                      key={g.key}
                      onClick={() => toggleGroup(g.key)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        on ? "border-orange bg-orange text-primary-foreground" : "border-neutral-200 bg-white text-neutral-700 hover:bg-hover"
                      }`}
                    >
                      {g.label} <span className="opacity-70">({counts[g.key] ?? 0})</span>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-neutral-900">2. Write your email</h2>
              <input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Subject"
                className="mt-3 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                rows={10}
                className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm outline-none focus:border-neutral-400"
              />
              <button
                onClick={send}
                disabled={sending || !subject.trim() || !message.trim() || sendable.length === 0}
                className="mt-3 inline-flex items-center gap-2 rounded-full bg-neutral-900 px-5 py-2 text-sm font-semibold text-white hover:bg-neutral-800 disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send to {sendable.length} {sendable.length === 1 ? "person" : "people"}
              </button>
              <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-600">
                <p className="font-semibold text-neutral-800">How sending works</p>
                <p className="mt-1">
                  Emails start going out right away, with no hourly wait. Each one counts toward the 50,000 monthly limit shown on the Overview page.
                  {" "}You can close this page after pressing Send. Addresses that blocked our emails are skipped.
                </p>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-neutral-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900">
              <Mail className="h-4 w-4" /> Recipients ({sendable.length})
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">Uncheck anyone you want to leave out. Blocked addresses are skipped.</p>
            <div className="mt-3 max-h-[560px] space-y-1 overflow-y-auto">
              {list.length === 0 && <p className="py-6 text-center text-xs text-neutral-400">Choose a group to see emails.</p>}
              {list.map((r) => (
                <label key={r.email} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs hover:bg-hover ${r.blocked ? "opacity-50" : ""}`}>
                  <input
                    type="checkbox"
                    disabled={r.blocked}
                    checked={!r.blocked && !excluded.has(r.email)}
                    onChange={() => toggleEmail(r.email)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-neutral-900">{r.email}</span>
                    {r.name && <span className="block truncate text-neutral-500">{r.name}</span>}
                  </span>
                  {r.blocked && <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[10px]">Blocked</span>}
                </label>
              ))}
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
