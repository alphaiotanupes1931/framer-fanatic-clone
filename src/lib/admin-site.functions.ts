import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";

type GateSession = { unlocked?: boolean };

function sessionConfig() {
  return {
    password: process.env.ADMIN_SESSION_SECRET!,
    name: "pb-admin-gate",
    maxAge: 60 * 60 * 24 * 7,
    cookie: {
      httpOnly: true,
      secure: true,
      // The published site and the editor preview both embed the app inside
      // a cross-site iframe. SameSite=Lax cookies are blocked in that
      // context, so the session cookie would be set but never sent back.
      sameSite: "none" as const,
      path: "/",
    },
  };
}

function matches(input: string, expected: string): boolean {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export const unlockAdminSite = createServerFn({ method: "POST" })
  .inputValidator((data: { username: string; password: string }) => data)
  .handler(async ({ data }) => {
    const expectedUser = process.env.ADMIN_SHARED_USERNAME;
    const expectedPass = process.env.ADMIN_SHARED_PASSWORD;
    if (!expectedUser || !expectedPass) {
      throw new Error("Admin credentials are not configured");
    }
    const userOk = matches(data.username.trim().toLowerCase(), expectedUser.trim().toLowerCase());
    const passOk = matches(data.password.trim(), expectedPass.trim());
    if (!userOk || !passOk) return { ok: false as const };
    const session = await useSession<GateSession>(sessionConfig());
    await session.update({ unlocked: true });
    return { ok: true as const };
  });

export const lockAdminSite = createServerFn({ method: "POST" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  await session.clear();
  return { ok: true as const };
});

export const isAdminSiteUnlocked = createServerFn({ method: "GET" }).handler(async () => {
  const session = await useSession<GateSession>(sessionConfig());
  return { unlocked: !!session.data.unlocked };
});

export const saveSiteContent = createServerFn({ method: "POST" })
  .inputValidator((data: { rows: { key: string; value: string }[] }) => data)
  .handler(async ({ data }) => {
    const session = await useSession<GateSession>(sessionConfig());
    if (!session.data.unlocked) {
      throw new Error("Admin gate is locked");
    }
    const clean = data.rows
      .filter((r) => typeof r.key === "string" && r.key.length > 0 && r.key.length < 200)
      .map((r) => ({ key: r.key, value: String(r.value ?? "") }));
    if (clean.length === 0) return { ok: true as const, count: 0 };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("site_content")
      .upsert(clean, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true as const, count: clean.length };
  });