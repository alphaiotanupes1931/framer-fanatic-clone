import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "@/components/smart-image";
import { ImageUpload } from "@/components/shared/image-upload";

type Exhibition = {
  id: string;
  title: string;
  subtitle: string | null;
  statement: string | null;
  venue: string | null;
  location: string | null;
  year_start: number | null;
  year_end: number | null;
  cover_url: string | null;
  order_index: number;
};

type ExImage = {
  id: string;
  exhibition_id: string;
  media_url: string;
  title: string | null;
  medium: string | null;
  dimensions: string | null;
  year: number | null;
  caption: string | null;
  order_index: number;
};

const emptyEx = {
  title: "", subtitle: "", statement: "", venue: "", location: "",
  year_start: "", year_end: "", cover_url: "",
};
const emptyImg = { media_url: "", title: "", medium: "", dimensions: "", year: "", caption: "" };

function yearLabel(e: Exhibition) {
  if (!e.year_start && !e.year_end) return null;
  if (e.year_start && e.year_end && e.year_start !== e.year_end) return `${e.year_start}–${e.year_end}`;
  return String(e.year_start ?? e.year_end);
}

export function ExhibitionsTab({ orgId, canManage = false }: { orgId: string; canManage?: boolean }) {
  const [rows, setRows] = useState<Exhibition[]>([]);
  const [images, setImages] = useState<ExImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [exOpen, setExOpen] = useState(false);
  const [exEditing, setExEditing] = useState<string | null>(null);
  const [exForm, setExForm] = useState(emptyEx);

  const [imgOpen, setImgOpen] = useState(false);
  const [imgEditing, setImgEditing] = useState<string | null>(null);
  const [imgForm, setImgForm] = useState(emptyImg);

  const [lightbox, setLightbox] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    const { data: ex } = await supabase
      .from("organization_exhibitions")
      .select("id,title,subtitle,statement,venue,location,year_start,year_end,cover_url,order_index")
      .eq("org_id", orgId)
      .order("order_index", { ascending: true })
      .order("year_start", { ascending: false, nullsFirst: false });
    const list = (ex ?? []) as Exhibition[];
    setRows(list);
    setActiveId((prev) => (prev && list.some((r) => r.id === prev) ? prev : list[0]?.id ?? null));

    if (list.length) {
      const { data: imgs } = await supabase
        .from("organization_exhibition_images")
        .select("id,exhibition_id,media_url,title,medium,dimensions,year,caption,order_index")
        .in("exhibition_id", list.map((r) => r.id))
        .order("order_index", { ascending: true })
        .order("created_at", { ascending: true });
      setImages((imgs ?? []) as ExImage[]);
    } else {
      setImages([]);
    }
    setLoading(false);
  };

  useEffect(() => { void load(); }, [orgId]);

  const active = rows.find((r) => r.id === activeId) ?? null;
  const activeImages = useMemo(
    () => images.filter((i) => i.exhibition_id === activeId),
    [images, activeId],
  );

  const saveExhibition = async () => {
    if (!exForm.title.trim()) { toast.error("Give the exhibition a title"); return; }
    const payload = {
      org_id: orgId,
      title: exForm.title.trim(),
      subtitle: exForm.subtitle.trim() || null,
      statement: exForm.statement.trim() || null,
      venue: exForm.venue.trim() || null,
      location: exForm.location.trim() || null,
      year_start: exForm.year_start ? Number(exForm.year_start) : null,
      year_end: exForm.year_end ? Number(exForm.year_end) : null,
      cover_url: exForm.cover_url.trim() || null,
      order_index: exEditing ? undefined : rows.length,
    };
    const { error } = exEditing
      ? await supabase.from("organization_exhibitions").update(payload).eq("id", exEditing)
      : await supabase.from("organization_exhibitions").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(exEditing ? "Exhibition updated" : "Exhibition created");
    setExOpen(false); setExEditing(null); setExForm(emptyEx);
    await load();
  };

  const removeExhibition = async (id: string) => {
    if (!confirm("Delete this exhibition and all of its images?")) return;
    const { error } = await supabase.from("organization_exhibitions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Exhibition deleted");
    setActiveId(null);
    await load();
  };

  const saveImage = async () => {
    if (!activeId) return;
    if (!imgForm.media_url.trim()) { toast.error("Upload an image"); return; }
    const payload = {
      exhibition_id: activeId,
      org_id: orgId,
      media_url: imgForm.media_url.trim(),
      title: imgForm.title.trim() || null,
      medium: imgForm.medium.trim() || null,
      dimensions: imgForm.dimensions.trim() || null,
      year: imgForm.year ? Number(imgForm.year) : null,
      caption: imgForm.caption.trim() || null,
      order_index: imgEditing ? undefined : activeImages.length,
    };
    const { error } = imgEditing
      ? await supabase.from("organization_exhibition_images").update(payload).eq("id", imgEditing)
      : await supabase.from("organization_exhibition_images").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(imgEditing ? "Image updated" : "Image added");
    setImgOpen(false); setImgEditing(null); setImgForm(emptyImg);
    await load();
  };

  const removeImage = async (id: string) => {
    if (!confirm("Remove this image from the exhibition?")) return;
    const { error } = await supabase.from("organization_exhibition_images").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setImages((prev) => prev.filter((i) => i.id !== id));
    toast.success("Image removed");
  };

  if (loading) return <div className="py-16 text-center text-sm text-muted-foreground">Loading exhibitions…</div>;

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border py-16 text-center">
        <Images className="mx-auto h-8 w-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">No exhibitions yet.</p>
        {canManage && (
          <button
            type="button"
            onClick={() => { setExEditing(null); setExForm(emptyEx); setExOpen(true); }}
            className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-5 py-2 text-sm font-semibold text-white hover:bg-[#b8480a]"
          >
            <Plus className="h-4 w-4" /> Create an exhibition
          </button>
        )}
        {exOpen && (
          <ExhibitionDialog
            form={exForm} setForm={setExForm} editing={!!exEditing}
            onCancel={() => setExOpen(false)} onSave={saveExhibition}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Exhibition index, styled like a gallery sub-navigation */}
      <div className="flex flex-col items-center gap-2 border-b border-border pb-6 text-center">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {rows.map((e) => {
            const on = e.id === activeId;
            return (
              <button
                key={e.id}
                type="button"
                onClick={() => { setActiveId(e.id); setLightbox(null); }}
                className={`text-sm uppercase tracking-[0.18em] transition ${on ? "text-[#d4580a]" : "text-muted-foreground hover:text-foreground"}`}
              >
                {e.title}
                {yearLabel(e) && <span className="ml-2 text-[11px] tracking-normal opacity-60">{yearLabel(e)}</span>}
              </button>
            );
          })}
        </div>
        {canManage && (
          <button
            type="button"
            onClick={() => { setExEditing(null); setExForm(emptyEx); setExOpen(true); }}
            className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-4 py-1.5 text-xs font-semibold text-muted-foreground hover:border-[#d4580a] hover:text-[#d4580a]"
          >
            <Plus className="h-3.5 w-3.5" /> New exhibition
          </button>
        )}
      </div>

      {active && (
        <article className="mx-auto w-full max-w-3xl">
          <header className="text-center">
            <h2 className="text-2xl font-light uppercase tracking-[0.22em]">{active.title}</h2>
            {active.subtitle && <p className="mt-3 text-base text-muted-foreground">{active.subtitle}</p>}
            {(active.venue || active.location || yearLabel(active)) && (
              <p className="mt-2 text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {[active.venue, active.location, yearLabel(active)].filter(Boolean).join(" · ")}
              </p>
            )}
            {canManage && (
              <div className="mt-4 flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setExEditing(active.id);
                    setExForm({
                      title: active.title, subtitle: active.subtitle ?? "", statement: active.statement ?? "",
                      venue: active.venue ?? "", location: active.location ?? "",
                      year_start: active.year_start ? String(active.year_start) : "",
                      year_end: active.year_end ? String(active.year_end) : "",
                      cover_url: active.cover_url ?? "",
                    });
                    setExOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold hover:border-[#d4580a] hover:text-[#d4580a]"
                >
                  <Pencil className="h-3.5 w-3.5" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => void removeExhibition(active.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-red-600 hover:border-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete
                </button>
              </div>
            )}
          </header>

          {active.statement && (
            <div className="mt-10 space-y-4">
              {active.statement.split(/\n{2,}/).map((p, i) => (
                <p key={i} className="text-[15px] leading-relaxed text-foreground/90">{p}</p>
              ))}
            </div>
          )}

          <div className="mt-12 space-y-14">
            {activeImages.map((img, i) => (
              <figure key={img.id} className="group">
                <button type="button" onClick={() => setLightbox(i)} className="block w-full">
                  <SmartImage src={img.media_url} alt={img.title ?? active.title} className="w-full bg-muted object-contain" />
                </button>
                {(img.title || img.medium || img.dimensions || img.year || img.caption) && (
                  <figcaption className="mt-3 text-center text-xs text-muted-foreground">
                    {[img.title, img.medium, img.dimensions, img.year].filter(Boolean).join(", ")}
                    {img.caption && <span className="mt-1 block italic">{img.caption}</span>}
                  </figcaption>
                )}
                {canManage && (
                  <div className="mt-2 flex justify-center gap-2 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => {
                        setImgEditing(img.id);
                        setImgForm({
                          media_url: img.media_url, title: img.title ?? "", medium: img.medium ?? "",
                          dimensions: img.dimensions ?? "", year: img.year ? String(img.year) : "",
                          caption: img.caption ?? "",
                        });
                        setImgOpen(true);
                      }}
                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeImage(img.id)}
                      className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </figure>
            ))}
            {activeImages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground">No images in this exhibition yet.</p>
            )}
          </div>

          {canManage && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => { setImgEditing(null); setImgForm(emptyImg); setImgOpen(true); }}
                className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-5 py-2 text-sm font-semibold text-white hover:bg-[#b8480a]"
              >
                <Plus className="h-4 w-4" /> Upload image
              </button>
            </div>
          )}
        </article>
      )}

      {lightbox !== null && activeImages[lightbox] && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 p-4" onClick={() => setLightbox(null)}>
          <button type="button" className="absolute right-4 top-4 text-white" onClick={() => setLightbox(null)}><X className="h-6 w-6" /></button>
          <button
            type="button"
            className="absolute left-4 text-white"
            onClick={(e) => { e.stopPropagation(); setLightbox((v) => (v! - 1 + activeImages.length) % activeImages.length); }}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <SmartImage
            src={activeImages[lightbox].media_url}
            alt={activeImages[lightbox].title ?? "Exhibition image"}
            className="max-h-[85vh] max-w-[85vw] object-contain"
          />
          <button
            type="button"
            className="absolute right-4 text-white"
            onClick={(e) => { e.stopPropagation(); setLightbox((v) => (v! + 1) % activeImages.length); }}
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </div>
      )}

      {exOpen && (
        <ExhibitionDialog
          form={exForm} setForm={setExForm} editing={!!exEditing}
          onCancel={() => { setExOpen(false); setExEditing(null); }} onSave={saveExhibition}
        />
      )}

      {imgOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-card p-5">
            <h3 className="text-lg font-bold">{imgEditing ? "Edit image" : "Upload image"}</h3>
            <div className="mt-4 space-y-3">
              <ImageUpload value={imgForm.media_url} onChange={(url) => setImgForm((f) => ({ ...f, media_url: url }))} bucket="post-media" label="Upload exhibition image" />
              <Field label="Title" value={imgForm.title} onChange={(v) => setImgForm((f) => ({ ...f, title: v }))} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Medium" value={imgForm.medium} onChange={(v) => setImgForm((f) => ({ ...f, medium: v }))} />
                <Field label="Dimensions" value={imgForm.dimensions} onChange={(v) => setImgForm((f) => ({ ...f, dimensions: v }))} />
              </div>
              <Field label="Year" value={imgForm.year} onChange={(v) => setImgForm((f) => ({ ...f, year: v.replace(/\D/g, "").slice(0, 4) }))} />
              <Field label="Caption" value={imgForm.caption} onChange={(v) => setImgForm((f) => ({ ...f, caption: v }))} />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => { setImgOpen(false); setImgEditing(null); }} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Cancel</button>
              <button type="button" onClick={() => void saveImage()} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, textarea = false }: { label: string; value: string; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={6} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      ) : (
        <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
      )}
    </label>
  );
}

