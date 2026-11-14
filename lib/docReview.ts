// Rule-based review of supporting documents (cover letters, sponsor/employer/invitation letters, statements).
// Flags errors and suggests replacements, and produces a corrected + rearranged version of letter text.
import { COUNTRIES } from "./countries";

export type ReviewContext = {
  fullName?: string;
  destination?: string; // country name
  visaType?: string; // visit | student | work ...
  passportNo?: string;
  docName?: string;
  university?: string; // target university (detect SOPs copied from another application)
  knownInstitutions?: string[]; // the applicant's own past schools/universities (not flagged)
};

export type ReviewIssue = {
  severity: "error" | "warning" | "tip";
  problem: string;
  found?: string;
  replaceWith?: string;
  suggestion: string;
};

export type DocReview = {
  verdict: "ok" | "warning" | "error";
  verdictLabel: string;
  issues: ReviewIssue[];
  corrected: string;
  /** Original wording, only the letter blocks put into the standard order (no corrections). */
  rearranged: string;
  isLetter: boolean;
  aiUsed?: boolean;
};

const SPELLING: Record<string, string> = {
  recieve: "receive", recieved: "received", seperate: "separate", embasy: "embassy", embassey: "embassy",
  comission: "commission", commision: "commission", goverment: "government", acommodation: "accommodation",
  accomodation: "accommodation", sincerly: "sincerely", definately: "definitely", occured: "occurred",
  untill: "until", beleive: "believe", adress: "address", buisness: "business", finacial: "financial",
  responsiblity: "responsibility", gaurantee: "guarantee", garantee: "guarantee", visitting: "visiting",
  applicaton: "application", refered: "referred", sponser: "sponsor", employeer: "employer", salery: "salary",
  intrested: "interested", oppurtunity: "opportunity", immediatly: "immediately", wich: "which", thier: "their",
  hense: "hence", reciept: "receipt", greatful: "grateful", truely: "truly", passprot: "passport",
  collage: "college", colleage: "college", proffesional: "professional", acheive: "achieve", acheivement: "achievement", sucessful: "successful", sucessfully: "successfully",
};

const INFORMAL: Record<string, string> = {
  wanna: "want to", gonna: "going to", pls: "please", plz: "please", thx: "thank you", thanks: "thank you",
  "u": "you", ur: "your", "im": "I am", dont: "do not", cant: "cannot", wont: "will not", ok: "acceptable",
  hi: "Dear Sir/Madam", hello: "Dear Sir/Madam", bro: "", guys: "",
};

type RiskRule = { re: RegExp; problem: string; replaceWith: string; types?: string[] };
const RISKY: RiskRule[] = [
  { re: /\b(find|look for|search for|get) (a )?(job|work|employment)\b[^.]*/i, problem: "States an intention to work, which contradicts a visit/business visa", replaceWith: "I will not undertake any work during my visit", types: ["visit", "business", "medical", "transit", "family"] },
  { re: /\b(stay|live|settle) (there )?(permanently|forever|for good)\b[^.]*/i, problem: "Suggests you may not return home, a common refusal reason", replaceWith: "I will return to my home country before my visa expires", types: ["visit", "student", "business", "medical", "work", "working-holiday"] },
  { re: /\b(never|not) (planning|intend(ing)?|going) to return\b[^.]*/i, problem: "Says you will not return home", replaceWith: "I intend to return home at the end of my authorised stay" },
  { re: /\basylum\b[^.]*/i, problem: "Mentions asylum in a visa application", replaceWith: "[remove this sentence and get legal advice]" },
  { re: /\bwork full[- ]?time\b[^.]*/i, problem: "Students usually may only work part-time", replaceWith: "I may work part-time within the limits allowed by my visa", types: ["student"] },
  { re: /\bborrow(ed)? (the )?money\b[^.]*/i, problem: "Borrowed funds just before applying can raise doubts about genuine finances", replaceWith: "These funds are my own savings accumulated over [period] (evidence enclosed)" },
  { re: /\b(guarantee|100% sure) (that )?(i|we) will get\b[^.]*/i, problem: "Over-confident or pressuring wording", replaceWith: "I respectfully request that my application be considered" },
];

const PLACEHOLDER = /\[[^\]\n]{1,60}\]|\bX{3,}\b|\blorem ipsum\b|\bTBD\b|\bTBC\b|\bN\/?A\b(?=\s*$)|_{4,}/gim;

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function replaceWord(text: string, from: string, to: string) {
  return text.replace(new RegExp(`\\b${escapeRe(from)}\\b`, "gi"), (m) => (m[0] === m[0].toUpperCase() && to ? to[0].toUpperCase() + to.slice(1) : to));
}

