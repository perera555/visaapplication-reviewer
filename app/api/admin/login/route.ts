import { createSession, findAdmin, publicAdmin, verifyPassword } from "@/lib/server/auth";

export async function POST(req: Request) {
  const { identifier, password } = (await req.json()) as { identifier?: string; password?: string };
  if (!identifier || !password) return Response.json({ error: "Enter your email/phone and password." }, { status: 400 });
  const admin = await findAdmin(identifier);
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    await new Promise((r) => setTimeout(r, 400));
    return Response.json({ error: "Incorrect email/phone or password." }, { status: 401 });
  }
  await createSession(admin.id);
  return Response.json(publicAdmin(admin));
}
