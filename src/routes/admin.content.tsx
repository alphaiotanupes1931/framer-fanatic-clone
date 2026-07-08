import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AdminShell } from "@/components/admin-shell";
import { HeroBanner } from "@/components/shared/hero-banner";
import { isAdminUnlocked, refreshAdminUnlocked } from "@/lib/admin-gate";
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
      const flag = isAdminUnlocked();
      const ok = flag ? true : await refreshAdminUnlocked();
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
      await saveSiteContent({ data: { rows } });
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
            {SITE_CONTENT_KEYS.map((key) => {
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