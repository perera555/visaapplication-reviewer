import { aiConfigured, aiPolishLetter } from "@/lib/server/ai";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { draft, type, notes } = (await req.json()) as { draft?: string; type?: string; notes?: string };
  if (!draft) return Response.json({ error: "Missing draft" }, { status: 400 });
  if (!aiConfigured) return Response.json({ error: "AI writing is not configured on this server (ANTHROPIC_API_KEY)." }, { status: 503 });
  const letter = await aiPolishLetter(draft.slice(0, 20000), type ?? "letter", (notes ?? "").slice(0, 4000));
  if (!letter) return Response.json({ error: "AI could not write the letter right now. Your template draft is still available." }, { status: 502 });
  return Response.json({ letter });
}
