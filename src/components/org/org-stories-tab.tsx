import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Clock, X, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Img } from "@/components/shared/smart-img";
import { ImageUpload } from "@/components/shared/image-upload";
import { stripHtml, timeAgo } from "@/lib/text-utils";

type OrgStory = {
  id: string;
  title: string;
  body: string | null;
  media_url: string | null;
  link_url: string | null;
  created_at: string;
};

function readMinutes(body: string | null) {
  const words = stripHtml(body ?? "").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Stories on a page, presented with the same reading layout as the Stories page. */
export function OrgStoriesTab({ orgId, canManage, title: tabTitle = "Stories" }: { orgId: string; canManage: boolean; title?: string }) {
  const [items, setItems] = useState<OrgStory[]>([]);
  const [loading, setLoading] = useState(true);
  const [composing, setComposing] = useState(false);
  const [active, setActive] = useState<OrgStory | null>(null);
  const [form, setForm] = useState({ title: "", body: "", media_url: "", link_url: "" });
  const singular = tabTitle === "Stories" ? "story" : tabTitle.replace(/s$/, "").toLowerCase();
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organization_posts")
      .select("id, title, body, media_url, link_url, created_at")
      .eq("org_id", orgId)
      .eq("kind", "press")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as OrgStory[]);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const publish = async () => {
    if (!form.title.trim() && !form.body.trim()) return toast.error("Add a title or some text");
    const { data: sess } = await supabase.auth.getUser();
    const uid = sess.user?.id;
    if (!uid) return toast.error("Sign in required");
    setSaving(true);
    const { error } = await supabase.from("organization_posts").insert({
      org_id: orgId,
      kind: "press",
      author_id: uid,
      title: form.title.trim() || "Untitled",
      body: form.body.trim() || null,
      media_url: form.media_url || null,
      link_url: form.link_url.trim() || null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    setForm({ title: "", body: "", media_url: "", link_url: "" });
    setComposing(false);
    toast.success("Published");
    void load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this piece?")) return;
    const { error } = await supabase.from("organization_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((xs) => xs.filter((x) => x.id !== id));
    setActive(null);
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

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
            <button onClick={() => setComposing(false)} className="text-sm font-medium text-muted-foreground hover:text-foreground">← Back</button>
            <button onClick={publish} disabled={saving} className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50">
              {saving ? "Publishing…" : "Publish"}
            </button>
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

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Content</p>
            <textarea
              className={`${inputCls} min-h-[320px] leading-relaxed`}
              rows={14}
              placeholder="Start writing…"
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
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
                <div className="flex justify-end border-t border-border px-3 py-2">
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
                <button onClick={() => setActive(null)} className="rounded-full p-1 text-muted-foreground hover:bg-accent"><X className="h-5 w-5" /></button>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{timeAgo(active.created_at)}</span>
                <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {readMinutes(active.body)} min read</span>
              </div>
              {active.body && (
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{stripHtml(active.body)}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
