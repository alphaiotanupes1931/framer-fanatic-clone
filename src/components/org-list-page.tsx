import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/app-layout";
import { useUserRole } from "@/hooks/use-user-role";
import { ORG_TYPE_LABEL, subtypesFor } from "@/lib/categories";
import { OrgCreateDialog } from "@/components/org-create-dialog";
import { Plus, MapPin, Search } from "lucide-react";

type Org = {
  id: string; slug: string; name: string; bio: string | null;
  type: string; subtype: string | null; neighborhood: string | null;
  avatar_url: string | null; banner_url: string | null;
};

export function OrgListPage({
  type,
  title,
  subtitle,
}: {
  type: "arts_org" | "business" | "community_assoc" | "group";
  title: string;
  subtitle: string;
}) {
  const { isArtist, isAdmin } = useUserRole();
  const canCreate = isArtist || isAdmin;
  const subs = subtypesFor(type);
  const [items, setItems] = useState<Org[]>([]);
  const [q, setQ] = useState("");
  const [sub, setSub] = useState<string>("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    let qb = supabase.from("organizations").select("*").eq("type", type).order("created_at", { ascending: false });
    if (sub) qb = qb.eq("subtype", sub);
    const { data } = await qb;
    let list = (data ?? []) as Org[];
    if (q.trim()) {
      const needle = q.toLowerCase();
      list = list.filter((o) => o.name.toLowerCase().includes(needle) || (o.bio ?? "").toLowerCase().includes(needle) || (o.neighborhood ?? "").toLowerCase().includes(needle));
    }
    setItems(list); setLoading(false);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sub]);
  useEffect(() => { const t = setTimeout(() => void load(), 200); return () => clearTimeout(t); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [q]);

  return (
    <AppLayout title={title} subtitle={subtitle}>
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${title.toLowerCase()}…`}
              className="w-full rounded-full border border-neutral-200 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-orange-400 focus:outline-none" />
          </div>
          {canCreate && (
            <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700">
              <Plus className="h-4 w-4" /> Create {ORG_TYPE_LABEL[type]}
            </button>
          )}
        </div>

        {subs.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setSub("")} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${sub === "" ? "border-orange-600 bg-orange-600 text-white" : "border-neutral-200 bg-white text-neutral-700"}`}>All</button>
            {subs.map((s) => (
              <button key={s} onClick={() => setSub(s)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${sub === s ? "border-orange-600 bg-orange-600 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-orange-300"}`}>{s}</button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-neutral-500">Loading…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
            No {title.toLowerCase()} yet{canCreate ? ". Be the first to add one." : "."}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((o) => (
              <Link key={o.id} to="/o/$slug" params={{ slug: o.slug }}
                className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition hover:border-orange-300">
                <div className="h-24 bg-gradient-to-br from-orange-200 to-orange-400"
                  style={o.banner_url ? { backgroundImage: `url(${o.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined} />
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="-mt-8 h-12 w-12 shrink-0 overflow-hidden rounded-full border-4 border-white bg-neutral-100">
                      {o.avatar_url && <img src={o.avatar_url} alt={o.name} className="h-full w-full object-cover" / loading="lazy" decoding="async">}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{o.name}</div>
                      {o.subtype && <div className="text-xs text-orange-600">{o.subtype}</div>}
                    </div>
                  </div>
                  {o.bio && <p className="mt-2 text-sm text-neutral-600 line-clamp-2">{o.bio}</p>}
                  {o.neighborhood && (
                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-neutral-500">
                      <MapPin className="h-3 w-3" /> {o.neighborhood}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <OrgCreateDialog type={type} open={open} onClose={() => { setOpen(false); void load(); }} />
    </AppLayout>
  );
}