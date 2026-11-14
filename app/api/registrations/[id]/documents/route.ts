import { getSessionAdmin, unauthorized } from "@/lib/server/auth";
import { checkUploadToken, getRegistration, putRegFile, saveRegistration } from "@/lib/server/registrations";
import { kvDel, newId } from "@/lib/server/store";
import { checkAuthenticity } from "@/lib/server/authenticity";
import { DOC_CATEGORIES, MAX_REG_FILE, type RegDocument } from "@/lib/types";

async function authorise(req: Request, id: string) {
  if (await getSessionAdmin()) return "admin" as const;
  const token = req.headers.get("x-upload-token") ?? "";
  return checkUploadToken(id, token) ? ("customer" as const) : null;
}

// Upload ONE document at a time to a registration (customer with upload token, or admin).
export const maxDuration = 60;

export async function POST(req: Request, ctx: RouteContext<"/api/registrations/[id]/documents">) {
  const { id } = await ctx.params;
  const by = await authorise(req, id);
  if (!by) return unauthorized();
  const reg = await getRegistration(id);
  if (!reg) return Response.json({ error: "Registration not found" }, { status: 404 });
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose a file" }, { status: 400 });
  if (file.size > MAX_REG_FILE) return Response.json({ error: `${file.name} is too large (max 4 MB per file).` }, { status: 413 });
  const cat = String(form.get("category") ?? "Other");
  const doc: RegDocument = {
    id: newId(),
    category: DOC_CATEGORIES.includes(cat) ? cat : "Other",
    name: file.name,
    type: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date().toISOString(),
    by,
  };
  await putRegFile(id, doc.id, file);
  // automatic authenticity check on every upload (a person can override it later)
  try {
    const r = await checkAuthenticity(new Uint8Array(await file.arrayBuffer()), file.name, doc.type, doc.category);
    doc.auth = { score: r.score, verdict: r.verdict, verdictLabel: r.verdictLabel, checkedAt: r.checkedAt, signals: r.signals.map(({ level, label, detail }) => ({ level, label, detail })) };
  } catch {}
  // admin adds a document they have personally verified: store it as a manual "original" decision
  if (by === "admin" && form.get("manualOriginal") === "1") {
    const admin = await getSessionAdmin();
    doc.manual = { status: "original", note: String(form.get("note") ?? "Added manually by admin as verified original").slice(0, 1000), by: admin?.name || admin?.email || "admin", at: new Date().toISOString() };
  }
  reg.documents.push(doc);
  if (reg.status === "documents-pending" && reg.documents.length >= 3) reg.status = "registered";
  await saveRegistration(reg);
  return Response.json(doc);
}

export async function DELETE(req: Request, ctx: RouteContext<"/api/registrations/[id]/documents">) {
  const { id } = await ctx.params;
  if (!(await authorise(req, id))) return unauthorized();
  const docId = new URL(req.url).searchParams.get("docId");
  const reg = await getRegistration(id);
  if (!reg || !docId) return Response.json({ error: "Not found" }, { status: 404 });
  reg.documents = reg.documents.filter((d) => d.id !== docId);
  await kvDel(`regfile:${id}:${docId}`);
  await saveRegistration(reg);
  return Response.json({ ok: true });
}
