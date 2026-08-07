import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Plus, Trash2, X, Pencil, Mail } from "lucide-react";
import { ImageUpload } from "@/components/shared/image-upload";
import { Img } from "@/components/shared/smart-img";

type Member = {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  email: string | null;
  photo_url: string | null;
  sort_order: number;
};

export function BoardTab({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Member | "new" | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("organization_board_members")
      .select("id, name, title, bio, email, photo_url, sort_order")
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) { toast.error("Could not load board members"); setLoading(false); return; }
    setMembers((data ?? []) as Member[]);
    setLoading(false);
  }, [orgId]);

  useEffect(() => { void load(); }, [load]);

  async function remove(id: string) {
    if (!confirm("Remove this board member?")) return;
    const prev = members;
    setMembers((m) => m.filter((x) => x.id !== id));
    const { error } = await supabase.from("organization_board_members").delete().eq("id", id);
    if (error) { setMembers(prev); toast.error("Could not remove member"); return; }
    toast.success("Member removed");
  }

  return (
    <div className="space-y-6 py-2">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-neutral-900">Leadership &amp; Board</h3>
        {canManage && (
          <button
            onClick={() => setEditing("new")}
            className="flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800"
          >
            <Plus className="h-4 w-4" /> Add Member
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-neutral-100" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="py-14 text-center">
          <Crown className="mx-auto mb-3 h-8 w-8 text-neutral-300" />
          <p className="text-sm text-neutral-500">No board members listed yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {members.map((m) => (
            <div key={m.id} className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-4">
              {m.photo_url ? (
                <Img src={m.photo_url} alt={m.name} className="h-16 w-16 shrink-0 rounded-full object-cover" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#d4580a]/10 text-lg font-bold text-[#d4580a]">
                  {m.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-neutral-900">{m.name}</p>
                {m.title && <p className="text-sm font-medium text-[#d4580a]">{m.title}</p>}
                {m.bio && <p className="mt-1 text-sm text-neutral-600">{m.bio}</p>}
                {m.email && (
                  <a href={`mailto:${m.email}`} className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-500 hover:underline">
                    <Mail className="h-3 w-3" /> {m.email}
                  </a>
                )}
              </div>
              {canManage && (
                <div className="flex flex-col gap-1">
                  <button onClick={() => setEditing(m)} className="rounded-lg p-2 text-neutral-500 hover:bg-neutral-100" aria-label="Edit member">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => void remove(m.id)} className="rounded-lg p-2 text-neutral-500 hover:bg-red-50 hover:text-red-600" aria-label="Remove member">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <MemberDialog
          orgId={orgId}
          member={editing === "new" ? null : editing}
          nextOrder={members.length}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); void load(); }}
        />
      )}
    </div>
  );
}

function MemberDialog({ orgId, member, nextOrder, onClose, onDone }: {
  orgId: string; member: Member | null; nextOrder: number; onClose: () => void; onDone: () => void;
}) {
  const [name, setName] = useState(member?.name ?? "");
  const [title, setTitle] = useState(member?.title ?? "");
  const [bio, setBio] = useState(member?.bio ?? "");
  const [email, setEmail] = useState(member?.email ?? "");
  const [photo, setPhoto] = useState(member?.photo_url ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setSaving(true);
    const payload = {
      name: name.trim(),
      title: title.trim() || null,
      bio: bio.trim() || null,
      email: email.trim() || null,
      photo_url: photo || null,
    };
    const { error } = member
      ? await supabase.from("organization_board_members").update(payload).eq("id", member.id)
      : await supabase.from("organization_board_members").insert({ ...payload, org_id: orgId, sort_order: nextOrder });
    setSaving(false);
    if (error) { toast.error("Could not save member"); return; }
    toast.success(member ? "Member updated" : "Member added");
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
          <h3 className="text-lg font-bold text-neutral-900">{member ? "Edit Member" : "Add Board Member"}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="max-h-[70vh] space-y-4 overflow-y-auto p-5">
          <ImageUpload value={photo} onChange={setPhoto} label="Upload photo (optional)" />
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Jane Smith"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Title / Role</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., President"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Bio (optional)</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} placeholder="Short bio or responsibilities..."
              className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-neutral-700">Email (optional)</label>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="name@example.com"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-[#d4580a]" />
          </div>
        </div>
        <div className="flex gap-3 border-t border-neutral-200 p-4">
          <button onClick={onClose} className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50">Cancel</button>
          <button onClick={() => void save()} disabled={!name.trim() || saving}
            className="flex-1 rounded-lg bg-[#d4580a] py-2.5 text-sm font-semibold text-white disabled:bg-neutral-300">
            {saving ? "Saving..." : member ? "Save Changes" : "Add Member"}
          </button>
        </div>
      </div>
    </div>
  );
}