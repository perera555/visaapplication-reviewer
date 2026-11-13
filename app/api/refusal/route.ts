import { analyzeRefusal } from "@/lib/refusal";
import type { VisaTypeId } from "@/lib/requirements";
import { aiAnalyzeRefusal, aiConfigured } from "@/lib/server/ai";

export const maxDuration = 120;

export async function POST(req: Request) {
  const { text, country, visaType, useAi } = (await req.json()) as { text?: string; country?: string; visaType?: VisaTypeId; useAi?: boolean };
  if (!text || text.trim().length < 20) return Response.json({ error: "Paste or upload the refusal letter text." }, { status: 400 });
  const ctry = country || "GB";
  const vt = visaType || "visit";
  const base = analyzeRefusal(text.slice(0, 40000), ctry, vt);
  if (useAi && aiConfigured) {
    const ai = await aiAnalyzeRefusal(text.slice(0, 40000), ctry, vt, base);
    if (ai) return Response.json(ai);
  }
  return Response.json(base);
}
