import { getSessionAdmin, unauthorized } from "@/lib/server/auth";
import { checkAuthenticity } from "@/lib/server/authenticity";
import { getRegFile, getRegistration, saveRegistration } from "@/lib/server/registrations";
import type { ManualVerification } from "@/lib/types";

export const maxDuration = 60;

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

// Admin re-runs the automatic authenticity check on the stored file.
export async function POST(_req: Request, ctx: RouteContext<"/api/registrations/[id]/documents/[docId]">) {
  if (!(await getSessionAdmin())) return unauthorized();
  const { id, docId } = await ctx.params;
  const reg = await getRegistration(id);
  const doc = reg?.documents.find((d) => d.id === docId);
  const f = await getRegFile(id, docId);
  if (!reg || !doc || !f) return Response.json({ error: "Not found" }, { status: 404 });
  const r = await checkAuthenticity(new Uint8Array(Buffer.from(f.data, "base64")), f.name, f.type, doc.category);
  doc.auth = { score: r.score, verdict: r.verdict, verdictLabel: r.verdictLabel, checkedAt: r.checkedAt, signals: r.signals.map(({ level, label, detail }) => ({ level, label, detail })) };
  await saveRegistration(reg);
  return Response.json(doc);
}

// Admin sets the MANUAL decision (original / fake / needs check). It overrides the automatic result.
export async function PATCH(req: Request, ctx: RouteContext<"/api/registrations/[id]/documents/[docId]">) {
  const admin = await getSessionAdmin();
  if (!admin) return unauthorized();
  const { id, docId } = await ctx.params;
  const reg = await getRegistration(id);
  const doc = reg?.documents.find((d) => d.id === docId);
  if (!reg || !doc) return Response.json({ error: "Not found" }, { status: 404 });
  const b = (await req.json()) as { status?: ManualVerification["status"] | null; note?: string };
  if (b.status === null) delete doc.manual;
  else if (b.status && ["original", "fake", "needs-check"].includes(b.status)) doc.manual = { status: b.status, note: String(b.note ?? "").slice(0, 1000), by: admin.name || admin.email, at: new Date().toISOString() };
  else return Response.json({ error: "Invalid status" }, { status: 400 });
  await saveRegistration(reg);
  return Response.json(doc);
}
