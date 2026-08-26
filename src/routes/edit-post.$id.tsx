import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ImagePlus, Loader2, Save, X, Users, Globe, Lock, Star } from "lucide-react";
import { toast } from "sonner";
import { Img, SmartVideo } from "@/components/shared/smart-img";
import { STORED_URL_TTL, compressImage } from "@/lib/image-compress";
import { isValidLink, normalizeLink } from "@/components/shared/link-fields";

export const Route = createFileRoute("/edit-post/$id")({
  component: EditPostPage,
  head: () => ({ meta: [{ title: "Edit Post - Planet Baltimore" }, { name: "robots", content: "noindex" }] }),
});

type Visibility = "public" | "followers" | "close_friends" | "only_me";

const CATEGORIES = [
  "General","Music","Art","Community","Event","Food","Nightlife","Wellness","Fashion","Sports","News","Question","Other",
];
const POST_TAGS = [
  "Process","Announcement","Studio","Behind the Scenes","Work in Progress","New Release","Show","Collaboration","Sale","Tutorial",
];

const BG_COLORS = [
  { name: "None",        bg: "",         fg: "#0F172A" },
  { name: "Baltimore",   bg: "#d4580a",  fg: "#FFFFFF" },
  { name: "Deep Blue",   bg: "#0F172A",  fg: "#FCFCFA" },
  { name: "Sky",         bg: "#0EA5E9",  fg: "#FFFFFF" },
  { name: "Rose",        bg: "#EC4899",  fg: "#FFFFFF" },
  { name: "Forest",      bg: "#16A34A",  fg: "#FFFFFF" },
  { name: "Sunset",      bg: "#F59E0B",  fg: "#0F172A" },
  { name: "Violet",      bg: "#7C3AED",  fg: "#FFFFFF" },
  { name: "Cream",       bg: "#FDF6E3",  fg: "#0F172A" },
];
const FONT_SIZES: { id: "sm" | "md" | "lg" | "xl"; label: string; cls: string }[] = [
  { id: "sm", label: "SM", cls: "text-base" },
  { id: "md", label: "MD", cls: "text-xl" },
  { id: "lg", label: "LG", cls: "text-3xl" },
  { id: "xl", label: "XL", cls: "text-5xl" },
];

