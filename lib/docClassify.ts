// Identify what kind of document a file is (from its name and text) and build a standard file name.
import { DOC_CATEGORIES } from "./types";

const RULES: { category: string; name: RegExp[]; text: RegExp[] }[] = [
  { category: "Passport", name: [/passport/i, /\bpp\b/i, /bio ?page/i], text: [/^P[<A-Z][A-Z<]{3}[A-Z<]{5,}$/m, /\bpassport\s*(no|number)/i, /type\s*p\b.*country code/i] },
  { category: "National ID", name: [/\bnic\b/i, /national.?id/i, /identity.?card/i, /\bid.?card/i], text: [/national identity card/i, /identity card/i, /\bNIC\b/] },
  { category: "Birth certificate", name: [/birth/i], text: [/certificate of birth|birth certificate|registrar of births/i] },
  { category: "Marriage certificate", name: [/marriage/i], text: [/certificate of marriage|marriage certificate|registrar of marriages/i] },
  { category: "Bank statement", name: [/statement/i, /bank/i, /\bstmt\b/i], text: [/statement of account|account statement|bank statement|closing balance|opening balance|available balance/i] },
  { category: "Payslips", name: [/pay ?slip/i, /salary ?slip/i, /pay ?stub/i], text: [/pay ?slip|salary slip|earnings.*deductions|net pay|gross pay/i] },
  { category: "Employment letter", name: [/employ/i, /\bnoc\b/i, /service ?letter/i, /leave/i, /experience/i], text: [/to whom it may concern[sS]*employ|is employed|employment (confirmation|letter)|no objection|approved leave|service letter|experience letter/i] },
  { category: "Business registration", name: [/business ?reg/i, /\bbr\b/i, /trade ?licen/i, /incorporation/i], text: [/certificate of (incorporation|registration)|business registration|trade licen[cs]e/i] },
  { category: "Tax returns", name: [/\btax\b/i, /\bitr\b/i], text: [/income tax|tax return|tax clearance|assessment year/i] },
  { category: "Offer / admission letter", name: [/offer/i, /admission/i, /\bcas\b/i, /\bi-?20\b/i, /\bloa\b/i, /\bcoe\b/i, /acceptance/i], text: [/offer of (a )?place|unconditional offer|conditional offer|letter of acceptance|confirmation of acceptance for studies|confirmation of enrolment|form i-20|we are pleased to offer you/i] },
  { category: "Academic certificates & transcripts", name: [/transcript/i, /degree/i, /diploma/i, /certificate/i, /\bo\/?l\b/i, /\ba\/?l\b/i, /result/i, /marksheet/i], text: [/academic transcript|transcript of records|bachelor of|master of|degree of|diploma in|g\.?c\.?e\.?|grade point average|\bGPA\b/i] },
  { category: "IELTS / PTE / English waiver", name: [/ielts/i, /\bpte\b/i, /toefl/i, /duolingo/i, /\bmoi\b/i, /english/i], text: [/IELTS|Pearson Test of English|PTE Academic|TOEFL|Duolingo English Test|medium of instruction/i] },
  { category: "Sponsor documents", name: [/sponsor/i, /affidavit/i], text: [/affidavit of support|sponsorship letter|i will (fully )?sponsor|financial support/i] },
  { category: "Property documents", name: [/deed/i, /property/i, /land/i, /valuation/i], text: [/deed of transfer|title deed|land registry|valuation report|property/i] },
  { category: "Travel itinerary / tickets", name: [/ticket/i, /itinerary/i, /flight/i, /booking ?ref/i, /e-?ticket/i], text: [/e-?ticket|itinerary|flight (no|number)|booking reference|PNR/i] },
  { category: "Hotel / accommodation", name: [/hotel/i, /accommodation/i, /airbnb/i, /booking/i, /tenancy/i], text: [/hotel reservation|booking confirmation|check-?in|accommodation|tenancy agreement/i] },
  { category: "Travel insurance", name: [/insurance/i, /\boshc\b/i], text: [/travel insurance|policy (no|number)|sum insured|medical expenses cover|OSHC/i] },
  { category: "Previous visas", name: [/visa/i], text: [/\bvisa\b.*(valid|entries|issued)|entry clearance|residence permit/i] },
  { category: "Refusal letter", name: [/refus/i, /reject/i], text: [/refus(al|ed)|your application (has been|is) refused|not satisfied that/i] },
  { category: "CV", name: [/\bcv\b/i, /resume/i, /curriculum/i], text: [/curriculum vitae|professional experience|work experience[sS]*education|skills/i] },
  { category: "Police clearance", name: [/police/i, /\bpcc\b/i, /clearance/i], text: [/police clearance|criminal record|certificate of good conduct/i] },
  { category: "Medical report", name: [/medical/i, /\btb\b/i, /x-?ray/i, /health/i], text: [/medical examination|tuberculosis|chest x-?ray|panel physician|medical report/i] },
];

/** Returns the best matching category, or "Other". Name matches weigh more than text matches. */
export function classifyCategory(fileName: string, text = ""): string {
  const fname = fileName.replace(/[_\-.]+/g, " ");
  const body = text.slice(0, 8000);
  let best = { category: "Other", score: 0 };
  for (const r of RULES) {
    let s = 0;
    for (const re of r.name) if (re.test(fname)) s += 3;
    for (const re of r.text) if (re.test(body)) s += 2;
    if (s > best.score) best = { category: r.category, score: s };
  }
  return DOC_CATEGORIES.includes(best.category) ? best.category : "Other";
}

/** "Kamal Perera - Passport.pdf", "Kamal Perera - Bank statement (2).pdf" */
export function standardFileName(personName: string, category: string, originalName: string, existingSameCategory: number) {
  const ext = (originalName.match(/\.[A-Za-z0-9]{1,5}$/)?.[0] ?? "").toLowerCase();
  const person = (personName || "Customer").replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, " ").trim();
  const cat = category.replace(/[\\/:*?"<>|]+/g, "-").trim();
  return `${person} - ${cat}${existingSameCategory > 0 ? ` (${existingSameCategory + 1})` : ""}${ext}`;
}
