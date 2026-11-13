import { getAdmins, getSessionAdmin, publicAdmin } from "@/lib/server/auth";

export async function GET() {
  const admin = await getSessionAdmin();
  if (admin) return Response.json({ admin: publicAdmin(admin) });
  const needsSetup = (await getAdmins()).length === 0;
  return Response.json({ admin: null, needsSetup }, { status: 401 });
}
