import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { HeroBanner } from "@/components/shared/hero-banner";
import { getAdminToken, refreshAdminUnlocked } from "@/lib/admin-gate";
import { saveSiteContent } from "@/lib/admin-site.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import { SITE_CONTENT_DEFAULTS, SITE_CONTENT_KEYS } from "@/hooks/use-site-content";

export const Route = createFileRoute("/admin/content")({
  component: AdminContentPage,
  head: () => ({ meta: [{ title: "Admin: Landing Content - Planet Baltimore" }] }),
});

const FIELD_META: Record<string, { label: string; help: string; multiline?: boolean }> = {
  "hero.line1": { label: "Hero headline (line 1)", help: "First line of the giant hero title." },
  "hero.line2": { label: "Hero headline (line 2)", help: "Second line of the giant hero title." },
  "hero.subtitle": { label: "Hero subtitle", help: "Short line under the headline." },
  "hero.cta": { label: "Hero CTA button label", help: "The button that links to /auth." },
  "quote.text": { label: "Featured quote", help: "The pull quote in the middle of the page.", multiline: true },
  "quote.author": { label: "Quote author", help: "Attribution under the quote." },
  "creators.headline.line1": { label: "Communities headline (line 1)", help: 'First line of the "Turning passions into communities" section.' },
  "creators.headline.line2": { label: "Communities headline (line 2)", help: "Second line of that headline." },
  "creators.card1.title": { label: "Community card 1: title", help: "Left card title (e.g. Build Your Community)." },
  "creators.card1.body": { label: "Community card 1: body", help: "Left card description.", multiline: true },
  "creators.card1.cta": { label: "Community card 1: button", help: "Left card button label." },
  "creators.card2.title": { label: "Community card 2: title", help: "Right card title (e.g. Everything in One Place)." },
  "creators.card2.body": { label: "Community card 2: body", help: "Right card description.", multiline: true },
  "creators.card2.cta": { label: "Community card 2: button", help: "Right card button label." },
  "features.heading": { label: "Meet today's Baltimore: heading", help: 'The big "Meet today\u2019s Baltimore." headline.' },
  "features.subtitle": { label: "Meet today's Baltimore: subtitle", help: "Line under that heading." },
  "cta.line1": { label: "Bottom CTA (line 1)", help: 'First line of the big bottom call to action (e.g. "Start free.").' },
  "cta.line2": { label: "Bottom CTA (line 2)", help: 'Second line (e.g. "Get paid tomorrow.").' },
  "cta.button": { label: "Bottom CTA button", help: "Button label under the big bottom CTA." },
  "about.hero.title": { label: "About: hero title", help: "First line of the About hero." },
  "about.hero.italic": { label: "About: hero italic line", help: "Second, italic line of the About hero." },
  "about.story.heading": { label: "About: story heading", help: "Section title above the story paragraphs." },
  "about.story.p1": { label: "About: story paragraph 1", help: "First paragraph.", multiline: true },
  "about.story.p2": { label: "About: story paragraph 2", help: "Second paragraph.", multiline: true },
  "about.story.p3": { label: "About: story paragraph 3", help: "Third paragraph.", multiline: true },
  "about.cta.heading": { label: "About: CTA heading", help: "Large call-to-action headline near the bottom." },
  "about.cta.primary": { label: "About: primary button label", help: "Main call-to-action button." },
  "about.cta.secondary": { label: "About: secondary button label", help: "Secondary link button." },
};

const COLOR_FIELDS: { key: string; label: string; help: string }[] = [
  { key: "colors.blue", label: "Primary blue", help: "Main blue used on the hero background, Features and CTA sections." },
  { key: "colors.blueDeep", label: "Deep blue", help: "Darker blue behind the Communities section." },
  { key: "colors.ink", label: "Ink (dark)", help: "Near-black used for dark buttons, cards, and the footer." },
  { key: "colors.paper", label: "Paper (light)", help: "Off-white used for light text, quote section, and light buttons." },
  { key: "colors.heroBg", label: "Hero background color", help: "Solid color for the hero section. Leave empty to show the photo/video background." },
  { key: "colors.heroText", label: "Hero text color", help: "Color of the headline, subtitle, and CTAs in the hero." },
  { key: "colors.textOnBlue", label: "Text color on blue sections", help: "Overrides text color on Features and CTA sections. Leave empty for default." },
  { key: "colors.textOnBlueDeep", label: "Text color on deep blue section", help: "Overrides text color on the Communities section. Leave empty for default." },
  { key: "colors.textOnPaper", label: "Text color on light sections", help: "Overrides text color on the quote / About story sections. Leave empty for default." },
];

const COLOR_KEY_SET = new Set(COLOR_FIELDS.map((c) => c.key));
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const OPTIONAL_COLOR_KEYS = new Set(["colors.heroBg", "colors.textOnBlue", "colors.textOnBlueDeep", "colors.textOnPaper"]);

function normalizeHex(v: string): string {
  const t = v.trim();
  if (!t) return t;
  return t.startsWith("#") ? t : `#${t}`;
}

