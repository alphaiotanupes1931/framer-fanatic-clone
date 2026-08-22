import { useEffect, useState } from "react";
import { navigateExternal, openExternalWindow, closeExternalWindow } from "@/lib/external-nav";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Pencil, ShoppingBag, X } from "lucide-react";
import { toast } from "sonner";
import { Img } from "@/components/shared/smart-img";
import { ImageUpload } from "@/components/shared/image-upload";
import { createProductCheckout, getOrgPaymentStatus } from "@/lib/stripe.functions";

type Product = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  price_cents: number;
  image_url: string | null;
  inventory: number | null;
  is_active: boolean;
  sort_order: number;
};

const money = (c: number) => `$${(c / 100).toFixed(2).replace(/\.00$/, "")}`;

export function StoreTab({
  orgId,
  canManage,
  title = "Shop",
}: {
  orgId: string;
  canManage: boolean;
  title?: string;
}) {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [payoutsReady, setPayoutsReady] = useState<boolean | null>(null);
  const [buying, setBuying] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organization_products")
      .select("*")
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setItems((data ?? []) as Product[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
    getOrgPaymentStatus({ data: { orgId } })
      .then((r) => setPayoutsReady(!!r.ready))
      .catch(() => setPayoutsReady(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId]);

  const remove = async (id: string) => {
    if (!confirm("Remove this product?")) return;
    const { error } = await supabase.from("organization_products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((xs) => xs.filter((x) => x.id !== id));
  };

  const buy = async (p: Product) => {
    setBuying(p.id);
    const pre = openExternalWindow();
    try {
      const res = await createProductCheckout({
        data: { productId: p.id, quantity: 1, returnOrigin: window.location.origin },
      });
      if (res?.url) navigateExternal(res.url, pre);
      else closeExternalWindow(pre);
    } catch (e) {
      closeExternalWindow(pre);
      toast.error(e instanceof Error ? e.message : "Could not start checkout");
    } finally {
      setBuying(null);
    }
  };

  const visible = canManage ? items : items.filter((i) => i.is_active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-bold text-foreground">
          <ShoppingBag className="h-5 w-5 text-primary" /> {title}
        </h3>
        {canManage && (
          <button
            onClick={() => setEditing("new")}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-3.5 w-3.5" /> Add product
          </button>
        )}
      </div>

      {canManage && payoutsReady === false && (
        <div className="rounded-xl border border-dashed border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Payouts are not connected yet, so buyers cannot check out. Set up payouts from your dashboard to start selling.
        </div>
      )}

      {editing && (
        <ProductForm
          orgId={orgId}
          initial={editing === "new" ? null : editing}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}

      {loading ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-muted/30 py-12 text-center text-sm text-muted-foreground">
          {canManage ? "No products yet. Add your first one." : "Nothing for sale yet."}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {visible.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-2xl border border-border bg-card">
              <div className="aspect-square w-full overflow-hidden bg-muted">
                {p.image_url ? (
                  <Img src={p.image_url} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ShoppingBag className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                )}
              </div>
              <div className="space-y-2 p-3">
                <div className="text-sm font-semibold leading-snug text-foreground line-clamp-2">{p.name}</div>
                {p.description && <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-foreground">{money(p.price_cents)}</span>
                  {p.inventory != null && (
                    <span className="text-[11px] text-muted-foreground">{p.inventory} left</span>
                  )}
                </div>
                {canManage ? (
                  <div className="space-y-2">
                    <button
                      onClick={() => buy(p)}
                      disabled={buying === p.id || payoutsReady === false}
                      className="w-full rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                    >
                      {buying === p.id ? "Starting checkout…" : payoutsReady === false ? "Not available" : "Buy now"}
                    </button>
                    <div className="flex gap-2">
                    <button onClick={() => setEditing(p)} className="inline-flex flex-1 items-center justify-center gap-1 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                    <button onClick={() => remove(p.id)} className="inline-flex items-center justify-center rounded-full border border-border px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => buy(p)}
                    disabled={buying === p.id || payoutsReady === false}
                    className="w-full rounded-full bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  >
                    {buying === p.id ? "Starting checkout…" : payoutsReady === false ? "Not available" : "Buy now"}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductForm({
  orgId,
  initial,
  onCancel,
  onSaved,
}: {
  orgId: string;
  initial: Product | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [price, setPrice] = useState(initial ? (initial.price_cents / 100).toFixed(2) : "");
  const [inventory, setInventory] = useState(initial?.inventory != null ? String(initial.inventory) : "");
  const [imageUrl, setImageUrl] = useState(initial?.image_url ?? "");
  const [active, setActive] = useState(initial?.is_active ?? true);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const cents = Math.round(parseFloat(price || "0") * 100);
    if (!name.trim()) return toast.error("Add a product name");
    if (!cents || cents < 100) return toast.error("Price must be at least $1.00");
    setSaving(true);
    const payload = {
      org_id: orgId,
      name: name.trim(),
      description: description.trim() || null,
      price_cents: cents,
      image_url: imageUrl || null,
      inventory: inventory.trim() === "" ? null : Math.max(0, parseInt(inventory, 10) || 0),
      is_active: active,
    };
    const { error } = initial
      ? await supabase.from("organization_products").update(payload).eq("id", initial.id)
      : await supabase.from("organization_products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(initial ? "Product updated" : "Product added");
    onSaved();
  };

  const inputCls =
    "w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none";

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <div className="text-sm font-bold text-foreground">{initial ? "Edit product" : "New product"}</div>
        <button onClick={onCancel} className="rounded-full p-1 text-muted-foreground hover:bg-accent"><X className="h-4 w-4" /></button>
      </div>
      <input className={inputCls} placeholder="Product name" value={name} onChange={(e) => setName(e.target.value)} />
      <textarea className={inputCls} rows={3} placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <input className={inputCls} inputMode="decimal" placeholder="Price you net (e.g. 25.00)" value={price} onChange={(e) => setPrice(e.target.value)} />
        <input className={inputCls} inputMode="numeric" placeholder="Inventory (blank = unlimited)" value={inventory} onChange={(e) => setInventory(e.target.value)} />
      </div>
      <ImageUpload value={imageUrl} onChange={setImageUrl} label="Upload product photo" />
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Listed for sale
      </label>
      <p className="text-[11px] text-muted-foreground">
        Buyers pay the platform fee and card processing on top, so you receive the price you set.
      </p>
      <div className="flex gap-2">
        <button onClick={save} disabled={saving} className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50">
          {saving ? "Saving…" : "Save product"}
        </button>
        <button onClick={onCancel} className="rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground">Cancel</button>
      </div>
    </div>
  );
}
