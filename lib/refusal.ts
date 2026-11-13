import { getCountryProfile, getRequirements, type VisaTypeId } from "./requirements";

export type RefusalGround = {
  id: string;
  title: string;
  severity: "low" | "medium" | "high" | "critical";
  explanation: string;
  matched: string[];
  docsToFix: string[];
  howToFix: string[];
};

export type RefusalAnalysis = {
  grounds: RefusalGround[];
  reference?: string;
  decisionDate?: string;
  route: "reapply" | "appeal-or-review" | "legal-advice";
  routeExplanation: string;
  countryOptions: string[];
  reapplySteps: string[];
  reapplyDocs: string[];
  summary: string;
  aiUsed?: boolean;
};

type Rule = Omit<RefusalGround, "matched"> & { patterns: RegExp[] };

const RULES: Rule[] = [
  {
    id: "funds",
    title: "Insufficient or unclear finances",
    severity: "high",
    patterns: [/\bfunds?\b/i, /financial (status|circumstances|means|situation|assets)/i, /bank statements?/i, /sufficient means/i, /source of (the )?(funds|money|deposit)/i, /large deposits?/i, /maintenance/i, /cannot (be )?(satisfied|verified).{0,40}(finance|money|funds)/i, /means of subsistence/i],
    explanation: "The officer was not satisfied you have enough money for the trip, or could not see where the money came from (e.g. sudden large deposits).",
    docsToFix: ["6 months of bank statements with a steady balance", "Explanation + evidence for any large deposits (sale deed, loan, gift letter)", "Payslips matching salary credits", "Tax returns", "Sponsor's bank statements, income proof and relationship proof (if sponsored)", "Fixed deposits / savings certificates"],
    howToFix: ["Keep funds in the account for a consistent period (do not deposit lump sums just before applying).", "Show income that matches your lifestyle and trip cost.", "Explain every unusual transaction in your cover letter."],
  },
  {
    id: "ties",
    title: "Weak ties to home country / doubts you will return",
    severity: "high",
    patterns: [/\bties\b/i, /home country/i, /not satisfied.{0,60}(leave|return|depart)/i, /intention to (leave|return)/i, /214\s*\(?b\)?/i, /family ties/i, /economic (ties|circumstances)/i, /circumstances in your home/i, /incentive to return/i, /R\s?179/i, /end of (the|your) (authorized|authorised) stay/i],
    explanation: "The officer believed you may not leave at the end of your visit — your job, family, property or studies at home were not strong enough or not proven.",
    docsToFix: ["Employer letter with approved leave and return-to-work date", "Property deeds / rental agreements / vehicle ownership", "Marriage & children's birth certificates / school letters", "Business registration and business bank statements", "Return flight reservation"],
    howToFix: ["Prove ongoing commitments at home that require your return.", "Keep the trip length reasonable for your leave and finances.", "Explain your plans after return in the cover letter."],
  },
  {
    id: "purpose",
    title: "Purpose of visit not credible / not genuine",
    severity: "high",
    patterns: [/purpose of (your|the) (visit|trip|stay)/i, /genuine (visitor|student|temporary|entrant)/i, /\bGTE\b/, /\bGS\b requirement/i, /credib/i, /intentions?/i, /justification for the purpose/i, /not (a )?genuine/i, /reason(s)? for (your )?(travel|visit)/i, /V\s?4\.2/i],
    explanation: "Your reason for travelling was unclear, inconsistent, or did not make sense with your profile.",
    docsToFix: ["Detailed cover letter explaining purpose, dates and who pays", "Day-by-day itinerary", "Invitation letter from host (with host's ID/status)", "Hotel and event/conference bookings"],
    howToFix: ["Make every document tell the same story (dates, names, amounts).", "Answer interview/form questions consistently with your documents."],
  },
  {
    id: "study",
    title: "Doubts about study plans / genuine student",
    severity: "high",
    patterns: [/course/i, /academic/i, /study (plan|gap)/i, /genuine student/i, /progression/i, /\bCAS\b/, /\bLOA\b|letter of acceptance/i, /institution/i, /R\s?216\s*\(1\)\s*\(b\)/i],
    explanation: "The officer doubted that the course fits your background or career plan, or saw unexplained study gaps.",
    docsToFix: ["Strong Statement of Purpose linking past studies, the course and career back home", "Gap explanation with work experience letters", "Academic transcripts & certificates", "Evidence of job prospects at home after the course"],
    howToFix: ["Explain why this course, this institution and this country.", "Show the course is a logical progression from your previous studies/work."],
  },
  {
    id: "documents",
    title: "Missing, insufficient or unverifiable documents",
    severity: "medium",
    patterns: [/not (been )?provided/i, /insufficient (documentation|evidence)/i, /missing/i, /did not (provide|submit|include)/i, /no evidence/i, /unable to verify/i, /could not (be )?verif/i, /lack of (documents|evidence)/i, /221\s*\(?g\)?/i],
    explanation: "Some required documents were missing, unclear, or the embassy could not verify them.",
    docsToFix: ["Every document on the official checklist", "Certified translations of non-English documents", "Original letters on letterhead with contact details for verification"],
    howToFix: ["Use the checklist in this app and tick every item.", "Make sure contact numbers on letters are reachable for verification calls."],
  },
  {
    id: "deception",
    title: "False documents or deception",
    severity: "critical",
    patterns: [/decept/i, /false (document|information|representation)/i, /misrepresent/i, /forged|fraudulent|not genuine document/i, /9\.7\.[12]/i, /V\s?3\.7/i, /A40/i, /212\s*\(a\)\s*\(6\)\s*\(C\)/i],
    explanation: "The officer believes false information or documents were used. This is the most serious ground and can lead to multi-year bans.",
    docsToFix: ["Verified original documents", "Explanation and proof if the error was genuine (e.g. bank confirmation letter)"],
    howToFix: ["Do NOT re-apply immediately — get advice from a qualified immigration adviser or lawyer.", "Check whether a re-entry ban applies and when it ends.", "Always disclose this refusal in future applications."],
  },
  {
    id: "immigration-history",
    title: "Previous immigration history / overstay",
    severity: "high",
    patterns: [/overstay/i, /immigration history/i, /breach(ed)? (of )?(conditions|immigration)/i, /previous(ly)? refus/i, /failed to (disclose|declare)/i, /non-?disclosure/i, /9\.8\.\d/i],
    explanation: "Past overstays, breaches, or not disclosing a previous refusal affected the decision.",
    docsToFix: ["Copies of all previous refusal letters", "Proof of departure on time from previous trips", "Explanation letter for past issues"],
    howToFix: ["Always declare every previous refusal on new forms.", "Explain what has changed since."],
  },
  {
    id: "employment",
    title: "Employment / job offer / qualifications concerns",
    severity: "medium",
    patterns: [/job offer/i, /employment (offer|contract)/i, /salary (threshold|level)/i, /skill(s|ed)? (level|requirement)/i, /qualif/i, /work experience/i, /occupation/i, /sponsor licen/i],
    explanation: "The officer had concerns about your job, salary level, skills or the sponsoring employer.",
    docsToFix: ["Signed contract with salary meeting thresholds", "Experience letters with duties", "Qualification certificates & skills assessment", "Employer's sponsorship/compliance documents"],
    howToFix: ["Make sure the job code/salary meet the route's minimums.", "Match your CV, experience letters and the job duties."],
  },
  {
    id: "language",
    title: "Language requirement not met",
    severity: "medium",
    patterns: [/english language/i, /language (requirement|ability|proficiency)/i, /IELTS|TOEFL|PTE/i, /interview.{0,40}(english|communicat)/i],
    explanation: "Your language test or interview did not meet the required level.",
    docsToFix: ["New approved language test meeting the minimum score"],
    howToFix: ["Retake the test and aim above the minimum.", "Practise interview questions about your course/plans."],
  },
  {
    id: "accommodation",
    title: "Accommodation / itinerary not shown",
    severity: "low",
    patterns: [/accommodation/i, /itinerary/i, /hotel/i, /where you (will|intend to) stay/i],
    explanation: "Where you will stay or what you will do during the trip was not clear.",
    docsToFix: ["Confirmed hotel booking or host invitation with address", "Detailed day-by-day itinerary"],
    howToFix: ["Bookings should match your travel dates exactly."],
  },
  {
    id: "insurance",
    title: "Travel medical insurance invalid or missing",
    severity: "low",
    patterns: [/travel medical insurance/i, /insurance/i],
    explanation: "Required travel insurance was missing or did not meet minimum cover (e.g. €30,000 for Schengen).",
    docsToFix: ["Valid travel medical insurance for the whole trip meeting minimum cover"],
    howToFix: ["Buy insurance covering every day of the stay and all destination states."],
  },
  {
    id: "sponsor",
    title: "Sponsor / host concerns",
    severity: "medium",
    patterns: [/sponsor/i, /\bhost\b/i, /inviting person/i, /relationship (to|with) (your )?(sponsor|host)/i],
    explanation: "The officer had doubts about your sponsor's ability to support you or your relationship with them.",
    docsToFix: ["Sponsor's bank statements, payslips, tax returns", "Relationship proof (birth/marriage certificates, photos)", "Sponsor's immigration status document", "Signed sponsorship/undertaking letter"],
    howToFix: ["Show the sponsor's income is enough for their own family and for you."],
  },
  {
    id: "security",
    title: "Security / criminality / public policy",
    severity: "critical",
    patterns: [/criminal/i, /public (policy|order|security|health)/i, /threat to/i, /security grounds/i, /conviction/i, /SIS alert/i],
    explanation: "The refusal involves character, security or public-order grounds.",
    docsToFix: ["Police clearance certificates", "Court documents / rehabilitation evidence"],
    howToFix: ["Seek professional legal advice before re-applying."],
  },
];

