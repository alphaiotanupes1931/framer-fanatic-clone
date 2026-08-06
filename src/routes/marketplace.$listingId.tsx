import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ArrowLeft, MapPin, MessageCircle, Trash2, Send, Tag } from "lucide-react";
import { toast } from "sonner";
import { Img, SmartAvatarImage } from "@/components/shared/smart-img";
import { ShareButtons } from "@/components/shared/share-buttons";

type Listing = {
  id: string; seller_id: string; title: string; description: string | null;
  price_cents: number; category: string; condition: string;
  neighborhood: string | null; location: string | null; photos: string[];
  status: string; created_at: string;
};

type Seller = { id: string; display_name: string | null; username: string | null; avatar_url: string | null };

export const Route = createFileRoute("/marketplace/$listingId")({
  component: ListingDetail,
  head: () => ({ meta: [{ title: "Listing - Planet Baltimore" }] }),
});

function ListingDetail() {
  const { listingId } = Route.useParams();
  const me = useCurrentProfile();
  const navigate = useNavigate();
  const [item, setItem] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("marketplace_listings").select("*").eq("id", listingId).maybeSingle();
      setItem(data as Listing | null);
      if (data) {
        const { data: profs } = await supabase.rpc("public_profiles_by_ids", { _ids: [data.seller_id] });
        setSeller(((profs || [])[0] as Seller) || null);
      }
      setLoading(false);
    })();
  }, [listingId]);

  const message = async () => {
    if (!me || !item) { navigate({ to: "/auth" }); return; }
    if (me.id === item.seller_id) return;
    const [a, b] = me.id < item.seller_id ? [me.id, item.seller_id] : [item.seller_id, me.id];
    const { data: existing } = await supabase.from("conversations").select("id").eq("user_a", a).eq("user_b", b).maybeSingle();
    let conversationId = existing?.id;
    if (!existing) {
      const { data: created, error } = await supabase.from("conversations").insert({ user_a: a, user_b: b }).select("id").single();
      if (error) { toast.error(error.message); return; }
      conversationId = created?.id;
    }
    if (conversationId) window.localStorage.setItem("pb_open_conversation", conversationId);
    navigate({ to: "/messages" });
  };

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: item?.title, url: window.location.href });
      else { await navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }
    } catch { /* cancelled */ }
  };

  const remove = async () => {
    if (!item || !me || me.id !== item.seller_id) return;
    if (!confirm("Delete this listing?")) return;
    const { error } = await supabase.from("marketplace_listings").delete().eq("id", item.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted"); navigate({ to: "/marketplace" });
  };

  const markSold = async () => {
    if (!item || !me || me.id !== item.seller_id) return;
    const { error } = await supabase.from("marketplace_listings").update({ status: item.status === "sold" ? "active" : "sold" }).eq("id", item.id);
    if (error) return toast.error(error.message);
    setItem({ ...item, status: item.status === "sold" ? "active" : "sold" });
  };

  if (loading) return <AppLayout title="" hero={false}><div className="text-muted-foreground text-sm">Loading…</div></AppLayout>;
  if (!item) return (
    <AppLayout title="Listing not found" hero={false}>
      <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>
    </AppLayout>
  );

  const isOwner = me && me.id === item.seller_id;
  const initials = (seller?.display_name || seller?.username || "U").slice(0, 2).toUpperCase();
  const cover = item.photos[photoIdx] || item.photos[0];

  return (
    <AppLayout title="" hero={false}>
      <Link to="/marketplace" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="overflow-hidden rounded-3xl border border-border bg-card">
          <div className="aspect-[4/3] w-full overflow-hidden bg-secondary">
            {cover ? (
              <Img src={cover} alt={item.title} className="h-full w-full object-cover" loading="lazy" decoding="async" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground"><Tag className="h-12 w-12" /></div>
            )}
          </div>
          {item.photos.length > 1 && (
            <div className="flex gap-2 overflow-x-auto p-3">
              {item.photos.map((p, i) => (
                <button key={i} onClick={() => setPhotoIdx(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === photoIdx ? "border-[#d4580a]" : "border-transparent"}`}>
                  <Img src={p} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-border bg-card p-5">
            {item.status === "sold" && (
              <div className="mb-3 inline-block rounded-full bg-red-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-700">Sold</div>
            )}
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-foreground">{item.title}</h1>
            <div className="mt-2 text-3xl font-bold text-[#d4580a]">
              {item.price_cents === 0 ? "Free" : `$${(item.price_cents / 100).toFixed(2)}`}
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-secondary px-2.5 py-1 capitalize text-foreground">{item.category.replace("-", " ")}</span>
              <span className="rounded-full bg-secondary px-2.5 py-1 capitalize text-foreground">{item.condition.replace("-", " ")}</span>
              {item.neighborhood && (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-foreground"><MapPin className="h-3 w-3" /> {item.neighborhood}</span>
              )}
            </div>
            {item.description && (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{item.description}</p>
            )}

            <div className="mt-5 flex flex-col gap-2">
              {!isOwner && (
                <button onClick={message} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#d4580a] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110">
                  <MessageCircle className="h-4 w-4" /> Message seller
                </button>
              )}
              <ShareButtons
                path={`/marketplace/${item.id}`}
                title={item.title}
                size="sm"
                label
                className="justify-center"
                buttonClassName="inline-flex flex-1 items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
              />
              {isOwner && (
                <>
                  <button onClick={markSold} className="rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent">
                    Mark as {item.status === "sold" ? "active" : "sold"}
                  </button>
                  <button onClick={remove} className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </>
              )}
            </div>
          </div>

          {seller && (
            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seller</div>
              <Link to="/u/$username" params={{ username: seller.username || seller.id }} className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  {seller.avatar_url && <SmartAvatarImage src={seller.avatar_url} alt="" />}
                  <AvatarFallback className="bg-[#d4580a]/10 text-[#d4580a]">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-foreground">{seller.display_name || seller.username}</div>
                  {seller.username && <div className="text-xs text-muted-foreground">@{seller.username}</div>}
                </div>
              </Link>
            </div>
          )}
        </aside>
      </div>
    </AppLayout>
  );
}