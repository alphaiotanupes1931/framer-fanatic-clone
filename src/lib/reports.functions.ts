import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PATHS: Record<string, (id: string) => string> = {
  post: (id) => `/posts/${id}`,
  story: (id) => `/stories/${id}`,
  event: (id) => `/events/${id}`,
  user: (id) => `/u/${id}`,
  comment: () => `/reports`,
  message: () => `/reports`,
};

/**
 * Emails the moderation inbox after a member files a content report.
 * Only the reporter who filed the report can trigger this.
 */
export const notifyContentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { reportId: string }) => {
    if (!input?.reportId) throw new Error("reportId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: report } = await supabase
      .from("content_reports")
      .select("id, content_type, content_id, reason, details, reporter_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report || report.reporter_id !== userId) return { sent: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: reporter } = await supabaseAdmin
      .from("profiles")
      .select("display_name, username, email")
      .eq("id", userId)
      .maybeSingle();

    const request = getRequest();
    const authHeader = request?.headers.get("authorization") ?? "";
    const origin = new URL(request!.url).origin;
    const site = "https://www.planetbaltimore.com";
    const path = (PATHS[report.content_type] ?? (() => "/reports"))(report.content_id);

    const res = await fetch(`${origin}/lovable/email/transactional/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        templateName: "content-report",
        recipientEmail: "ainsleyburrows7@gmail.com",
        idempotencyKey: `content-report-${report.id}`,
        templateData: {
          reporterName: reporter?.display_name || reporter?.username || reporter?.email || "A member",
          contentType: report.content_type,
          contentId: report.content_id,
          reason: report.reason,
          details: report.details ?? "",
          contentUrl: `${site}${path}`,
          reviewUrl: `${site}/reports`,
        },
      }),
    });
    return { sent: res.ok };
  });
