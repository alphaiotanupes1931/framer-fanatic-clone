import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Business staff logins: an owner can hand out a username + password that lets
 * an employee sign in to the business page without the owner's own credentials.
 * A successful staff login is exchanged for a session on the page owner's
 * account, so the employee gets exactly the page's management rights.
 */
export const setStaffLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; username: string; password: string }) => {
    if (!input?.organizationId) throw new Error("organizationId is required");
    const username = (input.username ?? "").trim();
    if (username.length < 3) throw new Error("Username must be at least 3 characters");
    if (!/^[a-zA-Z0-9._-]+$/.test(username)) throw new Error("Username can only use letters, numbers, dots, dashes and underscores");
    if ((input.password ?? "").length < 8) throw new Error("Password must be at least 8 characters");
    return { organizationId: input.organizationId, username, password: input.password };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: org } = await supabase
      .from("organizations")
      .select("id, owner_id")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (!org) throw new Error("Page not found");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (org.owner_id !== userId && !isAdmin) throw new Error("Only the page owner can set staff logins");

    const { hashPassword, newSalt, normalizeUsername } = await import("./staff-login.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const username = normalizeUsername(data.username);
    const salt = newSalt();
    const password_hash = await hashPassword(data.password, salt);

    const { data: existing } = await supabaseAdmin
      .from("organization_staff_logins")
      .select("id, organization_id")
      .ilike("username", username)
      .maybeSingle();

    if (existing && existing.organization_id !== org.id) {
      throw new Error("That username is already taken");
    }

    if (existing) {
      const { error } = await supabaseAdmin
        .from("organization_staff_logins")
        .update({ password_hash, password_salt: salt, username })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabaseAdmin
        .from("organization_staff_logins")
        .insert({ organization_id: org.id, username, password_hash, password_salt: salt, created_by: userId });
      if (error) throw new Error(error.message);
    }
    return { username };
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
      .select("id, username, last_login_at, created_at")
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
    const { error } = await context.supabase.from("organization_staff_logins").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Public: verify staff credentials and return a one-time token the browser
 *  exchanges for a session, plus the page to land on. */
export const staffLogin = createServerFn({ method: "POST" })
  .inputValidator((input: { username: string; password: string }) => {
    if (!input?.username || !input?.password) throw new Error("Enter your username and password");
    return input;
  })
  .handler(async ({ data }) => {
    const { verifyPassword, normalizeUsername } = await import("./staff-login.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const username = normalizeUsername(data.username);
    const { data: row } = await supabaseAdmin
      .from("organization_staff_logins")
      .select("id, organization_id, password_hash, password_salt")
      .ilike("username", username)
      .maybeSingle();

    const invalid = new Error("Incorrect username or password");
    if (!row) throw invalid;
    if (!(await verifyPassword(data.password, row.password_salt, row.password_hash))) throw invalid;

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug, owner_id")
      .eq("id", row.organization_id)
      .maybeSingle();
    if (!org?.owner_id) throw invalid;

    const { data: owner } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", org.owner_id)
      .maybeSingle();
    if (!owner?.email) throw new Error("This page is not ready for staff logins yet");

    const { data: link, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email: owner.email,
    });
    if (linkError || !link?.properties?.hashed_token) {
      throw new Error("Could not start your session. Please try again.");
    }

    await supabaseAdmin
      .from("organization_staff_logins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", row.id);

    return { tokenHash: link.properties.hashed_token, slug: org.slug, name: org.name };
  });
