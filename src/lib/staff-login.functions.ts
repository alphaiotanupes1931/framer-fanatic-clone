import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED = new Set<string>(["business", "arts_org", "community_assoc"]);

function newCode() {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(100000 + ((n[0] ?? 0) % 900000));
}

/** Sends the six digit verification code to a staff email. Never throws. */
async function sendStaffCode(email: string, code: string, pageName: string) {
  try {
    const { sendTemplateEmail } = await import("./email-templates/send-email");
    await sendTemplateEmail("staff-login-verify", email, { templateData: { code, pageName } });
  } catch (e) {
    console.error("Could not send staff verification email", e);
  }
}

/** Plain-language reason an email is not usable, or null when it looks fine. */
export function staffEmailProblem(raw: string): string | null {
  const email = (raw ?? "").trim();
  if (!email) return "Enter the staff email address";
  if (/\s/.test(email)) return "Email addresses cannot contain spaces";
  const ats = (email.match(/@/g) ?? []).length;
  if (ats === 0) return "An email needs an @ sign, like name@example.com";
  if (ats > 1) return "An email can only have one @ sign. Did you mean " + email.replace(/@(?=.*@)/g, ".") + "?";
  const [local, domain] = email.split("@");
  if (!local) return "Add the part before the @ sign";
  if (!domain || !domain.includes(".")) return "Add the domain after the @ sign, like gmail.com";
  if (!EMAIL_RE.test(email)) return "That does not look like a valid email address";
  return null;
}

const PRE_VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/** Looks an address up in the auth directory. Returns null when nothing matches. */
async function authUserByEmail(email: string): Promise<{ id: string } | null> {
  try {
    const base = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!base || !key) return null;
    const res = await fetch(`${base}/auth/v1/admin/users?filter=${encodeURIComponent(email)}&per_page=20`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { users?: Array<{ id: string; email?: string }> };
    const hit = (body.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());
    return hit ? { id: hit.id } : null;
  } catch {
    return null;
  }
}

/**
 * Plain-language reason this address cannot be used for a staff login, or null.
 * `allowUserId` is the auth account already attached to the login being edited.
 */
async function emailInUseReason(email: string, allowUserId?: string | null): Promise<string | null> {
  const found = await authUserByEmail(email);
  if (found && found.id !== allowUserId) {
    return "That email is already used by an account on Planet Baltimore. Pick a different staff email.";
  }
  return null;
}

/**
 * Owner-side: send a verification code to a staff email before the page is
 * created, so the email can be confirmed right on the create form.
 */
export const startStaffEmailVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; pageName?: string }) => {
    const email = (input?.email ?? "").trim().toLowerCase();
    const problem = staffEmailProblem(email);
    if (problem) throw new Error(problem);
    return { email, pageName: (input.pageName ?? "").trim().slice(0, 120) };
  })
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fail early if this email is already a staff login somewhere else.
    const { data: taken } = await supabaseAdmin
      .from("organization_staff_logins")
      .select("id, organization_id")
      .ilike("username", data.email)
      .maybeSingle();
    if (taken) throw new Error("That email is already used as a staff login for another page. Use a different staff email.");

    // And it cannot belong to any existing account either.
    const inUse = await emailInUseReason(data.email);
    if (inUse) throw new Error(inUse);

    const code = newCode();
    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
    const { data: existing } = await supabaseAdmin
      .from("staff_email_verifications")
      .select("id")
      .eq("user_id", userId)
      .ilike("email", data.email)
      .maybeSingle();
    const patch = { code, expires_at: expires, verified_at: null, updated_at: now.toISOString() };
    const { error } = existing
      ? await supabaseAdmin.from("staff_email_verifications").update(patch).eq("id", existing.id)
      : await supabaseAdmin.from("staff_email_verifications").insert({ user_id: userId, email: data.email, ...patch });
    if (error) throw new Error(error.message);
    await sendStaffCode(data.email, code, data.pageName || "your page");
    return { sent: true };
  });

/** Owner-side: confirm the code that was sent before the page exists. */
export const confirmStaffEmailVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { email: string; code: string }) => {
    const email = (input?.email ?? "").trim().toLowerCase();
    const code = (input?.code ?? "").trim();
    if (!EMAIL_RE.test(email)) throw new Error("Enter the staff email address");
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6 digit code from the email");
    return { email, code };
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("staff_email_verifications")
      .select("id, code, expires_at, verified_at")
      .eq("user_id", context.userId)
      .ilike("email", data.email)
      .maybeSingle();
    if (!row) throw new Error("Send the code first, then enter it here");
    if (row.verified_at) return { verified: true };
    if (!row.code || row.code !== data.code) throw new Error("That code is not correct");
    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      throw new Error("That code has expired. Send a new one.");
    }
    const { error } = await supabaseAdmin
      .from("staff_email_verifications")
      .update({ verified_at: new Date().toISOString(), code: null, expires_at: null, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return { verified: true };
  });

