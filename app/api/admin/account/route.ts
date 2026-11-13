import { getSessionAdmin, hashPassword, normEmail, normPhone, publicAdmin, saveAdmin, unauthorized, verifyPassword } from "@/lib/server/auth";

// Update the signed-in admin's name, email, phone (used for reset codes) and password.
export async function PATCH(req: Request) {
  const admin = await getSessionAdmin();
  if (!admin) return unauthorized();
  const b = (await req.json()) as { name?: string; email?: string; phone?: string; currentPassword?: string; newPassword?: string };
  if (b.name !== undefined) admin.name = b.name.trim() || admin.name;
  if (b.email !== undefined) {
    if (!b.email.includes("@")) return Response.json({ error: "Invalid email." }, { status: 400 });
    admin.email = normEmail(b.email);
  }
  if (b.phone !== undefined) admin.phone = normPhone(b.phone);
  if (b.newPassword) {
    if (!b.currentPassword || !verifyPassword(b.currentPassword, admin.passwordHash)) return Response.json({ error: "Current password is incorrect." }, { status: 400 });
    if (b.newPassword.length < 8) return Response.json({ error: "New password must be at least 8 characters." }, { status: 400 });
    admin.passwordHash = hashPassword(b.newPassword);
  }
  await saveAdmin(admin);
  return Response.json(publicAdmin(admin));
}