function ExhibitionDialog({
  form, setForm, editing, onCancel, onSave,
}: {
  form: typeof emptyEx;
  setForm: React.Dispatch<React.SetStateAction<typeof emptyEx>>;
  editing: boolean;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-card p-5 text-left">
        <h3 className="text-lg font-bold">{editing ? "Edit exhibition" : "New exhibition"}</h3>
        <div className="mt-4 space-y-3">
          <Field label="Title" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v }))} />
          <Field label="Subtitle" value={form.subtitle} onChange={(v) => setForm((f) => ({ ...f, subtitle: v }))} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Venue" value={form.venue} onChange={(v) => setForm((f) => ({ ...f, venue: v }))} />
            <Field label="Location" value={form.location} onChange={(v) => setForm((f) => ({ ...f, location: v }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Year start" value={form.year_start} onChange={(v) => setForm((f) => ({ ...f, year_start: v.replace(/\D/g, "").slice(0, 4) }))} />
            <Field label="Year end" value={form.year_end} onChange={(v) => setForm((f) => ({ ...f, year_end: v.replace(/\D/g, "").slice(0, 4) }))} />
          </div>
          <Field label="Statement" value={form.statement} onChange={(v) => setForm((f) => ({ ...f, statement: v }))} textarea />
          <div>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cover image</span>
            <ImageUpload value={form.cover_url} onChange={(url) => setForm((f) => ({ ...f, cover_url: url }))} bucket="post-media" label="Upload cover" />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Cancel</button>
          <button type="button" onClick={() => void onSave()} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Save</button>
        </div>
      </div>
    </div>
  );
}
