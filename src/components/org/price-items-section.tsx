import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Plus, Trash2, Pencil, Check, X } from "lucide-react";
import { toast } from "sonner";

export type PriceItem = {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  price_cents: number | null;
  price_label: string | null;
  section: string | null;
  sort_order: number;
};

function fmtPrice(cents: number | null, label: string | null) {
  if (label && label.trim()) return label.trim();
  if (cents == null) return "";
  return `$${(cents / 100).toFixed(2).replace(/\.00$/, "")}`;
}

function parsePrice(input: string): { cents: number | null; label: string | null } {
  const raw = input.trim();
  if (!raw) return { cents: null, label: null };
  const m = raw.match(/^\$?\s*(\d+(?:\.\d{1,2})?)\s*$/);
  if (m) return { cents: Math.round(parseFloat(m[1]) * 100), label: null };
  return { cents: null, label: raw };
}

export function itemHintsFor(subtype: string | null | undefined) {
  const s = (subtype ?? "").toLowerCase();
  if (/cafe|coffee|bakery/.test(s)) return { itemLabel: "Item", exampleName: "e.g. Latte, Croissant", exampleSection: "e.g. Drinks, Pastries" };
  if (/restaurant|food|diner|deli|pizz|grill|kitchen|brunch|bar/.test(s)) return { itemLabel: "Dish", exampleName: "e.g. Cheeseburger, House Salad", exampleSection: "e.g. Mains, Sides, Drinks" };
  if (/barber|salon|spa|beauty|nail|hair/.test(s)) return { itemLabel: "Service", exampleName: "e.g. Haircut, Beard Trim, Color", exampleSection: "e.g. Cuts, Color, Add-ons" };
  if (/health|clinic|therapy|massage|fitness|gym/.test(s)) return { itemLabel: "Service", exampleName: "e.g. 60-min Massage, Intake Visit", exampleSection: "e.g. Sessions, Packages" };
  if (/retail|shop|store/.test(s)) return { itemLabel: "Product", exampleName: "e.g. T-Shirt, Print", exampleSection: "e.g. Apparel, Accessories" };
  if (/venue|entertainment/.test(s)) return { itemLabel: "Package", exampleName: "e.g. Weeknight Rental, Full Buyout", exampleSection: "e.g. Rentals, Add-ons" };
  if (/creative|studio|design|photo|video/.test(s)) return { itemLabel: "Package", exampleName: "e.g. Brand Session, Half-day Shoot", exampleSection: "e.g. Sessions, Add-ons" };
  return { itemLabel: "Item", exampleName: "e.g. Consultation", exampleSection: "e.g. Category" };
}

