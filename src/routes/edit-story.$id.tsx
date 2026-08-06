import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Bold, Code2, ImagePlus, Italic, Link2, List, ListOrdered,
  Loader2, Quote, RemoveFormatting, Save, Strikethrough, Underline, X, ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Img } from "@/components/shared/smart-img";

export const Route = createFileRoute("/edit-story/$id")({
  component: EditStoryPage,
  head: () => ({
    meta: [
      { title: "Edit Story - Planet Baltimore" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

const CATEGORIES = [
  { value: "blog", label: "Blog" },
  { value: "essay", label: "Essay" },
  { value: "poetry", label: "Poetry" },
  { value: "review", label: "Review" },
  { value: "interview", label: "Interview" },
  { value: "resource", label: "Resource" },
  { value: "short story", label: "Short Story" },
];

const VISIBILITIES = [
  { value: "public", label: "Public" },
  { value: "followers", label: "Followers" },
  { value: "only_me", label: "Only me" },
];

function EditStoryPage() {
  const me = useCurrentProfile();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const inlineImgRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "", excerpt: "", content: "", format: "blog",
    visibility: "public", cover_url: "", tags: [] as string[],
  });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("stories").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Story not found"); navigate({ to: "/stories" }); return; }
      setOwnerId(data.user_id);
      setForm({
        title: data.title || "",
        excerpt: data.excerpt || "",
        content: data.content || "",
        format: data.format || "blog",
        visibility: data.visibility || "public",
        cover_url: data.cover_url || "",
        tags: Array.isArray(data.tags) ? data.tags : [],
      });
      setLoading(false);
      setTimeout(() => {
        if (editorRef.current) editorRef.current.innerHTML = data.content || "";
      }, 0);
    })();
  }, [id, navigate]);

  const upload = useCallback(async (file: File) => {
    if (!me) throw new Error("Sign in required");
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("story-covers").upload(path, file, { upsert: false, contentType: file.type });
    if (error) throw error;
    const { data: signed, error: sErr } = await supabase.storage.from("story-covers").createSignedUrl(path, STORED_URL_TTL);
    if (sErr || !signed?.signedUrl) throw sErr || new Error("Could not sign URL");
    return signed.signedUrl;
  }, [me]);

  const onPickCover = async (file: File) => {
    setUploading(true);
    try { const url = await upload(file); set("cover_url", url); toast.success("Cover updated"); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    if (editorRef.current) set("content", editorRef.current.innerHTML);
  };
  const insertLink = () => { const url = window.prompt("Link URL"); if (url) exec("createLink", url); };
  const insertImageFromFile = async (file: File) => {
    try { setUploading(true); const url = await upload(file); exec("insertImage", url); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed"); }
    finally { setUploading(false); }
  };
  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t) return;
    if (form.tags.includes(t)) { setTagInput(""); return; }
    if (form.tags.length >= 10) { toast.error("Max 10 tags"); return; }
    set("tags", [...form.tags, t]); setTagInput("");
  };
  const removeTag = (t: string) => set("tags", form.tags.filter((x) => x !== t));

  const save = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (ownerId && ownerId !== me.id) { toast.error("You can only edit your own stories"); return; }
    setSaving(true);
    try {
      const plain = (form.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const words = plain ? plain.split(/\s+/).length : 0;
      const read_minutes = Math.max(1, Math.round(words / 220));
      const { error } = await supabase.from("stories").update({
        title: form.title.trim() || "Untitled",
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        format: form.format,
        visibility: form.visibility,
        tags: form.tags,
        cover_url: form.cover_url || null,
        read_minutes,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
      if (error) throw error;
      toast.success("Story updated");
      navigate({ to: "/stories/$storyId", params: { storyId: id } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
    finally { setSaving(false); }
  };

  const tbBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900";

  if (loading) return <AppLayout><div className="p-8 text-sm text-muted-foreground">Loading…</div></AppLayout>;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/stories/$storyId" params={{ storyId: id }} className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4" /> Back to story
          </Link>
          <Button onClick={save} disabled={saving} className="gap-2 bg-neutral-800 text-white hover:bg-neutral-900">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </div>

        <div className="space-y-2">
          <div className="text-sm font-semibold text-neutral-800">Cover Image</div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickCover(f); e.currentTarget.value = ""; }} />
          {form.cover_url ? (
            <div className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
              <Img src={form.cover_url} alt="Cover" className="max-h-80 w-full object-cover" />
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow hover:bg-white">Replace</button>
                <button type="button" onClick={() => set("cover_url", "")}
                  className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-red-600 shadow hover:bg-white">Remove</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 hover:border-orange-300 hover:bg-orange-50/40">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-7 w-7" />}
              <span className="text-sm font-medium">Click to add cover image</span>
            </button>
          )}
        </div>

        <div className="mt-8 space-y-3">
          <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={160} placeholder="Story title..."
            className="w-full border-0 bg-transparent p-0 font-serif text-4xl font-bold leading-tight text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:ring-0 sm:text-5xl" />
          <input value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} maxLength={280} placeholder="Add a subtitle (optional)..."
            className="w-full border-0 bg-transparent p-0 text-xl text-neutral-500 placeholder:text-neutral-300 focus:outline-none focus:ring-0" />
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-neutral-800">Category</Label>
            <select value={form.format} onChange={(e) => set("format", e.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-semibold text-neutral-800">Visibility</Label>
            <select value={form.visibility} onChange={(e) => set("visibility", e.target.value)}
              className="h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm">
              {VISIBILITIES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 space-y-1.5">
          <Label className="text-sm font-semibold text-neutral-800">Tags</Label>
          <div className="flex items-center gap-2">
            <input value={tagInput} onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }}
              placeholder="Add a tag..."
              className="h-11 flex-1 rounded-lg border border-neutral-200 bg-white px-3 text-sm" />
            <Button type="button" variant="outline" onClick={addTag} className="h-11">Add</Button>
          </div>
          {form.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  #{t}
                  <button type="button" onClick={() => removeTag(t)} className="rounded-full p-0.5 hover:bg-orange-100"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8 space-y-2">
          <div className="text-sm font-semibold text-neutral-800">Content</div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-neutral-50 p-1.5">
              <select onChange={(e) => { exec("formatBlock", e.target.value); e.currentTarget.value = "p"; }} defaultValue="p"
                className="h-8 rounded-md border border-transparent bg-transparent px-2 text-sm hover:bg-neutral-100">
                <option value="p">Normal</option><option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option><option value="h3">Heading 3</option>
              </select>
              <span className="mx-1 h-5 w-px bg-neutral-200" />
              <button type="button" className={tbBtn} onClick={() => exec("bold")}><Bold className="h-4 w-4" /></button>
              <button type="button" className={tbBtn} onClick={() => exec("italic")}><Italic className="h-4 w-4" /></button>
              <button type="button" className={tbBtn} onClick={() => exec("underline")}><Underline className="h-4 w-4" /></button>
              <button type="button" className={tbBtn} onClick={() => exec("strikeThrough")}><Strikethrough className="h-4 w-4" /></button>
              <span className="mx-1 h-5 w-px bg-neutral-200" />
              <button type="button" className={tbBtn} onClick={() => exec("insertOrderedList")}><ListOrdered className="h-4 w-4" /></button>
              <button type="button" className={tbBtn} onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></button>
              <button type="button" className={tbBtn} onClick={() => exec("formatBlock", "blockquote")}><Quote className="h-4 w-4" /></button>
              <button type="button" className={tbBtn} onClick={() => exec("formatBlock", "pre")}><Code2 className="h-4 w-4" /></button>
              <span className="mx-1 h-5 w-px bg-neutral-200" />
              <button type="button" className={tbBtn} onClick={insertLink}><Link2 className="h-4 w-4" /></button>
              <button type="button" className={tbBtn} onClick={() => inlineImgRef.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              </button>
              <input ref={inlineImgRef} type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImageFromFile(f); e.currentTarget.value = ""; }} />
              <span className="mx-1 h-5 w-px bg-neutral-200" />
              <button type="button" className={tbBtn} onClick={() => exec("removeFormat")}><RemoveFormatting className="h-4 w-4" /></button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start writing..."
              onInput={(e) => set("content", (e.currentTarget as HTMLDivElement).innerHTML)}
              onBlur={(e) => set("content", (e.currentTarget as HTMLDivElement).innerHTML)}
              className="prose prose-neutral min-h-[360px] max-w-none p-5 text-base leading-relaxed focus:outline-none empty:before:pointer-events-none empty:before:text-neutral-300 empty:before:content-[attr(data-placeholder)]"
            />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}