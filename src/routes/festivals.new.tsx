import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared/page-header";
import { PageBackButton } from "@/components/shared/page-back-button";
import { EditFestivalDialog } from "@/components/festival/edit-festival-dialog";

export const Route = createFileRoute("/festivals/new")({
  component: NewFestivalPage,
  head: () => ({
    meta: [
      { title: "Create a Festival - Planet Baltimore" },
      { name: "description", content: "Create a festival page on Planet Baltimore: schedule, artists, vendors, tickets and more." },
      { property: "og:title", content: "Create a Festival - Planet Baltimore" },
      { property: "og:description", content: "Create a festival page on Planet Baltimore." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function NewFestivalPage() {
  const navigate = useNavigate();
  const back = () => void navigate({ to: "/festivals" });

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <PageHeader
          title="Create Festival"
          description="Build your festival page: lineup, vendors, tickets, gallery and more. Publish it or keep it as a draft."
          back={<PageBackButton />}
        />
        <EditFestivalDialog
          asPage
          open
          eventId={null}
          onOpenChange={(v) => {
            if (!v) back();
          }}
          onSaved={() => {
            /* create mode navigates to the new festival itself */
          }}
        />
      </div>
    </AppLayout>
  );
}
