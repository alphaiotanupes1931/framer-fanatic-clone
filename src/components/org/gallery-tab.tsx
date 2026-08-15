import { useEffect, useState } from "react";
import { Image as ImageIcon, ChevronLeft, ChevronRight, X, Wrench, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "@/components/smart-image";
import { ImageUpload } from "@/components/shared/image-upload";

type Work = {
  id: string | null;
  url: string;
  title: string | null;
  medium: string | null;
  dimensions: string | null;
  description: string | null;
};

const emptyForm = { title: "", medium: "", dimensions: "", description: "", media_url: "" };

export function GalleryTab({ orgId, canManage = false }: { orgId: string; canManage?: boolean }) {
  const [works, setWorks] = useState<Work[]>([]);
  const [curated, setCurated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [idx, setIdx] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => {
    setLoading(true);
    const { data: art } = await supabase
      .from("organization_artworks")
      .select("id, title, medium, dimensions, description, media_url, order_index, created_at")
      .eq("org_id", orgId)
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });

    // Portfolio is curated only: posts never appear here.
    setWorks(
      (art ?? []).map((a) => ({
        id: a.id as string,
        url: a.media_url as string,
        title: (a.title as string) ?? null,
        medium: (a.medium as string) ?? null,
        dimensions: (a.dimensions as string) ?? null,
        description: (a.description as string) ?? null,
      })),
    );
    setLoading(false);
  };

  useEffect(() => { void load(); }, [orgId]);

  const save = async () => {
    if (!form.media_url.trim()) { toast.error("Upload an image of the work"); return; }
    const payload = {
      org_id: orgId,
      title: form.title.trim() || null,
      medium: form.medium.trim() || null,
      dimensions: form.dimensions.trim() || null,
      description: form.description.trim() || null,
      media_url: form.media_url.trim(),
      order_index: curated ? works.length : 0,
    };
    const { error } = editingId
      ? await supabase.from("organization_artworks").update(payload).eq("id", editingId)
      : await supabase.from("organization_artworks").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Work updated" : "Work added");
    setOpen(false); setEditingId(null); setForm(emptyForm);
    void load();
  };

  const startEdit = (w: Work) => {
    setForm({
      title: w.title ?? "", medium: w.medium ?? "", dimensions: w.dimensions ?? "",
      description: w.description ?? "", media_url: w.url,
    });
    setEditingId(w.id);
    setOpen(true);
    setIdx(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this work?")) return;
    const { error } = await supabase.from("organization_artworks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setIdx(null);
    void load();
  };

  const lot = (i: number) => `LOT ${String(i + 1).padStart(2, "0")}`;
  const active = idx !== null ? works[idx] : null;

  if (loading) return <div className="py-14 text-center text-sm text-muted-foreground">Loading portfolio...</div>;

  return (
    <div className="space-y-5">
      {canManage && (
        <div className="flex justify-end">
          <button
            onClick={() => { setOpen((v) => !v); setEditingId(null); setForm(emptyForm); }}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
          >
            {open ? "Close" : "+ Add Work"}
          </button>
        </div>
      )}

      {canManage && open && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)]">
            <ImageUpload value={form.media_url} onChange={(url) => setForm((f) => ({ ...f, media_url: url }))} label="Work image" />
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title, year (e.g. Daughters Of The Sky, 2024)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  value={form.medium}
                  onChange={(e) => setForm({ ...form, medium: e.target.value })}
                  placeholder="Medium (e.g. Acrylic & Viscous Latex On Canvas)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  value={form.dimensions}
                  onChange={(e) => setForm({ ...form, dimensions: e.target.value })}
                  placeholder="Dimensions (e.g. 72 x 66 inches)"
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </div>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={6}
                placeholder="Caption / description"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setOpen(false); setEditingId(null); setForm(emptyForm); }} className="rounded-full px-4 py-2 text-sm">Cancel</button>
                <button onClick={save} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{editingId ? "Update" : "Save"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!works.length ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <ImageIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No work in the portfolio yet.</p>
          {canManage && <p className="mt-1 text-xs text-muted-foreground">Use “Add Work” to add a piece with its title, medium, dimensions and caption.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 py-2 sm:grid-cols-2 lg:grid-cols-3">
          {works.map((w, i) => (
            <div key={w.id ?? w.url} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
              <div className="px-5 pt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{lot(i)}</div>
              <button type="button" onClick={() => setIdx(i)} className="flex flex-1 items-center justify-center px-5 py-5">
                <SmartImage src={w.url} alt={w.title ?? "Portfolio work"} className="max-h-[340px] w-full object-contain transition duration-300 group-hover:scale-[1.02]" />
              </button>
              <div className="border-t border-border px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => setIdx(i)} className="min-w-0 text-left">
                    <div className="truncate font-serif text-lg italic leading-snug text-foreground">{w.title || "Untitled"}</div>
                  </button>
                  {canManage && w.id && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={() => startEdit(w)} aria-label="Edit work" className="text-muted-foreground hover:text-foreground">
                        <Wrench className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(w.id!)} aria-label="Delete work" className="text-muted-foreground hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {w.medium && <div className="mt-1 text-sm text-muted-foreground">{w.medium}</div>}
                {w.dimensions && <div className="text-sm text-muted-foreground">{w.dimensions}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {active && idx !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white/95 p-3 sm:p-6" onClick={() => setIdx(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative grid max-h-[94vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-[minmax(0,1.4fr)_minmax(300px,420px)]"
          >
            <div className="flex items-center justify-center bg-white p-4">
              <SmartImage src={active.url} alt={active.title ?? ""} className="max-h-[86vh] w-full object-contain" />
            </div>
            <div className="max-h-[86vh] overflow-y-auto border-t border-border p-6 md:border-l md:border-t-0">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{lot(idx)}</div>
                <button onClick={() => setIdx(null)} aria-label="Close" className="rounded-full border border-border p-1.5 hover:bg-muted">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-3 font-serif text-3xl italic leading-tight">{active.title || "Untitled"}</h3>
              {active.medium && <div className="mt-3 text-base text-muted-foreground">{active.medium}</div>}
              {active.dimensions && <div className="text-base text-muted-foreground">{active.dimensions}</div>}
              {active.description && <p className="mt-5 whitespace-pre-wrap text-base leading-relaxed text-foreground/90">{active.description}</p>}
              {canManage && active.id && (
                <div className="mt-6 flex gap-2">
                  <button onClick={() => startEdit(active)} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Edit</button>
                  <button onClick={() => remove(active.id!)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">Delete</button>
                </div>
              )}
            </div>
            {idx > 0 && (
              <button onClick={() => setIdx(idx - 1)} aria-label="Previous work" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white">
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            {idx < works.length - 1 && (
              <button onClick={() => setIdx(idx + 1)} aria-label="Next work" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/90 p-2 shadow hover:bg-white md:right-[calc(300px+0.75rem)]">
                <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
