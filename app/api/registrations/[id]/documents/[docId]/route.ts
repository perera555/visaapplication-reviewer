import { getSessionAdmin, unauthorized } from "@/lib/server/auth";
import { getRegFile } from "@/lib/server/registrations";

// Admin downloads / views a customer's document.
export async function GET(_req: Request, ctx: RouteContext<"/api/registrations/[id]/documents/[docId]">) {
  if (!(await getSessionAdmin())) return unauthorized();
  const { id, docId } = await ctx.params;
  const f = await getRegFile(id, docId);
  if (!f) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(f.data, "base64"), {
    headers: { "Content-Type": f.type, "Content-Disposition": `inline; filename="${encodeURIComponent(f.name)}"`, "Cache-Control": "private, no-store" },
  });
}
