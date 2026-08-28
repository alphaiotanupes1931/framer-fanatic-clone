import { useEffect, useState } from "react";
import { navigateExternal, openExternalWindow, closeExternalWindow } from "@/lib/external-nav";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Send, Trash2, ImageIcon, Loader2, MapPin, MessageSquare, Users, UserPlus,
  GraduationCap, Award, BookOpen, Newspaper, Mic, Film, Ticket, Music, Camera,
  Landmark, Wrench, Globe, Handshake, Drama, Shirt, Disc, Sparkles, ChevronDown, ChevronUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ImageUpload } from "@/components/shared/image-upload";
import { InviteFriendsDialog } from "@/components/invite-friends-dialog";
import { createArtworkCheckout } from "@/lib/stripe.functions";
import { Img, SmartVideo } from "@/components/shared/smart-img";

export function ArtistPostsGrid({ posts }: { posts: any[] }) {
  if (!posts.length) return <div className="py-12 text-center text-muted-foreground">No posts yet.</div>;
  return (
    <div className="grid grid-cols-2 gap-3">
      {posts.map((p) => {
        const firstMedia = Array.isArray(p.media_urls) ? p.media_urls[0] : null;
        const candidate = p.image_url || firstMedia || p.media_url;
        const isVideo = typeof candidate === "string" && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(candidate);
        const img = isVideo ? null : candidate;
        const videoUrl = isVideo ? candidate : null;
        return (
        <Link key={p.id} to="/posts/$postId" params={{ postId: p.id }} className="group block">
          {img ? (
            <div className="aspect-square overflow-hidden rounded-xl bg-neutral-100">
              <Img src={img} alt={p.content ?? ""} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = "none"; }} />
            </div>
          ) : videoUrl ? (
            <div className="aspect-square overflow-hidden rounded-xl bg-white">
              <SmartVideo src={videoUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
            </div>
          ) : (
            <div className="aspect-square rounded-xl bg-neutral-100 p-4 text-sm text-neutral-700 flex items-center justify-center text-center">
              {p.content ?? ""}
            </div>
          )}
          <div className="mt-2 px-1">
            {p.content && <div className="text-sm font-semibold text-neutral-800 line-clamp-2 whitespace-pre-wrap break-words">{p.content}</div>}
            {p.tag && <div className="mt-0.5 text-xs uppercase tracking-wider text-neutral-500">{p.tag}</div>}
          </div>
        </Link>
        );
      })}
    </div>
  );
}

