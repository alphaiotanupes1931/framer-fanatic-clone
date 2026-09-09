import { createFileRoute } from "@tanstack/react-router";
import { profileCompletionSteps, profileCompletionPercent } from "@/lib/profile-completion";

/**
 * Weekly reminder for people whose Planet Baltimore profile is not finished.
 *
 * Runs on a schedule. Each run scores every profile, skips finished ones and
 * anyone already reminded in the last 6 days, and queues a clean summary of
 * what is still missing.
 */

const BATCH = 200;
const SITE = "https://www.planetbaltimore.com";

export const Route = createFileRoute("/api/public/hooks/weekly-profile-reminders")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey") ?? "";
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ?? "";
        if (!expected || apikey !== expected) {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }

        let testEmail: string | null = null;
        try {
          const body = (await request.json()) as { testEmail?: string } | null;
          if (body?.testEmail) testEmail = String(body.testEmail).toLowerCase();
        } catch {
          // no body is fine
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendInternalEmail } = await import("@/lib/email-internal.server");

        let query = supabaseAdmin
          .from("profiles")
          .select("id, email, display_name, username, avatar_url, banner_url, bio, neighborhood, category, website")
          .not("email", "is", null)
          .eq("banned", false);

        if (testEmail) query = query.eq("email", testEmail);

        const { data: profiles, error } = await query.limit(testEmail ? 1 : 2000);
        if (error) {
          console.error("Profile reminder query failed", error);
          return Response.json({ error: "query_failed" }, { status: 500 });
        }

        let rows = profiles ?? [];
        if (rows.length === 0 && testEmail) {
          // Test sends may target an address with no account yet; use sample data.
          rows = [
            {
              id: "test",
              email: testEmail,
              display_name: "Friend",
              username: null,
              avatar_url: null,
              banner_url: null,
              bio: null,
              neighborhood: null,
              category: null,
              website: null,
            },
          ];
        }
        if (rows.length === 0) return Response.json({ scanned: 0, sent: 0 });

        // Who already has a post, so the "first post" step scores correctly.
        const { data: posted } = await supabaseAdmin
          .from("posts")
          .select("user_id")
          .in("user_id", rows.map((r) => r.id))
          .eq("is_deleted", false);
        const withPost = new Set((posted ?? []).map((p) => p.user_id));

        // Skip anyone reminded within the last 6 days.
        const since = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
        const { data: recent } = await supabaseAdmin
          .from("email_send_log")
          .select("recipient_email")
          .eq("template_name", "profile-completion")
          .gte("created_at", since);
        const recentlySent = new Set(
          (recent ?? []).map((r) => (r.recipient_email ?? "").toLowerCase()),
        );

        let sent = 0;
        let skipped = 0;

        for (const p of rows) {
          if (sent >= BATCH) break;
          const email = (p.email ?? "").toLowerCase();
          if (!email) continue;

          const extras = { hasPost: withPost.has(p.id) };
          const percent = profileCompletionPercent(p, extras);
          if (percent >= 100 && !testEmail) { skipped++; continue; }
          if (!testEmail && recentlySent.has(email)) { skipped++; continue; }

          const missing = profileCompletionSteps(p, extras)
            .filter((s) => !s.done)
            .map((s) => ({ label: s.label, hint: s.hint }));

          const week = new Date().toISOString().slice(0, 10);
          const result = await sendInternalEmail({
            templateName: "profile-completion",
            recipientEmail: email,
            idempotencyKey: `profile-completion-${p.id}-${testEmail ? Date.now() : week}`,
            templateData: {
              name: (p.display_name || p.username || "there").split(" ")[0],
              percent,
              missing,
              profileUrl: `${SITE}/edit-profile`,
            },
          });
          if (result.sent) sent++; else skipped++;
        }

        return Response.json({ scanned: rows.length, sent, skipped });
      },
    },
  },
});
