import { useEffect, useState } from "react";
import { Globe, Mail, MapPin, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Img } from "@/components/shared/smart-img";
import { DocumentsTab } from "@/components/org/documents-tab";

type PressPhoto = { id: string; media_url: string; title: string | null };

export function EpkTab({
  orgId,
  canManage,
  me,
  name,
  bio,
  email,
  phone,
  website,
  address,
}: {
  orgId: string;
  canManage: boolean;
  me: string | null;
  name: string;
  bio?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  address?: string | null;
}) {
  const [photos, setPhotos] = useState<PressPhoto[]>([]);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const { data } = await supabase
        .from("organization_artworks")
        .select("id,media_url,title")
        .eq("org_id", orgId)
        .order("order_index", { ascending: true })
        .limit(6);
      if (alive) setPhotos((data ?? []) as PressPhoto[]);
    })();
    return () => { alive = false; };
  }, [orgId]);

  const contacts = [
    email ? { Icon: Mail, label: email, href: `mailto:${email}` } : null,
    phone ? { Icon: Phone, label: phone, href: `tel:${phone}` } : null,
    website ? { Icon: Globe, label: website, href: website.startsWith("http") ? website : `https://${website}` } : null,
    address ? { Icon: MapPin, label: address, href: null } : null,
  ].filter(Boolean) as { Icon: typeof Mail; label: string; href: string | null }[];

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Press Bio</h3>
        {bio ? (
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{bio}</p>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {canManage ? "Add a bio from the About tab and it will appear here." : "No bio yet."}
          </p>
        )}
      </section>

      {photos.length > 0 && (
        <section>
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Press Photos</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <a key={p.id} href={p.media_url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-xl border border-border bg-muted">
                <Img src={p.media_url} alt={p.title ?? name} className="aspect-square w-full object-cover" loading="lazy" />
              </a>
            ))}
          </div>
        </section>
      )}

      {contacts.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Booking & Contact</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {contacts.map((c) => (
              <li key={c.label} className="flex items-center gap-2">
                <c.Icon className="h-4 w-4 text-muted-foreground" />
                {c.href
                  ? <a href={c.href} target="_blank" rel="noreferrer" className="truncate hover:underline">{c.label}</a>
                  : <span className="truncate">{c.label}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Press Kit Downloads</h3>
        <div className="mt-3">
          <DocumentsTab
            orgId={orgId}
            canManage={canManage}
            me={me}
            label="Press Kit File"
            docType="Press Kit"
            emptyTitle="No press kit files yet"
            emptyHint={canManage ? "Upload a rider, stage plot, one-sheet, or high-res photo pack." : undefined}
          />
        </div>
      </section>
    </div>
  );
}
