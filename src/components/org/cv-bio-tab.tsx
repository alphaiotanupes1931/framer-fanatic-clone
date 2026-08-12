import { useMemo, useState } from "react";
import {
  Plus, Trash2, Pencil, Save, X, ChevronUp, ChevronDown, Headphones,
  Disc3, Calendar, Radio, Users, Trophy, Newspaper, GraduationCap,
  Music2, Building2, ImageIcon, Film, Mic, PenTool, Shirt, Layers, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Entry = { year: string; title: string; detail: string };
type Cv = { statement: string; sections: Record<string, Entry[]> };

type SectionDef = { key: string; label: string; hint: string; Icon: LucideIcon };

const S = (key: string, label: string, hint: string, Icon: LucideIcon): SectionDef => ({ key, label, hint, Icon });

const DJ_SECTIONS: SectionDef[] = [
  S("residencies", "Club Residencies", "Venue or club", Building2),
  S("exhibitions", "Notable Performances & Festivals", "Festival or performance", Calendar),
  S("releases", "Releases & Productions", "Release or production", Disc3),
  S("mixseries", "Mix Series & Radio Shows", "Mix series or station", Radio),
  S("collabs", "Collaborations & Features", "Collaborator or feature", Users),
  S("awards", "Awards & Recognition", "Award or honor", Trophy),
  S("press", "Press & Features", "Publication or feature", Newspaper),
  S("education", "Training & Education", "School, program or mentorship", GraduationCap),
];

const MUSIC_SECTIONS: SectionDef[] = [
  S("releases", "Discography & Releases", "Album, EP or single", Disc3),
  S("exhibitions", "Notable Performances & Festivals", "Show, venue or festival", Music2),
  S("collabs", "Collaborations & Features", "Collaborator or feature", Users),
  S("awards", "Awards & Recognition", "Award, grant or honor", Trophy),
  S("press", "Press & Features", "Publication or feature", Newspaper),
  S("education", "Training & Education", "School, program or mentorship", GraduationCap),
];

const VISUAL_SECTIONS: SectionDef[] = [
  S("education", "Education & Training", "School, program or residency", GraduationCap),
  S("exhibitions", "Selected Exhibitions", "Show, venue or gallery", ImageIcon),
  S("collections", "Representation & Collections", "Gallery, label or collection", Building2),
  S("awards", "Awards & Grants", "Award, grant or honor", Trophy),
  S("press", "Press & Features", "Publication or feature", Newspaper),
];

const VIDEO_SECTIONS: SectionDef[] = [
  S("filmography", "Filmography & Projects", "Film, series or project", Film),
  S("exhibitions", "Screenings & Festivals", "Festival or screening", Calendar),
  S("collabs", "Collaborations & Clients", "Client or collaborator", Users),
  S("awards", "Awards & Recognition", "Award or honor", Trophy),
  S("press", "Press & Features", "Publication or feature", Newspaper),
  S("education", "Training & Education", "School or program", GraduationCap),
];

const PODCAST_SECTIONS: SectionDef[] = [
  S("shows", "Shows & Series", "Show or series", Mic),
  S("guests", "Notable Guests", "Guest name", Users),
  S("collabs", "Networks & Partnerships", "Network or partner", Radio),
  S("awards", "Awards & Recognition", "Award or honor", Trophy),
  S("press", "Press & Features", "Publication or feature", Newspaper),
  S("education", "Training & Education", "School or program", GraduationCap),
];

const LITERARY_SECTIONS: SectionDef[] = [
  S("publications", "Publications", "Book, essay or poem", PenTool),
  S("exhibitions", "Readings & Appearances", "Reading, venue or festival", Calendar),
  S("awards", "Awards & Fellowships", "Award, grant or fellowship", Trophy),
  S("press", "Press & Features", "Publication or feature", Newspaper),
  S("education", "Education & Training", "School, program or residency", GraduationCap),
];

const FASHION_SECTIONS: SectionDef[] = [
  S("collections", "Collections & Drops", "Collection or drop", Shirt),
  S("exhibitions", "Runway & Showcases", "Show, venue or festival", Layers),
  S("collabs", "Collaborations & Clients", "Client or collaborator", Users),
  S("awards", "Awards & Recognition", "Award or honor", Trophy),
  S("press", "Press & Features", "Publication or feature", Newspaper),
  S("education", "Education & Training", "School or program", GraduationCap),
];

function sectionsFor(category?: string | null): { title: string; Icon: LucideIcon; sections: SectionDef[] } {
  const hay = (category ?? "").toLowerCase();
  if (/\bdj\b/.test(hay)) return { title: "Bio & CV", Icon: Headphones, sections: DJ_SECTIONS };
  if (/podcast/.test(hay)) return { title: "Bio & CV", Icon: Mic, sections: PODCAST_SECTIONS };
  if (/videograph|filmmak|film|video/.test(hay)) return { title: "Bio & CV", Icon: Film, sections: VIDEO_SECTIONS };
  if (/music|producer/.test(hay)) return { title: "Bio & CV", Icon: Music2, sections: MUSIC_SECTIONS };
  if (/fashion/.test(hay)) return { title: "Bio & CV", Icon: Shirt, sections: FASHION_SECTIONS };
  if (/literary|poet|writer/.test(hay)) return { title: "Bio & CV", Icon: PenTool, sections: LITERARY_SECTIONS };
  return { title: "Bio & CV", Icon: ImageIcon, sections: VISUAL_SECTIONS };
}

/** Legacy shape stored flat keys; keep reading them so nothing is lost. */
const LEGACY_KEYS = ["education", "exhibitions", "awards", "press", "representation"];

function normalize(raw: unknown): Cv {
  const v = (raw ?? {}) as Record<string, unknown>;
  const list = (x: unknown): Entry[] =>
    Array.isArray(x) ? (x as Entry[]).map((e) => ({ year: e?.year ?? "", title: e?.title ?? "", detail: e?.detail ?? "" })) : [];
  const sections: Record<string, Entry[]> = {};
  const nested = (v.sections ?? {}) as Record<string, unknown>;
  for (const [k, val] of Object.entries(nested)) sections[k] = list(val);
  for (const k of LEGACY_KEYS) if (Array.isArray(v[k]) && !sections[k]) sections[k] = list(v[k]);
  if (Array.isArray(v.representation) && !sections.collections) sections.collections = list(v.representation);
  return { statement: typeof v.statement === "string" ? v.statement : "", sections };
}

/**
 * Structured CV / Bio for artist and organization pages. The section list is
 * tailored to the artist category (DJ, music, video, podcast, literary, fashion,
 * visual) so each discipline sees the credits that matter to it.
 */
export function CvBioTab({
  orgId,
  cv,
  canManage,
  category,
  onChange,
}: {
  orgId: string;
  cv: unknown;
  canManage: boolean;
  category?: string | null;
  onChange?: (cv: Cv) => void;
}) {
  const preset = useMemo(() => sectionsFor(category), [category]);
  const [value, setValue] = useState<Cv>(() => normalize(cv));
  const [edit, setEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const rows = (key: string) => value.sections[key] ?? [];

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from("organizations").update({ cv: value } as never).eq("id", orgId);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    onChange?.(value);
    setEdit(false);
    toast.success("Bio & CV saved");
  };

  const setEntry = (key: string, i: number, patch: Partial<Entry>) =>
    setValue((v) => ({ ...v, sections: { ...v.sections, [key]: (v.sections[key] ?? []).map((e, idx) => (idx === i ? { ...e, ...patch } : e)) } }));
  const addEntry = (key: string) =>
    setValue((v) => ({ ...v, sections: { ...v.sections, [key]: [...(v.sections[key] ?? []), { year: "", title: "", detail: "" }] } }));
  const removeEntry = (key: string, i: number) =>
    setValue((v) => ({ ...v, sections: { ...v.sections, [key]: (v.sections[key] ?? []).filter((_, idx) => idx !== i) } }));

  const Title = preset.Icon;

  const header = (
    <div className="flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-lg font-bold text-foreground">
        <Title className="h-5 w-5 text-[#d4580a]" /> {preset.title}
      </h2>
      {canManage && !edit && (
        <button onClick={() => setEdit(true)} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">
          <Pencil className="h-4 w-4" /> Edit Bio
        </button>
      )}
      {edit && (
        <div className="flex gap-2">
          <button onClick={() => { setValue(normalize(cv)); setEdit(false); }} className="inline-flex items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-semibold">
            <X className="h-4 w-4" /> Cancel
          </button>
          <button onClick={() => void save()} disabled={saving} className="inline-flex items-center gap-1.5 rounded-xl bg-[#d4580a] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save"}
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {header}

      <section className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Artist Bio</h3>
        {edit ? (
          <textarea
            value={value.statement}
            onChange={(e) => setValue({ ...value, statement: e.target.value })}
            rows={6}
            placeholder="Tell people about your practice…"
            className="mt-3 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-[#d4580a] focus:outline-none"
          />
        ) : value.statement.trim() ? (
          <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-foreground">{value.statement}</p>
        ) : (
          <p className="mt-3 text-sm italic text-muted-foreground">No bio yet.</p>
        )}
      </section>

      {preset.sections.map((s) => {
        const open = !collapsed[s.key];
        const items = rows(s.key);
        return (
          <section key={s.key} className="rounded-2xl border border-border bg-card">
            <div className="flex items-center justify-between px-5 py-4">
              <h3 className="flex items-center gap-2 text-[15px] font-bold text-foreground">
                <s.Icon className="h-4 w-4 text-muted-foreground" /> {s.label}
              </h3>
              <div className="flex items-center gap-1">
                {edit && (
                  <button onClick={() => addEntry(s.key)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#d4580a]">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                )}
                <button
                  onClick={() => setCollapsed((c) => ({ ...c, [s.key]: open }))}
                  className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                  aria-label={open ? "Collapse" : "Expand"}
                >
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {open && (
              <div className="border-t border-border px-5 py-4">
                {items.length === 0 && <p className="text-sm italic text-muted-foreground">No entries yet.</p>}
                {edit ? (
                  <div className="space-y-2">
                    {items.map((e, i) => (
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
                ) : (
                  <ul className="space-y-3">
                    {items.map((e, i) => (
                      <li key={i} className="grid grid-cols-[64px_minmax(0,1fr)] gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                        <span className="text-sm font-semibold text-[#d4580a]">{e.year}</span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-foreground">{e.title}</span>
                          {e.detail && <span className="block text-sm text-muted-foreground">{e.detail}</span>}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
