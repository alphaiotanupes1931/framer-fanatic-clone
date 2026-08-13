import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { ImageUpload } from "@/components/shared/image-upload";
import { Img, SmartVideo } from "@/components/shared/smart-img";
import { Dialog, DialogContent } from "@/components/ui/dialog";

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
  const [form, setForm] = useState({ title: "", body: "", media_url: "" });
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

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
      toast.error("Add a title, description, or upload media.");
      return;
    }
    const { error } = await supabase.from("profile_sections").insert({
      user_id: userId,
      kind,
      title: form.title.trim() || null,
      body: form.body.trim() || null,
      media_url: form.media_url.trim() || null,
      order_index: items.length,
    });
    if (error) { toast.error(error.message); return; }
    setOpen(false);
    setForm({ title: "", body: "", media_url: "" });
    toast.success(`${label} item added`);
    void load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("profile_sections").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setActiveIdx(null);
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
          <ImageUpload
            value={form.media_url}
            onChange={(url) => setForm({ ...form, media_url: url })}
            label="Upload photo or video"
            accept="image/*,video/*"
          />
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
          {items.map((it, i) => (
            <div key={it.id} className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white">
              <button type="button" onClick={() => setActiveIdx(i)} className="block w-full text-left">
                {it.media_url && (
                  <div className="aspect-video bg-neutral-100">
                    {isVideoUrl(it.media_url)
                      ? <SmartVideo src={it.media_url} muted playsInline preload="metadata" className="h-full w-full bg-black object-cover" />
                      : <Img src={it.media_url} alt={it.title ?? ""} className="h-full w-full object-cover" loading="lazy" decoding="async" />}
                  </div>
                )}
                <div className="p-4">
                  {it.title && <div className="font-semibold">{it.title}</div>}
                  {it.body && <p className="mt-1 text-sm text-neutral-600 line-clamp-3">{it.body}</p>}
                </div>
              </button>
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

      {activeIdx !== null && items[activeIdx] && (
        <Dialog open onOpenChange={(o) => { if (!o) setActiveIdx(null); }}>
          <DialogContent className="max-w-3xl overflow-hidden p-0">
            {(() => {
              const it = items[activeIdx]!;
              return (
                <div className="relative grid md:grid-cols-[minmax(0,1.2fr)_minmax(260px,340px)]">
                  {activeIdx > 0 && (
                    <button type="button" aria-label="Previous" onClick={() => setActiveIdx(activeIdx - 1)}
                      className="absolute left-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75">
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                  )}
                  {activeIdx < items.length - 1 && (
                    <button type="button" aria-label="Next" onClick={() => setActiveIdx(activeIdx + 1)}
                      className="absolute right-2 top-1/2 z-20 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white hover:bg-black/75">
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  )}
                  {it.media_url && (
                    <div className="flex items-center justify-center bg-black">
                      {isVideoUrl(it.media_url)
                        ? <SmartVideo src={it.media_url} controls playsInline className="max-h-[75vh] w-full bg-black" />
                        : <Img src={it.media_url} alt={it.title ?? ""} className="max-h-[75vh] w-full object-contain" />}
                    </div>
                  )}
                  <div className="min-w-0 space-y-2 p-5">
                    <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                      {label} · {activeIdx + 1} of {items.length}
                    </div>
                    {it.title && <div className="text-base font-semibold">{it.title}</div>}
                    {it.body && <p className="whitespace-pre-wrap break-words text-sm text-neutral-700">{it.body}</p>}
                    {canEdit && (
                      <button onClick={() => remove(it.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function isVideoUrl(u: string) {
  return /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);
}