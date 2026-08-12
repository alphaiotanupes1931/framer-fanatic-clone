import { useState } from "react";
import { Plus, Trash2, Pencil, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Entry = { year: string; title: string; detail: string };
type Cv = {
  statement: string;
  education: Entry[];
  exhibitions: Entry[];
  awards: Entry[];
  press: Entry[];
  representation: Entry[];
};

const EMPTY: Cv = { statement: "", education: [], exhibitions: [], awards: [], press: [], representation: [] };

const SECTIONS: { key: keyof Omit<Cv, "statement">; label: string; hint: string }[] = [
  { key: "education", label: "Education & Training", hint: "School, program or residency" },
  { key: "exhibitions", label: "Selected Work & Exhibitions", hint: "Show, venue or release" },
  { key: "awards", label: "Awards & Grants", hint: "Award, grant or honor" },
  { key: "press", label: "Press & Features", hint: "Publication or feature" },
  { key: "representation", label: "Representation & Collections", hint: "Gallery, label or collection" },
];

function normalize(raw: unknown): Cv {
  const v = (raw ?? {}) as Partial<Cv>;
  const list = (x: unknown): Entry[] =>
    Array.isArray(x) ? (x as Entry[]).map((e) => ({ year: e?.year ?? "", title: e?.title ?? "", detail: e?.detail ?? "" })) : [];
  return {
    statement: typeof v.statement === "string" ? v.statement : "",
    education: list(v.education),
    exhibitions: list(v.exhibitions),
    awards: list(v.awards),
    press: list(v.press),
    representation: list(v.representation),
  };
}

/**
 * Structured CV / Bio for artist and organization pages: an artist statement
 * plus dated lists for education, work, awards, press and representation.
 */
export function CvBioTab({
  orgId,
  cv,
  canManage,
  onChange,
}: {
  orgId: string;
  cv: unknown;
  canManage: boolean;
  onChange?: (cv: Cv) => void;
}) {
  const [value, setValue] = useState<Cv>(() => normalize(cv));
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("organizations").update({ cv: value } as never).eq("id", orgId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onChange?.(value);
    setEdit(false);
    toast.success("CV saved");
  };

  const setEntry = (key: keyof Omit<Cv, "statement">, i: number, patch: Partial<Entry>) =>
    setValue((v) => ({ ...v, [key]: v[key].map((e, idx) => (idx === i ? { ...e, ...patch } : e)) }));
  const addEntry = (key: keyof Omit<Cv, "statement">) =>
    setValue((v) => ({ ...v, [key]: [...v[key], { year: "", title: "", detail: "" }] }));
  const removeEntry = (key: keyof Omit<Cv, "statement">, i: number) =>
    setValue((v) => ({ ...v, [key]: v[key].filter((_, idx) => idx !== i) }));

  const isEmpty =
    !value.statement.trim() && SECTIONS.every((s) => value[s.key].length === 0);

  if (!edit) {
    return (
      <div className="space-y-8">
        {canManage && (
          <div className="flex justify-end">
            <button onClick={() => setEdit(true)} className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold">
              <Pencil className="h-4 w-4" /> Edit CV / Bio
            </button>
          </div>
        )}
        {isEmpty ? (
          <div className="rounded-2xl border border-dashed border-border py-14 text-center text-sm text-muted-foreground">
            {canManage ? "Add your statement, education, exhibitions, awards and press." : "No CV published yet."}
          </div>
        ) : (
          <>
            {value.statement.trim() && (
              <section>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Artist Statement</h3>
                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{value.statement}</p>
              </section>
            )}
            {SECTIONS.map((s) =>
              value[s.key].length === 0 ? null : (
                <section key={s.key}>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{s.label}</h3>
                  <ul className="mt-3 space-y-3">
                    {value[s.key].map((e, i) => (
                      <li key={i} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-b border-border pb-3 last:border-0">
                        <span className="text-sm font-semibold text-[#d4580a]">{e.year}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{e.title}</span>
                          {e.detail && <span className="block text-sm text-muted-foreground">{e.detail}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              ),
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-2">
        <button onClick={() => { setValue(normalize(cv)); setEdit(false); }} className="inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold">
          <X className="h-4 w-4" /> Cancel
        </button>
        <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-1.5 rounded-full bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <section>
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Artist Statement</label>
        <textarea
          value={value.statement}
          onChange={(e) => setValue({ ...value, statement: e.target.value })}
          rows={6}
          placeholder="Tell people about your practice…"
          className="mt-2 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-[#d4580a] focus:outline-none"
        />
      </section>

      {SECTIONS.map((s) => (
        <section key={s.key}>
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{s.label}</label>
            <button onClick={() => addEntry(s.key)} className="inline-flex items-center gap-1 text-xs font-semibold text-[#d4580a]">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </div>
          <div className="mt-2 space-y-2">
            {value[s.key].length === 0 && <p className="text-sm text-muted-foreground">Nothing added yet.</p>}
            {value[s.key].map((e, i) => (
              <div key={i} className="grid grid-cols-[80px_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2">
                <input value={e.year} onChange={(ev) => setEntry(s.key, i, { year: ev.target.value })} placeholder="Year" className="rounded-lg border border-border bg-background px-2 py-2 text-sm" />
                <input value={e.title} onChange={(ev) => setEntry(s.key, i, { title: ev.target.value })} placeholder={s.hint} className="rounded-lg border border-border bg-background px-2 py-2 text-sm" />
                <input value={e.detail} onChange={(ev) => setEntry(s.key, i, { detail: ev.target.value })} placeholder="Details (optional)" className="rounded-lg border border-border bg-background px-2 py-2 text-sm" />
                <button onClick={() => removeEntry(s.key, i)} className="rounded-full p-2 text-muted-foreground hover:text-red-600" aria-label="Remove">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
