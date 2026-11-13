import { timingSafeEqual } from "crypto";
import { createSession, getAdmins, hashPassword, normEmail, normPhone, publicAdmin, saveAdmin, setupPolicy, type Admin } from "@/lib/server/auth";

// First-run: create the first admin account. Disabled once any admin exists; see setupPolicy().

export async function POST(req: Request) {
  const policy = setupPolicy();
  if (!policy.allowed) return Response.json({ error: "Admin setup is disabled. Ask the system owner to sign in, or set ADMIN_EMAIL and ADMIN_PASSWORD on the server." }, { status: 403 });
  if ((await getAdmins()).length > 0) return Response.json({ error: "An admin already exists. Please sign in." }, { status: 403 });
  const b = (await req.json()) as { name?: string; email?: string; phone?: string; password?: string; setupKey?: string };
  if (policy.keyRequired) {
    const a = Buffer.from(policy.key);
    const g = Buffer.from(b.setupKey ?? "");
    if (!policy.key || a.length !== g.length || !timingSafeEqual(a, g)) {
      await new Promise((r) => setTimeout(r, 600));
      return Response.json({ error: "Invalid setup key." }, { status: 403 });
    }
  }
  if (!b.email?.includes("@")) return Response.json({ error: "A valid email is required." }, { status: 400 });
  if (!b.password || b.password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const admin: Admin = {
    id: crypto.randomUUID(),
    name: b.name?.trim() || "Administrator",
    email: normEmail(b.email),
    phone: normPhone(b.phone ?? ""),
    passwordHash: hashPassword(b.password),
    createdAt: new Date().toISOString(),
  };
  await saveAdmin(admin);
  await createSession(admin.id);
  return Response.json(publicAdmin(admin));
}
