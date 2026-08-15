import { useCallback, useEffect, useState } from "react";
import { Globe, Mail, MapPin, Phone, Pencil, Plus, Trash2, Upload, FileText, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Img } from "@/components/shared/smart-img";
import { FileUpload } from "@/components/shared/file-upload";

type Doc = {
  id: string;
  name: string;
  description: string | null;
  doc_type: string;
  file_url: string;
  file_name: string | null;
  created_at: string;
};

const LOGO = "Press Logo";
const PHOTO = "Press Photo";
const RELEASE = "Press Release";

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-5 py-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function ActionBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:border-[#d4580a] hover:text-[#d4580a]"
    >
      {children}
    </button>
  );
}

export function EpkTab({
  orgId, canManage, me, name, bio, email, phone, website, address,
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
  const [docs, setDocs] = useState<Doc[]>([]);
  const [editBio, setEditBio] = useState(false);
  const [form, setForm] = useState({ bio: bio ?? "", email: email ?? "", phone: phone ?? "", website: website ?? "" });
  const [savedBio, setSavedBio] = useState({ bio: bio ?? "", email: email ?? "", phone: phone ?? "", website: website ?? "" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("organization_documents")
      .select("id, name, description, doc_type, file_url, file_name, created_at")
      .eq("org_id", orgId)
      .in("doc_type", [LOGO, PHOTO, RELEASE])
      .order("created_at", { ascending: false });
    setDocs((data ?? []) as Doc[]);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  const logo = docs.find((d) => d.doc_type === LOGO);
  const photos = docs.filter((d) => d.doc_type === PHOTO);
  const releases = docs.filter((d) => d.doc_type === RELEASE);

  async function addDoc(row: { doc_type: string; name: string; description?: string | null; file_url: string; file_name?: string | null }) {
    if (!me) { toast.error("Sign in to upload"); return; }
    const { error } = await supabase.from("organization_documents").insert({ org_id: orgId, uploaded_by: me, ...row });
    if (error) { toast.error("Could not save"); return; }
    void load();
  }

  async function removeDoc(id: string) {
    const prev = docs;
    setDocs((d) => d.filter((x) => x.id !== id));
    const { error } = await supabase.from("organization_documents").delete().eq("id", id);
    if (error) { setDocs(prev); toast.error("Could not delete"); }
  }

  async function saveBio() {
    setSaving(true);
    const { error } = await supabase.from("organizations").update({
      bio: form.bio.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      website: form.website.trim() || null,
    }).eq("id", orgId);
    setSaving(false);
    if (error) { toast.error("Could not save press bio"); return; }
    setSavedBio({ ...form });
    setEditBio(false);
    toast.success("Press bio updated");
  }

  const contacts = [
    savedBio.email ? { Icon: Mail, label: savedBio.email, href: `mailto:${savedBio.email}` } : null,
    savedBio.phone ? { Icon: Phone, label: savedBio.phone, href: `tel:${savedBio.phone}` } : null,
    savedBio.website ? { Icon: Globe, label: savedBio.website, href: savedBio.website.startsWith("http") ? savedBio.website : `https://${savedBio.website}` } : null,
    address ? { Icon: MapPin, label: address, href: null } : null,
  ].filter(Boolean) as { Icon: typeof Mail; label: string; href: string | null }[];

  return (
    <div className="space-y-5 py-2">
      <Section
        title="Press Bio & Contact"
        action={canManage && !editBio ? <ActionBtn onClick={() => { setForm(savedBio); setEditBio(true); }}><Pencil className="h-3.5 w-3.5" /> Edit</ActionBtn> : undefined}
      >
        {editBio ? (
          <div className="space-y-3">
            <textarea
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              rows={6}
              placeholder="Short press bio for media and bookers..."
              className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#d4580a]"
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Booking email"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
              <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website"
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setEditBio(false)} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-muted-foreground">Cancel</button>
              <button onClick={() => void saveBio()} disabled={saving} className="rounded-lg bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : savedBio.bio || contacts.length > 0 ? (
          <div className="space-y-4">
            {savedBio.bio && <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{savedBio.bio}</p>}
            {contacts.length > 0 && (
              <ul className="space-y-2 text-sm">
                {contacts.map((c) => (
                  <li key={c.label} className="flex items-center gap-2">
                    <c.Icon className="h-4 w-4 text-muted-foreground" />
                    {c.href ? <a href={c.href} target="_blank" rel="noreferrer" className="truncate hover:underline">{c.label}</a> : <span className="truncate">{c.label}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No press bio added yet.</p>
        )}
      </Section>

      <Section title="Logo">
        {logo ? (
          <div className="flex items-center gap-4">
            <div className="grid h-24 w-24 place-items-center overflow-hidden rounded-xl border border-border bg-muted">
              <Img src={logo.file_url} alt={`${name} logo`} className="h-full w-full object-contain" loading="lazy" />
            </div>
            <div className="flex-1">
              <a href={logo.file_url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">{logo.file_name ?? "Logo"}</a>
            </div>
            {canManage && (
              <button onClick={() => void removeDoc(logo.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Remove logo">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ) : canManage ? (
          <FileUpload
            value=""
            onChange={(u, n) => { if (u) void addDoc({ doc_type: LOGO, name: n || "Logo", file_url: u, file_name: n ?? null }); }}
            label="Upload Logo"
            accept="image/*"
            bucket="post-media"
            maxSizeMB={10}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No logo added yet.</p>
        )}
      </Section>

      <Section
        title="Press Photos"
        action={canManage ? <ActionBtn onClick={() => document.getElementById("epk-photo-input")?.click()}><Upload className="h-3.5 w-3.5" /> Upload</ActionBtn> : undefined}
      >
        {canManage && (
          <div className="mb-4">
            <FileUpload
              value=""
              onChange={(u, n) => { if (u) void addDoc({ doc_type: PHOTO, name: n || "Press photo", file_url: u, file_name: n ?? null }); }}
              label="Upload press photo"
              accept="image/*"
              bucket="post-media"
              maxSizeMB={15}
              className="[&>button]:py-4"
            />
          </div>
        )}
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">No press photos yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-xl border border-border bg-muted">
                <a href={p.file_url} target="_blank" rel="noreferrer">
                  <Img src={p.file_url} alt={p.name} className="aspect-square w-full object-cover" loading="lazy" />
                </a>
                {canManage && (
                  <button onClick={() => void removeDoc(p.id)} className="absolute right-2 top-2 rounded-full bg-white/90 p-1.5 text-red-600 opacity-0 transition group-hover:opacity-100" aria-label="Delete photo">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Press Releases">
        {canManage && <ReleaseForm onAdd={(row) => addDoc({ doc_type: RELEASE, ...row })} />}
        {releases.length === 0 ? (
          <p className={canManage ? "mt-4 text-sm text-muted-foreground" : "text-sm text-muted-foreground"}>No press releases added yet.</p>
        ) : (
          <div className={`space-y-3 ${canManage ? "mt-5" : ""}`}>
            {releases.map((r) => {
              const [date, link] = (r.description ?? "").split("|");
              return (
                <div key={r.id} className="flex items-start gap-3 rounded-xl border border-border bg-background p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[#d4580a]/10">
                    <FileText className="h-5 w-5 text-[#d4580a]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-foreground">{r.name}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      {date && <span>{date}</span>}
                      {r.file_url && <a href={r.file_url} target="_blank" rel="noreferrer" className="hover:underline">Download</a>}
                      {link && <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline"><ExternalLink className="h-3 w-3" /> Link</a>}
                    </div>
                  </div>
                  {canManage && (
                    <button onClick={() => void removeDoc(r.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Delete press release">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

function ReleaseForm({ onAdd }: { onAdd: (row: { name: string; description: string | null; file_url: string; file_name: string | null }) => void }) {
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [link, setLink] = useState("");
  const [url, setUrl] = useState("");
  const [fileName, setFileName] = useState("");

  return (
    <div className="space-y-3">
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title *"
        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
      <div className="grid gap-3 sm:grid-cols-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
        <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="External link (optional)"
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
      </div>
      <FileUpload
        value={url}
        onChange={(u, n) => { setUrl(u); setFileName(n ?? ""); }}
        label="Upload PDF / Document (optional)"
        maxSizeMB={25}
      />
      <button
        onClick={() => {
          if (!title.trim()) return;
          onAdd({ name: title.trim(), description: `${date}|${link.trim()}`, file_url: url, file_name: fileName || null });
          setTitle(""); setDate(""); setLink(""); setUrl(""); setFileName("");
        }}
        disabled={!title.trim()}
        className="flex items-center gap-1.5 rounded-lg bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:bg-muted disabled:text-muted-foreground"
      >
        <Plus className="h-4 w-4" /> Add
      </button>
    </div>
  );
}
