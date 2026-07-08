import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppLayout, useCurrentProfile } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/notification-settings")({
  component: NotificationSettingsPage,
  head: () => ({
    meta: [
      { title: "Notification Settings - Planet Baltimore" },
      { name: "description", content: "Choose which Planet Baltimore notifications you receive." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

type Prefs = {
  new_follower: boolean;
  new_message: boolean;
  event_reminders: boolean;
  post_likes: boolean;
  post_comments: boolean;
  email_digest: boolean;
};

const DEFAULTS: Prefs = {
  new_follower: true, new_message: true, event_reminders: true,
  post_likes: true, post_comments: true, email_digest: false,
};

const ROWS: { key: keyof Prefs; label: string; desc: string }[] = [
  { key: "new_follower", label: "New followers", desc: "When someone follows you." },
  { key: "new_message", label: "Messages", desc: "New direct messages." },
  { key: "event_reminders", label: "Event reminders", desc: "Reminders for events you're going to." },
  { key: "post_likes", label: "Post likes", desc: "When someone likes your post." },
  { key: "post_comments", label: "Post comments", desc: "When someone comments on your post." },
  { key: "email_digest", label: "Weekly email digest", desc: "A weekly roundup of Baltimore highlights." },
];

function NotificationSettingsPage() {
  const me = useCurrentProfile();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    supabase.from("notification_preferences").select("*").eq("user_id", me.id).maybeSingle()
      .then(({ data }) => { if (data) setPrefs({ ...DEFAULTS, ...(data as Prefs) }); })
      .then(() => setLoading(false));
  }, [me?.id]);

  const save = async () => {
    if (!me) { toast.error("Please sign in"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("notification_preferences").upsert({ user_id: me.id, ...prefs });
      if (error) throw error;
      toast.success("Preferences saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Notification Settings" subtitle="Choose what you get pinged about." />
        <div className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          {loading ? (
            <div className="p-10 text-center text-sm text-neutral-500">Loading...</div>
          ) : ROWS.map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between gap-4 p-5">
              <div className="min-w-0">
                <Label className="text-sm font-medium text-neutral-900">{label}</Label>
                <div className="text-xs text-neutral-500">{desc}</div>
              </div>
              <Switch checked={prefs[key]} onCheckedChange={(v) => setPrefs((p) => ({ ...p, [key]: v }))} />
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={saving || loading}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save preferences
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
