import { getSessionAdmin, unauthorized } from "@/lib/server/auth";
import { kvDel, kvSet, listAll, newId, removeById, upsert } from "@/lib/server/store";
import { MAX_STORED_FILE, type SupportDoc } from "@/lib/types";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const country = (url.searchParams.get("country") ?? "").toUpperCase();
  const type = url.searchParams.get("type") ?? "";
  const all = await listAll<SupportDoc>("support-docs");
  const items = url.searchParams.has("all")
    ? all
    : all.filter((r) => (r.countryCode === "*" || !country || r.countryCode === country) && (r.visaType === "*" || !type || r.visaType === type));
  return Response.json(items);
}

export async function POST(req: Request) {
  if (!(await getSessionAdmin())) return unauthorized();
  const form = await req.formData();
  const title = String(form.get("title") ?? "").trim();
  if (!title) return Response.json({ error: "Title is required" }, { status: 400 });
  const doc: SupportDoc = {
    id: newId(),
    title,
    description: String(form.get("description") ?? "").trim(),
    countryCode: String(form.get("countryCode") || "*").toUpperCase(),
    visaType: String(form.get("visaType") || "*"),
    url: String(form.get("url") ?? "").trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const file = form.get("file");
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_STORED_FILE) return Response.json({ error: "File too large — max 900 KB. Upload larger files to Google Drive/Dropbox and paste the link instead." }, { status: 413 });
    const data = Buffer.from(await file.arrayBuffer()).toString("base64");
    await kvSet(`file:support:${doc.id}`, { name: file.name, type: file.type || "application/octet-stream", data });
    doc.fileName = file.name;
    doc.fileType = file.type;
    doc.fileSize = file.size;
  }
  if (!doc.url && !doc.fileName) return Response.json({ error: "Add a file or a link" }, { status: 400 });
  await upsert("support-docs", doc);
  return Response.json(doc);
}

export async function DELETE(req: Request) {
  if (!(await getSessionAdmin())) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  await removeById("support-docs", id);
  await kvDel(`file:support:${id}`);
  return Response.json({ ok: true });
}
