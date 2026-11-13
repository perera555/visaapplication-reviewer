import { getSessionAdmin, unauthorized } from "@/lib/server/auth";
import { deleteRegistration, getRegistration, saveRegistration } from "@/lib/server/registrations";
import { EMPTY_REG_DETAILS, REG_STATUS_LABEL, type Registration, type RegistrationDetails, type RegistrationStatus } from "@/lib/types";

export async function GET(_req: Request, ctx: RouteContext<"/api/registrations/[id]">) {
  if (!(await getSessionAdmin())) return unauthorized();
  const r = await getRegistration((await ctx.params).id);
  return r ? Response.json(r) : Response.json({ error: "Not found" }, { status: 404 });
}

// Admin edits details, status and notes.
export async function PATCH(req: Request, ctx: RouteContext<"/api/registrations/[id]">) {
  if (!(await getSessionAdmin())) return unauthorized();
  const r = await getRegistration((await ctx.params).id);
  if (!r) return Response.json({ error: "Not found" }, { status: 404 });
  const b = (await req.json()) as Partial<Pick<Registration, "status" | "adminNotes">> & { details?: Partial<RegistrationDetails> };
  if (b.status && b.status in REG_STATUS_LABEL) r.status = b.status as RegistrationStatus;
  if (typeof b.adminNotes === "string") r.adminNotes = b.adminNotes.slice(0, 10000);
  if (b.details) for (const k of Object.keys(EMPTY_REG_DETAILS) as (keyof RegistrationDetails)[]) if (typeof b.details[k] === "string") r.details[k] = b.details[k]!.slice(0, 1000);
  return Response.json(await saveRegistration(r));
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/registrations/[id]">) {
  if (!(await getSessionAdmin())) return unauthorized();
  await deleteRegistration((await ctx.params).id);
  return Response.json({ ok: true });
}
