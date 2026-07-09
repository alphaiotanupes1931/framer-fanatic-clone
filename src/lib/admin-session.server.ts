import { useSession } from "@tanstack/react-start/server";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export type GateSession = { unlocked?: boolean };

const SESSION_NAME = "pb-admin-gate";
const ADMIN_TOKEN_SCOPE = "pb-admin";
const ADMIN_TOKEN_MAX_AGE = 60 * 60 * 24 * 7;

export function adminSessionConfig() {
  return {
    password: process.env.ADMIN_SESSION_SECRET || "pb-admin-dev-fallback-secret-please-change",
    name: SESSION_NAME,
    maxAge: ADMIN_TOKEN_MAX_AGE,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none" as const,
      partitioned: true,
      path: "/",
    },
  };
}

export function normalizeAdminUsername(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/[\s._-]+/g, "")
    .toLowerCase();
}

export function normalizeAdminPassword(value: string, expectedValue = "") {
  const normalized = value
    .normalize("NFKC")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u00a0/g, " ")
    .trim();

  return /\s/.test(expectedValue) ? normalized : normalized.replace(/\s+/g, "");
}

export function timingSafeMatches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

function tokenSecret() {
  return process.env.ADMIN_SESSION_SECRET || "pb-admin-dev-fallback-secret-please-change";
}

function signPayload(payload: string) {
  return createHmac("sha256", tokenSecret()).update(payload, "utf8").digest("base64url");
}

function safeStringMatches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

export function createAdminToken() {
  const payload = Buffer.from(
    JSON.stringify({ scope: ADMIN_TOKEN_SCOPE, exp: Math.floor(Date.now() / 1000) + ADMIN_TOKEN_MAX_AGE }),
    "utf8",
  ).toString("base64url");
  return `${payload}.${signPayload(payload)}`;
}

export function verifyAdminToken(token?: string | null) {
  if (!token || typeof token !== "string") return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [payload, signature] = parts;
  if (!payload || !signature || !safeStringMatches(signature, signPayload(payload))) return false;

  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      scope?: string;
      exp?: number;
    };
    return parsed.scope === ADMIN_TOKEN_SCOPE && typeof parsed.exp === "number" && parsed.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function setAdminUnlocked() {
  const session = await useSession<GateSession>(adminSessionConfig());
  await session.update({ unlocked: true });
}

export async function clearAdminUnlocked() {
  const session = await useSession<GateSession>(adminSessionConfig());
  await session.clear();
}

export async function hasAdminAccess(adminToken?: string | null) {
  const session = await useSession<GateSession>(adminSessionConfig());
  return !!session.data.unlocked || verifyAdminToken(adminToken);
}