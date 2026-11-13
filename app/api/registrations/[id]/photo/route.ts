import { getSessionAdmin, unauthorized } from "@/lib/server/auth";
import { getRegistration, getRegPhoto, putRegPhoto, saveRegistration } from "@/lib/server/registrations";
import { MAX_REG_FILE } from "@/lib/types";

export async function GET(_req: Request, ctx: RouteContext<"/api/registrations/[id]/photo">) {
  if (!(await getSessionAdmin())) return unauthorized();
  const p = await getRegPhoto((await ctx.params).id);
  if (!p) return new Response("Not found", { status: 404 });
  return new Response(Buffer.from(p.data, "base64"), { headers: { "Content-Type": p.type, "Cache-Control": "private, no-store" } });
}

// Admin replaces the customer photo.
export async function POST(req: Request, ctx: RouteContext<"/api/registrations/[id]/photo">) {
  if (!(await getSessionAdmin())) return unauthorized();
  const { id } = await ctx.params;
  const reg = await getRegistration(id);
  if (!reg) return Response.json({ error: "Not found" }, { status: 404 });
  const file = (await req.formData()).get("photo");
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > MAX_REG_FILE) return Response.json({ error: "Upload a JPG/PNG photo under 4 MB" }, { status: 400 });
  await putRegPhoto(id, file);
  reg.photo = { type: file.type, size: file.size };
  await saveRegistration(reg);
  return Response.json({ ok: true });
}
