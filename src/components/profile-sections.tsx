import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export type ProfileSection = {
  id: string;
  user_id: string;
  kind: string;
  title: string | null;
  body: string | null;
  media_url: string | null;
  link_url: string | null;
  order_index: number;
};

export function ProfileSectionTab({
  userId,
  kind,
  label,
  canEdit,
}: {
  userId: string;
  kind: string;
  label: string;
  canEdit: boolean;
}) {
  const [items, setItems] = useState<ProfileSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", media_url: "", link_url: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("profile_sections")
      .select("*")
      .eq("user_id", userId)
      .eq("kind", kind)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data ?? []) as ProfileSection[]);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId, kind]);

  const add = async () => {
    if (!form.title.trim() && !form.body.trim() && !form.media_url.trim()) {
      toast.error("Add a title, description, or media URL.");
      return;
    }
    const { error } = await supabase.from("profile_sections").insert({
      user_id: userId,
      kind,
      title: form.title.trim() || null,
      body: form.body.trim() || null,
      media_url: form.media_url.trim() || null,
      link_url: form.link_url.trim() || null,
      order_index: items.length,
    });
    if (error) { toast.error(error.message); return; }
    setOpen(false);
    setForm({ title: "", body: "", media_url: "", link_url: "" });
    toast.success(`${label} item added`);
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("profile_sections").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  if (loading) return <div className="py-12 text-center text-neutral-500">Loading…</div>;

  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
          >
            <Plus className="h-4 w-4" /> Add to {label}
          </button>
        </div>
      )}

      {open && canEdit && (
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 space-y-2">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Description" rows={3} className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <input value={form.media_url} onChange={(e) => setForm({ ...form, media_url: e.target.value })}
            placeholder="Image or media URL (optional)" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })}
            placeholder="External link (optional)" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="rounded-full px-4 py-2 text-sm">Cancel</button>
            <button onClick={add} className="rounded-full bg-orange-600 px-4 py-2 text-sm font-semibold text-white">Save</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="py-12 text-center text-neutral-500">
          {canEdit ? `Nothing in ${label} yet. Add your first item above.` : `No ${label.toLowerCase()} yet.`}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <div key={it.id} className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              {it.media_url && (
                <div className="aspect-video bg-neutral-100">
                  <img src={it.media_url} alt={it.title ?? ""} className="h-full w-full object-cover" loading="lazy" decoding="async" />
                </div>
              )}
              <div className="p-4">
                {it.title && <div className="font-semibold">{it.title}</div>}
                {it.body && <p className="mt-1 text-sm text-neutral-600 line-clamp-3">{it.body}</p>}
                {it.link_url && (
                  <a href={it.link_url} target="_blank" rel="noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:underline">
                    Visit <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
              {canEdit && (
                <button onClick={() => remove(it.id)}
                  className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 opacity-0 group-hover:opacity-100">
                  <Trash2 className="h-3.5 w-3.5 text-red-600" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}