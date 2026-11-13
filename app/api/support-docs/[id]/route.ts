import { kvGet } from "@/lib/server/store";

// Public download of an admin-provided support document (templates, sample letters, checklists).
export async function GET(_req: Request, ctx: RouteContext<"/api/support-docs/[id]">) {
  const { id } = await ctx.params;
  const f = await kvGet<{ name: string; type: string; data: string }>(`file:support:${id}`);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(f.data, "base64"), {
    headers: {
      "Content-Type": f.type,
      "Content-Disposition": `inline; filename="${encodeURIComponent(f.name)}"`,
    },
  });
}