export function ArtistGalleryTab({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewIdx, setViewIdx] = useState<number | null>(null);
  const [form, setForm] = useState({ title: "", medium: "", dimensions: "", body: "", media_url: "" });
  const resetForm = () => setForm({ title: "", medium: "", dimensions: "", body: "", media_url: "" });

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("profile_sections").select("*")
      .eq("user_id", userId).eq("kind", "gallery")
      .order("created_at", { ascending: true });
    setItems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [userId]);

  const save = async () => {
    if (!form.media_url.trim()) { toast.error("Upload an image of the work"); return; }
    const payload = {
      user_id: userId,
      kind: "gallery",
      title: form.title.trim() || null,
      subtitle: form.medium.trim() || null,
      year: form.dimensions.trim() || null,
      body: form.body.trim() || null,
      media_url: form.media_url.trim(),
      order_index: items.length,
    };
    const { error } = editingId
      ? await supabase.from("profile_sections").update(payload).eq("id", editingId)
      : await supabase.from("profile_sections").insert(payload);
    if (error) { toast.error(error.message); return; }
    setOpen(false); setEditingId(null); resetForm(); void load();
  };

  const startEdit = (it: any) => {
    setForm({
      title: it.title ?? "", medium: it.subtitle ?? "", dimensions: it.year ?? "",
      body: it.body ?? "", media_url: it.media_url ?? "",
    });
    setEditingId(it.id); setOpen(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this work?")) return;
    await supabase.from("profile_sections").delete().eq("id", id);
    setViewIdx(null);
    void load();
  };

  const lot = (i: number) => `LOT ${String(i + 1).padStart(2, "0")}`;
  const active = viewIdx !== null ? items[viewIdx] : null;

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading portfolio...</div>;

  return (
    <div className="space-y-5">
      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => { setOpen((v) => !v); setEditingId(null); resetForm(); }}
            className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b8480a]"
          >
            {open ? "Close" : "+ Add Work"}
          </button>
        </div>
      )}

      {canEdit && open && (
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="grid gap-4 md:grid-cols-[200px_minmax(0,1fr)]">
            <ImageUpload value={form.media_url} onChange={(url) => setForm({ ...form, media_url: url })} label="Work image" />
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title, year (e.g. Nuclear Family, 2025)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })} placeholder="Medium (e.g. Acrylic on canvas)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <input value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} placeholder="Dimensions (e.g. 72 x 66 inches)" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <textarea value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} rows={4} placeholder="Description / statement (optional)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2">
                <button onClick={() => { setOpen(false); setEditingId(null); resetForm(); }} className="rounded-full px-4 py-2 text-sm">Cancel</button>
                <button onClick={save} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">{editingId ? "Update" : "Save"}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-sm text-muted-foreground">No work in the portfolio yet.</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <div key={it.id} className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-card">
              <div className="px-5 pt-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{lot(i)}</div>
              <button type="button" onClick={() => setViewIdx(i)} className="flex flex-1 items-center justify-center px-5 py-5">
                {it.media_url && (
                  <Img src={it.media_url} alt={it.title ?? ""} loading="lazy" className="max-h-[340px] w-full object-contain transition duration-300 group-hover:scale-[1.02]" />
                )}
              </button>
              <div className="border-t border-border px-5 py-4">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => setViewIdx(i)} className="min-w-0 text-left">
                    <div className="truncate font-serif text-lg italic leading-snug text-foreground">{it.title || "Untitled"}</div>
                  </button>
                  {canEdit && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button onClick={() => startEdit(it)} aria-label="Edit work" className="text-muted-foreground hover:text-foreground">
                        <Wrench className="h-4 w-4" />
                      </button>
                      <button onClick={() => remove(it.id)} aria-label="Delete work" className="text-muted-foreground hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
                {it.subtitle && <div className="mt-1 text-sm text-muted-foreground">{it.subtitle}</div>}
                {it.year && <div className="text-sm text-muted-foreground">{it.year}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {active && viewIdx !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-white/95 p-3 sm:p-6" onClick={() => setViewIdx(null)}>
          {viewIdx > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); setViewIdx(viewIdx - 1); }}
              aria-label="Previous work"
              className="absolute left-2 top-1/2 z-[71] hidden -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-lg ring-1 ring-black/5 hover:bg-white md:flex lg:left-6"
            >
              <ChevronDown className="h-6 w-6 rotate-90" />
            </button>
          )}
          {viewIdx < items.length - 1 && (
            <button
              onClick={(e) => { e.stopPropagation(); setViewIdx(viewIdx + 1); }}
              aria-label="Next work"
              className="absolute right-2 top-1/2 z-[71] hidden -translate-y-1/2 rounded-full bg-white/90 p-3 shadow-lg ring-1 ring-black/5 hover:bg-white md:flex lg:right-6"
            >
              <ChevronDown className="h-6 w-6 -rotate-90" />
            </button>
          )}
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative grid max-h-[94vh] w-full max-w-6xl grid-cols-1 overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-[minmax(0,1.4fr)_minmax(300px,420px)]"
          >
            <div className="relative flex items-center justify-center bg-white p-4">
              {active.media_url && <Img src={active.media_url} alt={active.title ?? ""} className="max-h-[88vh] w-full object-contain" />}
            </div>
            <div className="max-h-[88vh] overflow-y-auto border-t border-border p-6 md:border-l md:border-t-0">
              <div className="flex items-start justify-between gap-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{lot(viewIdx)}</div>
                <button onClick={() => setViewIdx(null)} aria-label="Close" className="rounded-full border border-border px-2 py-1 text-xs font-semibold">Close</button>
              </div>
              <h3 className="mt-3 font-serif text-3xl italic leading-tight">{active.title || "Untitled"}</h3>
              {active.subtitle && <div className="mt-3 text-base text-muted-foreground">{active.subtitle}</div>}
              {active.year && <div className="text-base text-muted-foreground">{active.year}</div>}
              {active.body && <p className="mt-5 whitespace-pre-wrap text-base leading-relaxed text-foreground/90">{active.body}</p>}
              {canEdit && (
                <div className="mt-6 flex gap-2">
                  <button onClick={() => { startEdit(active); setViewIdx(null); }} className="rounded-full border border-border px-4 py-2 text-sm font-semibold">Edit</button>
                  <button onClick={() => remove(active.id)} className="rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-600">Delete</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ArtistSeriesTab({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const [series, setSeries] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [addingSeries, setAddingSeries] = useState(false);
  const [seriesForm, setSeriesForm] = useState({ title: "", body: "", media_url: "" });
  const [itemForm, setItemForm] = useState({ title: "", media_url: "", body: "" });
  const [addingItem, setAddingItem] = useState(false);
  const load = async () => {
    const { data } = await supabase.from("profile_sections").select("*").eq("user_id", userId).eq("kind", "series").order("created_at", { ascending: false });
    const all = data ?? [];
    setSeries(all.filter((r: any) => !r.parent_id));
    setItems(all.filter((r: any) => r.parent_id));
  };
  useEffect(() => { void load(); }, [userId]);
  const addSeries = async () => {
    if (!seriesForm.title.trim()) { toast.error("Series title required"); return; }
    const { error } = await supabase.from("profile_sections").insert({ user_id: userId, kind: "series", title: seriesForm.title.trim(), body: seriesForm.body.trim() || null, media_url: seriesForm.media_url.trim() || null });
    if (error) { toast.error(error.message); return; }
    setSeriesForm({ title: "", body: "", media_url: "" }); setAddingSeries(false); void load();
  };
  const addItem = async (parentId: string) => {
    if (!itemForm.media_url.trim() && !itemForm.title.trim()) { toast.error("Add an image or title"); return; }
    const { error } = await supabase.from("profile_sections").insert({ user_id: userId, kind: "series", parent_id: parentId, title: itemForm.title.trim() || null, media_url: itemForm.media_url.trim() || null, body: itemForm.body.trim() || null });
    if (error) { toast.error(error.message); return; }
    setItemForm({ title: "", media_url: "", body: "" }); setAddingItem(false); void load();
  };
  const remove = async (id: string) => { if (!confirm("Delete this?")) return; await supabase.from("profile_sections").delete().eq("id", id); void load(); };
  if (openId) {
    const s = series.find((r) => r.id === openId);
    const kids = items.filter((r) => r.parent_id === openId);
    if (!s) { setOpenId(null); return null; }
    return (
      <div className="space-y-4">
        <button onClick={() => setOpenId(null)} className="text-sm font-semibold text-[#d4580a]">Back to Series</button>
        <div className="rounded-2xl border border-border overflow-hidden">
          {s.media_url && <Img src={s.media_url} alt={s.title} className="w-full h-56 object-cover" />}
          <div className="p-5">
            <div className="text-2xl font-bold">{s.title}</div>
            {s.body && <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>}
          </div>
        </div>
        {canEdit && (addingItem ? (
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
            <input value={itemForm.title} onChange={(e) => setItemForm({ ...itemForm, title: e.target.value })} placeholder="Piece title" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <ImageUpload value={itemForm.media_url} onChange={(url) => setItemForm({ ...itemForm, media_url: url })} label="Upload piece photo" />
            <textarea value={itemForm.body} onChange={(e) => setItemForm({ ...itemForm, body: e.target.value })} placeholder="Description (optional)" rows={2} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button onClick={() => setAddingItem(false)} className="rounded-full px-4 py-2 text-sm">Cancel</button>
              <button onClick={() => addItem(s.id)} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Add to series</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setAddingItem(true)} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">+ Add piece to series</button>
        ))}
        {kids.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No pieces in this series yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {kids.map((k) => (
              <div key={k.id} className="group relative overflow-hidden rounded-2xl border border-border">
                {k.media_url && <Img src={k.media_url} alt={k.title ?? ""} className="w-full h-64 object-cover" />}
                <div className="p-3">
                  {k.title && <div className="font-semibold">{k.title}</div>}
                  {k.body && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{k.body}</p>}
                </div>
                {canEdit && <button onClick={() => remove(k.id)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 opacity-0 group-hover:opacity-100"><span className="text-red-600 text-xs font-bold">x</span></button>}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {canEdit && (
        <div className="flex justify-end">
          <button onClick={() => setAddingSeries((v) => !v)} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">+ New series</button>
        </div>
      )}
      {addingSeries && (
        <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
          <input value={seriesForm.title} onChange={(e) => setSeriesForm({ ...seriesForm, title: e.target.value })} placeholder="Series title" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={seriesForm.body} onChange={(e) => setSeriesForm({ ...seriesForm, body: e.target.value })} placeholder="Series description" rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <ImageUpload value={seriesForm.media_url} onChange={(url) => setSeriesForm({ ...seriesForm, media_url: url })} label="Upload cover photo (optional)" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setAddingSeries(false)} className="rounded-full px-4 py-2 text-sm">Cancel</button>
            <button onClick={addSeries} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Create series</button>
          </div>
        </div>
      )}
      {series.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">No series yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {series.map((s) => {
            const count = items.filter((i) => i.parent_id === s.id).length;
            return (
              <button key={s.id} onClick={() => setOpenId(s.id)} className="text-left rounded-2xl border border-border overflow-hidden hover:shadow-md transition">
                {s.media_url && <Img src={s.media_url} alt={s.title} className="w-full h-48 object-cover" />}
                <div className="p-4">
                  <div className="font-bold">{s.title}</div>
                  {s.body && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.body}</p>}
                  <div className="mt-2 text-xs text-muted-foreground">{count} {count === 1 ? "piece" : "pieces"}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ArtistBookCollaborateTab({ profile }: { profile: any }) {
  const [intent, setIntent] = useState<string>("Collaborate");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const intents: Array<{ key: string; icon: LucideIcon }> = [
    { key: "Collaborate", icon: MessageSquare },
    { key: "Commission", icon: Landmark },
    { key: "Book / Perform", icon: Music },
    { key: "Photography", icon: Camera },
    { key: "Other", icon: Sparkles },
  ];
  const displayName = profile?.display_name || profile?.username || "this artist";
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.id) return;
    if (!name.trim() || !email.trim() || !message.trim()) { toast.error("Fill in your name, email, and message."); return; }
    setSending(true);
    const { data: sess } = await supabase.auth.getSession();
    const { error } = await supabase.from("artist_inquiries").insert({
      artist_id: profile.id, sender_id: sess.session?.user.id ?? null,
      intent, sender_name: name.trim(), sender_email: email.trim(), message: message.trim(),
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Message sent");
    setName(""); setEmail(""); setMessage("");
  };
  return (
    <div className="rounded-2xl border border-border p-6 space-y-6">
      <div>
        <div className="text-xl font-bold">Book or Collaborate</div>
        <div className="text-sm text-muted-foreground mt-1">Reach out to {displayName} for commissions, collaborations, bookings, or any project inquiry.</div>
      </div>
      <div>
        <div className="text-xs font-semibold tracking-wider text-muted-foreground mb-2">I WANT TO...</div>
        <div className="flex flex-wrap gap-2">
          {intents.map((i) => {
            const Icon = i.icon;
            return (
              <button key={i.key} type="button" onClick={() => setIntent(i.key)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${intent === i.key ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : "border-border hover:bg-muted"}`}>
                <Icon className="h-4 w-4" /> {i.key}
              </button>
            );
          })}
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-semibold">Your name <span className="text-[#d4580a]">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-sm font-semibold">Your email <span className="text-[#d4580a]">*</span></label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-sm font-semibold">Message <span className="text-[#d4580a]">*</span></label>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={5} placeholder={`Tell ${displayName} about your project, timeline, budget, or any details...`} className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={sending} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#d4580a] px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50">
          <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Message"}
        </button>
        <p className="text-center text-xs text-muted-foreground">Your message goes directly to {displayName}. No spam, ever.</p>
      </form>
    </div>
  );
}

type CVSectionDef = { kind: string; label: string; icon: LucideIcon };

const DEFAULT_CV_SECTIONS: CVSectionDef[] = [
  { kind: "cv_education", label: "Education", icon: GraduationCap },
  { kind: "cv_solo", label: "Solo Exhibitions", icon: Globe },
  { kind: "cv_group", label: "Group Exhibitions", icon: Users },
  { kind: "cv_awards", label: "Awards & Grants", icon: Award },
  { kind: "cv_residencies", label: "Residencies", icon: BookOpen },
  { kind: "cv_publications", label: "Publications", icon: BookOpen },
  { kind: "cv_press", label: "Press", icon: Newspaper },
];

const VIDEO_CV_SECTIONS: CVSectionDef[] = [
  { kind: "cv_education", label: "Education & Training", icon: GraduationCap },
  { kind: "cv_filmography", label: "Selected Filmography", icon: Film },
  { kind: "cv_festivals", label: "Festivals & Screenings", icon: Ticket },
  { kind: "cv_awards", label: "Awards & Grants", icon: Award },
  { kind: "cv_press", label: "Press", icon: Newspaper },
];

const MUSIC_CV_SECTIONS: CVSectionDef[] = [
  { kind: "cv_education", label: "Training", icon: GraduationCap },
  { kind: "cv_releases", label: "Selected Releases", icon: Disc },
  { kind: "cv_performances", label: "Notable Performances", icon: Mic },
  { kind: "cv_awards", label: "Awards", icon: Award },
  { kind: "cv_press", label: "Press", icon: Newspaper },
];

const PODCAST_CV_SECTIONS: CVSectionDef[] = [
  { kind: "cv_education", label: "Education & Background", icon: GraduationCap },
  { kind: "cv_shows", label: "Shows & Productions", icon: Mic },
  { kind: "cv_guests", label: "Notable Guests", icon: Users },
  { kind: "cv_media_roles", label: "Production & Media Roles", icon: Wrench },
  { kind: "cv_awards", label: "Awards & Recognition", icon: Award },
  { kind: "cv_press", label: "Press", icon: Newspaper },
];

const LITERARY_CV_SECTIONS: CVSectionDef[] = [
  { kind: "cv_education", label: "Education", icon: GraduationCap },
  { kind: "cv_books", label: "Published Books", icon: BookOpen },
  { kind: "cv_publications", label: "Selected Publications", icon: Newspaper },
  { kind: "cv_readings", label: "Readings & Appearances", icon: Mic },
  { kind: "cv_awards", label: "Awards & Fellowships", icon: Award },
  { kind: "cv_residencies", label: "Residencies", icon: BookOpen },
];

const PERFORMANCE_CV_SECTIONS: CVSectionDef[] = [
  { kind: "cv_education", label: "Training", icon: GraduationCap },
  { kind: "cv_repertoire", label: "Repertoire", icon: Drama },
  { kind: "cv_performances", label: "Notable Performances", icon: Mic },
  { kind: "cv_companies", label: "Companies & Collaborations", icon: Handshake },
  { kind: "cv_awards", label: "Awards", icon: Award },
  { kind: "cv_press", label: "Press", icon: Newspaper },
];

const FASHION_CV_SECTIONS: CVSectionDef[] = [
  { kind: "cv_education", label: "Education", icon: GraduationCap },
  { kind: "cv_collections", label: "Collections", icon: Shirt },
  { kind: "cv_shows", label: "Runway & Presentations", icon: Film },
  { kind: "cv_collabs", label: "Collaborations", icon: Handshake },
  { kind: "cv_press", label: "Press", icon: Newspaper },
  { kind: "cv_awards", label: "Awards", icon: Award },
];

const MIXED_MEDIA_CV_SECTIONS: CVSectionDef[] = [
  { kind: "cv_education", label: "Education", icon: GraduationCap },
  { kind: "cv_installations", label: "Installations", icon: Landmark },
  { kind: "cv_commissions", label: "Commissions", icon: Wrench },
  { kind: "cv_solo", label: "Solo Exhibitions", icon: Globe },
  { kind: "cv_group", label: "Group Exhibitions", icon: Users },
  { kind: "cv_awards", label: "Awards & Grants", icon: Award },
  { kind: "cv_press", label: "Press", icon: Newspaper },
];

const PHOTO_CV_SECTIONS: CVSectionDef[] = [
  { kind: "cv_education", label: "Education", icon: GraduationCap },
  { kind: "cv_solo", label: "Solo Exhibitions", icon: Camera },
  { kind: "cv_group", label: "Group Exhibitions", icon: Users },
  { kind: "cv_publications", label: "Publications & Editorials", icon: BookOpen },
  { kind: "cv_clients", label: "Selected Clients", icon: Handshake },
  { kind: "cv_awards", label: "Awards & Grants", icon: Award },
  { kind: "cv_press", label: "Press", icon: Newspaper },
];

function cvSectionsFor(category?: string | null, role?: string | null) {
  const hay = `${(category ?? "").toLowerCase()} ${(role ?? "").toLowerCase()}`;
  if (/podcast/.test(hay)) return PODCAST_CV_SECTIONS;
  if (/videograph|film/.test(hay)) return VIDEO_CV_SECTIONS;
  if (/music|musician|dj|producer/.test(hay)) return MUSIC_CV_SECTIONS;
  if (/literary|poet|writer/.test(hay)) return LITERARY_CV_SECTIONS;
  if (/performance|dancer/.test(hay)) return PERFORMANCE_CV_SECTIONS;
  if (/fashion/.test(hay)) return FASHION_CV_SECTIONS;
  if (/mixed media/.test(hay)) return MIXED_MEDIA_CV_SECTIONS;
  if (/photograph/.test(hay)) return PHOTO_CV_SECTIONS;
  return DEFAULT_CV_SECTIONS;
}

// Label shown above the CV block.
function cvHeadingFor(category?: string | null, role?: string | null) {
  const hay = `${(category ?? "").toLowerCase()} ${(role ?? "").toLowerCase()}`;
  if (/podcast/.test(hay)) return "Podcaster CV / Bio";
  if (/videograph|film/.test(hay)) return "Videographer CV / Bio";
  if (/music|musician|dj|producer/.test(hay)) return "Musician CV / Bio";
  if (/literary|poet|writer/.test(hay)) return "Writer CV / Bio";
  if (/performance|dancer/.test(hay)) return "Performer CV / Bio";
  if (/fashion/.test(hay)) return "Designer CV / Bio";
  if (/mixed media/.test(hay)) return "Mixed Media CV / Bio";
  if (/photograph/.test(hay)) return "Photographer CV / Bio";
  return "Curriculum Vitae";
}

export function ArtistCVTab({ userId, profile, canEdit }: { userId: string; profile: any; canEdit: boolean }) {
  const CV_SECTIONS = cvSectionsFor(profile?.category, profile?.role);
  const heading = cvHeadingFor(profile?.category, profile?.role);
  const [statement, setStatement] = useState<string>(profile?.bio || "");
  const [editStatement, setEditStatement] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("profile_sections").select("*").eq("user_id", userId)
      .in("kind", CV_SECTIONS.map((s) => s.kind))
      .order("year", { ascending: false, nullsFirst: false });
    setItems(data ?? []);
  };
  useEffect(() => { void load(); }, [userId]);
  useEffect(() => { setStatement(profile?.bio || ""); }, [profile?.bio]);
  const saveStatement = async () => {
    const { error } = await supabase.from("profiles").update({ bio: statement }).eq("id", userId);
    if (error) { toast.error(error.message); return; }
    setEditStatement(false); toast.success("Statement saved");
  };
  return (
    <div className="space-y-4">
      <div className="text-2xl font-bold">{heading}</div>
      <div className="rounded-2xl border border-border p-5">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold tracking-wider text-muted-foreground">ARTIST STATEMENT</div>
          {canEdit && !editStatement && <button onClick={() => setEditStatement(true)} className="text-xs font-semibold text-[#d4580a]">Edit</button>}
        </div>
        {editStatement ? (
          <div className="space-y-2">
            <textarea value={statement} onChange={(e) => setStatement(e.target.value)} rows={6} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <div className="flex justify-end gap-2">
              <button onClick={() => { setStatement(profile?.bio || ""); setEditStatement(false); }} className="rounded-full px-4 py-2 text-sm">Cancel</button>
              <button onClick={saveStatement} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">Save</button>
            </div>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{statement || <span className="text-muted-foreground">No artist statement yet.</span>}</p>
        )}
      </div>
      {CV_SECTIONS.map((s) => (
        <CVSection key={s.kind} section={s} userId={userId} items={items.filter((i) => i.kind === s.kind)} canEdit={canEdit} onChange={load} />
      ))}
    </div>
  );
}

function CVSection({ section, userId, items, canEdit, onChange }: { section: CVSectionDef; userId: string; items: any[]; canEdit: boolean; onChange: () => void; }) {
  const [expanded, setExpanded] = useState(true);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ year: "", title: "", subtitle: "" });
  const add = async () => {
    if (!form.title.trim()) { toast.error("Title required"); return; }
    const { error } = await supabase.from("profile_sections").insert({ user_id: userId, kind: section.kind, year: form.year.trim() || null, title: form.title.trim(), subtitle: form.subtitle.trim() || null });
    if (error) { toast.error(error.message); return; }
    setForm({ year: "", title: "", subtitle: "" }); setAdding(false); onChange();
  };
  const remove = async (id: string) => { await supabase.from("profile_sections").delete().eq("id", id); onChange(); };
  const Icon = section.icon;
  return (
    <div className="rounded-2xl border border-border">
      <button onClick={() => setExpanded((v) => !v)} className="w-full flex items-center justify-between p-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-neutral-600" />
          <span className="font-semibold">{section.label}</span>
          <span className="text-sm text-muted-foreground">({items.length})</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t border-border p-4 space-y-3">
          {items.length === 0 && !adding && <div className="text-sm text-muted-foreground text-center py-4">No entries yet.</div>}
          {items.map((it) => (
            <div key={it.id} className="grid grid-cols-[70px_1fr_auto] gap-3 items-start">
              <div className="text-sm font-semibold text-muted-foreground">{it.year || ""}</div>
              <div>
                <div className="font-semibold">{it.title}</div>
                {it.subtitle && <div className="text-sm text-muted-foreground">{it.subtitle}</div>}
              </div>
              {canEdit && <button onClick={() => remove(it.id)} className="text-xs text-red-600 hover:underline">Remove</button>}
            </div>
          ))}
          {canEdit && (adding ? (
            <div className="rounded-lg bg-muted/30 p-3 space-y-2">
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <input value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} placeholder="Year" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              </div>
              <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Venue / Location (optional)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
              <div className="flex justify-end gap-2">
                <button onClick={() => setAdding(false)} className="rounded-full px-3 py-1.5 text-sm">Cancel</button>
                <button onClick={add} className="rounded-full bg-[#d4580a] px-3 py-1.5 text-sm font-semibold text-white">Add</button>
              </div>
            </div>
          ) : (
            <button onClick={() => setAdding(true)} className="text-sm font-semibold text-[#d4580a]">+ Add entry</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ArtistInviteTab({ profile }: { profile: any }) {
  const [open, setOpen] = useState(false);
  const name = profile?.display_name || profile?.username || "your page";
  return (
    <div className="mx-auto max-w-2xl space-y-6 py-6">
      <div className="rounded-2xl border border-border bg-neutral-50 p-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <UserPlus className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-neutral-900">Invite friends to {name}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Grow your following. Upload a contact list or paste emails, we handle the rest.
        </p>
      </div>
      <button
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-200 px-6 py-4 text-base font-semibold text-neutral-800 transition hover:bg-neutral-300"
      >
        <UserPlus className="h-5 w-5" /> Invite Friends
      </button>
      <InviteFriendsDialog open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

export function ArtistEventsGrouped({ events }: { events: Array<{ id: string; title: string; description: string | null; starts_at: string; location: string | null; image_url: string | null }> }) {
  if (events.length === 0) return <div className="py-12 text-center text-muted-foreground">No events yet.</div>;
  const now = Date.now();
  const upcoming = events.filter((e) => new Date(e.starts_at).getTime() >= now).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
  const past = events.filter((e) => new Date(e.starts_at).getTime() < now);
  const renderCard = (e: typeof events[number]) => (
    <Link key={e.id} to="/events/$eventId" params={{ eventId: e.id }} className="block rounded-2xl border border-border overflow-hidden hover:shadow-md transition">
      {e.image_url && (
        <Img
          src={e.image_url}
          alt={e.title}
          className="w-full h-56 object-cover bg-neutral-100"
          loading="lazy"
          onError={(ev) => { (ev.currentTarget as HTMLImageElement).style.display = "none"; }}
        />
      )}
      <div className="p-4 space-y-2">
        <div className="text-xs text-muted-foreground">
          {new Date(e.starts_at).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })} · {new Date(e.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
        </div>
        <div className="font-bold text-lg">{e.title}</div>
        {e.description && <p className="text-sm text-muted-foreground line-clamp-2">{e.description}</p>}
        {e.location && <div className="text-xs text-muted-foreground inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {e.location}</div>}
      </div>
    </Link>
  );
  return (
    <div className="space-y-8">
      {upcoming.length > 0 && (
        <div>
          <div className="text-xs font-semibold tracking-wider text-muted-foreground mb-3">UPCOMING</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">{upcoming.map(renderCard)}</div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <div className="text-xs font-semibold tracking-wider text-muted-foreground mb-3">PAST</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">{past.map(renderCard)}</div>
        </div>
      )}
    </div>
  );
}

export function ArtistStudioTab({ posts }: { posts: any[] }) {
  const studio = posts.filter((p) => (p.tag || "").toLowerCase() === "studio" || (p.tag || "").toLowerCase() === "process" || (p.tag || "").toLowerCase() === "behind the scenes");
  if (studio.length === 0) return <div className="py-12 text-center text-muted-foreground">No studio posts yet. Tag your posts as Studio, Process, or Behind the Scenes to show them here.</div>;
  return <ArtistPostsGrid posts={studio} />;
}

export function ArtistTalkTab({ profile }: { profile: { id: string; display_name?: string | null; username?: string | null } }) {
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await supabase
      .from("profile_wall_comments")
      .select("id, content, created_at, author_id")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (data ?? []) as any[];
    const ids = Array.from(new Set(rows.map((r) => r.author_id)));
    let authors: Record<string, any> = {};
    if (ids.length) {
      const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: ids });
      for (const p of (profs ?? []) as any[]) authors[p.id] = p;
    }
    setComments(rows.map((r) => ({ ...r, author: authors[r.author_id] })));
    setLoading(false);
  };
  useEffect(() => {
    void load();
    supabase.auth.getUser().then(({ data }) => setMe(data.user ? { id: data.user.id } : null));
  }, [profile.id]);

  const post = async () => {
    if (!me) { toast.error("Sign in to comment"); return; }
    const body = text.trim();
    if (!body) return;
    const { error } = await supabase.from("profile_wall_comments").insert({ profile_id: profile.id, author_id: me.id, content: body });
    if (error) { toast.error(error.message); return; }
    setText(""); void load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this comment?")) return;
    const { error } = await supabase.from("profile_wall_comments").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setComments((c) => c.filter((x) => x.id !== id));
  };

  const name = profile.display_name || profile.username || "this page";
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-border p-5 bg-muted/30">
        <div className="flex items-start gap-3">
          <MessageSquare className="mt-1 h-5 w-5 text-[#d4580a]" />
          <div>
            <div className="font-semibold text-[15px]">Community Discussion</div>
            <div className="text-sm text-muted-foreground">Ask questions, share thoughts, or start a conversation with {name} and their followers.</div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-lg font-semibold flex items-center gap-2"><MessageSquare className="h-4 w-4" /> Comments</div>
        <div className="flex gap-2 items-start">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={me ? "Add a comment..." : "Sign in to comment"}
            disabled={!me}
            rows={2}
            className="flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm resize-none"
          />
          <button onClick={post} disabled={!me || !text.trim()} className="rounded-full bg-[#d4580a] p-2.5 text-white disabled:opacity-40 shrink-0" aria-label="Post comment">
            <Send className="h-4 w-4 -rotate-45" />
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : comments.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No comments yet. Be the first!</div>
        ) : (
          <div className="space-y-3 pt-2">
            {comments.map((c) => (
              <div key={c.id} className="flex gap-3 rounded-xl border border-border p-3">
                {c.author?.avatar_url ? (
                  <Img src={c.author.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded-full bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-semibold truncate">
                      {c.author?.username ? (
                        <Link to="/u/$username" params={{ username: c.author.username }} className="hover:underline">
                          {c.author.display_name || c.author.username}
                        </Link>
                      ) : (c.author?.display_name || "Someone")}
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">{new Date(c.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-sm text-neutral-800 whitespace-pre-wrap mt-0.5">{c.content}</div>
                  {me && (me.id === c.author_id || me.id === profile.id) && (
                    <button onClick={() => remove(c.id)} className="text-xs text-red-600 hover:underline mt-1">Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

type WorkMeta = { price_cents?: number; edition?: string; status?: string };

function parseWorkMeta(link_url: string | null | undefined): WorkMeta {
  if (!link_url) return {};
  try { return JSON.parse(link_url) as WorkMeta; } catch { return {}; }
}

export function ArtistAvailableWorksTab({ userId, canEdit }: { userId: string; canEdit: boolean }) {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [ownerReady, setOwnerReady] = useState<boolean>(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", medium: "", dimensions: "", description: "",
    media_url: "", price: "", edition: "Original", status: "available",
  });
  const navigate = useNavigate();
  const checkout = useServerFn(createArtworkCheckout);

  const resetForm = () => setForm({ title: "", medium: "", dimensions: "", description: "", media_url: "", price: "", edition: "Original", status: "available" });

  const load = async () => {
    setLoading(true);
    const [{ data: rows }, { data: owner }] = await Promise.all([
      supabase.from("profile_sections").select("*").eq("user_id", userId).eq("kind", "available_work").order("created_at", { ascending: false }),
      (supabase as any).rpc("payouts_ready", { _user_id: userId }),
    ]);
    setItems(rows ?? []);
    setOwnerReady(!!owner);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [userId]);

  const save = async () => {
    if (!form.title.trim()) { toast.error("Add a work title"); return; }
    if (!form.media_url) { toast.error("Upload an image of the work"); return; }
    const priceNum = Number(form.price);
    if (!Number.isFinite(priceNum) || priceNum < 1) { toast.error("Set a price of $1 or more"); return; }
    const meta: WorkMeta = { price_cents: Math.round(priceNum * 100), edition: form.edition, status: form.status };
    const payload = {
      user_id: userId,
      kind: "available_work",
      title: form.title.trim(),
      subtitle: form.medium.trim() || null,
      year: form.dimensions.trim() || null,
      body: form.description.trim() || null,
      media_url: form.media_url,
      link_url: JSON.stringify(meta),
    };
    if (editingId) {
      const { error } = await supabase.from("profile_sections").update(payload).eq("id", editingId);
      if (error) { toast.error(error.message); return; }
    } else {
      const { error } = await supabase.from("profile_sections").insert(payload);
      if (error) { toast.error(error.message); return; }
    }
    setShowForm(false); setEditingId(null); resetForm(); void load();
  };

  const startEdit = (it: any) => {
    const meta = parseWorkMeta(it.link_url);
    setForm({
      title: it.title ?? "",
      medium: it.subtitle ?? "",
      dimensions: it.year ?? "",
      description: it.body ?? "",
      media_url: it.media_url ?? "",
      price: meta.price_cents ? String((meta.price_cents / 100).toFixed(2)) : "",
      edition: meta.edition || "Original",
      status: meta.status || "available",
    });
    setEditingId(it.id); setShowForm(true);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this work? This cannot be undone.")) return;
    const { error } = await supabase.from("profile_sections").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  const buy = async (it: any) => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) { toast.error("Please sign in to purchase."); navigate({ to: "/auth" }); return; }
    setBusyId(it.id);
    const pre = openExternalWindow();
    try {
      const { url } = await checkout({ data: { workId: it.id, returnOrigin: window.location.origin } });
      if (url) navigateExternal(url, pre);
      else closeExternalWindow(pre);
    } catch (e: any) {
      closeExternalWindow(pre);
      toast.error(e?.message ?? "Could not start checkout.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <div className="py-12 text-center text-muted-foreground">Loading available works…</div>;

  return (
    <div className="space-y-4">
      {canEdit && !ownerReady && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 p-3 text-sm text-orange-900">
          Set up payouts in <Link to="/settings" className="font-semibold underline">Settings</Link> so buyers can purchase your work directly.
        </div>
      )}

      {canEdit && (
        <div className="flex justify-end">
          <button
            onClick={() => { setShowForm((v) => !v); setEditingId(null); resetForm(); }}
            className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white"
          >
            {showForm ? "Close" : "+ Add work"}
          </button>
        </div>
      )}

      {canEdit && showForm && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <div className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-4">
            <div>
              <ImageUpload value={form.media_url} onChange={(url) => setForm({ ...form, media_url: url })} label="Image" />
            </div>
            <div className="space-y-3">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Work title *" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              <div className="flex gap-2">
                <select value={form.edition} onChange={(e) => setForm({ ...form, edition: e.target.value })} className="flex-1 rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                  <option>Original</option>
                  <option>Print</option>
                  <option>Limited Edition</option>
                </select>
                <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="decimal" placeholder="Price (USD)" className="w-40 rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input value={form.medium} onChange={(e) => setForm({ ...form, medium: e.target.value })} placeholder="Medium (e.g. Oil on canvas)" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
                <input value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: e.target.value })} placeholder="Dimensions (e.g. 24 x 36 in)" className="rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              </div>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} placeholder="Description / statement (optional)" className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" />
              <div className="flex items-center justify-between">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                  <option value="available">Available</option>
                  <option value="sold">Sold</option>
                  <option value="reserved">Reserved</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={() => { setShowForm(false); setEditingId(null); resetForm(); }} className="rounded-full px-4 py-2 text-sm">Cancel</button>
                  <button onClick={save} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white">{editingId ? "Update" : "Save"}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-14 text-center text-sm text-neutral-500">
          <ImageIcon className="h-6 w-6 text-neutral-400" />
          <div>No works listed yet.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => {
            const meta = parseWorkMeta(it.link_url);
            const price = meta.price_cents ? `$${(meta.price_cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}` : "—";
            const status = meta.status || "available";
            const soldOut = status !== "available";
            return (
              <div key={it.id} className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white">
                {it.media_url && (
                  <div className="aspect-square overflow-hidden bg-neutral-100">
                    <Img src={it.media_url} alt={it.title ?? ""} className="h-full w-full object-cover" loading="lazy" />
                  </div>
                )}
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-neutral-900">{it.title}</div>
                      <div className="mt-0.5 text-xs uppercase tracking-wider text-neutral-500">{meta.edition || "Original"}</div>
                    </div>
                    <div className="text-sm font-bold text-[#d4580a] shrink-0">{price}</div>
                  </div>
                  {(it.subtitle || it.year) && (
                    <div className="mt-1 text-xs text-neutral-600 line-clamp-1">
                      {[it.subtitle, it.year].filter(Boolean).join(" \u00b7 ")}
                    </div>
                  )}
                  {it.body && <div className="mt-2 text-xs text-neutral-700 line-clamp-3">{it.body}</div>}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    {canEdit ? (
                      <div className="flex gap-2">
                        <button onClick={() => startEdit(it)} className="rounded-full border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-700 hover:bg-neutral-50">Edit</button>
                        <button onClick={() => remove(it.id)} className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" /> Delete</button>
                      </div>
                    ) : soldOut ? (
                      <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-600 capitalize">{status}</span>
                    ) : ownerReady ? (
                      <button onClick={() => buy(it)} disabled={busyId === it.id} className="inline-flex items-center gap-1.5 rounded-full bg-[#d4580a] px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
                        {busyId === it.id ? <><Loader2 className="h-3 w-3 animate-spin" /> Loading…</> : <>Purchase {price}</>}
                      </button>
                    ) : (
                      <span className="text-xs text-neutral-500">Artist has not set up a payment method yet.</span>
                    )}
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