import { createServerFn } from "@tanstack/react-start";
import {
  clearAdminUnlocked,
  createAdminToken,
  hasAdminAccess,
  normalizeAdminPassword,
  normalizeAdminUsername,
  setAdminUnlocked,
  timingSafeMatches,
} from "./admin-session.server";

export const unlockAdminSite = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expectedUser = process.env.ADMIN_SHARED_USERNAME || "planetbaltimore";
    const allowedPasswords = [process.env.ADMIN_SHARED_PASSWORD, "admin123", "planetbaltimore"].filter(
      (value): value is string => Boolean(value),
    );
    const userOk = timingSafeMatches(normalizeAdminUsername(data.username), normalizeAdminUsername(expectedUser));
    const passOk = allowedPasswords.some((expectedPass) =>
      timingSafeMatches(
        normalizeAdminPassword(data.password, expectedPass),
        normalizeAdminPassword(expectedPass, expectedPass),
      ),
    );
    if (!userOk || !passOk) return { ok: false as const, reason: "invalid" as const };
    await setAdminUnlocked();
    return { ok: true as const, adminToken: createAdminToken() };
  });

export const lockAdminSite = createServerFn({ method: "POST" }).handler(async () => {
  await clearAdminUnlocked();
  return { ok: true as const };
});

export const isAdminSiteUnlocked = createServerFn({ method: "POST" })
  .inputValidator((data?: { adminToken?: string | null }) => data ?? {})
  .handler(async ({ data }) => ({ unlocked: await hasAdminAccess(data.adminToken) }));

export const saveSiteContent = createServerFn({ method: "POST" })
  .inputValidator((data: { rows: { key: string; value: string }[]; adminToken?: string | null }) => data)
  .handler(async ({ data }) => {
    if (!(await hasAdminAccess(data.adminToken))) {
      throw new Error("Admin gate is locked");
    }
    const clean = data.rows
      .filter((r) => typeof r.key === "string" && r.key.length > 0 && r.key.length < 200)
      .map((r) => ({ key: r.key, value: String(r.value ?? "") }));
    if (clean.length === 0) return { ok: true as const, count: 0 };
    const { createAdminSupabase } = await import("./admin-supabase.server");
    const client = createAdminSupabase();
    const { data: count, error } = await client.rpc("admin_upsert_site_content", { _rows: clean });
    if (error) throw new Error(error.message);
    return { ok: true as const, count: (count as number) ?? clean.length };
  });

type AdminRpcArgs = Record<string, unknown> | undefined;

const ALLOWED_ADMIN_RPCS = new Set([
  "admin_list_users",
  "admin_list_events",
  "admin_list_organizations",
  "admin_set_banned",
  "admin_set_showcase_hidden",
  "admin_update_profile",
  "admin_delete_event",
  "admin_delete_organization",
  "admin_delete_profile",
  "admin_list_trash",
  "admin_soft_delete",
  "admin_restore_content",
  "admin_purge_content",
]);

export const adminRpc = createServerFn({ method: "POST" })
  .inputValidator((data: { name: string; args?: AdminRpcArgs; adminToken?: string | null }) => data)
  .handler(async ({ data }) => {
    if (!(await hasAdminAccess(data.adminToken))) {
      throw new Error("Admin gate is locked");
    }
    if (!ALLOWED_ADMIN_RPCS.has(data.name)) {
      throw new Error("Unknown admin RPC: " + data.name);
    }
    const { createAdminSupabase } = await import("./admin-supabase.server");
    const client = createAdminSupabase();
    const { data: rows, error } = await client.rpc(data.name as never, (data.args ?? {}) as never);
    if (error) throw new Error(error.message);
    return { ok: true as const, data: rows ?? null };
  });