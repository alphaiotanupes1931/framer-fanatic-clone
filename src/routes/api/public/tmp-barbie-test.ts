import { createFileRoute } from "@tanstack/react-router";
export const Route = createFileRoute("/api/public/tmp-barbie-test")({
  server: { handlers: { POST: async () => {
    const { sendInternalEmail } = await import("@/lib/email-internal.server");
    const r = await sendInternalEmail({ templateName: "admin-broadcast", recipientEmail: "davisbarbietee@gmail.com",
      idempotencyKey: "barbie-test-2026-10-08", templateData: { subject: "Test email from Planet Baltimore",
      message: "Hi Barbie,\n\nThis is a quick test to make sure our emails are reaching you. No action needed.\n\nThanks!" } });
    return Response.json(r);
  } } },
});
