import { createServerFn } from "@tanstack/react-start";
import { hasAdminAccess } from "./admin-session.server";

export type EmailGroupKey =
  | "business"
  | "arts_org"
  | "artist"
  | "community_assoc"
  | "group"
  | "resident_members"
  | "visitor_members";

export type GroupRecipient = { email: string; name: string; groups: EmailGroupKey[]; blocked: boolean };

const ORG_TYPES: EmailGroupKey[] = ["business", "arts_org", "artist", "community_assoc", "group"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const listEmailGroupRecipients = createServerFn({ method: "POST" })
  .inputValidator((data: { adminToken?: string | null }) => data)
  .handler(async ({ data }) => {
    if (!(await hasAdminAccess(data.adminToken))) throw new Error("Admin gate is locked");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Account emails for every user.
    const accountEmail = new Map<string, string>();
    for (let page = 1; page < 50; page++) {
      const { data: res, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw new Error(error.message);
      for (const u of res.users) if (u.email) accountEmail.set(u.id, u.email);
      if (res.users.length < 1000) break;
    }

    const [{ data: orgs, error: orgErr }, { data: profiles, error: profErr }, { data: blocked }] = await Promise.all([
      supabaseAdmin.from("organizations").select("owner_id, type, name, email"),
      supabaseAdmin.from("profiles").select("id, role, display_name"),
      supabaseAdmin.from("suppressed_emails").select("email"),
    ]);
    if (orgErr) throw new Error(orgErr.message);
    if (profErr) throw new Error(profErr.message);
    const blockedSet = new Set((blocked ?? []).map((b) => String(b.email).toLowerCase()));

    const map = new Map<string, GroupRecipient>();
    const add = (raw: string | null | undefined, name: string, group: EmailGroupKey) => {
      const email = (raw ?? "").trim().toLowerCase();
      if (!EMAIL_RE.test(email)) return;
      const cur = map.get(email);
      if (cur) {
        if (!cur.groups.includes(group)) cur.groups.push(group);
        if (!cur.name && name) cur.name = name;
      } else {
        map.set(email, { email, name, groups: [group], blocked: blockedSet.has(email) });
      }
    };

    for (const o of orgs ?? []) {
      const t = o.type as EmailGroupKey;
      if (!ORG_TYPES.includes(t)) continue;
      add(o.email, o.name ?? "", t);
      add(accountEmail.get(o.owner_id as string), o.name ?? "", t);
    }
    for (const p of profiles ?? []) {
      const g: EmailGroupKey | null =
        p.role === "resident" ? "resident_members" : p.role === "visitor" ? "visitor_members" : null;
      if (g) add(accountEmail.get(p.id), p.display_name ?? "", g);
    }

    return { recipients: [...map.values()].sort((a, b) => a.email.localeCompare(b.email)) };
  });

export const sendEmailBlast = createServerFn({ method: "POST" })
  .inputValidator(
    (data: { adminToken?: string | null; subject: string; message: string; recipients: string[] }) => data,
  )
  .handler(async ({ data }) => {
    if (!(await hasAdminAccess(data.adminToken))) throw new Error("Admin gate is locked");
    const subject = String(data.subject ?? "").trim().slice(0, 200);
    const message = String(data.message ?? "").trim().slice(0, 20000);
    if (!subject || !message) throw new Error("Subject and message are required");
    const recipients = [
      ...new Set((data.recipients ?? []).map((e) => String(e).trim().toLowerCase()).filter((e) => EMAIL_RE.test(e))),
    ].slice(0, 5000);
    if (recipients.length === 0) throw new Error("No recipients selected");

    const { sendInternalEmail } = await import("./email-internal.server");
    const blastId = crypto.randomUUID();
    let sent = 0;
    let skipped = 0;
    // Provider allows ~100 emails/hour, so release 100 per hour.
    const PER_HOUR = 100;
    for (let i = 0; i < recipients.length; i += 6) {
      const chunk = recipients.slice(i, i + 6);
      const results = await Promise.all(
        chunk.map((to, j) =>
          sendInternalEmail({
            templateName: "admin-broadcast",
            recipientEmail: to,
            idempotencyKey: `blast-${blastId}-${to}`,
            templateData: { subject, message },
            delaySeconds: Math.floor((i + j) / PER_HOUR) * 3600,
          }).catch(() => ({ sent: false })),
        ),
      );
      for (const r of results) r.sent ? sent++ : skipped++;
    }
    return { ok: true as const, sent, skipped, hours: Math.ceil(recipients.length / PER_HOUR) };
  });

// Provider sends about 100 emails per hour, so a full day allows about 2,400.
export const EMAIL_HOURLY_CAP = 100;
export const EMAIL_DAILY_CAP = EMAIL_HOURLY_CAP * 24;

export const getEmailUsage = createServerFn({ method: "POST" })
  .inputValidator((data: { adminToken?: string | null }) => data)
  .handler(async ({ data }) => {
    if (!(await hasAdminAccess(data.adminToken))) throw new Error("Admin gate is locked");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date();
    const ny = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const startOfDay = new Date(now.getTime() - ((ny.getHours() * 60 + ny.getMinutes()) * 60 + ny.getSeconds()) * 1000);
    const hourAgo = now.getTime() - 3600_000;
    const ids = new Map<string, number>();
    for (let from = 0; from < 50000; from += 1000) {
      const { data: rows, error } = await supabaseAdmin
        .from("email_send_log")
        .select("message_id, created_at, status")
        .gte("created_at", startOfDay.toISOString())
        .in("status", ["sent", "pending"])
        .range(from, from + 999);
      if (error) throw new Error(error.message);
      for (const r of rows ?? []) {
        const t = new Date(r.created_at as string).getTime();
        const k = String(r.message_id ?? t);
        ids.set(k, Math.max(ids.get(k) ?? 0, t));
      }
      if ((rows ?? []).length < 1000) break;
    }
    const today = ids.size;
    const lastHour = [...ids.values()].filter((t) => t >= hourAgo).length;
    return {
      sentToday: today,
      leftToday: Math.max(0, EMAIL_DAILY_CAP - today),
      dailyCap: EMAIL_DAILY_CAP,
      leftThisHour: Math.max(0, EMAIL_HOURLY_CAP - lastHour),
      hourlyCap: EMAIL_HOURLY_CAP,
    };
  });
