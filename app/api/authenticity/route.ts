import { checkAuthenticity } from "@/lib/server/authenticity";

export const maxDuration = 60;

// Checks one uploaded file for signs of editing/forgery. The file is analysed in memory and not stored.
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "No file" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "File too large (max 10 MB)" }, { status: 413 });
  const category = String(form.get("category") ?? "");
  return Response.json(await checkAuthenticity(new Uint8Array(await file.arrayBuffer()), file.name, file.type, category));
}
