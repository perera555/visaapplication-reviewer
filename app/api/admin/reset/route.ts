import { createSession, findAdmin, hashPassword, saveAdmin, verifyResetCode } from "@/lib/server/auth";

export async function POST(req: Request) {
  const { identifier, code, password } = (await req.json()) as { identifier?: string; code?: string; password?: string };
  if (!identifier || !code || !password) return Response.json({ error: "All fields are required." }, { status: 400 });
  if (password.length < 8) return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  const admin = await findAdmin(identifier);
  if (!admin) return Response.json({ error: "Invalid or expired code." }, { status: 400 });
  const result = await verifyResetCode(admin.id, code);
  if (result !== "ok") {
    const msg = result === "locked" ? "Too many attempts. Request a new code." : result === "expired" ? "Code expired. Request a new code." : "Incorrect code.";
    return Response.json({ error: msg }, { status: 400 });
  }
  admin.passwordHash = hashPassword(password);
  await saveAdmin(admin);
  await createSession(admin.id);
  return Response.json({ ok: true });
}