function AdminContentPage() {
  const navigate = useNavigate();
  const [unlocked, setUnlocked] = useState(false);
  const [gateChecked, setGateChecked] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({ ...SITE_CONTENT_DEFAULTS });
  const [initial, setInitial] = useState<Record<string, string>>({ ...SITE_CONTENT_DEFAULTS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      // Always verify with the server so a stale local flag can't
      // convince the UI it's unlocked when the cookie isn't set.
      const ok = await refreshAdminUnlocked();
      setUnlocked(ok);
      setGateChecked(true);
      if (!ok) navigate({ to: "/admin/login" });
    })();
  }, [navigate]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("site_content").select("key, value");
      const merged = { ...SITE_CONTENT_DEFAULTS };
      (data || []).forEach((row: { key: string; value: unknown }) => {
        if (typeof row.value === "string") merged[row.key] = row.value;
        else if (row.value != null) merged[row.key] = String(row.value);
      });
      setValues(merged);
      setInitial(merged);
      setLoading(false);
    })();
  }, []);

  const dirtyKeys = SITE_CONTENT_KEYS.filter((k) => values[k] !== initial[k]);

  const save = async () => {
    if (dirtyKeys.length === 0) return;
    setSaving(true);
    const rows = dirtyKeys.map((k) => ({ key: k, value: values[k] ?? "" }));
    try {
      await saveSiteContent({ data: { rows, adminToken: getAdminToken() } });
      setInitial({ ...values });
      toast.success(`Saved ${dirtyKeys.length} change${dirtyKeys.length === 1 ? "" : "s"}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Save failed";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!gateChecked || !unlocked) {
    return (
      <AdminShell>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Redirecting to admin login...
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Admin
          </Link>
        </div>
        <HeroBanner
          title="Landing Page Content"
          subtitle="Edit the text that appears on the public homepage. Changes go live immediately."
          cta={
            <Button onClick={save} disabled={saving || dirtyKeys.length === 0} className="gap-2">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {dirtyKeys.length > 0 ? `Save (${dirtyKeys.length})` : "Saved"}
            </Button>
          }
        />

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading...
          </div>
        ) : (
          <div className="space-y-5">
            {/* Colors */}
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold">Landing page colors</h2>
                  <p className="text-xs text-muted-foreground">
                    Change the color palette used across the homepage and About page. Pick a color or paste a hex code.
                  </p>
                </div>
                <a
                  href="/"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50"
                >
                  Open landing page ↗
                </a>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {COLOR_FIELDS.map((c) => {
                  const current = values[c.key] ?? SITE_CONTENT_DEFAULTS[c.key] ?? "#000000";
                  const savedVal = initial[c.key] ?? SITE_CONTENT_DEFAULTS[c.key] ?? "";
                  const dirty = current !== savedVal;
                  const optional = OPTIONAL_COLOR_KEYS.has(c.key);
                  const valid = (optional && current.trim() === "") || HEX_RE.test(current);
                  return (
                    <div key={c.key} className={`rounded-xl border p-4 ${dirty ? "border-orange bg-orange/5" : "border-border bg-background"}`}>
                      <Label htmlFor={c.key} className="text-sm font-semibold">
                        {c.label}
                        {dirty && <span className="ml-2 text-xs text-orange">• unsaved</span>}
                      </Label>
                      <p className="mb-3 text-xs text-muted-foreground">{c.help}</p>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={HEX_RE.test(current) ? current : "#000000"}
                          onChange={(e) => setValues((v) => ({ ...v, [c.key]: e.target.value }))}
                          className="h-10 w-14 shrink-0 cursor-pointer rounded-md border border-border bg-transparent"
                          aria-label={`${c.label} color picker`}
                        />
                        <Input
                          id={c.key}
                          value={current}
                          onChange={(e) => {
                            const raw = e.target.value;
                            setValues((v) => ({ ...v, [c.key]: raw.trim() === "" ? "" : normalizeHex(raw) }));
                          }}
                          placeholder={optional ? "empty = use default" : "#000000"}
                          className={valid ? "" : "border-destructive"}
                        />
                        {optional && current.trim() !== "" && (
                          <button
                            type="button"
                            onClick={() => setValues((v) => ({ ...v, [c.key]: "" }))}
                            className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-50"
                            title="Clear"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Currently saved: <code>{savedVal || "(none)"}</code></span>
                        {current !== (SITE_CONTENT_DEFAULTS[c.key] ?? "") && (
                          <button
                            type="button"
                            onClick={() => setValues((v) => ({ ...v, [c.key]: SITE_CONTENT_DEFAULTS[c.key] ?? "" }))}
                            className="text-neutral-600 underline hover:text-neutral-900"
                          >
                            Reset to default ({SITE_CONTENT_DEFAULTS[c.key] || "empty"})
                          </button>
                        )}
                      </div>
                      {!valid && (
                        <p className="mt-2 text-[11px] text-destructive">Enter a valid hex like #1E3A5F{optional ? " (or leave empty)" : ""}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {SITE_CONTENT_KEYS.map((key) => {
              if (COLOR_KEY_SET.has(key)) return null;
              const meta = FIELD_META[key] ?? { label: key, help: "" };
              const dirty = values[key] !== initial[key];
              return (
                <div key={key} className={`rounded-2xl border p-5 ${dirty ? "border-orange bg-orange/5" : "border-border bg-card"}`}>
                  <Label htmlFor={key} className="text-sm font-semibold">
                    {meta.label}
                    {dirty && <span className="ml-2 text-xs text-orange">• unsaved</span>}
                  </Label>
                  {meta.help && <p className="mb-2 text-xs text-muted-foreground">{meta.help}</p>}
                  {meta.multiline ? (
                    <Textarea
                      id={key}
                      rows={3}
                      value={values[key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                    />
                  ) : (
                    <Input
                      id={key}
                      value={values[key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                    />
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">Key: <code>{key}</code></p>
                </div>
              );
            })}

            <div className="sticky bottom-4 flex justify-end">
              <Button onClick={save} disabled={saving || dirtyKeys.length === 0} className="gap-2 shadow-lg">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {dirtyKeys.length > 0 ? `Save ${dirtyKeys.length} change${dirtyKeys.length === 1 ? "" : "s"}` : "All saved"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </AdminShell>
  );
}