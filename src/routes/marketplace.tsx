import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/text-utils";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { ImageUpload } from "@/components/shared/image-upload";
import { HeroBanner } from "@/components/shared/hero-banner";
import { Plus, MapPin, Tag, Search } from "lucide-react";
import { toast } from "sonner";
import { EmptyState, CardGridSkeleton } from "@/components/shared/empty-state";
import { Img } from "@/components/shared/smart-img";
import { pageHead } from "@/lib/seo";

type Listing = {
  id: string; seller_id: string; title: string; description: string | null;
  price_cents: number; category: string; condition: string;
  neighborhood: string | null; location: string | null; photos: string[];
  status: string; created_at: string;
};

const CATEGORIES = ["all", "art", "music-gear", "furniture", "clothing", "books", "electronics", "services", "other"];
const CONDITIONS = ["new", "like-new", "used", "for-parts"];

export const Route = createFileRoute("/marketplace")({
  component: MarketplacePage,
  head: () => pageHead({ path: "/marketplace", title: "Baltimore Creator Marketplace | Planet Baltimore", description: "Buy and sell art, gear and services directly from Baltimore creators and neighbors." }),
});

function MarketplacePage() {
  const me = useCurrentProfile();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("marketplace_listings").select("*").eq("status", "active").order("created_at", { ascending: false }).limit(120);
    setItems((data || []) as Listing[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => {
      if (cat !== "all" && i.category !== cat) return false;
      if (!s) return true;
      return (i.title + " " + (i.description || "") + " " + (i.neighborhood || "")).toLowerCase().includes(s);
    });
  }, [items, q, cat]);

  return (
    <AppLayout title="" hero={false}>
      <div className="space-y-6">
        <HeroBanner
          title="Marketplace"
          subtitle="Buy, sell, and trade with the Baltimore community."
          cta={me && (
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
              <Plus className="h-4 w-4" /> List an item
            </button>
          )}
        />

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search listings…" className="w-full rounded-full border border-border bg-card py-2 pl-10 pr-4 text-sm outline-none focus:border-[#d4580a]" />
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCat(c)} className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${cat === c ? "border-[#d4580a] bg-[#d4580a] text-white" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                {c.replace("-", " ")}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <CardGridSkeleton count={6} aspect="aspect-[4/3]" />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Tag}
            title="No listings yet"
            description="Nothing matches your search. Try a different category."
            action={me ? (
              <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:brightness-110">
                <Plus className="h-4 w-4" /> List an item
              </button>
            ) : undefined}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((it) => (
              <Link key={it.id} to="/marketplace/$listingId" params={{ listingId: it.id }} className="group overflow-hidden rounded-2xl border border-border bg-card transition hover:shadow-md">
                <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
                  {it.photos[0] ? (
                    <Img src={it.photos[0]} alt={it.title} className="h-full w-full object-cover transition group-hover:scale-105" loading="lazy" decoding="async" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Tag className="h-8 w-8" /></div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-1 font-semibold text-foreground">{it.title}</h3>
                    <span className="shrink-0 font-bold text-[#d4580a]">{it.price_cents === 0 ? "Free" : `$${(it.price_cents / 100).toFixed(0)}`}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="capitalize">{it.condition.replace("-", " ")}</span>
                    <span>·</span><span>{timeAgo(it.created_at)}</span>
                    {it.neighborhood && <><span>·</span><span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {it.neighborhood}</span></>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {open && me && <NewListingDialog onClose={() => setOpen(false)} onCreated={() => { setOpen(false); void load(); }} sellerId={me.id} />}
    </AppLayout>
  );
}

function NewListingDialog({ onClose, onCreated, sellerId }: { onClose: () => void; onCreated: () => void; sellerId: string }) {
  const [form, setForm] = useState({ title: "", description: "", price: "", category: "other", condition: "used", neighborhood: "", photo: "" });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Title required");
    setSaving(true);
    const { error } = await supabase.from("marketplace_listings").insert({
      seller_id: sellerId,
      title: form.title.trim(),
      description: form.description.trim() || null,
      price_cents: Math.max(0, Math.round(parseFloat(form.price || "0") * 100)),
      category: form.category,
      condition: form.condition,
      neighborhood: form.neighborhood.trim() || null,
      photos: form.photo.trim() ? [form.photo.trim()] : [],
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Listing posted");
    onCreated();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-3 font-display text-xl font-bold text-foreground">New listing</h2>
        <div className="space-y-2 text-sm">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title" className="w-full rounded-lg border border-border px-3 py-2" />
          <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Description" rows={3} className="w-full rounded-lg border border-border px-3 py-2" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Price ($)" inputMode="decimal" className="rounded-lg border border-border px-3 py-2" />
            <input value={form.neighborhood} onChange={(e) => setForm({ ...form, neighborhood: e.target.value })} placeholder="Neighborhood" className="rounded-lg border border-border px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border border-border bg-card px-3 py-2 capitalize">
              {CATEGORIES.filter(c => c !== "all").map((c) => <option key={c} value={c}>{c.replace("-", " ")}</option>)}
            </select>
            <select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })} className="rounded-lg border border-border bg-card px-3 py-2 capitalize">
              {CONDITIONS.map((c) => <option key={c} value={c}>{c.replace("-", " ")}</option>)}
            </select>
          </div>
          <ImageUpload value={form.photo} onChange={(url) => setForm({ ...form, photo: url })} label="Upload listing photo (optional)" />
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent">Cancel</button>
          <button onClick={submit} disabled={saving} className="rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Posting…" : "Post"}</button>
        </div>
      </div>
    </div>
  );
}