/**
 * Business staff logins use separate auth identities. Staff can manage only
 * the business page they were assigned to, never the owner's account.
 */
export const setStaffLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; username: string; password: string; replaceId?: string }) => {
    if (!input?.organizationId) throw new Error("organizationId is required");
    const email = (input.username ?? "").trim().toLowerCase();
    const problem = staffEmailProblem(email);
    if (problem) throw new Error(problem);
    if ((input.password ?? "").length < 8) throw new Error("Password must be at least 8 characters");
    return { organizationId: input.organizationId, email, password: input.password, replaceId: input.replaceId ?? null };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: org } = await supabase
      .from("organizations")
      .select("id, owner_id, type, name")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (!org || !ALLOWED.has(org.type)) {
      throw new Error("Only business, arts organization and community association pages can have staff logins");
    }

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (org.owner_id !== userId && !isAdmin) throw new Error("Only the page owner can set staff logins");

    const { hashPassword, newSalt } = await import("./staff-login.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const salt = newSalt();
    const password_hash = await hashPassword(data.password, salt);

    // Was this email already confirmed on the create form (within the last day)?
    const { data: pre } = await supabaseAdmin
      .from("staff_email_verifications")
      .select("id, verified_at")
      .eq("user_id", userId)
      .ilike("email", data.email)
      .maybeSingle();
    const preVerified = !!pre?.verified_at && Date.now() - new Date(pre.verified_at).getTime() < PRE_VERIFY_TTL_MS;

    const code = preVerified ? null : newCode();
    const expires = preVerified ? null : new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const verifiedAt = preVerified ? new Date().toISOString() : null;

    const { data: byEmail } = await supabaseAdmin
      .from("organization_staff_logins")
      .select("id, organization_id, staff_user_id")
      .ilike("username", data.email)
      .maybeSingle();

    if (byEmail && byEmail.organization_id !== org.id) {
      throw new Error("That email is already used for another page");
    }

    // Changing the email on an existing staff login: keep the same record so the
    // old address stops working, and make the new address prove itself again.
    let replacing: { id: string; organization_id: string; staff_user_id: string | null } | null = null;
    if (!byEmail && data.replaceId) {
      const { data: row } = await supabaseAdmin
        .from("organization_staff_logins")
        .select("id, organization_id, staff_user_id")
        .eq("id", data.replaceId)
        .maybeSingle();
      if (row && row.organization_id === org.id) replacing = row;
    }
    const existing = byEmail ?? replacing;

    // Block addresses that already belong to somebody's account.
    const inUse = await emailInUseReason(data.email, existing?.staff_user_id ?? null);
    if (inUse) throw new Error(inUse);

    let staffUserId = existing?.staff_user_id ?? null;
    if (staffUserId) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(staffUserId, {
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (error) throw new Error("Could not update the staff account");
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });
      if (error || !created.user) {
        throw new Error(error?.message?.toLowerCase().includes("already")
          ? "That email already has an account. Use a different staff email."
          : "Could not create the staff account");
      }
      staffUserId = created.user.id;
    }

    if (existing) {
      const { error } = await supabaseAdmin
        .from("organization_staff_logins")
        .update({
          password_hash,
          password_salt: salt,
          username: data.email,
          staff_user_id: staffUserId,
          email_verified: preVerified,
          verified_at: verifiedAt,
          verification_code: code,
          verification_expires_at: expires,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("organization_staff_logins")
        .insert({
          organization_id: org.id,
          username: data.email,
          password_hash,
          password_salt: salt,
          created_by: userId,
          staff_user_id: staffUserId,
          email_verified: preVerified,
          verified_at: verifiedAt,
          verification_code: code,
          verification_expires_at: expires,
        });
      if (error) throw new Error(error.message);
    }
    if (preVerified) {
      await supabaseAdmin.from("staff_email_verifications").delete().eq("id", pre!.id);
      return { username: data.email, needsVerification: false };
    }
    await sendStaffCode(data.email, code!, org.name ?? "your page");
    return { username: data.email, needsVerification: true };
  });

export const listStaffLogins = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string }) => {
    if (!input?.organizationId) throw new Error("organizationId is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("organization_staff_logins")
      .select("id, username, last_login_at, created_at, email_verified")
      .eq("organization_id", data.organizationId)
      .order("created_at");
    return rows ?? [];
  });

