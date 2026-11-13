import { getAdmins, getSessionAdmin, publicAdmin, setupPolicy } from "@/lib/server/auth";

export async function GET() {
  const admin = await getSessionAdmin();
  if (admin) return Response.json({ admin: publicAdmin(admin) });
  const policy = setupPolicy();
  // Only reveal the setup form when no admin exists AND setup is allowed (key-protected in production).
  const needsSetup = policy.allowed && (await getAdmins()).length === 0;
  return Response.json({ admin: null, needsSetup, setupKeyRequired: needsSetup && policy.keyRequired }, { status: 401 });
}
