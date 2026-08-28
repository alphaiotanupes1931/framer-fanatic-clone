import { MentionText } from "@/components/shared/mention-text";
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MentionField } from "@/components/shared/mention-input";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, Video as VideoIcon, Type as TypeIcon, X, Users, Globe, Lock, Star } from "lucide-react";
import { toast } from "sonner";
import { Img, SmartVideo } from "@/components/shared/smart-img";
import { STORED_URL_TTL, compressImage } from "@/lib/image-compress";

export const Route = createFileRoute("/create-post")({
  component: CreatePostPage,
  head: () => ({
    meta: [
      { title: "Create Post - Planet Baltimore" },
      { name: "description", content: "Share an update with the Planet Baltimore community." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type PostType = "text" | "photo" | "video";
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

function CreatePostPage() {
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as { orgId?: string };
  const orgId = typeof search.orgId === "string" ? search.orgId : null;
  const [org, setOrg] = useState<{ id: string; name: string; slug: string } | null>(null);

  useEffect(() => {
    if (!orgId) { setOrg(null); return; }
    supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", orgId)
      .maybeSingle()
      .then(({ data }) => setOrg(data ?? null));
  }, [orgId]);
  const imageRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);

  const [postType, setPostType] = useState<PostType>("text");
  const [content, setContent] = useState("");
  const [imagePath, setImagePath] = useState("");
  const [videoPath, setVideoPath] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [neighborhood, setNeighborhood] = useState("");
  const [neighborhoodOptions, setNeighborhoodOptions] = useState<string[]>([]);
  const [category, setCategory] = useState<string>("General");
  const [tag, setTag] = useState<string>("");
  const [bg, setBg] = useState<{ bg: string; fg: string }>(BG_COLORS[0]);
  const [fontSize, setFontSize] = useState<"sm" | "md" | "lg" | "xl">("md");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [excludeQuery, setExcludeQuery] = useState("");
  const [excludeResults, setExcludeResults] = useState<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }[]>([]);
  const [excluded, setExcluded] = useState<{ id: string; display_name: string | null; username: string | null }[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const contentValid = content.trim().length === 0 || content.trim().length <= 2000;
  const hasMedia =
    (postType === "photo" && (mediaUrls.length > 0 || !!imagePath)) ||
    (postType === "video" && (mediaUrls.length > 0 || !!videoPath));
  useEffect(() => {
    supabase
      .from("neighborhoods")
      .select("name")
      .order("name", { ascending: true })
      .then(({ data }) => {
        if (data) setNeighborhoodOptions(data.map((n: { name: string }) => n.name));
      });
  }, []);

  const canSubmit =
    contentValid &&
    (postType === "text" ? content.trim().length > 0
      : hasMedia || content.trim().length > 0);

  // Debounced people search for the excluded list
  useEffect(() => {
    const q = excludeQuery.trim().replace(/^@+/, "");
    if (!q) { setExcludeResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.rpc("search_all_users", { q, lim: 10 });
      setExcludeResults((data ?? []).filter((r: { id: string }) => !excluded.some((e) => e.id === r.id)));
    }, 220);
    return () => clearTimeout(t);
  }, [excludeQuery, excluded]);

  const uploadTo = async (bucket: "post-media", file: File, kind: "image" | "video") => {
    file = await compressImage(file);
    if (!me) { toast.error("Please sign in"); return null; }
    const cap = kind === "image" ? 10 * 1024 * 1024 : 50 * 1024 * 1024;
    if (file.size > cap) { toast.error(`${kind === "image" ? "Image" : "Video"} must be under ${cap / 1024 / 1024}MB`); return null; }
    setUploading(true);
    const tId = toast.loading(`Uploading ${kind}...`);
    try {
      const ext = (file.name.split(".").pop() || (kind === "image" ? "jpg" : "mp4")).toLowerCase();
      const path = `${me.id}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      // Bucket is private: create a long-lived signed URL so posts render everywhere.
      const { data: signed, error: sErr } = await supabase.storage.from(bucket).createSignedUrl(path, STORED_URL_TTL);
      if (sErr || !signed?.signedUrl) throw sErr || new Error("Could not sign URL");
      toast.success(`${kind === "image" ? "Image" : "Video"} uploaded`, { id: tId });
      return signed.signedUrl;
    } catch (e) {
      console.error("upload failed", e);
      toast.error(e instanceof Error ? e.message : "Upload failed", { id: tId });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    if (!canSubmit) { toast.error("Add some content"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: me.id,
        organization_id: orgId,
        content: content.trim(),
        image_url: postType === "photo" ? (mediaUrls[0] || imagePath || null) : null,
        video_url: postType === "video" ? (mediaUrls.find((u) => /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u)) || videoPath || null) : null,
        link_url: null,
        link_title: null,
        link_description: null,
        media_urls: mediaUrls.length ? mediaUrls : (imagePath ? [imagePath] : videoPath ? [videoPath] : []),
        music_url: null,
        post_type: postType,
        // Text posts always carry their canvas colours so the published card
        // looks exactly like the square composer, line breaks included.
        bg_color: postType === "text" ? (bg.bg || "#F5F5F4") : null,
        text_color: postType === "text" ? (bg.bg ? bg.fg : "#1c1917") : null,
        font_size: postType === "text" ? fontSize : null,
        category,
        tag: tag || null,
        visibility,
        excluded_user_ids: excluded.map((e) => e.id),
        neighborhood: neighborhood.trim() || null,
      });
      if (error) throw error;
      toast.success("Posted");
      if (org?.slug) navigate({ to: "/o/$slug", params: { slug: org.slug } });
      else navigate({ to: "/profile" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not post");
    } finally {
      setSaving(false);
    }
  };

  const typeTabs: { id: PostType; label: string; Icon: typeof TypeIcon }[] = [
    { id: "text",  label: "Text",  Icon: TypeIcon },
    { id: "photo", label: "Photo", Icon: ImagePlus },
    { id: "video", label: "Video", Icon: VideoIcon },
  ];

  const visibilityOpts: { id: Visibility; label: string; hint: string; Icon: typeof Globe }[] = [
    { id: "public",         label: "Public",         hint: "Anyone can see",        Icon: Globe },
    { id: "followers",      label: "Followers only", hint: "People who follow you", Icon: Users },
    { id: "close_friends",  label: "Close friends",  hint: "Your close friends",    Icon: Star },
    { id: "only_me",        label: "Only me",        hint: "Private",               Icon: Lock },
  ];

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner
          title="Create Post"
          subtitle={org ? `Posting to ${org.name}. It also appears in the On Planet feed.` : "Share what's happening in Baltimore."}
        />
        <div className="space-y-5 rounded-xl border border-neutral-200 bg-white p-5 sm:p-6">
          {/* Type tabs */}
          <div className="flex flex-wrap gap-2">
            {typeTabs.map(({ id, label, Icon }) => {
              const active = postType === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPostType(id)}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                    active ? "border-[#d4580a] bg-[#d4580a] text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-orange-300"
                  }`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </button>
              );
            })}
          </div>

          {/* Composer */}
          {postType === "text" ? (
            <div className="space-y-3">
              {/* Square canvas: what you type here is exactly what gets published. */}
              <div
                className="mx-auto flex aspect-square w-full max-w-md items-center justify-center overflow-y-auto rounded-2xl p-6 transition"
                style={{ background: bg.bg || "#F5F5F4", color: bg.fg }}
              >
                <MentionField
                  multiline
                  value={content}
                  onChange={setContent}
                  rows={8}
                  maxLength={2000}
                  placeholder="Share your thoughts... use @ to mention someone"
                  style={{ color: bg.fg, fontSize: FONT_SIZE_PX[fontSize], lineHeight: 1.25 }}
                  className="w-full resize-none border-0 bg-transparent text-center font-medium outline-none placeholder:opacity-60"
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-neutral-600 uppercase tracking-wide">Background</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {BG_COLORS.map((c) => {
                    const active = c.bg === bg.bg;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setBg(c)}
                        title={c.name}
                        className={`h-9 w-9 rounded-full border-2 transition ${active ? "border-[#d4580a] scale-110" : "border-neutral-200"}`}
                        style={{ background: c.bg || "linear-gradient(135deg, #fff 50%, #eee 50%)" }}
                      />
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
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setFontSize(s.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-[#d4580a] bg-[#d4580a]/10 text-[#d4580a]" : "border-neutral-200 text-neutral-600 hover:border-orange-300"}`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              <p className="text-xs text-neutral-500 text-right">{content.length}/2000</p>
              {/^(?:https?:\/\/|www\.)/im.test(content) || /\s(?:https?:\/\/|www\.)/i.test(content) ? (
                <div className="rounded-xl border border-neutral-200 bg-white p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Preview</p>
                  <div className="whitespace-pre-wrap break-words text-sm text-neutral-800">
                    <MentionText text={content} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Caption (optional)</Label>
              <MentionField multiline value={content} onChange={setContent} rows={3} maxLength={2000} placeholder="Add a caption... use @ to mention someone"
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
              {(/^(?:https?:\/\/|www\.)/im.test(content) || /\s(?:https?:\/\/|www\.)/i.test(content)) && (
                <div className="rounded-xl border border-neutral-200 bg-white p-3">
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Preview</p>
                  <div className="whitespace-pre-wrap break-words text-sm text-neutral-800">
                    <MentionText text={content} />
                  </div>
                </div>
              )}
            </div>
          )}

          {postType === "photo" && (
            <div className="space-y-1.5">
              <input ref={imageRef} type="file" accept="image/*,video/*" multiple className="hidden" onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                for (const f of files) {
                  const kind: "image" | "video" = f.type.startsWith("video/") ? "video" : "image";
                  const p = await uploadTo("post-media", f, kind);
                  if (p) setMediaUrls((prev) => [...prev, p]);
                }
                if (imageRef.current) imageRef.current.value = "";
              }} />
              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaUrls.map((u, i) => {
                    const isVideo = /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);
                    return (
                      <div key={u} className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                        {isVideo ? (
                          <SmartVideo src={u} className="h-32 w-full object-cover" />
                        ) : (
                          <Img src={u} alt="" className="h-32 w-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => setMediaUrls((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => imageRef.current?.click()} disabled={uploading} className="w-full sm:w-auto">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                {mediaUrls.length ? "Add more" : "Upload images or videos"}
              </Button>
              <p className="text-xs text-neutral-500">Max 50MB per video. Supports only landscape videos.</p>
            </div>
          )}

          {postType === "video" && (
            <div className="space-y-1.5">
              <input ref={videoRef} type="file" accept="video/*,image/*" multiple className="hidden" onChange={async (e) => {
                const files = Array.from(e.target.files ?? []);
                if (!files.length) return;
                for (const f of files) {
                  const kind: "image" | "video" = f.type.startsWith("video/") ? "video" : "image";
                  const p = await uploadTo("post-media", f, kind);
                  if (p) setMediaUrls((prev) => [...prev, p]);
                }
                if (videoRef.current) videoRef.current.value = "";
              }} />
              {mediaUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {mediaUrls.map((u, i) => {
                    const isVideo = /\.(mp4|webm|mov|m4v|ogg)(\?|$)/i.test(u);
                    return (
                      <div key={u} className="group relative overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                        {isVideo ? (
                          <SmartVideo src={u} className="h-32 w-full object-cover" />
                        ) : (
                          <Img src={u} alt="" className="h-32 w-full object-cover" />
                        )}
                        <button
                          type="button"
                          onClick={() => setMediaUrls((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              <Button type="button" variant="outline" onClick={() => videoRef.current?.click()} disabled={uploading} className="w-full sm:w-auto">
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <VideoIcon className="mr-2 h-4 w-4" />}
                {mediaUrls.length ? "Add more" : "Upload videos or images"}
              </Button>
              <p className="text-xs text-neutral-500">Max 50MB per video. Supports only landscape videos.</p>
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
              <select
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">No neighborhood</option>
                {neighborhoodOptions.map((n) => <option key={n} value={n}>{n}</option>)}
                {neighborhood && !neighborhoodOptions.includes(neighborhood) && <option value={neighborhood}>{neighborhood}</option>}
              </select>
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
              {visibilityOpts.map(({ id, label, hint, Icon }) => {
                const active = visibility === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setVisibility(id)}
                    className={`flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
                      active ? "border-[#d4580a] bg-orange-50" : "border-neutral-200 hover:border-orange-300"
                    }`}
                  >
                    <Icon className="h-4 w-4 text-[#d4580a]" />
                    <span className="text-sm font-semibold">{label}</span>
                    <span className="text-[11px] text-neutral-500">{hint}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Exclude specific users */}
          <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <Label className="text-sm font-medium">Hide from specific people (optional)</Label>
            <Input
              value={excludeQuery}
              onChange={(e) => setExcludeQuery(e.target.value)}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === "Tab") && excludeResults.length > 0) {
                  e.preventDefault();
                  const top = excludeResults[0];
                  setExcluded((x) => [...x, top]);
                  setExcludeQuery("");
                  setExcludeResults([]);
                }
              }}
              placeholder="Type a name or @username..."
              autoComplete="off"
            />
            {excludeQuery.trim() && excludeResults.length > 0 && (
              <p className="text-xs text-neutral-500">
                Press Enter or Tab to add <span className="font-medium text-neutral-800">
                  {excludeResults[0].display_name || excludeResults[0].username}
                  {excludeResults[0].username ? ` (@${excludeResults[0].username})` : ""}
                </span>
              </p>
            )}
            {excludeResults.length > 0 && (
              <div className="rounded-md border border-neutral-200 bg-white">
                {excludeResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => { setExcluded((x) => [...x, r]); setExcludeQuery(""); setExcludeResults([]); }}
                    className="flex w-full items-center gap-2 border-b border-neutral-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-neutral-50"
                  >
                    {r.avatar_url ? (
                      <Img src={r.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover" />
                    ) : (
                      <span className="h-6 w-6 rounded-full bg-neutral-200" />
                    )}
                    <span className="truncate font-medium text-neutral-900">{r.display_name || r.username}</span>
                    {r.username && <span className="truncate text-xs text-neutral-500">@{r.username}</span>}
                  </button>
                ))}
              </div>
            )}
            {excluded.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {excluded.map((e) => (
                  <span key={e.id} className="inline-flex items-center gap-1 rounded-full bg-white border border-neutral-200 px-2.5 py-1 text-xs">
                    {e.display_name || e.username}{e.username ? ` (@${e.username})` : ""}
                    <button type="button" onClick={() => setExcluded((x) => x.filter((y) => y.id !== e.id))} className="text-neutral-400 hover:text-neutral-900">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={submit} disabled={!canSubmit || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Post
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