export const deleteStaffLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("id is required");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("organization_staff_logins")
      .select("id, staff_user_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row) return { ok: true };

    const { error } = await context.supabase.from("organization_staff_logins").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    if (row.staff_user_id) {
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(row.staff_user_id);
      if (deleteError) console.error("Could not delete staff auth account", deleteError.message);
    }
    return { ok: true };
  });

/** Public: validate a staff credential and return its assigned business page. */
export const staffLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => {
    const email = (input?.username ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email) || !input?.password) throw new Error("Enter your staff email and password");
    return { email, password: input.password };
  })
  .handler(async ({ data }) => {
    const { verifyPassword } = await import("./staff-login.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row } = await supabaseAdmin
      .from("organization_staff_logins")
      .select("id, organization_id, password_hash, password_salt, staff_user_id, email_verified")
      .ilike("username", data.email)
      .maybeSingle();

    const invalid = new Error("Incorrect staff email or password");
    if (!row?.staff_user_id) throw invalid;
    if (!(await verifyPassword(data.password, row.password_salt, row.password_hash))) throw invalid;
    if (!row.email_verified) {
      throw new Error("This staff email is not verified yet. Check your inbox for the code, or ask the page owner to resend it.");
    }

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug, owner_id, type")
      .eq("id", row.organization_id)
      .maybeSingle();
    if (!org?.owner_id || !ALLOWED.has(org.type)) throw invalid;

    const { error } = await supabaseAdmin
      .from("organization_staff_logins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) console.error("Could not record staff login", error.message);

    return { slug: org.slug, name: org.name, type: org.type, email: data.email };
  });


/** Public: confirm a staff email with the emailed six digit code. */
export const verifyStaffEmail = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; code: string }) => {
    const email = (input?.email ?? "").trim().toLowerCase();
    const code = (input?.code ?? "").trim();
    if (!EMAIL_RE.test(email)) throw new Error("Enter the staff email address");
    if (!/^\d{6}$/.test(code)) throw new Error("Enter the 6 digit code from the email");
    return { email, code };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("organization_staff_logins")
      .select("id, verification_code, verification_expires_at, email_verified")
      .ilike("username", data.email)
      .maybeSingle();
    if (!row) throw new Error("We could not find that staff email");
    if (row.email_verified) return { verified: true };
    if (!row.verification_code || row.verification_code !== data.code) throw new Error("That code is not correct");
    if (row.verification_expires_at && new Date(row.verification_expires_at).getTime() < Date.now()) {
      throw new Error("That code has expired. Ask for a new one.");
    }
    const { error } = await supabaseAdmin
      .from("organization_staff_logins")
      .update({ email_verified: true, verified_at: new Date().toISOString(), verification_code: null, verification_expires_at: null })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    return { verified: true };
  });

/** Owner only: send a fresh verification code to a staff email. */
export const resendStaffVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; email: string }) => {
    const email = (input?.email ?? "").trim().toLowerCase();
    if (!input?.organizationId) throw new Error("organizationId is required");
    if (!EMAIL_RE.test(email)) throw new Error("Enter the staff email address");
    return { organizationId: input.organizationId, email };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: org } = await supabase
      .from("organizations")
      .select("id, owner_id, name")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (!org) throw new Error("Page not found");
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (org.owner_id !== userId && !isAdmin) throw new Error("Only the page owner can resend this");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("organization_staff_logins")
      .select("id, email_verified")
      .eq("organization_id", org.id)
      .ilike("username", data.email)
      .maybeSingle();
    if (!row) throw new Error("We could not find that staff email");
    if (row.email_verified) return { sent: false, alreadyVerified: true };

    const code = newCode();
    const { error } = await supabaseAdmin
      .from("organization_staff_logins")
      .update({ verification_code: code, verification_expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString() })
      .eq("id", row.id);
    if (error) throw new Error(error.message);
    await sendStaffCode(data.email, code, org.name ?? "your page");
    return { sent: true, alreadyVerified: false };
  });

/**
 * Public pre-signup check: returns a plain-language reason this email cannot
 * be used for a new account (already a staff login or an existing account),
 * or null when it is available. Never reveals which kind of account exists
 * beyond "already in use".
 */
export const signupEmailProblem = createServerFn({ method: "GET" })
  .inputValidator((data) => {
    const email = String((data as { email?: string } | null)?.email ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address");
    return { email };
  })
  .handler(async ({ data }) => {
    const found = await authUserByEmail(data.email);
    if (found) return "That email is already in use. Try signing in instead.";
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: staff } = await supabaseAdmin
      .from("organization_staff_logins")
      .select("id")
      .ilike("username", data.email)
      .maybeSingle();
    if (staff) return "That email is already in use as a staff login. Sign in on the staff login page.";
    return null;
  });
