import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Send, X, ExternalLink, FileText, Download } from "lucide-react";
import { Img } from "@/components/shared/smart-img";
import { ImageUpload } from "@/components/shared/image-upload";
import { FileUpload } from "@/components/shared/file-upload";

type Sponsor = {
  id: string;
  name: string;
  logo_url: string | null;
  website: string | null;
  tier: string | null;
  blurb: string | null;
  sort_order: number;
};

type MediaKit = { id: string; name: string; file_url: string; file_name: string | null };

const TIERS = ["Presenting", "Title", "Gold", "Silver", "Bronze", "Community", "In-kind"];

export function SponsorsTab({
  orgId,
  ownerId,
  canManage,
  label = "Page",
}: {
  orgId: string;
  ownerId: string;
  canManage: boolean;
  /** Noun used in the inquiry heading, e.g. "Podcast" or "Page". */
  label?: string;
}) {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [kit, setKit] = useState<MediaKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Sponsor | "new" | null>(null);
  const [form, setForm] = useState({ name: "", tier: "", website: "", blurb: "", logo_url: "" });

  const load = useCallback(async () => {
    const [s, d] = await Promise.all([
      supabase
        .from("organization_sponsors")
        .select("id, name, logo_url, website, tier, blurb, sort_order")
        .eq("org_id", orgId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("organization_documents")
        .select("id, name, file_url, file_name")
        .eq("org_id", orgId)
        .eq("doc_type", "media_kit")
        .order("created_at", { ascending: false })
        .limit(1),
    ]);
    if (s.error) toast.error("Could not load sponsors");
    setSponsors((s.data ?? []) as Sponsor[]);
    setKit(((d.data ?? [])[0] as MediaKit) ?? null);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  function openEditor(sp: Sponsor | "new") {
    setEditing(sp);
    setForm(sp === "new"
      ? { name: "", tier: "", website: "", blurb: "", logo_url: "" }
      : { name: sp.name, tier: sp.tier ?? "", website: sp.website ?? "", blurb: sp.blurb ?? "", logo_url: sp.logo_url ?? "" });
  }

  async function save() {
    if (!form.name.trim()) { toast.error("Add a sponsor name"); return; }
    const payload = {
      org_id: orgId,
      name: form.name.trim(),
      tier: form.tier.trim() || null,
      website: form.website.trim() || null,
      blurb: form.blurb.trim() || null,
      logo_url: form.logo_url.trim() || null,
    };
    const res = editing === "new"
      ? await supabase.from("organization_sponsors").insert(payload)
      : await supabase.from("organization_sponsors").update(payload).eq("id", (editing as Sponsor).id);
    if (res.error) { toast.error(res.error.message); return; }
    setEditing(null);
    toast.success(editing === "new" ? "Sponsor added" : "Sponsor updated");
    void load();
  }

  async function remove(id: string) {
    if (!confirm("Remove this sponsor?")) return;
    const prev = sponsors;
    setSponsors((s) => s.filter((x) => x.id !== id));
    const { error } = await supabase.from("organization_sponsors").delete().eq("id", id);
    if (error) { setSponsors(prev); toast.error("Could not remove sponsor"); return; }
    toast.success("Sponsor removed");
  }

  async function saveKit(url: string, fileName?: string) {
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) { toast.error("Sign in to upload"); return; }
    if (!url) {
      if (kit) await supabase.from("organization_documents").delete().eq("id", kit.id);
      setKit(null);
      return;
    }
    const { error } = await supabase.from("organization_documents").insert({
      org_id: orgId,
      uploaded_by: uid,
      doc_type: "media_kit",
      name: "Media Kit",
      file_url: url,
      file_name: fileName ?? null,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Media kit published");
    void load();
  }

  return (
    <div className="space-y-8 py-2">
      {/* Media kit */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Media Kit</h3>
        </div>
        {kit ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{kit.file_name ?? "Media kit"}</div>
              <div className="text-xs text-muted-foreground">Rates, audience and reach</div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <a
                href={kit.file_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background hover:opacity-90"
              >
                <Download className="h-3.5 w-3.5" /> Download
              </a>
              {canManage && (
                <button onClick={() => void saveKit("")} title="Remove media kit" className="rounded p-2 text-muted-foreground hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        ) : canManage ? (
          <FileUpload value="" onChange={(url, name) => void saveKit(url, name)} label="Upload your media kit (PDF, deck, one-sheet)" />
        ) : (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No media kit published yet.
          </div>
        )}
      </section>

      {/* Sponsors */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wide text-foreground">Sponsors</h3>
          {canManage && (
            <button
              onClick={() => openEditor("new")}
              className="flex items-center gap-2 rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Add Sponsor
            </button>
          )}
        </div>

        {loading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Loading...</div>
        ) : sponsors.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
            No sponsors listed yet.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sponsors.map((s) => (
              <div key={s.id} className="flex items-start gap-3 rounded-2xl border border-border bg-card p-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-white">
                  {s.logo_url
                    ? <Img src={s.logo_url} alt={s.name} className="h-full w-full object-contain" />
                    : <span className="text-sm font-bold text-muted-foreground">{s.name.slice(0, 2).toUpperCase()}</span>}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-bold text-foreground">{s.name}</div>
                      {s.tier && (
                        <span className="mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                          {s.tier}
                        </span>
                      )}
                    </div>
                    {canManage && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button onClick={() => openEditor(s)} title="Edit sponsor" className="rounded p-1 text-muted-foreground hover:text-foreground">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => void remove(s.id)} title="Remove sponsor" className="rounded p-1 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                  {s.blurb && <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{s.blurb}</p>}
                  {s.website && (
                    <a href={s.website} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-primary">
                      <ExternalLink className="h-3.5 w-3.5" /> Visit
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {editing && (
          <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-foreground">{editing === "new" ? "Add sponsor" : "Edit sponsor"}</div>
              <button onClick={() => setEditing(null)} title="Close" className="rounded p-1 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ImageUpload value={form.logo_url} onChange={(url) => setForm({ ...form, logo_url: url })} label="Upload sponsor logo" />
            <div className="grid gap-3 sm:grid-cols-2">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Sponsor name *" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
              <select value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })} title="Sponsor tier" className="rounded-xl border border-border bg-background px-3 py-2 text-sm">
                <option value="">Tier (optional)</option>
                {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website link" className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <textarea value={form.blurb} onChange={(e) => setForm({ ...form, blurb: e.target.value })} placeholder="Short description (optional)" rows={2} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
            <button onClick={() => void save()} className="rounded-full bg-foreground px-5 py-2 text-sm font-semibold text-background hover:opacity-90">
              Save sponsor
            </button>
          </div>
        )}
      </section>

      <SponsorInquiryForm ownerId={ownerId} label={label} />
    </div>
  );
}

function SponsorInquiryForm({ ownerId, label }: { ownerId: string; label: string }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", budget: "", message: "" });
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Name, email, and campaign details are required");
      return;
    }
    setSending(true);
    const { data: sess } = await supabase.auth.getSession();
    const { error } = await supabase.from("artist_inquiries").insert({
      artist_id: ownerId,
      sender_id: sess.session?.user.id ?? null,
      intent: `Sponsorship inquiry${form.company.trim() ? ` (${form.company.trim()})` : ""}`,
      sender_name: form.name.trim(),
      sender_email: form.email.trim(),
      message: `${form.message.trim()}${form.budget.trim() ? `\n\nBudget: ${form.budget.trim()}` : ""}`,
    });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setForm({ name: "", email: "", company: "", budget: "", message: "" });
    toast.success("Sponsorship inquiry sent");
  }

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
      <div>
        <div className="text-sm font-bold text-foreground">Sponsor This {label}</div>
        <div className="text-xs text-muted-foreground">Interested in advertising? Reach out with your campaign details.</div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name *" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email *" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company / brand" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
        <input value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} placeholder="Budget range (optional)" className="rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      </div>
      <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Tell us about your campaign... *" rows={4} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm" />
      <button
        onClick={() => void submit()}
        disabled={sending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-3 text-sm font-semibold text-background hover:opacity-90 disabled:opacity-60"
      >
        <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Inquiry"}
      </button>
    </div>
  );
}
