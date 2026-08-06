import { useEffect, useState } from "react";
import { X, Facebook, Linkedin, MessageCircle, Mail, Copy, Users, Instagram, Send as SendIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useCurrentProfile } from "@/components/app-layout";
import { Img } from "@/components/shared/smart-img";
import { getConnectionsSnapshot, loadConnections, type Person } from "@/lib/connections";

export function ExternalShareDialog({
  open,
  onClose,
  url,
  title,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  title?: string;
}) {
  const me = useCurrentProfile();
  const [people, setPeople] = useState<Person[]>(() => (getConnectionsSnapshot(me?.id)?.all ?? []).slice(0, 12));
  const [sendingTo, setSendingTo] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !me?.id) return;
    const snap = getConnectionsSnapshot(me.id);
    if (snap) setPeople(snap.all.slice(0, 12));
    let cancelled = false;
    void loadConnections(me.id).then((s) => { if (!cancelled) setPeople(s.all.slice(0, 12)); });
    return () => { cancelled = true; };
  }, [open, me?.id]);

  if (!open) return null;
  const text = title || "Check this out on Planet Baltimore";
  const enc = encodeURIComponent;
  const apps = [
    { name: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`, color: "#1877F2" },
    { name: "IG Stories", icon: Instagram, href: `https://www.instagram.com/`, color: "#E1306C" },
    { name: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${enc(text + " " + url)}`, color: "#25D366" },
    { name: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`, color: "#0A66C2" },
    { name: "Telegram", icon: SendIcon, href: `https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`, color: "#26A5E4" },
    { name: "Email", icon: Mail, href: `mailto:?subject=${enc(text)}&body=${enc(url)}`, color: "#d4580a" },
    { name: "Message", icon: MessageCircle, href: `sms:?&body=${enc(text + " " + url)}`, color: "#25D366" },
  ];

  const copy = async () => {
    try { await navigator.clipboard.writeText(url); toast.success("Link copied"); } catch { toast.error("Could not copy"); }
  };

  const sendToPerson = async (uid: string) => {
    if (!me) { toast.error("Sign in first"); return; }
    setSendingTo(uid);
    try {
      const { data: mine } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", me.id);
      const myIds = (mine ?? []).map((r: { conversation_id: string }) => r.conversation_id);
      let convId: string | null = null;
      if (myIds.length) {
        const { data: shared } = await supabase.from("conversation_members").select("conversation_id").eq("user_id", uid).in("conversation_id", myIds);
        convId = (shared ?? [])[0]?.conversation_id ?? null;
      }
      if (!convId) {
        const { data: conv, error } = await supabase.from("conversations").insert({
          is_group: false, created_by: me.id, user_a: me.id, user_b: uid,
          last_message_preview: (title || url).slice(0, 140),
        }).select("id").single();
        if (error || !conv) throw error || new Error("Could not create conversation");
        convId = conv.id;
        const { error: mErr } = await supabase.from("conversation_members").insert([
          { conversation_id: convId, user_id: me.id },
          { conversation_id: convId, user_id: uid },
        ]);
        if (mErr) throw mErr;
      }
      const body = `${title ? title + "\n" : ""}${url}`;
      const { error: msgErr } = await supabase.from("messages").insert({ conversation_id: convId, sender_id: me.id, content: body });
      if (msgErr) throw msgErr;
      toast.success("Sent");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to send");
    } finally {
      setSendingTo(null);
    }
  };

  const initial = (name: string | null | undefined) => (name || "U").trim()[0]?.toUpperCase() || "U";

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <div className="text-lg font-bold text-neutral-900">Share</div>
          <button onClick={onClose} className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100" aria-label="Close"><X className="h-5 w-5" /></button>
        </div>

        <div className="px-5">
          <input readOnly value={title || ""} className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900" />
        </div>

        <div className="px-5 pt-4">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-neutral-800">
            <Users className="h-4 w-4" /> Send to people you know
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {people.length === 0 ? (
              <div className="text-xs text-neutral-500">Follow people to share with them directly.</div>
            ) : (
              people.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={sendingTo === p.id}
                  onClick={() => sendToPerson(p.id)}
                  className="flex w-14 flex-shrink-0 flex-col items-center gap-1 text-center disabled:opacity-50"
                >
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 text-sm font-bold text-neutral-700">
                    {p.avatar_url ? <Img src={p.avatar_url} alt="" className="h-full w-full object-cover" /> : initial(p.display_name || p.username)}
                  </div>
                  <div className="w-full truncate text-[11px] text-neutral-700">{(p.display_name || p.username || "").split(" ")[0]}</div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 px-5 pt-3">
          {apps.map((a) => (
            <a
              key={a.name}
              href={a.href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1.5"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-white" style={{ backgroundColor: a.color }}>
                <a.icon className="h-5 w-5" />
              </div>
              <div className="text-xs font-medium text-neutral-800">{a.name}</div>
            </a>
          ))}
        </div>

        <div className="px-5 py-4">
          <div className="flex items-center gap-2 rounded-lg bg-neutral-100 px-3 py-2">
            <div className="min-w-0 flex-1 truncate text-xs text-neutral-700">{url}</div>
            <button onClick={copy} className="flex items-center gap-1.5 rounded-md bg-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-300">
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}