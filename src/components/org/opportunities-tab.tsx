import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Trash2, ExternalLink, CalendarDays, Loader2 } from "lucide-react";

type Opportunity = {
  id: string;
  title: string;
  body: string | null;
  link_url: string | null;
  opportunity_type: string | null;
  deadline: string | null;
  created_at: string;
};

const TYPES = ["Open call", "Job", "Residency", "Grant", "Commission", "Volunteer", "Internship"];

export function OpportunitiesTab({ orgId, canManage }: { orgId: string; canManage: boolean }) {
  const [items, setItems] = useState<Opportunity[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", opportunity_type: TYPES[0], deadline: "", body: "", link_url: "" });

  const reset = () => setForm({ title: "", opportunity_type: TYPES[0], deadline: "", body: "", link_url: "" });

  const load = async () => {
    const { data } = await supabase
      .from("organization_posts")
      .select("id, title, body, link_url, opportunity_type, deadline, created_at")
      .eq("org_id", orgId)
      .eq("kind", "opportunity")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as unknown as Opportunity[]);
  };
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [orgId]);

  const save = async () => {
    if (!form.title.trim()) return toast.error("Title is required");
    const { data: sess } = await supabase.auth.getSession();
    const uid = sess.session?.user.id;
    if (!uid) return toast.error("Sign in first");
    setSaving(true);
    const { error } = await supabase.from("organization_posts").insert({
      org_id: orgId,
      author_id: uid,
      kind: "opportunity",
      title: form.title.trim(),
      body: form.body.trim() || null,
      link_url: form.link_url.trim() || null,
      opportunity_type: form.opportunity_type,
      deadline: form.deadline || null,
    } as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    setOpen(false); reset(); void load();
    toast.success("Opportunity posted");
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this opportunity?")) return;
    const { error } = await supabase.from("organization_posts").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="space-y-4">
      {canManage && !open && (
        <div className="flex justify-end">
          <button onClick={() => setOpen(true)} className="inline-flex items-center gap-2 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700">
            <Plus className="h-4 w-4" /> New opportunity
          </button>
        </div>
      )}

      {open && canManage && (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="Title *"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-orange-400 focus:outline-none"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <select
              value={form.opportunity_type}
              onChange={(e) => setForm({ ...form, opportunity_type: e.target.value })}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-orange-400 focus:outline-none"
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            <input
              type="date"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-orange-400 focus:outline-none"
            />
          </div>
          <textarea
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            rows={4}
            placeholder="Description"
            className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-orange-400 focus:outline-none"
          />
          <input
            value={form.link_url}
            onChange={(e) => setForm({ ...form, link_url: e.target.value })}
            placeholder="Apply / Learn more URL"
            className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm focus:border-orange-400 focus:outline-none"
          />
          <div className="flex items-center gap-3">
            <button onClick={save} disabled={saving || !form.title.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-[#d4580a] px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
            </button>
            <button onClick={() => { setOpen(false); reset(); }} className="rounded-lg border border-border bg-card px-5 py-2 text-sm font-semibold text-neutral-700">Cancel</button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card py-12 text-center text-sm text-muted-foreground">
          No opportunities posted yet.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((o) => {
            const expired = o.deadline ? new Date(`${o.deadline}T23:59:59`) < new Date() : false;
            return (
              <div key={o.id} className="group relative rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {o.opportunity_type && (
                    <span className="rounded-full bg-[#d4580a]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#d4580a]">{o.opportunity_type}</span>
                  )}
                  {o.deadline && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold ${expired ? "bg-neutral-100 text-neutral-500" : "bg-neutral-100 text-neutral-700"}`}>
                      <CalendarDays className="h-3 w-3" /> {expired ? "Closed" : "Deadline"} {fmt(o.deadline)}
                    </span>
                  )}
                </div>
                <h3 className="mt-2 text-lg font-bold text-foreground">{o.title}</h3>
                {o.body && <p className="mt-1 whitespace-pre-wrap text-sm text-neutral-700">{o.body}</p>}
                {o.link_url && (
                  <a href={o.link_url} target="_blank" rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#d4580a] px-4 py-2 text-xs font-semibold text-white hover:bg-orange-700">
                    Apply <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {canManage && (
                  <button onClick={() => remove(o.id)} aria-label="Delete opportunity"
                    className="absolute right-3 top-3 rounded-full bg-card/90 p-1.5 opacity-0 transition group-hover:opacity-100">
                    <Trash2 className="h-3.5 w-3.5 text-red-600" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
