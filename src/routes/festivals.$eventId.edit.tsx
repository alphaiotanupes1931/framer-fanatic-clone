import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppLayout } from "@/components/app-layout";
import { PageHeader } from "@/components/shared/page-header";
import { PageBackButton } from "@/components/shared/page-back-button";
import { EditFestivalDialog } from "@/components/festival/edit-festival-dialog";

export const Route = createFileRoute("/festivals/$eventId/edit")({
  component: EditFestivalPage,
  head: () => ({
    meta: [
      { title: "Edit Festival - Planet Baltimore" },
      { name: "description", content: "Update your festival page on Planet Baltimore: schedule, artists, vendors, tickets and more." },
      { property: "og:title", content: "Edit Festival - Planet Baltimore" },
      { property: "og:description", content: "Update your festival page on Planet Baltimore." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function EditFestivalPage() {
  const { eventId } = Route.useParams();
  const navigate = useNavigate();
  const back = () => void navigate({ to: "/festivals/$eventId", params: { eventId } });

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6">
        <PageHeader
          title="Edit Festival"
          description="Update every part of your festival page. Changes go live immediately."
          back={<PageBackButton />}
        />
        <EditFestivalDialog
          asPage
          open
          eventId={eventId}
          onOpenChange={(v) => {
            if (!v) back();
          }}
          onSaved={back}
        />
      </div>
    </AppLayout>
  );
}