export function PriceItemsSection({
  orgId,
  subtype,
  canManage,
  title,
}: {
  orgId: string;
  subtype: string | null | undefined;
  canManage: boolean;
  title: string;
}) {
  const [items, setItems] = useState<PriceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const hints = itemHintsFor(subtype);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("organization_price_items")
      .select("*")
      .eq("organization_id", orgId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    setItems((data ?? []) as PriceItem[]);
    setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const remove = async (id: string) => {
    if (!confirm("Remove this item?")) return;
    const { error } = await supabase.from("organization_price_items").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setItems((xs) => xs.filter((x) => x.id !== id));
  };

  // group by section
  const grouped: Record<string, PriceItem[]> = {};
  items.forEach((it) => {
    const key = (it.section && it.section.trim()) || "";
    (grouped[key] ||= []).push(it);
  });
  const sections = Object.keys(grouped).sort((a, b) => (a === "" ? 1 : b === "" ? -1 : a.localeCompare(b)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-neutral-900">{title}</h3>
        {canManage && !adding && (
          <button
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#d4580a] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#b84907]"
          >
            <Plus className="h-3.5 w-3.5" /> Add {hints.itemLabel.toLowerCase()}
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-neutral-400" /></div>
      ) : items.length === 0 && !adding ? (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50 py-10 text-center text-sm text-neutral-500">
          {canManage ? `No ${hints.itemLabel.toLowerCase()}s yet. Add your first one above.` : "Nothing listed yet."}
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((sec) => (
            <div key={sec || "_"}>
              {sec && <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-500">{sec}</div>}
              <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
                {grouped[sec].map((it) => (
                  editId === it.id ? (
                    <PriceItemForm
                      key={it.id}
                      hints={hints}
                      initial={it}
                      onCancel={() => setEditId(null)}
                      onSaved={(saved) => {
                        setItems((xs) => xs.map((x) => (x.id === saved.id ? saved : x)));
                        setEditId(null);
                      }}
                      orgId={orgId}
                    />
                  ) : (
                    <div key={it.id} className="flex items-start justify-between gap-3 px-4 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="truncate font-medium text-neutral-900">{it.name}</div>
                          <div className="whitespace-nowrap text-sm font-semibold text-[#d4580a]">{fmtPrice(it.price_cents, it.price_label)}</div>
                        </div>
                        {it.description && <div className="mt-0.5 text-sm text-neutral-600">{it.description}</div>}
                      </div>
                      {canManage && (
                        <div className="flex shrink-0 gap-1">
                          <button onClick={() => setEditId(it.id)} className="rounded-full p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900" aria-label="Edit"><Pencil className="h-4 w-4" /></button>
                          <button onClick={() => remove(it.id)} className="rounded-full p-1.5 text-neutral-500 hover:bg-red-50 hover:text-red-600" aria-label="Delete"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      )}
                    </div>
                  )
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <PriceItemForm
            hints={hints}
            onCancel={() => setAdding(false)}
            onSaved={(saved) => { setItems((xs) => [...xs, saved]); setAdding(false); }}
            orgId={orgId}
          />
        </div>
      )}
    </div>
  );
}

function PriceItemForm({
  orgId,
  initial,
  hints,
  onCancel,
  onSaved,
}: {
  orgId: string;
  initial?: PriceItem;
  hints: { itemLabel: string; exampleName: string; exampleSection: string };
  onCancel: () => void;
  onSaved: (item: PriceItem) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [priceInput, setPriceInput] = useState(
    initial ? fmtPrice(initial.price_cents, initial.price_label) : ""
  );
  const [section, setSection] = useState(initial?.section ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    const parsed = parsePrice(priceInput);
    const payload = {
      organization_id: orgId,
      name: name.trim(),
      description: description.trim() || null,
      price_cents: parsed.cents,
      price_label: parsed.label,
      section: section.trim() || null,
    };
    if (initial) {
      const { data, error } = await supabase
        .from("organization_price_items")
        .update(payload).eq("id", initial.id).select("*").single();
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      onSaved(data as PriceItem);
    } else {
      const { data, error } = await supabase
        .from("organization_price_items")
        .insert(payload).select("*").single();
      setSaving(false);
      if (error) { toast.error(error.message); return; }
      onSaved(data as PriceItem);
    }
  };

  const inputCls = "w-full rounded-md border border-neutral-200 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none";

  return (
    <div className="space-y-2 px-1 py-1">
      <div className="grid gap-2 sm:grid-cols-[1fr,120px]">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder={`${hints.itemLabel} name — ${hints.exampleName}`} className={inputCls} />
        <input value={priceInput} onChange={(e) => setPriceInput(e.target.value)} placeholder="Price (e.g. 12 or $8-15)" className={inputCls} />
      </div>
      <input value={section} onChange={(e) => setSection(e.target.value)} placeholder={`Section (optional) — ${hints.exampleSection}`} className={inputCls} />
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className={inputCls} />
      <div className="flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-neutral-600 hover:bg-neutral-100"><X className="h-3.5 w-3.5" /> Cancel</button>
        <button onClick={save} disabled={saving} className="inline-flex items-center gap-1 rounded-full bg-[#d4580a] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#b84907] disabled:opacity-50">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
        </button>
      </div>
    </div>
  );
}