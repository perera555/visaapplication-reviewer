// Which supporting documents should be enclosed with each letter.
import type { LetterInput, LetterType } from "./letters";
import { analyzeRefusal } from "./refusal";

const BY_TYPE: Record<LetterType, string[]> = {
  reconsideration: ["Copy of the refusal letter", "Passport bio page copy", "New evidence answering each refusal reason"],
  appeal: ["Copy of the refusal letter", "Appeal form / review request form (if required)", "Passport bio page copy", "Evidence for each ground of appeal"],
  "reapply-cover": ["Copy of the previous refusal letter", "Passport bio page copy", "Evidence of changed circumstances"],
  resubmit: ["Corrected document(s)", "Copy of the embassy's request letter / email", "Passport bio page copy"],
  explanation: ["Evidence supporting the explanation (e.g. sale deed, loan letter, gift letter)"],
  cover: ["Bank statements (last 6 months)", "Employment letter / business registration", "Travel itinerary & flight reservation", "Accommodation booking", "Proof of ties to home country"],
  sponsor: ["Sponsor's bank statements (last 6 months)", "Sponsor's payslips / income proof", "Sponsor's passport / ID copy", "Proof of relationship to the applicant", "Sponsor's tax returns"],
  invitation: ["Host's passport / residence permit copy", "Proof of host's address (utility bill / tenancy)", "Host's bank statement (if host pays)", "Proof of relationship to the applicant"],
  employer: ["Company registration / trade licence", "Applicant's payslips (last 3–6 months)", "Approved leave record"],
};

export function letterSupportDocs(input: LetterInput): { name: string; why: string }[] {
  const out = new Map<string, string>();
  BY_TYPE[input.type].forEach((d) => out.set(d, "Usually enclosed with this type of letter"));
  const reasonText = input.reasons.map((r) => `${r.reason}. ${r.response}`).join("\n");
  if (reasonText.trim().length > 10) {
    for (const g of analyzeRefusal(reasonText, "GB", "visit").grounds) {
      g.docsToFix.forEach((d) => { if (!out.has(d)) out.set(d, `Answers: ${g.title}`); });
    }
  }
  return [...out].map(([name, why]) => ({ name, why }));
}
