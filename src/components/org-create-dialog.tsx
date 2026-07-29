import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowLeft, ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { slugify, subtypesFor, ORG_TYPE_LABEL } from "@/lib/categories";
import { itemHintsFor } from "@/components/org/price-items-section";

type Neighborhood = { id: string; name: string };

export function OrgCreateDialog({
  type,
  open,
  onClose,
}: {
  type: "arts_org" | "business" | "community_assoc" | "group";
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState<string>("");
  const fileRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const subs = subtypesFor(type);
  type DraftItem = { name: string; price: string; section: string; description: string };
  const [priceItems, setPriceItems] = useState<DraftItem[]>([]);
  const [form, setForm] = useState({
    name: "",
    tagline: "",
    subtype: "",
    bio: "",
    mission: "",
    neighborhood: "",
    address: "",
    website: "",
    phone: "",
    hours: "",
    avatar_url: "",
    banner_url: "",
  });

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("neighborhoods").select("id,name").order("name");
      setNeighborhoods((data ?? []) as Neighborhood[]);
    })();
  }, [open]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const onPickImage = async (file: File) => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { toast.error("Sign in first"); return; }
    // Instant local preview so the user sees the image immediately
    const localUrl = URL.createObjectURL(file);
    setPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return localUrl; });
    setUploading(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${uid}/org-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: signErr } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("Could not sign URL");
      set("avatar_url", signed.signedUrl);
      toast.success("Logo uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const onPickBanner = async (file: File) => {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { toast.error("Sign in first"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB"); return; }
    const localUrl = URL.createObjectURL(file);
    setBannerPreviewUrl((prev) => { if (prev) URL.revokeObjectURL(prev); return localUrl; });
    setUploadingBanner(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${uid}/org-banner-${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data: signed, error: signErr } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl) throw signErr || new Error("Could not sign URL");
      set("banner_url", signed.signedUrl);
      toast.success("Background uploaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploadingBanner(false);
    }
  };

  const canSubmit = form.name.trim().length > 0 && form.subtype.length > 0 && !busy && !uploading && !uploadingBanner;

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.subtype) return toast.error("Organization type is required");
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) throw new Error("Sign in first.");
      const baseSlug = slugify(form.name) || "org";
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      const { data, error } = await supabase.from("organizations").insert({
        owner_id: uid,
        type,
        subtype: form.subtype || null,
        name: form.name.trim(),
        slug,
        tagline: form.tagline.trim() || null,
        bio: form.bio.trim() || null,
        mission: form.mission.trim() || null,
        website: form.website.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        banner_url: form.banner_url.trim() || null,
        hours: form.hours.trim() ? { text: form.hours.trim() } : null,
      }).select("slug").single();
      if (error) throw error;
      // Insert any pricing items the user pre-filled during setup
      const cleanItems = priceItems
        .map((it) => ({ ...it, name: it.name.trim() }))
        .filter((it) => it.name.length > 0);
      if (cleanItems.length && data) {
        const { data: orgRow } = await supabase.from("organizations").select("id").eq("slug", data.slug).maybeSingle();
        if (orgRow?.id) {
          const rows = cleanItems.map((it, i) => {
            const raw = it.price.trim();
            const m = raw.match(/^\$?\s*(\d+(?:\.\d{1,2})?)\s*$/);
            return {
              organization_id: orgRow.id,
              name: it.name,
              description: it.description.trim() || null,
              price_cents: m ? Math.round(parseFloat(m[1]) * 100) : null,
              price_label: m ? null : (raw || null),
              section: it.section.trim() || null,
              sort_order: i,
            };
          });
          await supabase.from("organization_price_items").insert(rows);
        }
      }
      toast.success(`${ORG_TYPE_LABEL[type]} created`);
      onClose();
      navigate({ to: "/o/$slug", params: { slug: data!.slug } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create");
    } finally { setBusy(false); }
  };

  const inputCls = "w-full rounded-xl border border-neutral-200 bg-white px-4 py-3.5 text-[15px] text-neutral-900 placeholder:text-neutral-400 focus:border-orange-400 focus:outline-none";
  const hints = itemHintsFor(form.subtype);
  const showPricing = type === "business" && form.subtype;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-100 bg-white px-4 py-4 sm:px-8">
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-neutral-100" aria-label="Back">
          <ArrowLeft className="h-5 w-5 text-neutral-700" />
        </button>
        <h1 className="text-lg font-bold text-neutral-900 sm:text-xl">Create {ORG_TYPE_LABEL[type]}</h1>
        <button
          onClick={submit}
          disabled={!canSubmit}
          className="rounded-full bg-[#d4580a] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#b84907] disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {busy ? "Creating…" : "Create"}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-8">
          {/* Logo dropzone */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mb-6 flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/60 px-6 py-14 text-center transition hover:border-orange-300 hover:bg-orange-50/40"
          >
            {previewUrl || form.avatar_url ? (
              <div className="relative">
                <img
                  src={previewUrl || form.avatar_url}
                  alt="Logo preview"
                  className="h-28 w-28 rounded-2xl object-cover"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                />
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/30">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
            ) : uploading ? (
              <Loader2 className="h-10 w-10 animate-spin text-neutral-400" />
            ) : (
              <ImagePlus className="h-10 w-10 text-neutral-400" strokeWidth={1.5} />
            )}
            <div className="text-[15px] font-medium text-neutral-500">
              {previewUrl || form.avatar_url ? "Change logo or photo" : "Add logo or photo"}
            </div>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickImage(f); e.target.value = ""; }}
          />

          {/* Banner / background dropzone */}
          <button
            type="button"
            onClick={() => bannerRef.current?.click()}
            className="mb-6 flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50/60 text-center transition hover:border-orange-300 hover:bg-orange-50/40"
            style={
              bannerPreviewUrl || form.banner_url
                ? { backgroundImage: `url(${bannerPreviewUrl || form.banner_url})`, backgroundSize: "cover", backgroundPosition: "center", minHeight: 160 }
                : { minHeight: 120 }
            }
          >
            {uploadingBanner ? (
              <div className="flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 text-sm text-white">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
              </div>
            ) : bannerPreviewUrl || form.banner_url ? (
              <div className="rounded-full bg-black/50 px-3 py-1.5 text-sm text-white">Change background</div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-6 text-neutral-500">
                <ImagePlus className="h-8 w-8" strokeWidth={1.5} />
                <div className="text-[15px] font-medium">Upload banner image (optional)</div>
              </div>
            )}
          </button>
          <input
            ref={bannerRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPickBanner(f); e.target.value = ""; }}
          />

          <div className="space-y-3">
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Organization name *"
              className={inputCls}
            />
            <input
              value={form.tagline}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="Tagline (optional)"
              className={inputCls}
            />
            <select
              value={form.subtype}
              onChange={(e) => set("subtype", e.target.value)}
              className={`${inputCls} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23737373%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[position:right_1rem_center] bg-no-repeat pr-10 ${form.subtype ? "text-neutral-900" : "text-neutral-400"}`}
            >
              <option value="" disabled>Organization type *</option>
              {subs.map((s) => <option key={s} value={s} className="text-neutral-900">{s}</option>)}
            </select>
            <textarea
              value={form.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="Description"
              rows={4}
              className={inputCls}
            />
            <textarea
              value={form.mission}
              onChange={(e) => set("mission", e.target.value)}
              placeholder="Mission statement (optional)"
              rows={4}
              className={inputCls}
            />
            <select
              value={form.neighborhood}
              onChange={(e) => set("neighborhood", e.target.value)}
              className={`${inputCls} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2212%22 height=%2212%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23737373%22 stroke-width=%222%22><path d=%22M6 9l6 6 6-6%22/></svg>')] bg-[position:right_1rem_center] bg-no-repeat pr-10 ${form.neighborhood ? "text-neutral-900" : "text-neutral-400"}`}
            >
              <option value="" className="text-neutral-400">Select neighborhood...</option>
              {neighborhoods.map((n) => (
                <option key={n.id} value={n.name} className="text-neutral-900">{n.name}</option>
              ))}
            </select>
            <input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Address"
              className={inputCls}
            />
            <input
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              placeholder="Website"
              className={inputCls}
            />
            <input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="Phone"
              className={inputCls}
            />
            <input
              value={form.hours}
              onChange={(e) => set("hours", e.target.value)}
              placeholder="Hours (e.g. Tue-Sun, 10am-5pm)"
              className={inputCls}
            />
            {showPricing && (
              <div className="rounded-2xl border border-neutral-200 bg-neutral-50/60 p-4">
                <div className="mb-1 text-[15px] font-semibold text-neutral-900">Pricing</div>
                <div className="mb-3 text-xs text-neutral-500">
                  Add a few {hints.itemLabel.toLowerCase()}s and prices so customers know what to expect. You can add more later.
                </div>
                <div className="space-y-2">
                  {priceItems.map((it, idx) => (
                    <div key={idx} className="rounded-xl border border-neutral-200 bg-white p-3">
                      <div className="grid gap-2 sm:grid-cols-[1fr,120px]">
                        <input
                          value={it.name}
                          onChange={(e) => setPriceItems((xs) => xs.map((x, i) => i === idx ? { ...x, name: e.target.value } : x))}
                          placeholder={`${hints.itemLabel} — ${hints.exampleName}`}
                          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                        />
                        <input
                          value={it.price}
                          onChange={(e) => setPriceItems((xs) => xs.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))}
                          placeholder="Price"
                          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                        />
                      </div>
                      <div className="mt-2 flex gap-2">
                        <input
                          value={it.section}
                          onChange={(e) => setPriceItems((xs) => xs.map((x, i) => i === idx ? { ...x, section: e.target.value } : x))}
                          placeholder={`Section (optional) — ${hints.exampleSection}`}
                          className="w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setPriceItems((xs) => xs.filter((_, i) => i !== idx))}
                          className="rounded-md p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPriceItems((xs) => [...xs, { name: "", price: "", section: "", description: "" }])}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 hover:border-orange-300 hover:text-[#d4580a]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add {hints.itemLabel.toLowerCase()}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}