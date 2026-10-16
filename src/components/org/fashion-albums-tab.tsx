import { useEffect, useRef, useState } from "react";
import { ChevronLeft, Image as ImageIcon, Loader2, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SmartImage } from "@/components/smart-image";
import { STORED_URL_TTL, compressImage } from "@/lib/image-compress";

type Item = { id: string; url: string; description: string | null; album: string; cover: string | null };
type Draft = { url: string; description: string };

async function uploadImage(file: File): Promise<string> {
  file = await compressImage(file);
  const { data: u } = await supabase.auth.getUser();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${u.user?.id ?? "anon"}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("post-media").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data, error: e2 } = await supabase.storage.from("post-media").createSignedUrl(path, STORED_URL_TTL);
  if (e2 || !data?.signedUrl) throw e2 ?? new Error("Upload failed");
  return data.signedUrl;
}

/** Fashion artists: albums (name only) holding items (image + caption). */
export function FashionAlbumsTab({ orgId, canManage = false, section = "fashion_line" }: { orgId: string; canManage?: boolean; section?: "fashion_line" | "lookbook" }) {
  const noun = section === "lookbook" ? "Lookbook" : "Fashion Line";
  const scope = (q: any) => section === "lookbook" ? q.eq("section", "lookbook") : q.or("section.is.null,section.eq.fashion_line");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAlbum, setOpenAlbum] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<Item | null>(null);
  const [storyStart, setStoryStart] = useState(0);
  const [story, setStory] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);
  const newCoverRef = useRef<HTMLInputElement>(null);
  const [cover, setCover] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await scope(supabase
      .from("organization_artworks")
      .select("id, media_url, description, title, album, album_cover, order_index, created_at")
      .eq("org_id", orgId))
      .order("order_index", { ascending: true })
      .order("created_at", { ascending: true });
    setItems((data ?? []).map((a: any) => ({
      id: a.id, url: a.media_url, description: a.description ?? null,
      album: (a.album || a.title || "Untitled Album") as string,
      cover: a.album_cover ?? null,
    })));
    setLoading(false);
  };
  useEffect(() => { void load(); }, [orgId]);

  const albums = Array.from(new Set(items.map((i) => i.album)));
  const coverOf = (a: string) => items.find((i) => i.album === a && i.cover)?.cover ?? null;
  const reset = () => { setFormOpen(false); setAlbumName(""); setDrafts([]); setCover(""); };

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const f of Array.from(files)) {
        const url = await uploadImage(f);
        setDrafts((d) => [...d, { url, description: "" }]);
      }
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    setBusy(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  const save = async () => {
    const name = (openAlbum ?? albumName).trim();
    if (!name) { toast.error(`Add a ${noun.toLowerCase()} name`); return; }
    if (!drafts.length) { toast.error("Add at least one image"); return; }
    const albumCover = openAlbum ? coverOf(openAlbum) : (cover || null);
    const rows = drafts.map((d, i) => ({
      org_id: orgId, album: name, title: name, media_url: d.url, album_cover: albumCover, section,
      description: d.description.trim() || null, order_index: items.length + i,
    }));
    const { error } = await supabase.from("organization_artworks").insert(rows);
    if (error) { toast.error(error.message); return; }
    toast.success(drafts.length === 1 ? "Item added" : `${drafts.length} items added`);
    if (!openAlbum) setOpenAlbum(name);
    reset(); void load();
  };

  const changeCover = async (files: FileList | null) => {
    const f = files?.[0]; if (!f || !openAlbum) return;
    setBusy(true);
    try {
      const url = await uploadImage(f);
      const { error } = await scope(supabase.from("organization_artworks").update({ album_cover: url }).eq("org_id", orgId).eq("album", openAlbum));
      if (error) throw error;
      toast.success("Cover updated"); void load();
    } catch (e: any) { toast.error(e?.message ?? "Upload failed"); }
    setBusy(false);
    if (coverRef.current) coverRef.current.value = "";
  };

  const updateCaption = async (id: string, description: string) => {
    const { error } = await supabase.from("organization_artworks").update({ description: description.trim() || null }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Caption saved"); void load(); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from("organization_artworks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setViewer(null); void load();
  };

  if (loading) return <div className="py-14 text-center text-sm text-muted-foreground">Loading...</div>;

  const form = canManage && formOpen && (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      {!openAlbum && (
        <>
          <input value={albumName} onChange={(e) => setAlbumName(e.target.value)}
            placeholder={`${noun} name`}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />

          <div className="flex items-center gap-3">
            {cover && <SmartImage src={cover} alt="Cover" className="h-20 w-20 rounded-lg object-cover" />}
            <button type="button" onClick={() => newCoverRef.current?.click()} disabled={busy}
              className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
              {cover ? "Change cover image" : "Add cover image"}
            </button>
            {cover && <button type="button" aria-label="Remove cover" onClick={() => setCover("")} className="text-muted-foreground"><X className="h-4 w-4" /></button>}
            <input ref={newCoverRef} type="file" accept="image/*,.heic,.heif" hidden
              onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setBusy(true);
                try { setCover(await uploadImage(f)); } catch (err: any) { toast.error(err?.message ?? "Upload failed"); }
                setBusy(false); e.target.value = "";
              }} />
          </div>
        </>
      )}
      {drafts.map((d, i) => (
        <div key={d.url} className="flex gap-3">
          <SmartImage src={d.url} alt="" className={`h-24 w-24 shrink-0 rounded-lg ${section === "lookbook" ? "bg-muted object-contain" : "object-cover"}`} />
          <textarea value={d.description} rows={3} placeholder="Caption / description"
            onChange={(e) => setDrafts((all) => all.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
            className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button aria-label="Remove image" onClick={() => setDrafts((all) => all.filter((_, j) => j !== i))} className="self-start text-muted-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => void pickFiles(e.target.files)} />
      <button onClick={() => fileRef.current?.click()} disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border py-6 text-sm text-muted-foreground">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
        {busy ? "Uploading..." : drafts.length ? "Add more images" : "Add images (you can pick several)"}
      </button>
      <div className="flex justify-end gap-2">
        <button onClick={reset} className="rounded-full px-4 py-2 text-sm">Cancel</button>
        <button onClick={save} disabled={busy} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save</button>
      </div>
    </div>
  );

  // Inside one album
  if (openAlbum) {
    const list = items.filter((i) => i.album === openAlbum);
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-2">
          <button onClick={() => { setOpenAlbum(null); reset(); }} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
            <ChevronLeft className="h-4 w-4" /> All {noun.toLowerCase()}s
          </button>
          {canManage && (
            <button onClick={() => (formOpen ? reset() : setFormOpen(true))}
              className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              {formOpen ? "Close" : "+ Add Item"}
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-2xl font-semibold">{openAlbum}</h3>
          {canManage && (
            <button onClick={() => coverRef.current?.click()} disabled={busy} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">
              {busy ? "Uploading..." : coverOf(openAlbum) ? "Change cover" : "Add cover image"}
            </button>
          )}
        </div>
        <input ref={coverRef} type="file" accept="image/*,.heic,.heif" hidden onChange={(e) => void changeCover(e.target.files)} />
        {form}
        <div className="grid grid-cols-3 gap-4">
          {coverOf(openAlbum) && (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
              <SmartImage src={coverOf(openAlbum)!} alt={`${openAlbum} cover`}
                className={`aspect-[3/4] w-full ${section === "lookbook" ? "bg-muted object-contain" : "object-cover"}`} />
              <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold shadow-sm">Cover photo</span>
            </div>
          )}
          {list.map((it) => (
            <button key={it.id} onClick={() => (section === "lookbook" ? (setStoryStart(list.indexOf(it)), setStory(openAlbum)) : setViewer(it))} className="overflow-hidden rounded-2xl border border-border bg-card text-left">
              <SmartImage src={it.url} alt={it.description ?? openAlbum} className={`aspect-[3/4] w-full ${section === "lookbook" ? "bg-muted object-contain" : "object-cover"}`} />
              {it.description && <p className="line-clamp-2 px-3 py-2 text-sm text-muted-foreground">{it.description}</p>}
            </button>
          ))}
        </div>
        {viewer && <Viewer item={viewer} canManage={canManage} onClose={() => setViewer(null)} onSave={updateCaption} onDelete={remove} />}
        {story && <StoryViewer title={story} start={storyStart} items={list} onClose={() => setStory(null)} />}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {canManage && (
        <div className="flex justify-end">
          <button onClick={() => (formOpen ? reset() : setFormOpen(true))}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
            {formOpen ? "Close" : `+ Add ${noun}`}
          </button>
        </div>
      )}
      {form}
      {!albums.length ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <ImageIcon className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">No {noun.toLowerCase()}s yet.</p>
          {canManage && <p className="mt-1 text-xs text-muted-foreground">Use "Add {noun}" to name one, then add items with captions.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          {albums.map((a) => {
            const list = items.filter((i) => i.album === a);
            const isLook = section === "lookbook";
            return (
              <div key={a} className="overflow-hidden rounded-2xl border border-border bg-card text-left">
                <button onClick={() => setOpenAlbum(a)} className="block w-full">
                  <SmartImage src={coverOf(a) ?? list[0].url} alt={a} className="aspect-[3/4] w-full object-cover" />
                </button>
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{a}</div>
                    <div className="text-xs text-muted-foreground">{list.length} {list.length === 1 ? "photo" : "photos"}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Full-screen, story-style lookbook viewer. Photos are shown whole, never cropped. */
function StoryViewer({ title, items, start = 0, onClose }: { title: string; items: Item[]; start?: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo(0, 0); }, [i]);
  const it = items[i];
  const next = () => (i < items.length - 1 ? setI(i + 1) : onClose());
  const prev = () => setI(Math.max(0, i - 1));
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); };
    window.addEventListener("keydown", k);
    const o = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", k); document.body.style.overflow = o; };
  });
  if (!it) return null;
  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background text-foreground">
      <div className="flex gap-1 px-3 pt-3">
        {items.map((_, j) => (
          <div key={j} className={`h-1 flex-1 rounded-full ${j <= i ? "bg-foreground" : "bg-foreground/20"}`} />
        ))}
      </div>
      <div className="flex items-center justify-between px-4 py-3">
        <div className="truncate font-semibold">{title}</div>
        <button onClick={onClose} aria-label="Close"><X className="h-6 w-6" /></button>
      </div>
      <div ref={scrollRef} className="relative min-h-0 flex-1 overflow-y-auto">
        <SmartImage src={it.url} alt={it.description ?? title} className="block h-auto w-full" />
        {it.description && <p className="whitespace-pre-wrap px-5 py-4 text-center text-sm">{it.description}</p>}
      </div>
      {i > 0 && <button aria-label="Previous photo" onClick={prev} className="fixed left-2 top-1/2 z-[81] -translate-y-1/2 rounded-full bg-background/80 p-2 shadow"><ChevronLeft className="h-6 w-6" /></button>}
      <button aria-label="Next photo" onClick={next} className="fixed right-2 top-1/2 z-[81] -translate-y-1/2 rounded-full bg-background/80 p-2 shadow"><ChevronLeft className="h-6 w-6 rotate-180" /></button>
    </div>
  );
}

function Viewer({ item, canManage, onClose, onSave, onDelete }: {
  item: Item; canManage: boolean; onClose: () => void;
  onSave: (id: string, d: string) => void; onDelete: (id: string) => void;
}) {
  const [text, setText] = useState(item.description ?? "");
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/95 p-3" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative grid max-h-[94vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-card shadow-2xl md:grid-cols-[minmax(0,1.4fr)_360px]">
        <SmartImage src={item.url} alt="" className="max-h-[86vh] w-full object-contain p-4" />
        <div className="space-y-4 overflow-y-auto border-t border-border p-5 md:border-l md:border-t-0">
          <div className="flex justify-end">
            <button onClick={onClose} aria-label="Close" className="rounded-full border border-border p-1.5"><X className="h-4 w-4" /></button>
          </div>
          {canManage ? (
            <>
              <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="Caption / description"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <button onClick={() => onSave(item.id, text)} className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Save caption</button>
                <button onClick={() => onDelete(item.id)} aria-label="Delete item" className="rounded-full border border-border px-3 py-2 text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </>
          ) : (
            item.description && <p className="whitespace-pre-wrap text-base">{item.description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
