import { createFileRoute, redirect } from "@tanstack/react-router";

// Event editing now lives inside the Organizer Studio, alongside tickets,
// attendees and payouts. Keep the old URL working with a redirect.
export const Route = createFileRoute("/edit-event/$eventId")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/organizer-studio", search: { event: params.eventId, edit: true } });
  },
  component: () => null,
});
