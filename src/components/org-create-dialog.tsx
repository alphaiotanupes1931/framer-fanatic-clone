import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { X } from "lucide-react";
import { slugify, subtypesFor, ORG_TYPE_LABEL } from "@/lib/categories";

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
  const subs = subtypesFor(type);
  const [form, setForm] = useState({
    name: "",
    subtype: subs[0] ?? "",
    bio: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    neighborhood: "",
    avatar_url: "",
    banner_url: "",
  });

  if (!open) return null;

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
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
        bio: form.bio.trim() || null,
        website: form.website.trim() || null,
        phone: form.phone.trim() || null,
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        avatar_url: form.avatar_url.trim() || null,
        banner_url: form.banner_url.trim() || null,
      }).select("slug").single();
      if (error) throw error;
      toast.success(`${ORG_TYPE_LABEL[type]} created`);
      onClose();
      navigate({ to: "/o/$slug", params: { slug: data!.slug } });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create");
    } finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Create {ORG_TYPE_LABEL[type]}</h2>
          <button onClick={onClose}><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-3 text-sm">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name *" className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
          {subs.length > 0 && (
            <select value={form.subtype} onChange={(e) => setForm({ ...form, subtype: e.target.value })} className="w-full rounded-lg border border-neutral-200 px-3 py-2 bg-white">
              {subs.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
          <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Short bio / about" rows={3} className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
          <input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} placeholder="Neighborhood" className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address (optional)" className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website (optional)" className="rounded-lg border border-neutral-200 px-3 py-2" />
            <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone (optional)" className="rounded-lg border border-neutral-200 px-3 py-2" />
          </div>
          <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Public email (optional)" className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
          <input value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })} placeholder="Logo URL (optional)" className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
          <input value={form.banner_url} onChange={(e) => setForm({ ...form, banner_url: e.target.value })} placeholder="Banner URL (optional)" className="w-full rounded-lg border border-neutral-200 px-3 py-2" />
          <button disabled={busy} onClick={submit} className="w-full rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-60">
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}