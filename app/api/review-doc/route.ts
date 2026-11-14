import { reviewDocument, type ReviewContext } from "@/lib/docReview";
import { aiConfigured, aiReviewDocument } from "@/lib/server/ai";

export const maxDuration = 120;

// Reviews a support document's text. Rule-based always; merged with Claude's review when available.
export async function POST(req: Request) {
  const { text, context, useAi } = (await req.json()) as { text?: string; context?: ReviewContext; useAi?: boolean };
  const t = (text ?? "").slice(0, 30000);
  const base = reviewDocument(t, context ?? {});
  if (useAi && aiConfigured && t.trim().length >= 40) {
    const { knownInstitutions, ...rest } = context ?? {};
    const ai = await aiReviewDocument(t, { ...rest, knownInstitutions: knownInstitutions?.join("; ") });
    if (ai) {
      const issues = [...ai.issues, ...base.issues.filter((b) => !ai.issues.some((a) => a.found && b.found && a.found.toLowerCase() === b.found.toLowerCase()))];
      const errors = issues.filter((i) => i.severity === "error").length;
      const warns = issues.filter((i) => i.severity === "warning").length;
      return Response.json({
        ...base,
        issues,
        corrected: ai.corrected || base.corrected,
        verdict: errors ? "error" : warns ? "warning" : "ok",
        verdictLabel: errors ? `Error document: ${errors} error(s) must be fixed` : warns ? `Needs improvement: ${warns} warning(s)` : "Looks good",
        aiUsed: true,
      });
    }
  }
  return Response.json(base);
}
