import { createHmac, randomBytes, randomInt, scryptSync, timingSafeEqual, createHash } from "crypto";
import { cookies } from "next/headers";
import { kvDel, kvGet, kvSet, listAll, saveAll } from "./store";

export type Admin = {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  createdAt: string;
};

const COOKIE = "vr_admin";
const SESSION_DAYS = 7;

function secret() {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 16) return s;
  // Fallback keeps dev working; production should always set SESSION_SECRET.
  return createHash("sha256").update(`visa-review:${process.env.ADMIN_EMAIL ?? ""}:${process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN ?? "local-dev"}`).digest("hex");
}

export function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(pw, salt, 64).toString("hex")}`;
}
export function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = scryptSync(pw, salt, 64);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * First-admin setup rules. In production the setup form ALWAYS needs ADMIN_SETUP_KEY (12+ chars);
 * without it setup is switched off and the first admin must come from ADMIN_EMAIL / ADMIN_PASSWORD.
 * After that, only signed-in admins can add admins (Admin users tab).
 */
export function setupPolicy() {
  const key = process.env.ADMIN_SETUP_KEY ?? "";
  const prod = process.env.NODE_ENV === "production";
  return { allowed: !prod || key.length >= 12, keyRequired: key.length > 0 || prod, key };
}

export const normEmail =(e: string) => e.trim().toLowerCase();
export const normPhone = (p: string) => p.replace(/[^\d+]/g, "");

export async function getAdmins(): Promise<Admin[]> {
  const admins = await listAll<Admin>("admins");
  if (admins.length === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
    // Deterministic id so every server instance (and every restart) agrees on the same admin,
    // otherwise a session created on one instance would be unknown on another.
    const seeded: Admin = {
      id: `env-${createHash("sha256").update(normEmail(process.env.ADMIN_EMAIL)).digest("hex").slice(0, 24)}`,
      name: "Administrator",
      email: normEmail(process.env.ADMIN_EMAIL),
      phone: normPhone(process.env.ADMIN_PHONE ?? ""),
      passwordHash: hashPassword(process.env.ADMIN_PASSWORD),
      createdAt: new Date().toISOString(),
    };
    await saveAll("admins", [seeded]);
    return [seeded];
  }
  return admins;
}

export async function findAdmin(identifier: string) {
  const admins = await getAdmins();
  const e = normEmail(identifier);
  const p = normPhone(identifier);
  return admins.find((a) => a.email === e || (p.length >= 6 && a.phone === p));
}

export async function saveAdmin(admin: Admin) {
  const admins = await getAdmins();
  const i = admins.findIndex((a) => a.id === admin.id);
  if (i >= 0) admins[i] = admin;
  else admins.push(admin);
  await saveAll("admins", admins);
}

// ---------- sessions (HMAC-signed cookie) ----------
function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export async function createSession(adminId: string) {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const payload = Buffer.from(JSON.stringify({ id: adminId, exp })).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSessionAdmin(): Promise<Admin | null> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (expected.length !== sig.length || !timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  try {
    const { id, exp } = JSON.parse(Buffer.from(payload, "base64url").toString()) as { id: string; exp: number };
    if (Date.now() > exp) return null;
    return (await getAdmins()).find((a) => a.id === id) ?? null;
  } catch {
    return null;
  }
}

export function publicAdmin(a: Admin) {
  return { id: a.id, name: a.name, email: a.email, phone: a.phone };
}

export function unauthorized() {
  return Response.json({ error: "Not signed in" }, { status: 401 });
}

// ---------- password reset codes ----------
type ResetRecord = { adminId: string; codeHash: string; exp: number; attempts: number };
const codeHash = (code: string) => createHmac("sha256", secret()).update(code).digest("hex");

export async function createResetCode(adminId: string) {
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await kvSet(`reset:${adminId}`, { adminId, codeHash: codeHash(code), exp: Date.now() + 10 * 60000, attempts: 0 } satisfies ResetRecord, 600);
  return code;
}

export async function verifyResetCode(adminId: string, code: string): Promise<"ok" | "invalid" | "expired" | "locked"> {
  const rec = await kvGet<ResetRecord>(`reset:${adminId}`);
  if (!rec || Date.now() > rec.exp) return "expired";
  if (rec.attempts >= 5) return "locked";
  const a = Buffer.from(rec.codeHash);
  const b = Buffer.from(codeHash(code.trim()));
  if (a.length === b.length && timingSafeEqual(a, b)) {
    await kvDel(`reset:${adminId}`);
    return "ok";
  }
  rec.attempts += 1;
  await kvSet(`reset:${adminId}`, rec, 600);
  return "invalid";
}
