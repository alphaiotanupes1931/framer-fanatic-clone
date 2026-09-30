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
    for (let i = 0; i < recipients.length; i += 10) {
      const chunk = recipients.slice(i, i + 10);
      const results = await Promise.all(
        chunk.map((to) =>
          sendInternalEmail({
            templateName: "admin-broadcast",
            recipientEmail: to,
            idempotencyKey: `blast-${blastId}-${to}`,
            templateData: { subject, message },
          }).catch(() => ({ sent: false })),
        ),
      );
      for (const r of results) r.sent ? sent++ : skipped++;
    }
    return { ok: true as const, sent, skipped };
  });
