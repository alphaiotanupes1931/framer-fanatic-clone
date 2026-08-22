import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "@tanstack/react-router";
import { Send, Users, X, Search, Link as LinkIcon, Check, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { toast } from "sonner";
import { encodeSharePreview, type SharePreview } from "@/lib/share-preview";
import { Img } from "@/components/shared/smart-img";
import { logShareEvent } from "@/lib/share-log";
import { getConnectionsSnapshot, loadConnections, type Person } from "@/lib/connections";

function initials(name: string | null | undefined) {
  return (name || "U").trim()[0]?.toUpperCase() || "U";
}

export function ShareToUsersDialog({
  open,
  onClose,
  url,
  title,
  preview,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title?: string;
  preview?: SharePreview;
}) {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [people, setPeople] = useState<Person[]>(() => getConnectionsSnapshot(me?.id)?.all ?? []);
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState<string[]>([]);
  const [failReason, setFailReason] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, 'success' | 'failed'>>({});
  const [showResults, setShowResults] = useState(false);
  const [sentRecipients, setSentRecipients] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !me?.id) return;
    // Paint from the shared cache immediately, then revalidate in the background.
    const snap = getConnectionsSnapshot(me.id);
    if (snap) setPeople(snap.all.slice(0, 200));
    setLoading(!snap);
    let cancelled = false;
    void loadConnections(me.id).then((s) => {
      if (cancelled) return;
      setPeople(s.all.slice(0, 200));
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, me?.id]);

  useEffect(() => {
    if (!open) {
      setSelected({});
      setNote("");
      setQ("");
      setFailed([]);
      setFailReason(null);
      setResults({});
      setShowResults(false);
      setSentRecipients([]);
    }
  }, [open]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return people;
    return people.filter(
      (p) =>
        (p.display_name || "").toLowerCase().includes(term) ||
        (p.username || "").toLowerCase().includes(term),
    );
  }, [people, q]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((k) => selected[k]), [selected]);
  const toggle = (id: string) => setSelected((s) => ({ ...s, [id]: !s[id] }));

  const allFilteredSelected = useMemo(
    () => filtered.length > 0 && filtered.every((p) => selected[p.id]),
    [filtered, selected],
  );

  const selectAllFiltered = () => {
    setSelected((s) => {
      const next = { ...s };
      for (const p of filtered) {
        next[p.id] = true;
      }
      return next;
    });
  };

  const deselectAllFiltered = () => {
    setSelected((s) => {
      const next = { ...s };
      for (const p of filtered) {
        next[p.id] = false;
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      deselectAllFiltered();
    } else {
      selectAllFiltered();
    }
  };

  const failedNames = useMemo(
    () =>
      failed.map((id) => {
        const p = people.find((x) => x.id === id);
        return p?.display_name || p?.username || "Someone";
      }),
    [failed, people],
  );

  const openDetails = () => {
    if (!url) return;
    const isExternal = url.startsWith("http") && !url.startsWith(window.location.origin);
    if (isExternal) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      const path = url.replace(/^https?:\/\/[^/]+/, "") || "/";
      navigate({ to: path });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const send = async (targetIds?: string[]) => {
    if (!me) {
      toast.error("Please sign in");
      return;
    }
    const recipients = targetIds && targetIds.length ? targetIds : selectedIds;
    if (recipients.length === 0) {
      toast.error("Select at least one person to share with.");
      return;
    }

    const isRetry = Boolean(targetIds && targetIds.length);
    setSending(true);
    void logShareEvent({
      actorId: me.id,
      url,
      title,
      kind: preview?.type ?? null,
      isRetry,
      recipientCount: recipients.length,
      outcome: "attempt",
    });
    const body = preview
      ? encodeSharePreview({ ...preview, url }, note)
      : `${note.trim() ? note.trim() + "\n\n" : ""}${title ? title + "\n" : ""}${url}`;
    let successes = 0;
    const failures: string[] = [];
    const failedIds: string[] = [];
    const nextResults: Record<string, 'success' | 'failed'> = {};
    setSentRecipients((prev) => Array.from(new Set([...prev, ...recipients])));
    try {

      // Send one direct message per recipient. Reuse an existing 1:1 conversation if any.
      for (const uid of recipients) {
        try {
          const { data: mine } = await supabase
            .from("conversation_members")
            .select("conversation_id")
            .eq("user_id", me.id);
          const myConvIds = (mine ?? []).map((r: { conversation_id: string }) => r.conversation_id);
          let convId: string | null = null;
          if (myConvIds.length) {
            const { data: shared } = await supabase
              .from("conversation_members")
              .select("conversation_id")
              .eq("user_id", uid)
              .in("conversation_id", myConvIds);
            convId = (shared ?? [])[0]?.conversation_id ?? null;
          }
          if (!convId) {
            const { data: conv, error } = await supabase
              .from("conversations")
              .insert({
                is_group: false,
                created_by: me.id,
                user_a: me.id,
                user_b: uid,
                last_message_preview: (title || url).slice(0, 140),
              })
              .select("id")
              .single();
            if (error || !conv) throw error || new Error("Could not create conversation");
            convId = conv.id;
            const { error: mErr } = await supabase.from("conversation_members").insert([
              { conversation_id: convId, user_id: me.id },
              { conversation_id: convId, user_id: uid },
            ]);
            if (mErr) throw mErr;
          }
          const { error: msgErr } = await supabase
            .from("messages")
            .insert({ conversation_id: convId, sender_id: me.id, content: body });
          if (msgErr) throw msgErr;
          successes += 1;
          nextResults[uid] = 'success';
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Could not send";
          failures.push(msg);
          failedIds.push(uid);
          nextResults[uid] = 'failed';
          console.error("Share to user failed", { uid, error: msg });
        }
      }

      setFailed(failedIds);
      setFailReason(failures[0] || null);
      setResults((prev) => ({ ...prev, ...nextResults }));
      setShowResults(true);

      void logShareEvent({
        actorId: me.id,
        url,
        title,
        kind: preview?.type ?? null,
        isRetry,
        recipientCount: recipients.length,
        successCount: successes,
        failureCount: failedIds.length,
        failureReasons: failures,
        outcome: failedIds.length === 0 ? "success" : successes > 0 ? "partial" : "failure",
      });



      if (failedIds.length === 0) {
        toast.success(
          <div className="flex flex-col gap-2">
            <div>Shared with {successes} {successes === 1 ? "person" : "people"}</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { openDetails(); toast.dismiss(); }}
                className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#d4580a] hover:bg-neutral-100"
              >
                View details
              </button>
              <button
                type="button"
                onClick={() => { void copyLink(); toast.dismiss(); }}
                className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[#d4580a] hover:bg-neutral-100"
              >
                Copy link
              </button>
            </div>
          </div>,
        );
      } else if (successes > 0) {
        toast.warning(
          <div className="flex flex-col gap-2">
            <div>Shared with {successes} of {recipients.length}. {failedIds.length} did not go through.</div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { openDetails(); toast.dismiss(); }}
                className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-neutral-100"
              >
                View details
              </button>
              <button
                type="button"
                onClick={() => { void copyLink(); toast.dismiss(); }}
                className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-neutral-100"
              >
                Copy link
              </button>
            </div>
          </div>,
        );
      } else {
        toast.error(failures[0] || "Failed to share");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to share";
      void logShareEvent({
        actorId: me.id,
        url,
        title,
        kind: preview?.type ?? null,
        isRetry,
        recipientCount: recipients.length,
        successCount: 0,
        failureCount: recipients.length,
        failureReasons: [msg],
        outcome: "failure",
      });
      toast.error(msg);

    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4" onClick={onClose}>
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <div>
            <div className="text-lg font-bold text-neutral-900">Share with followers</div>
            <div className="mt-0.5 text-xs text-neutral-500">You can only send this to people you follow (or who follow you).</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          {preview && (
            <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white p-3">
              {preview.image ? (
                <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-neutral-100">
                  <Img src={preview.image} alt={preview.title || "Preview"} className="h-full w-full object-cover" />
                </div>
              ) : (
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-[#d4580a]/10 text-[#d4580a]">
                  <Send className="h-6 w-6 -rotate-45" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {preview.title && (
                  <div className="truncate text-sm font-semibold text-neutral-900">{preview.title}</div>
                )}
                {preview.excerpt && (
                  <div className="mt-0.5 line-clamp-2 text-xs text-neutral-500">{preview.excerpt}</div>
                )}
                {preview.author && (
                  <div className="mt-0.5 truncate text-xs text-[#d4580a]">{preview.author}</div>
                )}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={copyLink}
            className="flex w-full items-center gap-3 rounded-lg border border-neutral-200 px-4 py-3 text-left text-sm font-semibold text-neutral-800 hover:border-[#d4580a] hover:bg-orange-50/40"
          >
            <LinkIcon className="h-4 w-4" /> Copy link
          </button>


          {!showResults && (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search people you follow…"
                className="w-full rounded-lg border border-neutral-200 bg-white py-2.5 pl-9 pr-3 text-sm focus:border-orange-400 focus:outline-none"
              />
            </div>
          )}

          {showResults ? (
            <div className="rounded-lg border border-neutral-200">
              <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-600">
                <Check className="h-3.5 w-3.5" /> Results ({sentRecipients.length} {sentRecipients.length === 1 ? "person" : "people"})
              </div>
              <div className="max-h-64 overflow-y-auto">
                {sentRecipients.length === 0 ? (
                  <div className="p-6 text-center text-sm text-neutral-500">No results yet.</div>
                ) : (
                  sentRecipients.map((uid) => {
                    const p = people.find((x) => x.id === uid);
                    const status = results[uid];
                    if (!p) return null;
                    return (
                      <div
                        key={uid}
                        className="flex items-center gap-3 border-b border-neutral-100 px-4 py-2.5 last:border-b-0"
                      >
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#d4580a]/10 text-xs font-bold text-[#d4580a]">
                          {p.avatar_url ? (
                            <Img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            initials(p.display_name || p.username)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-neutral-900">{p.display_name || p.username}</div>
                          {p.username && <div className="truncate text-xs text-neutral-500">@{p.username}</div>}
                        </div>
                        {status === 'success' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600">
                            <Check className="h-4 w-4" /> Sent
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
                            <X className="h-4 w-4" /> Failed
                          </span>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200">
              <div className="flex items-center gap-2 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-neutral-600">
                <Users className="h-3.5 w-3.5" /> Followers ({selectedIds.length} selected)
              </div>
              <div className="max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-6 text-center text-sm text-neutral-500">Loading…</div>
                ) : filtered.length === 0 ? (
                  <div className="p-6 text-center text-sm text-neutral-500">
                    {people.length === 0 ? "Follow some people to share with them." : "No matches."}
                  </div>
                ) : (
                  filtered.map((p) => {
                    const on = !!selected[p.id];
                    return (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => toggle(p.id)}
                        className="flex w-full items-center gap-3 border-b border-neutral-100 px-4 py-2.5 text-left last:border-b-0 hover:bg-neutral-50"
                      >
                        <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-[#d4580a]/10 text-xs font-bold text-[#d4580a]">
                          {p.avatar_url ? (
                            <Img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            initials(p.display_name || p.username)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-neutral-900">{p.display_name || p.username}</div>
                          {p.username && <div className="truncate text-xs text-neutral-500">@{p.username}</div>}
                        </div>
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                            on ? "border-[#d4580a] bg-[#d4580a] text-white" : "border-neutral-300 text-transparent"
                          }`}
                        >
                          <Check className="h-4 w-4" />
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {!showResults && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Add a note (optional)"
              className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-4 py-2.5 text-sm focus:border-orange-400 focus:outline-none"
            />
          )}
        </div>

        <div className="space-y-3 border-t border-neutral-200 px-5 py-4">
          {!showResults && people.length > 0 && selectedIds.length === 0 && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
              <span className="font-semibold">Select at least one person</span> to share with.
            </div>
          )}

          {failed.length > 0 && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-amber-900">
                    {failed.length} {failed.length === 1 ? "message" : "messages"} did not send
                  </div>
                  <div className="mt-0.5 truncate text-xs text-amber-800">
                    {failedNames.join(", ")}
                  </div>
                  {failReason && <div className="mt-1 text-xs text-amber-700">{failReason}</div>}
                </div>
              </div>
              <button
                type="button"
                disabled={sending}
                onClick={() => void send(failed)}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-amber-400 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${sending ? "animate-spin" : ""}`} />
                {sending ? "Retrying…" : `Retry ${failed.length} failed`}
              </button>
            </div>
          )}
          <button
            type="button"
            disabled={sending || (!showResults && selectedIds.length === 0)}
            onClick={() => (showResults ? onClose() : void send())}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4580a] px-4 py-3 text-sm font-semibold text-white hover:bg-[#b8480a] disabled:cursor-not-allowed disabled:bg-neutral-300"
          >
            {showResults ? <Check className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            {sending
              ? "Sending…"
              : showResults
              ? "Done"
              : selectedIds.length > 0
              ? `Send to ${selectedIds.length} ${selectedIds.length === 1 ? "person" : "people"}`
              : "Select people to share"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