const SEV_ORDER = { critical: 0, high: 1, medium: 2, low: 3 } as const;

export function analyzeRefusal(text: string, countryCode: string, visaType: VisaTypeId): RefusalAnalysis {
  const grounds: RefusalGround[] = [];
  for (const rule of RULES) {
    const matched = new Set<string>();
    for (const p of rule.patterns) {
      const m = text.match(p);
      if (m) matched.add(snippet(text, m.index ?? 0, m[0].length));
    }
    if (matched.size) {
      const { patterns: _p, ...g } = rule;
      grounds.push({ ...g, matched: [...matched].slice(0, 3) });
    }
  }
  // "insurance" pattern is broad — drop it if only found inside a longer generic sentence about other grounds
  grounds.sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity] || b.matched.length - a.matched.length);

  const reference = text.match(/\b(GWF\d{6,}|[A-Z]{2,4}\d{6,}|AA\d{8}|[A-Z]\d{9,})\b/)?.[0] ?? text.match(/(reference|application|file)\s*(no\.?|number|#)\s*[:\-]?\s*([A-Z0-9\-/]{5,})/i)?.[3];
  const decisionDate = text.match(/\b(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{4})\b/i)?.[0];

  const profile = getCountryProfile(countryCode);
  const hasCritical = grounds.some((g) => g.severity === "critical");
  const appealMentioned = /appeal|administrative review|right of review|reconsider|tribunal|judicial review|remedy|recourse/i.test(text);
  const noAppeal = /no right of appeal|not entitled to appeal|cannot appeal|no (right of )?administrative review/i.test(text);

  const route: RefusalAnalysis["route"] = hasCritical ? "legal-advice" : appealMentioned && !noAppeal ? "appeal-or-review" : "reapply";
  const routeExplanation =
    route === "legal-advice"
      ? "Serious grounds were found (deception/security). Get professional legal advice before any new application — a ban may apply."
      : route === "appeal-or-review"
        ? "Your letter mentions appeal/review rights. If you believe the officer made a mistake, file the appeal/review before the deadline. Otherwise re-apply with stronger documents."
        : "No appeal right was found in the letter. The fastest route is a fresh application that fixes every refusal reason below.";

  const standard = getRequirements(countryCode, visaType).filter((r) => r.mandatory).map((r) => r.name);
  const fixDocs = grounds.flatMap((g) => g.docsToFix);
  const reapplyDocs = [...new Set(["Copy of the refusal letter", "Cover letter addressing each refusal reason", ...fixDocs, ...standard])];

  const reapplySteps = [
    "Read the refusal letter line by line and list every reason the officer gave.",
    ...(countryCode === "CA" ? ["Order your GCMS notes to see the officer's full notes before re-applying."] : []),
    "For each reason, collect new evidence that directly answers it (see documents below).",
    "Fix inconsistencies: names, dates, salary and amounts must match across all documents and the form.",
    "Write a cover letter that acknowledges the previous refusal and explains what has changed.",
    "Declare the previous refusal truthfully on the new application form.",
    "Re-run this app's document review and aim for a success rate of 80%+ before submitting.",
    "Submit a new application with fresh fee and biometrics.",
  ];

  const summary = grounds.length
    ? `Found ${grounds.length} refusal ground(s): ${grounds.map((g) => g.title).join("; ")}.`
    : "No standard refusal grounds were recognised automatically. Paste the full refusal text (including the officer's reasons) for a better result.";

  return {
    grounds,
    reference,
    decisionDate,
    route,
    routeExplanation,
    countryOptions: profile.refusalOptions ?? [],
    reapplySteps,
    reapplyDocs,
    summary,
  };
}

function snippet(text: string, index: number, len: number) {
  const start = Math.max(0, index - 60);
  const end = Math.min(text.length, index + len + 60);
  return (start > 0 ? "…" : "") + text.slice(start, end).replace(/\s+/g, " ").trim() + (end < text.length ? "…" : "");
}
