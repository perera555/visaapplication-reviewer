// Optional Claude-powered analysis. Everything in the app works without it (rule-based engine);
// set ANTHROPIC_API_KEY to enable deeper refusal analysis and letter polishing.
import Anthropic from "@anthropic-ai/sdk";
import type { RefusalAnalysis, RefusalGround } from "../refusal";
import type { DocReview } from "../docReview";

export const aiConfigured = Boolean(process.env.ANTHROPIC_API_KEY);
const MODEL = "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient() {
  client ??= new Anthropic();
  return client;
}

async function ask(system: string, user: string, schema?: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await getClient().beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      output_config: { effort: "medium", ...(schema ? { format: { type: "json_schema", schema } } : {}) },
      system,
      messages: [{ role: "user", content: user }],
    });
    if (res.stop_reason === "refusal") return null;
    return res.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim() || null;
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) console.error("Claude: invalid ANTHROPIC_API_KEY");
    else if (err instanceof Anthropic.RateLimitError) console.error("Claude: rate limited");
    else if (err instanceof Anthropic.APIError) console.error(`Claude API error ${err.status}:`, err.message);
    else console.error("Claude request failed", err);
    return null;
  }
}

const groundSchema = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "severity", "explanation", "matched", "docsToFix", "howToFix"],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
    explanation: { type: "string" },
    matched: { type: "array", items: { type: "string" } },
    docsToFix: { type: "array", items: { type: "string" } },
    howToFix: { type: "array", items: { type: "string" } },
  },
};

const analysisSchema = {
  type: "object",
  additionalProperties: false,
  required: ["summary", "grounds", "route", "routeExplanation", "reapplySteps", "reapplyDocs", "reference", "decisionDate"],
  properties: {
    summary: { type: "string" },
    grounds: { type: "array", items: groundSchema },
    route: { type: "string", enum: ["reapply", "appeal-or-review", "legal-advice"] },
    routeExplanation: { type: "string" },
    reapplySteps: { type: "array", items: { type: "string" } },
    reapplyDocs: { type: "array", items: { type: "string" } },
    reference: { type: "string" },
    decisionDate: { type: "string" },
  },
};

export async function aiAnalyzeRefusal(
  letterText: string,
  country: string,
  visaType: string,
  baseline: RefusalAnalysis,
): Promise<RefusalAnalysis | null> {
  const system =
    "You are an experienced visa consultant who reviews visa refusal letters for applicants. " +
    "Identify every refusal ground the officer actually stated, quote the exact sentence from the letter for each in `matched`, " +
    "explain it in plain language a first-time applicant understands, and list the concrete documents and actions that would address it. " +
    "Be accurate about appeal/review rights: only say an appeal or review exists when the letter or the country's known rules support it. " +
    "If grounds involve deception, fraud, security or criminality, set route to legal-advice. Use empty strings when reference or date are not present.";
  const user = `Destination country: ${country}\nVisa type: ${visaType}\n\nRule-based pre-analysis (may be incomplete):\n${JSON.stringify({ grounds: baseline.grounds.map((g) => g.title), route: baseline.route })}\n\nRefusal letter:\n<letter>\n${letterText}\n</letter>`;
  const out = await ask(system, user, analysisSchema);
  if (!out) return null;
  try {
    const parsed = JSON.parse(out) as Omit<RefusalAnalysis, "countryOptions"> & { grounds: RefusalGround[] };
    return {
      ...parsed,
      reference: parsed.reference || baseline.reference,
      decisionDate: parsed.decisionDate || baseline.decisionDate,
      countryOptions: baseline.countryOptions,
      aiUsed: true,
    };
  } catch {
    return null;
  }
}

const reviewSchema = {
  type: "object",
  additionalProperties: false,
  required: ["issues", "corrected"],
  properties: {
    issues: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["severity", "problem", "found", "replaceWith", "suggestion"],
        properties: {
          severity: { type: "string", enum: ["error", "warning", "tip"] },
          problem: { type: "string" },
          found: { type: "string" },
          replaceWith: { type: "string" },
          suggestion: { type: "string" },
        },
      },
    },
    corrected: { type: "string" },
  },
};

export async function aiReviewDocument(text: string, ctx: Record<string, string | undefined>): Promise<{ issues: DocReview["issues"]; corrected: string } | null> {
  const system =
    "You review supporting documents for visa applications (cover letters, sponsor, employer and invitation letters, statements). " +
    "Find errors a visa officer would notice: name/passport/date/country mismatches with the applicant details, unfilled placeholders, statements that contradict the visa type, " +
    "inconsistent amounts, spelling/grammar and informal wording, and letter parts in the wrong order. For each issue quote the exact text in `found` and give the exact replacement in `replaceWith` (empty string if none). " +
    "Then return `corrected`: the full document with every fix applied and parts in the standard order. Never invent facts; keep [placeholders] for unknown information.";
  const out = await ask(system, `Applicant details: ${JSON.stringify(ctx)}\n\nDocument:\n<document>\n${text}\n</document>`, reviewSchema);
  if (!out) return null;
  try {
    return JSON.parse(out);
  } catch {
    return null;
  }
}

export async function aiPolishLetter(draft: string, letterType: string, notes: string): Promise<string | null> {
  const system =
    "You write formal letters to embassies and high commissions on behalf of visa applicants. " +
    "Rewrite the draft into a clear, polite, persuasive and truthful letter. Keep every fact, name, date, reference and enclosure from the draft; " +
    "never invent facts, documents or amounts — keep [bracketed placeholders] where information is missing. " +
    "Respond to each refusal reason in its own paragraph. Return only the letter text, no commentary.";
  return ask(system, `Letter type: ${letterType}\nApplicant notes: ${notes || "none"}\n\nDraft:\n${draft}`);
}
