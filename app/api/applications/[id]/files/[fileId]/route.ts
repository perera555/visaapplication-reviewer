import { getSessionAdmin, unauthorized } from "@/lib/server/auth";
import { kvGet } from "@/lib/server/store";

export async function GET(_req: Request, ctx: RouteContext<"/api/applications/[id]/files/[fileId]">) {
  if (!(await getSessionAdmin())) return unauthorized();
  const { id, fileId } = await ctx.params;
  const f = await kvGet<{ name: string; type: string; data: string }>(`file:app:${id}:${fileId}`);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(f.data, "base64"), {
    headers: { "Content-Type": f.type, "Content-Disposition": `inline; filename="${encodeURIComponent(f.name)}"` },
  });
}
