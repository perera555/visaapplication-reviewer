import { getSessionAdmin, unauthorized } from "@/lib/server/auth";
import { listAll, newId, removeById, upsert } from "@/lib/server/store";
import type { CustomRequirement } from "@/lib/types";

// Public: admin-added required documents for a destination + visa type ("*" = all)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const country = (url.searchParams.get("country") ?? "").toUpperCase();
  const type = url.searchParams.get("type") ?? "";
  const all = await listAll<CustomRequirement>("requirements");
  const items = url.searchParams.has("all")
    ? all
    : all.filter((r) => (r.countryCode === "*" || r.countryCode === country) && (r.visaType === "*" || r.visaType === type));
  return Response.json(items);
}

export async function POST(req: Request) {
  if (!(await getSessionAdmin())) return unauthorized();
  const b = (await req.json()) as Partial<CustomRequirement>;
  if (!b.name?.trim()) return Response.json({ error: "Document name is required" }, { status: 400 });
  const item: CustomRequirement = {
    id: b.id || `admin-${newId()}`,
    name: b.name.trim(),
    description: (b.description ?? "").trim(),
    mandatory: Boolean(b.mandatory),
    weight: b.mandatory ? 3 : 2,
    category: b.category ?? "supporting",
    keywords: (b.keywords ?? []).map((k) => k.trim().toLowerCase()).filter(Boolean),
    source: "admin",
    countryCode: (b.countryCode || "*").toUpperCase(),
    visaType: b.visaType || "*",
    createdAt: new Date().toISOString(),
  };
  if (item.keywords.length === 0) item.keywords = [item.name.toLowerCase()];
  await upsert("requirements", item);
  return Response.json(item);
}

export async function DELETE(req: Request) {
  if (!(await getSessionAdmin())) return unauthorized();
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return Response.json({ error: "Missing id" }, { status: 400 });
  await removeById("requirements", id);
  return Response.json({ ok: true });
}
