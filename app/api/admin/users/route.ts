import { getAdmins, getSessionAdmin, hashPassword, normEmail, normPhone, publicAdmin, saveAdmin, unauthorized, type Admin } from "@/lib/server/auth";
import { sendEmail } from "@/lib/server/notify";
import { saveAll } from "@/lib/server/store";

// List all admin users (signed-in admins only)
export async function GET() {
  if (!(await getSessionAdmin())) return unauthorized();
  return Response.json((await getAdmins()).map((a) => ({ ...publicAdmin(a), createdAt: a.createdAt })));
}

// Create a new admin user
export async function POST(req: Request) {
  const me = await getSessionAdmin();
  if (!me) return unauthorized();
  const b = (await req.json()) as { name?: string; email?: string; phone?: string; password?: string };
  if (!b.name?.trim()) return Response.json({ error: "Name is required." }, { status: 400 });
  if (!b.email?.includes("@")) return Response.json({ error: "A valid email is required." }, { status: 400 });
  if (!b.password || b.password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const admins = await getAdmins();
  const email = normEmail(b.email);
  const phone = normPhone(b.phone ?? "");
  if (admins.some((a) => a.email === email)) return Response.json({ error: "An admin with this email already exists." }, { status: 409 });
  if (phone && admins.some((a) => a.phone === phone)) return Response.json({ error: "An admin with this phone already exists." }, { status: 409 });
  const admin: Admin = { id: crypto.randomUUID(), name: b.name.trim(), email, phone, passwordHash: hashPassword(b.password), createdAt: new Date().toISOString() };
  await saveAdmin(admin);
  await sendEmail(email, "Your VisaReview admin account", `Hello ${admin.name},\n\n${me.name} created an admin account for you.\nSign in at /admin/login with ${email}. Change your password under Account & settings after your first login.\n`).catch(() => {});
  return Response.json(publicAdmin(admin));
}

// Remove an admin user (cannot remove yourself or the last admin)
export async function DELETE(req: Request) {
  const me = await getSessionAdmin();
  if (!me) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  if (id === me.id) return Response.json({ error: "You cannot delete your own account." }, { status: 400 });
  const admins = await getAdmins();
  if (admins.length <= 1) return Response.json({ error: "At least one admin must remain." }, { status: 400 });
  await saveAll("admins", admins.filter((a) => a.id !== id));
  return Response.json({ ok: true });
}
