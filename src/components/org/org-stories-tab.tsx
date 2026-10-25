import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Clock, X, BookOpen, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Img } from "@/components/shared/smart-img";
import { ImageUpload } from "@/components/shared/image-upload";
import { stripHtml, timeAgo } from "@/lib/text-utils";
import { RichTextEditor, richHtmlIsEmpty } from "@/components/rich-text-editor";
import DOMPurify from "isomorphic-dompurify";
import { Button } from "@/components/ui/button";

type OrgStory = {
  id: string;
  title: string;
  body: string | null;
  media_url: string | null;
  link_url: string | null;
  created_at: string;
  tags: string[];
};

function readMinutes(body: string | null) {
  const words = stripHtml(body ?? "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Legacy plain-text bodies become paragraphs so line breaks survive rich editing. */
function plainToHtml(body: string) {
  if (!body || /<\/?[a-z][^>]*>/i.test(body)) return body;
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return body.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("");
}

/** Stories on a page, presented with the same reading layout as the Stories page. */
export function OrgStoriesTab({ orgId, canManage, title: tabTitle = "Stories", allowTags = false }: { orgId: string; canManage: boolean; title?: string; allowTags?: boolean }) {
  const [items, setItems] = useState<OrgStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [active, setActive] = useState<OrgStory | null>(null);
  const [form, setForm] = useState({ title: "", body: "", media_url: "", link_url: "", tags: [] as string[] });
  const [tagInput, setTagInput] = useState("");
  const addTag = () => {
    const tag = tagInput.trim().replace(/^#+/, "");
    if (!tag) return;
    setForm((f) => ({ ...f, tags: f.tags.some((existing) => existing.toLowerCase() === tag.toLowerCase()) ? f.tags : [...f.tags, tag] }));
    setTagInput("");
  };
  const singular = tabTitle === "Stories" ? "story" : tabTitle.replace(/s$/, "").toLowerCase();
  const [saving, setSaving] = useState(false);

  const closeComposer = () => {
    setComposing(false);
    setEditingId(null);
    setForm({ title: "", body: "", media_url: "", link_url: "", tags: [] });
    setTagInput("");
  };

  const edit = (story: OrgStory) => {
    setEditingId(story.id);
    setForm({ title: story.title, body: plainToHtml(story.body ?? ""), media_url: story.media_url ?? "", link_url: story.link_url ?? "", tags: [...(story.tags ?? [])] });
    setTagInput("");
    setActive(null);
    setComposing(true);
  };

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organization_posts")
      .select("id, title, body, media_url, link_url, created_at, tags")
      .eq("org_id", orgId)
      .eq("kind", "press")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as OrgStory[]);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const publish = async () => {
    if (!canManage || saving) return;
    if (!form.title.trim() && richHtmlIsEmpty(form.body)) return toast.error("Add a title or some text");
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) return toast.error("Sign in required");
    setSaving(true);
    const content = {
      title: form.title.trim() || "Untitled",
      body: form.body.trim() || null,
      media_url: form.media_url || null,
      link_url: form.link_url.trim() || null,
      tags: allowTags ? form.tags : [],
    };
    const { data, error } = editingId
      ? await supabase.from("organization_posts").update(content).eq("id", editingId).eq("org_id", orgId).eq("kind", "press").select("id")
      : await supabase.from("organization_posts").insert({ ...content, org_id: orgId, kind: "press", author_id: uid }).select("id");
    setSaving(false);
    if (error) return toast.error(error.message);
    if (!data?.length) return toast.error("This story could not be saved. Refresh the page and try again.");
    toast.success(editingId ? "Story updated" : "Published");
    closeComposer();
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this piece?")) return;
    const { error } = await supabase.from("organization_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((xs) => xs.filter((x) => x.id !== id));
    setActive(null);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <BookOpen className="h-5 w-5 text-primary" /> {tabTitle}
        </h3>
        {canManage && !composing && (
          <button
            onClick={() => setComposing(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Write a {singular}
          </button>
        )}
      </div>

      {composing && (
        <div className="mx-auto w-full max-w-3xl space-y-6 rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <Button variant="ghost" onClick={closeComposer} disabled={saving} className="text-sm font-medium text-muted-foreground hover:bg-transparent hover:text-foreground">← Back</Button>
            <Button onClick={publish} disabled={saving} className="rounded-full px-4 py-1.5 text-xs font-semibold">
              {saving ? "Saving…" : editingId ? "Save changes" : "Publish"}
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cover image</p>
            <ImageUpload value={form.media_url} onChange={(url) => setForm((f) => ({ ...f, media_url: url }))} label="Click to add cover image" />
          </div>

          <input
            className="w-full border-none bg-transparent text-3xl font-bold text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
            placeholder={`${singular.charAt(0).toUpperCase() + singular.slice(1)} title…`}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
          <input
            className="w-full border-none bg-transparent text-base text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none"
            placeholder="Add a link (optional)…"
            value={form.link_url}
            onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
          />

          {allowTags && (
            <div className="space-y-2">
              <label htmlFor={`story-tags-${orgId}`} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</label>
              <div className="flex items-center gap-2">
                <input id={`story-tags-${orgId}`} value={tagInput} onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
                  placeholder="Add a tag…" className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground" />
                <Button type="button" variant="outline" onClick={addTag} className="hover:bg-background hover:text-foreground"><Plus /> Add</Button>
              </div>
              {form.tags.length > 0 && <div className="flex flex-wrap gap-2">
                {form.tags.map((tag) => <span key={tag} className="inline-flex max-w-full items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs text-secondary-foreground">
                  <span className="break-all">#{tag}</span>
                  <Button type="button" variant="ghost" size="icon-sm" title={`Remove ${tag}`} aria-label={`Remove ${tag}`} className="h-6 w-6 shrink-0 p-0 hover:bg-transparent hover:text-secondary-foreground" onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((t) => t !== tag) }))}><X /></Button>
                </span>)}
              </div>}
            </div>
          )}

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Content</p>
            <RichTextEditor
              minHeight={320}
              placeholder="Start writing…"
              value={form.body}
              onChange={(body) => setForm((f) => ({ ...f, body }))}
            />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center text-sm text-muted-foreground">
          {canManage ? `No ${tabTitle.toLowerCase()} yet. Write your first one.` : `No ${tabTitle.toLowerCase()} yet.`}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((s) => (
            <article key={s.id} className="group overflow-hidden rounded-2xl border border-border bg-card">
              <button onClick={() => setActive(s)} className="block w-full text-left">
                {s.media_url && (
                  <Img src={s.media_url} alt="" className="aspect-[16/9] w-full object-cover" loading="lazy" />
                )}
                <div className="space-y-2 p-4">
                  <h4 className="text-[15px] font-bold leading-snug text-foreground line-clamp-2">{s.title}</h4>
                  {s.tags?.length > 0 && <div className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground">{s.tags.map((tag) => <span key={tag} className="break-all">#{tag}</span>)}</div>}
                  {s.body && (
                    <p className="text-sm leading-relaxed text-muted-foreground line-clamp-3">{stripHtml(s.body)}</p>
                  )}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{timeAgo(s.created_at)}</span>
                    <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {readMinutes(s.body)} min read</span>
                  </div>
                </div>
              </button>
              {canManage && (
                <div className="flex items-center justify-between border-t border-border px-3 py-2">
                  <Button variant="ghost" size="sm" onClick={() => edit(s)} className="gap-1 text-xs hover:bg-transparent"><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                  <button onClick={() => remove(s.id)} className="inline-flex items-center gap-1 text-xs font-semibold text-destructive hover:underline">
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {active && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4" onClick={() => setActive(null)}>
          <div className="my-6 w-full max-w-2xl overflow-hidden rounded-2xl bg-card text-card-foreground" onClick={(e) => e.stopPropagation()}>
            {active.media_url && <Img src={active.media_url} alt="" className="aspect-[16/9] w-full object-cover" />}
            <div className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <h2 className="text-2xl font-bold leading-tight text-foreground">{active.title}</h2>
                <button onClick={() => setActive(null)} className="rounded-full p-1 text-muted-foreground hover:bg-hover"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{timeAgo(active.created_at)}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {readMinutes(active.body)} min read</span>
              </div>
              {active.body && (
                /<\/?[a-z][^>]*>/i.test(active.body) ? (
                  <div className="text-[15px] leading-relaxed text-foreground [&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(active.body) }} />
                ) : (
                  <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{active.body}</div>
                )
              )}
              {active.tags?.length > 0 && <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">{active.tags.map((tag) => <span key={tag} className="break-all">#{tag}</span>)}</div>}
              {canManage && <div className="border-t border-border pt-4"><Button variant="outline" onClick={() => edit(active)} className="gap-2 hover:bg-transparent"><Pencil className="h-4 w-4" /> Edit {singular}</Button></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