function EditPostPage() {
  const me = useCurrentProfile();
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [postType, setPostType] = useState<string>("text");
  const [content, setContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [link, setLink] = useState({ url: "", title: "", description: "" });
  const [neighborhood, setNeighborhood] = useState("");
  const [category, setCategory] = useState("General");
  const [tag, setTag] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [bg, setBg] = useState<{ bg: string; fg: string }>(BG_COLORS[0]);
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg" | "xl">("md");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
      if (error || !data) { toast.error("Post not found"); navigate({ to: "/dashboard" }); return; }
      setOwnerId(data.user_id);
      setPostType(data.post_type || "text");
      setContent(data.content || "");
      const urls: string[] = Array.isArray(data.media_urls) && data.media_urls.length
        ? data.media_urls
        : [data.image_url, data.video_url].filter(Boolean) as string[];
      setMediaUrls(urls);
      setLink({
        url: data.link_url || "",
        title: data.link_title || "",
        description: data.link_description || "",
      });
      setNeighborhood(data.neighborhood || "");
      setCategory(data.category || "General");
      setTag(data.tag || "");
      setVisibility((data.visibility as Visibility) || "public");
      const foundBg = BG_COLORS.find((c) => c.bg === (data.bg_color || "")) || BG_COLORS[0];
      setBg(data.bg_color ? { bg: data.bg_color, fg: data.text_color || foundBg.fg } : BG_COLORS[0]);
      const fs = (data.font_size as "sm" | "md" | "lg" | "xl" | null) || "md";
      setFontSize(fs);
      setLoading(false);
    })();
  }, [id, navigate]);

  const uploadFile = async (file: File) => {
    file = await compressImage(file);
    if (!me) { toast.error("Please sign in"); return null; }
    const kind: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
    const cap = kind === "image" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > cap) { toast.error(`${kind} must be under ${cap/1024/1024}MB`); return null; }
    setUploading(true);
    const tId = toast.loading("Uploading…");
    try {
      const ext = (file.name.split(".").pop() || (kind === "image" ? "jpg" : "mp4")).toLowerCase();
      const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("post-media").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: sErr } = await supabase.storage.from("post-media").createSignedUrl(path, STORED_URL_TTL);
      if (sErr || !signed?.signedUrl) throw sErr || new Error("Could not sign URL");
      toast.success("Uploaded", { id: tId });
      return signed.signedUrl;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed", { id: tId });
      return null;
    } finally { setUploading(false); }
  };

  const save = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (ownerId && ownerId !== me.id) { toast.error("You can only edit your own posts"); return; }
    setSaving(true);
    try {
      const firstVideo = mediaUrls.find((u) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u)) || null;
      const firstImage = mediaUrls.find((u) => !/\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u)) || null;
      const { error } = await supabase.from("posts").update({
        content: content.trim(),
        image_url: postType === "photo" ? firstImage : null,
        video_url: postType === "video" ? firstVideo : null,
        media_urls: mediaUrls,
        link_url: isValidLink(link.url) ? normalizeLink(link.url) : null,
        link_title: isValidLink(link.url) ? (link.title.trim() || null) : null,
        link_description: isValidLink(link.url) ? (link.description.trim() || null) : null,
        category,
        tag: tag || null,
        visibility,
        neighborhood: neighborhood.trim() || null,
        bg_color: postType === "text" && bg.bg ? bg.bg : null,
        text_color: postType === "text" && bg.bg ? bg.fg : null,
        font_size: postType === "text" ? fontSize : null,
      }).eq("id", id);
      if (error) throw error;
      toast.success("Post updated");
      navigate({ to: "/posts/$postId", params: { postId: id } });
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not save"); }
    finally { setSaving(false); }
  };

  const visibilityOpts: { id: Visibility; label: string; hint: string; Icon: typeof Globe }[] = [
    { id: "public", label: "Public", hint: "Anyone can see", Icon: Globe },
    { id: "followers", label: "Followers only", hint: "People who follow you", Icon: Users },
    { id: "close_friends", label: "Close friends", hint: "Your close friends", Icon: Star },
    { id: "only_me", label: "Only me", hint: "Private", Icon: Lock },
  ];

  if (loading) return <AppLayout><div className="p-8 text-sm text-muted-foreground">Loading…</div></AppLayout>;

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link to="/posts/$postId" params={{ postId: id }} className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700 hover:text-neutral-900">
            <ArrowLeft className="h-4 w-4" /> Back to post
          </Link>
          <Button onClick={save} disabled={saving} className="gap-2 bg-neutral-800 text-white hover:bg-neutral-900">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
          </Button>
        </div>

        <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Content</Label>
            {postType === "text" ? (
              <div
                className="mx-auto flex aspect-square w-full max-w-md items-center justify-center overflow-y-auto rounded-2xl p-6 transition"
                style={{ background: bg.bg || "#F5F5F4", color: bg.fg }}
              >
                <Textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={5}
                  maxLength={2000}
                  placeholder="Share your thoughts..."
                  style={{ color: bg.fg }}
                  className={`w-full resize-none border-0 bg-transparent text-center font-medium placeholder:opacity-60 focus-visible:ring-0 ${FONT_SIZES.find((f) => f.id === fontSize)!.cls}`}
                />
              </div>
            ) : (
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={5} maxLength={2000} placeholder="Share your thoughts..." />
            )}
            <p className="text-xs text-neutral-500 text-right">{content.length}/2000</p>
            {postType === "text" && (
              <div className="space-y-3 pt-2">
                <div>
                  <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Background</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {BG_COLORS.map((c) => {
                      const active = c.bg === bg.bg;
                      return (
                        <button key={c.name} type="button" onClick={() => setBg(c)} title={c.name}
                          className={`h-9 w-9 rounded-full border-2 transition ${active ? "border-[#d4580a] scale-110" : "border-neutral-200"}`}
                          style={{ background: c.bg || "linear-gradient(135deg, #fff 50%, #eee 50%)" }} />
                      );
                    })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Font size</Label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {FONT_SIZES.map((s) => {
                      const active = fontSize === s.id;
                      return (
                        <button key={s.id} type="button" onClick={() => setFontSize(s.id)}
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : "border-neutral-200 text-neutral-600 hover:border-orange-300"}`}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {(postType === "photo" || postType === "video") && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Media</Label>
              <input ref={fileRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                for (const f of files) { const u = await uploadFile(f); if (u) setMediaUrls((p) => [...p, u]); }
                if (fileRef.current) fileRef.current.value = "";
              }} />
              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaUrls.map((u, i) => {
                    const isVideo = /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);
                    return (
                      <div key={u + i} className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                        {isVideo ? <SmartVideo src={u} className="h-32 w-full object-cover" /> : <Img src={u} alt="" className="h-32 w-full object-cover" />}
                        <button type="button" onClick={() => setMediaUrls((p) => p.filter((_, idx) => idx !== i))}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100" aria-label="Remove">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                {mediaUrls.length ? "Add more" : "Upload media"}
              </Button>
            </div>
          )}


          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Category</Label>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Neighborhood</Label>
              <Input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} maxLength={80} placeholder="e.g. Hampden" />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Tag (optional)</Label>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setTag("")}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium ${tag === "" ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : "border-neutral-200 text-neutral-600 hover:border-orange-300"}`}>
                None
              </button>
              {POST_TAGS.map((t) => (
                <button key={t} type="button" onClick={() => setTag(t)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${tag === t ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : "border-neutral-200 text-neutral-600 hover:border-orange-300"}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">Who can see this?</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {visibilityOpts.map(({ id: vId, label, hint, Icon }) => {
                const active = visibility === vId;
                return (
                  <button key={vId} type="button" onClick={() => setVisibility(vId)}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${active ? "border-[#d4580a] bg-orange-50" : "border-neutral-200 hover:border-orange-300"}`}>
                    <Icon className="h-4 w-4 text-[#d4580a]" />
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-[11px] text-neutral-500">{hint}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}