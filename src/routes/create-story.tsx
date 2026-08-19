import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft, Bold, Code2, Eye, ImagePlus, Italic, Link2, List, ListOrdered,
  Loader2, Quote, RemoveFormatting, Save, Strikethrough, Underline, X, ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Img } from "@/components/shared/smart-img";
import { STORED_URL_TTL, compressImage } from "@/lib/image-compress";
import { isValidLink, normalizeLink } from "@/components/shared/link-fields";

export const Route = createFileRoute("/create-story")({
  component: CreateStoryPage,
  head: () => ({
    meta: [
      { title: "Write a Story - Planet Baltimore" },
      { name: "description", content: "Publish a long-form story for Baltimore." },
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

function CreateStoryPage() {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const inlineImgRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const [uploading, setUploading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    format: "blog",
    visibility: "public",
    cover_url: "",
    tags: [] as string[],
  });
  const [link, setLink] = useState({ url: "", title: "", description: "" });
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const upload = useCallback(async (file: File) => {
    file = await compressImage(file);
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
    try {
      const url = await upload(file);
      set("cover_url", url);
      toast.success("Cover uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const exec = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(cmd, false, value);
    if (editorRef.current) set("content", editorRef.current.innerHTML);
  };

  const insertLink = () => {
    const url = window.prompt("Link URL");
    if (!url) return;
    exec("createLink", url);
  };

  const insertImageFromFile = async (file: File) => {
    try {
      setUploading(true);
      const url = await upload(file);
      exec("insertImage", url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, "");
    if (!t) return;
    if (form.tags.includes(t)) { setTagInput(""); return; }
    if (form.tags.length >= 10) { toast.error("Max 10 tags"); return; }
    set("tags", [...form.tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => set("tags", form.tags.filter((x) => x !== t));

  const canPublish = form.title.trim().length > 0 && (form.content || "").replace(/<[^>]*>/g, "").trim().length > 0;

  const save = async (status: "draft" | "published") => {
    if (!me) { toast.error("Please sign in"); return; }
    if (status === "published" && !canPublish) { toast.error("Title and content are required"); return; }
    const setBusy = status === "published" ? setPublishing : setSavingDraft;
    setBusy(true);
    try {
      const plain = (form.content || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
      const words = plain ? plain.split(/\s+/).length : 0;
      const read_minutes = Math.max(1, Math.round(words / 220));
      const payload = {
        user_id: me.id,
        title: form.title.trim() || "Untitled",
        excerpt: form.excerpt.trim() || null,
        content: form.content,
        format: form.format,
        visibility: form.visibility,
        tags: form.tags,
        cover_url: form.cover_url || null,
        link_url: isValidLink(link.url) ? normalizeLink(link.url) : null,
        link_title: isValidLink(link.url) ? (link.title.trim() || null) : null,
        link_description: isValidLink(link.url) ? (link.description.trim() || null) : null,
        read_minutes,
        status,
      };
      const { data, error } = await supabase.from("stories").insert(payload).select("id").single();
      if (error) throw error;
      if (status === "published") {
        toast.success("Story published");
        navigate({ to: "/stories/$storyId", params: { storyId: data.id } });
      } else {
        toast.success("Draft saved");
        navigate({ to: "/stories" });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  // Keep editor DOM in sync on mount / when cleared
  useEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML && form.content) {
      editorRef.current.innerHTML = form.content;
    }
  }, [form.content]);

  const tbBtn = "inline-flex h-8 w-8 items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900";

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/stories" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" className="gap-2" onClick={() => save("draft")} disabled={savingDraft || publishing}>
              {savingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Draft
            </Button>
            <Button onClick={() => save("published")} disabled={!canPublish || publishing || savingDraft} className="gap-2 bg-neutral-800 text-white hover:bg-neutral-900">
              {publishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />} Publish
            </Button>
          </div>
        </div>

        {/* Cover Image */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-neutral-800">Cover Image</div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onPickCover(f); e.currentTarget.value = ""; }} />
          {form.cover_url ? (
            <div className="group relative overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
              <Img src={form.cover_url} alt="Cover preview" className="max-h-80 w-full object-cover" />
              <div className="absolute right-3 top-3 flex items-center gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-neutral-800 shadow hover:bg-white">Replace</button>
                <button type="button" onClick={() => set("cover_url", "")}
                  className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-red-600 shadow hover:bg-white">Remove</button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
              className="flex h-64 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 text-neutral-500 transition hover:border-orange-300 hover:bg-orange-50/40">
              {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageIcon className="h-7 w-7" />}
              <span className="text-sm font-medium">Click to add cover image</span>
            </button>
          )}
        </div>

        {/* Title / Subtitle */}
        <div className="mt-8 space-y-3">
          <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={160} placeholder="Story title..."
            className="w-full border-0 bg-transparent p-0 font-serif text-4xl font-bold leading-tight text-neutral-900 placeholder:text-neutral-300 focus:outline-none focus:ring-0 sm:text-5xl" />
          <input value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} maxLength={280} placeholder="Add a subtitle (optional)..."
            className="w-full border-0 bg-transparent p-0 text-xl text-neutral-500 placeholder:text-neutral-300 focus:outline-none focus:ring-0" />
        </div>

        {/* Category + Visibility */}
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

        {/* Tags */}
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

        <div className="mt-6">
        </div>

        {/* Content */}
        <div className="mt-8 space-y-2">
          <div className="text-sm font-semibold text-neutral-800">Content</div>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 bg-neutral-50 p-1.5">
              <select onChange={(e) => { exec("formatBlock", e.target.value); e.currentTarget.value = "p"; }} defaultValue="p"
                className="h-8 rounded-md border border-transparent bg-transparent px-2 text-sm hover:bg-neutral-100">
                <option value="p">Normal</option>
                <option value="h1">Heading 1</option>
                <option value="h2">Heading 2</option>
                <option value="h3">Heading 3</option>
              </select>
              <span className="mx-1 h-5 w-px bg-neutral-200" />
              <button type="button" title="Bold" className={tbBtn} onClick={() => exec("bold")}><Bold className="h-4 w-4" /></button>
              <button type="button" title="Italic" className={tbBtn} onClick={() => exec("italic")}><Italic className="h-4 w-4" /></button>
              <button type="button" title="Underline" className={tbBtn} onClick={() => exec("underline")}><Underline className="h-4 w-4" /></button>
              <button type="button" title="Strikethrough" className={tbBtn} onClick={() => exec("strikeThrough")}><Strikethrough className="h-4 w-4" /></button>
              <span className="mx-1 h-5 w-px bg-neutral-200" />
              <button type="button" title="Numbered list" className={tbBtn} onClick={() => exec("insertOrderedList")}><ListOrdered className="h-4 w-4" /></button>
              <button type="button" title="Bulleted list" className={tbBtn} onClick={() => exec("insertUnorderedList")}><List className="h-4 w-4" /></button>
              <button type="button" title="Quote" className={tbBtn} onClick={() => exec("formatBlock", "blockquote")}><Quote className="h-4 w-4" /></button>
              <button type="button" title="Code" className={tbBtn} onClick={() => exec("formatBlock", "pre")}><Code2 className="h-4 w-4" /></button>
              <span className="mx-1 h-5 w-px bg-neutral-200" />
              <button type="button" title="Link" className={tbBtn} onClick={insertLink}><Link2 className="h-4 w-4" /></button>
              <button type="button" title="Image" className={tbBtn} onClick={() => inlineImgRef.current?.click()}>
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
              </button>
              <input ref={inlineImgRef} type="file" accept="image/*" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) insertImageFromFile(f); e.currentTarget.value = ""; }} />
              <span className="mx-1 h-5 w-px bg-neutral-200" />
              <button type="button" title="Clear formatting" className={tbBtn} onClick={() => exec("removeFormat")}><RemoveFormatting className="h-4 w-4" /></button>
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              data-placeholder="Start writing your story..."
              onInput={(e) => set("content", (e.currentTarget as HTMLDivElement).innerHTML)}
              onBlur={(e) => set("content", (e.currentTarget as HTMLDivElement).innerHTML)}
              className="prose prose-neutral min-h-[360px] max-w-none p-5 text-base leading-relaxed focus:outline-none empty:before:pointer-events-none empty:before:text-neutral-300 empty:before:content-[attr(data-placeholder)]"
            />
          </div>
          <p className="text-xs text-neutral-500">Tip: paste text with formatting, add images inline, and use the toolbar to style.</p>
        </div>
      </div>
    </AppLayout>
  );
}