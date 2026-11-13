import { getSessionAdmin, unauthorized } from "@/lib/server/auth";
import { kvDel, listAll, removeById, upsert } from "@/lib/server/store";
import type { Application } from "@/lib/types";

async function find(id: string) {
  return (await listAll<Application>("applications")).find((a) => a.id === id);
}

export async function GET(_req: Request, ctx: RouteContext<"/api/applications/[id]">) {
  if (!(await getSessionAdmin())) return unauthorized();
  const app = await find((await ctx.params).id);
  return app ? Response.json(app) : Response.json({ error: "Not found" }, { status: 404 });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/applications/[id]">) {
  if (!(await getSessionAdmin())) return unauthorized();
  const app = await find((await ctx.params).id);
  if (!app) return Response.json({ error: "Not found" }, { status: 404 });
  const b = (await req.json()) as Partial<Application>;
  if (b.status) app.status = b.status;
  if (typeof b.adminNotes === "string") app.adminNotes = b.adminNotes.slice(0, 10000);
  app.updatedAt = new Date().toISOString();
  await upsert("applications", app);
  return Response.json(app);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/applications/[id]">) {
  if (!(await getSessionAdmin())) return unauthorized();
  const { id } = await ctx.params;
  const app = await find(id);
  if (app) await Promise.all(app.files.map((f) => kvDel(`file:app:${id}:${f.id}`)));
  await removeById("applications", id);
  return Response.json({ ok: true });
}
