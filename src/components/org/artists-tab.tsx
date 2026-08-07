import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, X, Pencil, Globe, Image as ImageIcon } from "lucide-react";
import { ImageUpload } from "@/components/shared/image-upload";
import { Img } from "@/components/shared/smart-img";

type OrgArtist = {
  id: string;
  name: string;
  bio: string | null;
  photo_url: string | null;
  website: string | null;
  portfolio_url: string | null;
  sort_order: number;
};

export function ArtistsTab({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const [artists, setArtists] = useState<OrgArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<OrgArtist | "new" | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("organization_artists")
      .select("id, name, bio, photo_url, website, portfolio_url, sort_order")
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) { toast.error("Could not load artists"); setLoading(false); return; }
    setArtists((data ?? []) as OrgArtist[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("Remove this artist?")) return;
    const prev = artists;
    setArtists((a) => a.filter((x) => x.id !== id));
    const { error } = await supabase.from("organization_artists").delete().eq("id", id);
    if (error) { setArtists(prev); toast.error("Could not remove artist"); return; }
    toast.success("Artist removed");
  }

  return (
    <div className="space-y-5 py-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-foreground">Artists</h3>
        {canManage && (
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
          >
            <Plus className="h-4 w-4" /> Add Artist
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
      ) : artists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
          No artists yet.{canManage ? " Add your first artist." : ""}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {artists.map((a) => (
            <div key={a.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
                  {a.photo_url && <Img src={a.photo_url} alt={a.name} className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate text-sm font-bold text-foreground">{a.name}</div>
                    {canManage && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => setEditing(a)} title="Edit artist" className="rounded p-1 text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => remove(a.id)} title="Remove artist" className="rounded p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {a.bio && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{a.bio}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    {a.website && (
                      <a href={a.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                        <Globe className="h-3.5 w-3.5" /> Website
                      </a>
                    )}
                    {a.portfolio_url && (
                      <a href={a.portfolio_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
                        <ImageIcon className="h-3.5 w-3.5" /> Portfolio
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ArtistDialog
          orgId={orgId}
          artist={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}

function ArtistDialog({
  orgId,
  artist,
  onClose,
  onSaved,
}: {
  orgId: string;
  artist: OrgArtist | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(artist?.name ?? "");
  const [bio, setBio] = useState(artist?.bio ?? "");
  const [photoUrl, setPhotoUrl] = useState(artist?.photo_url ?? "");
  const [website, setWebsite] = useState(artist?.website ?? "");
  const [portfolio, setPortfolio] = useState(artist?.portfolio_url ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) { toast.error("Artist name is required"); return; }
    setSaving(true);
    const payload = {
      org_id: orgId,
      name: name.trim(),
      bio: bio.trim() || null,
      photo_url: photoUrl || null,
      website: website.trim() || null,
      portfolio_url: portfolio.trim() || null,
    };
    const { error } = artist
      ? await supabase.from("organization_artists").update(payload).eq("id", artist.id)
      : await supabase.from("organization_artists").insert(payload);
    setSaving(false);
    if (error) { toast.error("Could not save artist"); return; }
    toast.success(artist ? "Artist updated" : "Artist added");
    onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-card p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h4 className="text-lg font-bold text-foreground">{artist ? "Edit Artist" : "Add Artist"}</h4>
          <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">Photo</label>
            <ImageUpload value={photoUrl} onChange={(url) => setPhotoUrl(url || "")} />
          </div>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Artist name" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Short bio" rows={3} className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="Website URL" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <input value={portfolio} onChange={(e) => setPortfolio(e.target.value)} placeholder="Portfolio URL" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "Saving..." : artist ? "Save changes" : "Add artist"}
          </button>
        </div>
      </div>
    </div>
  );
}