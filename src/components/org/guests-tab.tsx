import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Send, X } from "lucide-react";
import { Img } from "@/components/shared/smart-img";

type Guest = {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  website: string | null;
  sort_order: number;
};

const GUEST_TYPES = ["Local Artist", "Business Owner", "Musician", "Community Leader", "Other"];

export function GuestsTab({ orgId, ownerId, canManage }: { orgId: string; ownerId: string; canManage: boolean }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Guest | "new" | null>(null);
  const [form, setForm] = useState({ name: "", bio: "", website: "", photo_url: "" });

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("organization_artists")
      .select("id, name, bio, photo_url, website, sort_order")
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) { toast.error("Could not load guests"); setLoading(false); return; }
    setGuests((data ?? []) as Guest[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  function openEditor(g: Guest | "new") {
    setEditing(g);
    setForm(g === "new"
      ? { name: "", bio: "", website: "", photo_url: "" }
      : { name: g.name, bio: g.bio ?? "", website: g.website ?? "", photo_url: g.photo_url ?? "" });
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Add a guest name"); return; }
    const payload = {
      org_id: orgId,
      name: form.name.trim(),
      bio: form.bio.trim() || null,
      website: form.website.trim() || null,
      photo_url: form.photo_url.trim() || null,
    };
    const res = editing === "new"
      ? await supabase.from("organization_artists").insert(payload)
      : await supabase.from("organization_artists").update(payload).eq("id", (editing as Guest).id);
    if (res.error) { toast.error(res.error.message); return; }
    setEditing(null);
    toast.success(editing === "new" ? "Guest added" : "Guest updated");
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this guest?")) return;
    const prev = guests;
    setGuests((g) => g.filter((x) => x.id !== id));
    const { error } = await supabase.from("organization_artists").delete().eq("id", id);
    if (error) { setGuests(prev); toast.error("Could not remove guest"); return; }
    toast.success("Guest removed");
  }

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-foreground">Past &amp; Upcoming Guests</h3>
        {canManage && (
          <button
            onClick={() => openEditor("new")}
            className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
          >
            <Plus className="h-4 w-4" /> Add Guest
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
      ) : guests.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          No guests yet.{canManage ? " Add your first guest." : ""}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {guests.map((g) => (
            <div key={g.id} className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-sm font-bold text-muted-foreground">
                {g.photo_url ? <Img src={g.photo_url} alt={g.name} className="h-full w-full object-cover" /> : g.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-foreground">{g.name}</div>
                {g.bio && <div className="truncate text-xs text-muted-foreground">{g.bio}</div>}
              </div>
              {canManage && (
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => openEditor(g)} title="Edit guest" className="rounded p-1 text-muted-foreground hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => void remove(g.id)} title="Remove guest" className="rounded p-1 text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-foreground">{editing === "new" ? "Add guest" : "Edit guest"}</div>
            <button onClick={() => setEditing(null)} title="Close" className="rounded p-1 text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Guest name" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Short description (optional)" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website or social link (optional)" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <input value={form.photo_url} onChange={(e) => setForm({ ...form, photo_url: e.target.value })} placeholder="Photo URL (optional)" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
          <button onClick={() => void save()} className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90">Save guest</button>
        </div>
      )}

      <GuestPitchForm ownerId={ownerId} />
    </div>
  );
}

function GuestPitchForm({ ownerId }: { ownerId: string }) {
  const [form, setForm] = useState({ name: "", email: "", type: GUEST_TYPES[0], link: "", why: "" });
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!form.name.trim() || !form.email.trim() || !form.why.trim()) {
      toast.error("Name, email, and your story are required");
      return;
    }
    setSending(true);
    const { data: sess } = await supabase.auth.getSession();
    const { error } = await supabase.from("artist_inquiries").insert({
      artist_id: ownerId,
      sender_id: sess.session?.user.id ?? null,
      intent: `Guest request (${form.type})`,
      sender_name: form.name.trim(),
      sender_email: form.email.trim(),
      message: `${form.why.trim()}${form.link.trim() ? `\n\nLink: ${form.link.trim()}` : ""}`,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setForm({ name: "", email: "", type: GUEST_TYPES[0], link: "", why: "" });
    toast.success("Guest request sent");
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div>
        <div className="text-sm font-bold text-foreground">Want to be a guest?</div>
        <div className="text-xs text-muted-foreground">Local artists and business owners can pitch themselves here.</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name *" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email address *" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      </div>
      <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} title="Guest type" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
        {GUEST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="Website or social link (optional)" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      <textarea value={form.why} onChange={(e) => setForm({ ...form, why: e.target.value })} placeholder="Why would you make a great guest? What's your story? *" rows={3} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      <button
        onClick={() => void submit()}
        disabled={sending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
      >
        <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Guest Request"}
      </button>
    </div>
  );
}
