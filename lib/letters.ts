export type LetterType = "reconsideration" | "appeal" | "reapply-cover" | "resubmit" | "explanation" | "cover" | "sponsor" | "invitation" | "employer";

export const LETTER_TYPES: { id: LetterType; name: string; hint: string }[] = [
  { id: "reconsideration", name: "Reconsideration request", hint: "Ask the embassy/high commission to review a refusal decision" },
  { id: "appeal", name: "Appeal / administrative review", hint: "Formal appeal where your refusal letter gives that right" },
  { id: "reapply-cover", name: "Re-application cover letter", hint: "New application after a refusal, addressing each reason" },
  { id: "resubmit", name: "Document resubmission letter", hint: "Re-submit corrected or missing documents to the embassy" },
  { id: "explanation", name: "Explanation letter", hint: "Explain a gap, a large deposit, a past refusal, etc." },
  { id: "cover", name: "Visa cover letter", hint: "Standard cover letter for a new application" },
  { id: "sponsor", name: "Sponsor / financial support letter", hint: "Written by the person paying for the trip" },
  { id: "invitation", name: "Invitation letter", hint: "Written by the host in the destination country" },
  { id: "employer", name: "Employer leave / NOC letter", hint: "Employer confirms job and approved leave" },
];

export type LetterInput = {
  type: LetterType;
  applicantName: string;
  applicantAddress: string;
  applicantPhone: string;
  applicantEmail: string;
  passportNo: string;
  nationality: string;
  embassyName: string;
  embassyAddress: string;
  destination: string;
  visaType: string;
  reference: string;
  refusalDate: string;
  travelDates: string;
  purpose: string;
  reasons: { reason: string; response: string }[];
  enclosures: string[];
  extra: string; // other names: sponsor/host/employer name, relationship, etc.
};

export const EMPTY_LETTER: LetterInput = {
  type: "reconsideration", applicantName: "", applicantAddress: "", applicantPhone: "", applicantEmail: "",
  passportNo: "", nationality: "", embassyName: "", embassyAddress: "", destination: "", visaType: "",
  reference: "", refusalDate: "", travelDates: "", purpose: "", reasons: [{ reason: "", response: "" }],
  enclosures: [], extra: "",
};

