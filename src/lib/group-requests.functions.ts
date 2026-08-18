import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emails the group owner that someone requested to join. The in-app
 * notification is created by a database trigger; this adds the email.
 * Only callable by a user who actually has a pending request on that group.
 */
export const notifyGroupJoinRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string }) => {
    if (!input?.organizationId) throw new Error("organizationId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: membership } = await supabase
      .from("organization_members")
      .select("status")
      .eq("organization_id", data.organizationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!membership || membership.status !== "pending") return { sent: false };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug, owner_id")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (!org?.owner_id || org.owner_id === userId) return { sent: false };

    const [{ data: owner }, { data: requester }] = await Promise.all([
      supabaseAdmin.from("profiles").select("email").eq("id", org.owner_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("display_name, username").eq("id", userId).maybeSingle(),
    ]);
    if (!owner?.email) return { sent: false };

    const request = getRequest();
    const authHeader = request?.headers.get("authorization") ?? "";
    const origin = new URL(request!.url).origin;

    const res = await fetch(`${origin}/lovable/email/transactional/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({
        templateName: "group-join-request",
        recipientEmail: owner.email,
        idempotencyKey: `group-join-${org.id}-${userId}`,
        templateData: {
          requesterName: requester?.display_name || requester?.username || "Someone",
          groupName: org.name,
          groupUrl: `https://www.planetbaltimore.com/o/${org.slug}`,
        },
      }),
    });
    return { sent: res.ok };
  });
