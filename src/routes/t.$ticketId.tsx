import { createFileRoute, useParams } from "@tanstack/react-router";
import { TicketVerifyView } from "@/components/tickets/ticket-verify-view";

export const Route = createFileRoute("/t/$ticketId")({
  component: TicketVerifyPage,
  head: () => ({
    meta: [
      { title: "Ticket Verification - Planet Baltimore" },
      { name: "description", content: "Scan-to-verify digital event ticket." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function TicketVerifyPage() {
  const { ticketId } = useParams({ from: "/t/$ticketId" });
  return <TicketVerifyView ticketId={ticketId} />;
}
