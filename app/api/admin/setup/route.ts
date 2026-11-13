import { createSession, getAdmins, hashPassword, normEmail, normPhone, publicAdmin, saveAdmin, type Admin } from "@/lib/server/auth";

// First-run: create the first admin account. Disabled once any admin exists.
// If ADMIN_SETUP_KEY is set, it must be supplied.
export async function POST(req: Request) {
  if ((await getAdmins()).length > 0) return Response.json({ error: "An admin already exists. Please sign in." }, { status: 403 });
  const b = (await req.json()) as { name?: string; email?: string; phone?: string; password?: string; setupKey?: string };
  if (process.env.ADMIN_SETUP_KEY && b.setupKey !== process.env.ADMIN_SETUP_KEY) return Response.json({ error: "Invalid setup key." }, { status: 403 });
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
