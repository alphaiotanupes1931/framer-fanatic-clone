import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { HeroBanner } from "@/components/shared/hero-banner";

export const Route = createFileRoute("/notification-settings")({
  component: NotificationSettingsPage,
  head: () => ({
    meta: [
      { title: "Notification Settings - Planet Baltimore" },
      { name: "description", content: "Control which notifications you receive." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function NotificationSettingsPage() {
  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <HeroBanner title="Notification Settings" subtitle="Choose what you want to hear about." />
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white p-10 text-center text-neutral-500">
          Notification preferences coming soon.
        </div>
      </div>
    </AppLayout>
  );
}