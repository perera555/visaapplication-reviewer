import { getAdmins, getSessionAdmin, hashPassword, saveAdmin, unauthorized } from "@/lib/server/auth";

// A signed-in admin sets a new password for another admin (e.g. they forgot it and cannot receive codes).
export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  if (!(await getSessionAdmin())) return unauthorized();
  const { id } = await ctx.params;
  const { password } = (await req.json()) as { password?: string };
  if (!password || password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const admin = (await getAdmins()).find((a) => a.id === id);
  if (!admin) return Response.json({ error: "Admin not found" }, { status: 404 });
  admin.passwordHash = hashPassword(password);
  await saveAdmin(admin);
  return Response.json({ ok: true });
}
