import { extractText, getDocumentProxy } from "unpdf";

// Extracts text from an uploaded PDF so documents can be recognised and refusal letters analysed.
// The file is processed in memory and not stored.
export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return Response.json({ error: "File too large (max 10 MB)" }, { status: 413 });

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    if (file.type.startsWith("text/")) return Response.json({ text: (await file.text()).slice(0, 50000) });
    return Response.json({ text: "", note: "Text can only be read from PDF or text files. Images are matched by file name." });
  }
  try {
    const pdf = await getDocumentProxy(new Uint8Array(await file.arrayBuffer()));
    const { text, totalPages } = await extractText(pdf, { mergePages: true });
    return Response.json({ text: text.slice(0, 50000), pages: totalPages });
  } catch {
    return Response.json({ text: "", note: "Could not read this PDF (it may be scanned or encrypted)." });
  }
}