export function buildLetter(i: LetterInput, dateText = "[Date]"): string {
  const today = () => dateText;
  const name = i.applicantName || "[Your full name]";
  const header = [name, i.applicantAddress, i.applicantPhone, i.applicantEmail].filter(Boolean).join("\n");
  const to = [i.embassyName || "The Visa Officer / Entry Clearance Manager", i.embassyAddress].filter(Boolean).join("\n");
  const visa = i.visaType || "visa";
  const dest = i.destination || "[destination country]";
  const ref = i.reference ? `Application reference: ${i.reference}` : "";
  const pp = i.passportNo ? `Passport number: ${i.passportNo}` : "";
  const reasons = i.reasons.filter((r) => r.reason.trim() || r.response.trim());
  const reasonBlock = reasons
    .map((r, idx) => `${idx + 1}. Refusal reason: ${r.reason || "[reason]"}\n   My response: ${r.response || "[explain with evidence]"}`)
    .join("\n\n");
  const encl = i.enclosures.filter(Boolean);
  const enclBlock = encl.length ? `\nEnclosed documents:\n${encl.map((e, k) => `${k + 1}. ${e}`).join("\n")}\n` : "";
  const sign = `\nYours faithfully,\n\n\n${name}${i.passportNo ? `\nPassport No: ${i.passportNo}` : ""}`;

  const subj = (s: string) => `Subject: ${s}\n${[ref, pp].filter(Boolean).join("\n")}`;

  switch (i.type) {
    case "reconsideration":
      return `${header}\n\n${today()}\n\n${to}\n\n${subj(`Request for reconsideration of ${visa} refusal${i.refusalDate ? ` dated ${i.refusalDate}` : ""}`)}\n\nDear Sir/Madam,\n\nI respectfully request that you reconsider the decision to refuse my ${visa} application for ${dest}${i.refusalDate ? `, notified on ${i.refusalDate}` : ""}. I believe the concerns raised can be fully addressed, and I have enclosed additional evidence that may not have been clear in my original application.\n\nThe purpose of my travel is ${i.purpose || "[purpose]"}${i.travelDates ? `, during ${i.travelDates}` : ""}.\n\nI would like to respond to each reason given in the refusal notice:\n\n${reasonBlock || "1. [Reason] — [Your response with evidence]"}\n\nI have always respected immigration laws and I fully intend to comply with all visa conditions and return home at the end of my authorised stay. I kindly ask you to review my application in light of the clarifications and documents provided.\n${enclBlock}\nThank you for your time and consideration. I am available for an interview or to provide any further information.\n${sign}`;
    case "appeal":
      return `${header}\n\n${today()}\n\n${to}\n\n${subj(`Notice of appeal / request for administrative review – ${visa} refusal${i.refusalDate ? ` dated ${i.refusalDate}` : ""}`)}\n\nDear Sir/Madam,\n\nI hereby submit my appeal against the decision to refuse my ${visa} application for ${dest}. This appeal is submitted within the deadline stated in the refusal notice.\n\nGrounds of appeal:\n\n${reasonBlock || "1. [Reason] — [Why the decision was wrong, with evidence]"}\n\nI submit that the decision was not in accordance with the applicable rules because the evidence provided (and enclosed again here) demonstrates that I meet the requirements. I respectfully request that the decision be withdrawn and the visa be granted.\n${enclBlock}\n${sign}`;
    case "reapply-cover":
      return `${header}\n\n${today()}\n\n${to}\n\n${subj(`Cover letter – new ${visa} application for ${dest} (previous refusal disclosed)`)}\n\nDear Visa Officer,\n\nI am submitting a new ${visa} application to travel to ${dest}${i.travelDates ? ` from ${i.travelDates}` : ""} for the purpose of ${i.purpose || "[purpose]"}.\n\nI would like to transparently disclose that my previous application${i.reference ? ` (${i.reference})` : ""} was refused${i.refusalDate ? ` on ${i.refusalDate}` : ""}. I have carefully reviewed the reasons and this application addresses each of them:\n\n${reasonBlock || "1. [Reason] — [What has changed and the new evidence]"}\n\nMy circumstances have been documented with the enclosed evidence, and I confirm that I will comply with all conditions of the visa and return home before it expires.\n${enclBlock}\nThank you for considering my application.\n${sign}`;
    case "resubmit":
      return `${header}\n\n${today()}\n\n${to}\n\n${subj(`Resubmission of corrected / additional documents – ${visa} application for ${dest}`)}\n\nDear Visa Officer,\n\nWith reference to my ${visa} application${i.reference ? ` (${i.reference})` : ""}, I am resubmitting the following corrected and/or additional documents${i.refusalDate ? ` as requested on ${i.refusalDate}` : ""}.\n\n${reasonBlock ? `Corrections made:\n\n${reasonBlock}\n` : ""}The enclosed documents replace the earlier versions. All names, dates and amounts now match my passport and application form. I apologise for any inconvenience caused and kindly request that you continue processing my application with these documents.\n${enclBlock}\nThank you for your time and consideration.\n${sign}`;
    case "explanation":
      return `${header}\n\n${today()}\n\n${to}\n\n${subj(`Letter of explanation – ${visa} application for ${dest}`)}\n\nDear Visa Officer,\n\nI am writing to explain the following matter(s) in support of my application:\n\n${reasonBlock || "1. [Issue] — [Clear explanation and the evidence enclosed]"}\n\nI hope this clarifies my situation. Supporting evidence is enclosed.\n${enclBlock}\n${sign}`;
    case "cover":
      return `${header}\n\n${today()}\n\n${to}\n\n${subj(`Cover letter – ${visa} application for ${dest}`)}\n\nDear Visa Officer,\n\nI, ${name}, a ${i.nationality || "[nationality]"} national, am applying for a ${visa} to visit ${dest}${i.travelDates ? ` from ${i.travelDates}` : ""}.\n\nPurpose of travel: ${i.purpose || "[purpose]"}\n\n${i.extra || "[Who is paying for the trip, your job/studies at home, family and property ties, and your plan to return]"}\n\nI will respect all conditions of the visa and return home before it expires.\n${enclBlock}\nThank you for your consideration.\n${sign}`;
    case "sponsor":
      return `${i.extra || "[Sponsor's full name, address, phone]"}\n\n${today()}\n\n${to}\n\n${subj(`Letter of financial support for ${name}`)}\n\nDear Visa Officer,\n\nI confirm that I will fully sponsor the ${visa} trip of ${name}${i.passportNo ? ` (passport ${i.passportNo})` : ""} to ${dest}${i.travelDates ? ` during ${i.travelDates}` : ""}, for the purpose of ${i.purpose || "[purpose]"}.\n\nI will cover travel, accommodation, living and medical expenses. My relationship to the applicant is: [relationship]. My income and bank statements are enclosed as proof of my financial capacity.\n${enclBlock}\nYours faithfully,\n\n\n[Sponsor signature and name]`;
    case "invitation":
      return `${i.extra || "[Host's full name, address in destination, phone, status (citizen/resident)]"}\n\n${today()}\n\n${to}\n\n${subj(`Invitation letter for ${name}`)}\n\nDear Visa Officer,\n\nI would like to invite ${name}${i.passportNo ? `, passport ${i.passportNo}` : ""}, to visit me in ${dest}${i.travelDates ? ` from ${i.travelDates}` : ""}. Purpose: ${i.purpose || "[purpose]"}.\n\nThe applicant will stay at my address shown above. [State who pays for the trip.] I confirm the applicant will return home before the visa expires. A copy of my passport/residence permit is enclosed.\n${enclBlock}\nYours faithfully,\n\n\n[Host signature and name]`;
    case "employer":
      return `[Company letterhead]\n\n${today()}\n\n${to}\n\n${subj(`Employment confirmation and leave approval – ${name}`)}\n\nDear Visa Officer,\n\nThis is to confirm that ${name}${i.passportNo ? ` (passport ${i.passportNo})` : ""} is employed with our company as [position] since [start date], earning [monthly salary].\n\nWe have approved leave ${i.travelDates ? `from ${i.travelDates}` : "[dates]"} for travel to ${dest}. ${i.extra || "The employee is expected to resume duties immediately on return and their position will be held."}\n\nPlease contact us at [phone/email] for verification.\n\nYours faithfully,\n\n\n[Name, designation, signature, company stamp]`;
  }
}
