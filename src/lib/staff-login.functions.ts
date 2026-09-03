import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Business staff logins use separate auth identities. Staff can manage only
 * the business page they were assigned to, never the owner's account.
 */
export const setStaffLogin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { organizationId: string; username: string; password: string }) => {
    if (!input?.organizationId) throw new Error("organizationId is required");
    const email = (input.username ?? "").trim().toLowerCase();
    if (!EMAIL_RE.test(email)) throw new Error("Enter a valid email address");
    if ((input.password ?? "").length < 8) throw new Error("Password must be at least 8 characters");
    return { organizationId: input.organizationId, email, password: input.password };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: org } = await supabase
      .from("organizations")
      .select("id, owner_id, type")
      .eq("id", data.organizationId)
      .maybeSingle();
    if (!org || org.type !== "business") throw new Error("Only business pages can have staff logins");

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (org.owner_id !== userId && !isAdmin) throw new Error("Only the business owner can set staff logins");

    const { hashPassword, newSalt } = await import("./staff-login.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const salt = newSalt();
    const password_hash = await hashPassword(data.password, salt);

    const { data: existing } = await supabaseAdmin
      .from("organization_staff_logins")
      .select("id, organization_id, staff_user_id")
      .ilike("username", data.email)
      .maybeSingle();

    if (existing && existing.organization_id !== org.id) {
      throw new Error("That email is already used for another business page");
    }

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
        .update({ password_hash, password_salt: salt, username: data.email, staff_user_id: staffUserId })
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
        });
      if (error) throw new Error(error.message);
    }
    return { username: data.email };
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
      .select("id, organization_id, password_hash, password_salt, staff_user_id")
      .ilike("username", data.email)
      .maybeSingle();

    const invalid = new Error("Incorrect staff email or password");
    if (!row?.staff_user_id) throw invalid;
    if (!(await verifyPassword(data.password, row.password_salt, row.password_hash))) throw invalid;

    const { data: org } = await supabaseAdmin
      .from("organizations")
      .select("id, name, slug, owner_id, type")
      .eq("id", row.organization_id)
      .maybeSingle();
    if (!org?.owner_id || org.type !== "business") throw invalid;

    const { error } = await supabaseAdmin
      .from("organization_staff_logins")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", row.id);
    if (error) console.error("Could not record staff login", error.message);

    return { slug: org.slug, name: org.name, email: data.email };
  });
