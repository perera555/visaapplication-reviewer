import { getAdmins, getSessionAdmin, publicAdmin, setupPolicy } from "@/lib/server/auth";

export async function GET() {
  const admin = await getSessionAdmin();
  if (admin) return Response.json({ admin: publicAdmin(admin) });
  const policy = setupPolicy();
  const hasAdmins = (await getAdmins()).length > 0;
  // needsSetup: first admin can be created. ownerCreate: owner can add admins at /admin/setup with the key.
  const needsSetup = policy.allowed && !hasAdmins;
  const ownerCreate = policy.allowed && (needsSetup || Boolean(policy.key));
  return Response.json({ admin: null, needsSetup, ownerCreate, setupKeyRequired: ownerCreate && (policy.keyRequired || hasAdmins) }, { status: 401 });
}