function sentences(text: string) {
  return text.replace(/\s+/g, " ").split(/(?<=[.!?])\s+(?=[A-Z])/).map((s) => s.trim()).filter(Boolean);
}

const MONTHS = "jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec";
const DATE_RE = new RegExp(`\\b(\\d{1,2}[/\\-.]\\d{1,2}[/\\-.]\\d{2,4}|\\d{4}-\\d{2}-\\d{2}|\\d{1,2}(st|nd|rd|th)?\\s+(${MONTHS})[a-z]*\\.?,?\\s+\\d{4}|(${MONTHS})[a-z]*\\.?\\s+\\d{1,2}(st|nd|rd|th)?,?\\s+\\d{4})\\b`, "i");

export function reviewDocument(rawText: string, ctx: ReviewContext = {}): DocReview {
  const text = rawText.replace(/\r/g, "");
  const issues: ReviewIssue[] = [];
  let corrected = text;
  const lower = text.toLowerCase();

  if (text.trim().length < 40) {
    return {
      verdict: "warning",
      verdictLabel: "Could not read this document",
      issues: [{ severity: "warning", problem: "No readable text found", suggestion: "This looks like a scanned image or photo. Make sure the copy is clear, in colour, all four corners are visible and nothing is cut off. For letters, upload the original PDF/Word file so it can be checked." }],
      corrected: text,
      rearranged: text,
      isLetter: false,
    };
  }

  const isLetter = /\bdear\b|\byours (sincerely|faithfully|truly)\b|\bto whom it may concern\b|\bsubject\s*:/i.test(text);

  // 1. placeholders left in the document
  const ph = [...new Set(text.match(PLACEHOLDER) ?? [])];
  for (const p of ph.slice(0, 8)) issues.push({ severity: "error", problem: "Unfilled placeholder / blank", found: p, replaceWith: "[enter the real information]", suggestion: "Replace the placeholder with the real details before submitting." });

  // 2. spelling & informal words
  for (const [wrong, right] of Object.entries(SPELLING)) {
    if (new RegExp(`\\b${wrong}\\b`, "i").test(text)) {
      issues.push({ severity: "warning", problem: "Spelling mistake", found: wrong, replaceWith: right, suggestion: `Replace “${wrong}” with “${right}”.` });
      corrected = replaceWord(corrected, wrong, right);
    }
  }
  if (isLetter) {
    for (const [inf, formal] of Object.entries(INFORMAL)) {
      if (new RegExp(`(^|\\s)${escapeRe(inf)}(?=[\\s,.!?]|$)`, "i").test(text)) {
        issues.push({ severity: "warning", problem: "Informal word in a formal letter", found: inf, replaceWith: formal || "(remove)", suggestion: formal ? `Replace “${inf}” with “${formal}”.` : `Remove “${inf}”.` });
        corrected = corrected.replace(new RegExp(`(^|\\s)${escapeRe(inf)}(?=[\\s,.!?]|$)`, "gi"), (_m, pre) => (formal ? pre + formal : pre));
      }
    }
  }

  // 3. risky statements for this visa type
  for (const r of RISKY) {
    if (r.types && ctx.visaType && !r.types.includes(ctx.visaType)) continue;
    const m = text.match(r.re);
    if (m) {
      issues.push({ severity: "error", problem: r.problem, found: m[0].trim(), replaceWith: r.replaceWith, suggestion: `Replace this sentence with: “${r.replaceWith}”.` });
      corrected = corrected.replace(m[0], r.replaceWith);
    }
  }

  // 4. name check against the passport name
  if (ctx.fullName?.trim()) {
    const parts = ctx.fullName.toLowerCase().split(/\s+/).filter((p) => p.length > 2);
    const hits = parts.filter((p) => lower.includes(p));
    if (parts.length && hits.length === 0) issues.push({ severity: "error", problem: "Applicant name not found in the document", found: undefined, replaceWith: ctx.fullName, suggestion: `The document should show your name exactly as in your passport: “${ctx.fullName}”.` });
    else if (parts.length > 1 && hits.length < parts.length) issues.push({ severity: "warning", problem: "Name only partly matches the passport", replaceWith: ctx.fullName, suggestion: `Use your full passport name “${ctx.fullName}” consistently in every document.` });
  }

  // 5. wrong destination country mentioned
  if (ctx.destination) {
    const dest = ctx.destination.toLowerCase();
    const others = COUNTRIES.filter((c) => c.name.length > 4 && c.name.toLowerCase() !== dest && ["United Kingdom", "United States", "Canada", "Australia", "New Zealand", "Germany", "France", "Italy", "Ireland", "Japan", "Netherlands", "Spain", "Switzerland", "Sweden", "Singapore", "United Arab Emirates"].includes(c.name));
    const wrong = others.filter((c) => new RegExp(`\\b${escapeRe(c.name)}\\b`, "i").test(text));
    if (wrong.length && !lower.includes(dest)) {
      for (const w of wrong.slice(0, 2)) {
        issues.push({ severity: "error", problem: "Wrong destination country in the document", found: w.name, replaceWith: ctx.destination, suggestion: `This document mentions ${w.name} but you are applying to ${ctx.destination}. Replace “${w.name}” with “${ctx.destination}”.` });
        corrected = replaceWord(corrected, w.name, ctx.destination);
      }
    } else if (isLetter && !lower.includes(dest)) {
      issues.push({ severity: "warning", problem: "Destination country not mentioned", replaceWith: ctx.destination, suggestion: `State clearly that you are applying to travel to ${ctx.destination}.` });
    }
  }

  // 5b. another university mentioned (SOP copied from a different application)
  if (ctx.university?.trim()) {
    const target = ctx.university.toLowerCase();
    const initials = ctx.university.split(/\s+/).filter((w) => /^[A-Z]/.test(w) && !/^(of|the|and)$/i.test(w)).map((w) => w[0]).join("").toUpperCase();
    const known = ["UTAS", "RMIT", "UNSW", "UWA", "QUT", "UTS", "ANU", "ECU", "CQU", "JCU", "ACU", "UQ", "UCL", "LSE", "KCL", "MIT", "UBC", "UCD", "UOW", "CDU", "SCU", "USQ", "UniSA"];
    const others = new Set<string>();
    for (const m of text.matchAll(/\b(University of [A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?|[A-Z][a-zA-Z]+ (?:[A-Z][a-zA-Z]+ )?University)\b/g)) {
      const n = m[1];
      const own = (ctx.knownInstitutions ?? []).some((k) => k && (k.toLowerCase().includes(n.toLowerCase()) || n.toLowerCase().includes(k.toLowerCase())));
      if (!own && !target.includes(n.toLowerCase()) && !n.toLowerCase().includes(target)) others.add(n);
    }
    for (const k of known) if (new RegExp(`\\b${k}\\b`).test(text) && k.toUpperCase() !== initials) others.add(k);
    for (const o of [...others].slice(0, 4)) {
      issues.push({ severity: "error", problem: "Another university is mentioned (looks copied from a different SOP)", found: o, replaceWith: ctx.university, suggestion: `The statement is for ${ctx.university}, but mentions “${o}”. Officers treat this as a sign of a copied, non-genuine statement.` });
      corrected = replaceWord(corrected, o, ctx.university);
    }
  }

  // 6. passport number mismatch
  if (ctx.passportNo && ctx.passportNo.length >= 6) {
    const pass = text.match(/passport\s*(no\.?|number|#)?\s*[:\-]?\s*([A-Z0-9]{6,12})/i)?.[2];
    if (pass && pass.toUpperCase() !== ctx.passportNo.toUpperCase()) {
      issues.push({ severity: "error", problem: "Passport number does not match", found: pass, replaceWith: ctx.passportNo, suggestion: `Replace “${pass}” with your passport number “${ctx.passportNo}”.` });
      corrected = corrected.replace(pass, ctx.passportNo);
    }
  }

  // 7. date checks
  if (!DATE_RE.test(text)) issues.push({ severity: "warning", problem: "No date found", replaceWith: "[today's date]", suggestion: "Every letter and statement must be dated. Embassies usually want letters issued within the last 1–3 months." });

  // 8. letter structure & order (rearrange)
  if (isLetter) {
    const iDear = lower.search(/\bdear\b|\bto whom it may concern\b/);
    const iClose = lower.search(/\byours (sincerely|faithfully|truly)\b|\bkind regards\b|\bbest regards\b/);
    const iSubject = lower.search(/\bsubject\s*:|\bre\s*:/);
    if (iDear < 0) issues.push({ severity: "warning", problem: "Missing greeting", replaceWith: "Dear Sir/Madam,", suggestion: "Start the letter with “Dear Sir/Madam,” or “Dear Visa Officer,”." });
    if (iClose < 0) issues.push({ severity: "warning", problem: "Missing closing", replaceWith: "Yours faithfully,", suggestion: "End with “Yours faithfully,” followed by your signature and full name." });
    if (iDear >= 0 && iClose >= 0 && iClose < iDear) issues.push({ severity: "error", problem: "Letter parts are in the wrong order", suggestion: "Rearrange: date → your address → embassy address → subject → greeting → body → closing → signature. The corrected version below is rearranged." });
    if (iSubject >= 0 && iDear >= 0 && iSubject > iDear) issues.push({ severity: "warning", problem: "Subject line is after the greeting", suggestion: "Move the subject line above “Dear …”." });
    if (!/signature|signed|\bsign\b/i.test(text) && iClose >= 0) issues.push({ severity: "tip", problem: "Signature", suggestion: "Make sure the printed letter is signed by hand (and stamped, for company letters)." });
    if (ctx.docName && /employ|leave|noc|company/i.test(ctx.docName) && !/letterhead|tel|phone|email|@/i.test(text)) issues.push({ severity: "warning", problem: "No company contact details", suggestion: "Employer letters must be on letterhead with phone/email so the embassy can verify them." });
  }

  // 9. repeated & overlong sentences
  const sents = sentences(text);
  const seen = new Map<string, number>();
  for (const s of sents) {
    const k = s.toLowerCase().replace(/[^a-z ]/g, "");
    if (k.length > 25) seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  for (const [k, n] of seen) if (n > 1) {
    const original = sents.find((s) => s.toLowerCase().replace(/[^a-z ]/g, "") === k)!;
    issues.push({ severity: "warning", problem: "Repeated sentence", found: original, suggestion: "Remove the duplicate. The corrected version keeps it once." });
    const parts = corrected.split(original);
    if (parts.length > 2) corrected = parts[0] + original + parts.slice(1).join("");
  }
  for (const s of sents) {
    const words = s.split(/\s+/).length;
    if (words > 45) issues.push({ severity: "tip", problem: `Very long sentence (${words} words)`, found: s.slice(0, 120) + (s.length > 120 ? "…" : ""), suggestion: "Split it into two or three shorter sentences so the officer can read it easily." });
  }

  if (isLetter) corrected = rearrangeLetter(corrected);

  const errors = issues.filter((i) => i.severity === "error").length;
  const warns = issues.filter((i) => i.severity === "warning").length;
  const verdict: DocReview["verdict"] = errors ? "error" : warns ? "warning" : "ok";
  return {
    verdict,
    verdictLabel: errors ? `Error document: ${errors} error(s) must be fixed` : warns ? `Needs improvement: ${warns} warning(s)` : "Looks good",
    issues,
    corrected,
    rearranged: isLetter ? rearrangeLetter(text) : text,
    isLetter,
  };
}

/** Put a letter's blocks into the standard order: header → date → recipient → subject → greeting → body → closing. */
export function rearrangeLetter(text: string) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  if (blocks.length < 3) return text;
  const isGreeting = (b: string) => /^(dear|to whom it may concern)/i.test(b);
  const isSubject = (b: string) => /^(subject|re)\s*:/i.test(b);
  const isClosing = (b: string) => /^(yours (sincerely|faithfully|truly)|kind regards|best regards|sincerely)/i.test(b);
  const isDate = (b: string) => b.length < 40 && DATE_RE.test(b);

  // closing = the sign-off block plus up to 3 short blocks right after it (name, title, signature)
  const closing: number[] = [];
  const ci = blocks.findIndex(isClosing);
  if (ci >= 0) {
    closing.push(ci);
    for (let j = ci + 1; j < blocks.length && closing.length < 4; j++) {
      if (isGreeting(blocks[j]) || isSubject(blocks[j]) || isClosing(blocks[j]) || blocks[j].length > 60) break;
      closing.push(j);
    }
  }
  const gi = blocks.findIndex(isGreeting);
  const header: number[] = [];
  const body: number[] = [];
  blocks.forEach((b, i) => {
    if (closing.includes(i) || isGreeting(b) || isSubject(b)) return;
    if ((gi >= 0 && i < gi && b.length < 300 && (ci < 0 || i < ci || isDate(b))) || isDate(b)) header.push(i);
    else body.push(i);
  });
  const pick = (ids: number[]) => ids.map((i) => blocks[i]);
  return [...pick(header), ...blocks.filter(isSubject), ...blocks.filter(isGreeting), ...pick(body), ...pick(closing)].join("\n\n");
}
