import { composeLong, composeRefusals } from "./sopAuto";
// Statement of Purpose / Genuine Student / Study Plan writer. Uses ONLY the facts the applicant gives;
// anything missing stays as a [placeholder] so nothing is invented.

export type EduEntry = { qualification: string; institution: string; from: string; to: string; result: string; certificate: boolean };
export type JobEntry = { role: string; employer: string; from: string; to: string; current: boolean; duties: string; letter: boolean };
export const EMPTY_EDU: EduEntry = { qualification: "", institution: "", from: "", to: "", result: "", certificate: false };
export const EMPTY_JOB: JobEntry = { role: "", employer: "", from: "", to: "", current: false, duties: "", letter: false };

export type TripEntry = { country: string; year: string; purpose: string };
export type Family = { father: string; mother: string; brothers: string; sisters: string; position: string; marital: string; children: string; spouseJob: string; relativesAbroad: string; livesWith: string };
export const EMPTY_FAMILY: Family = { father: "", mother: "", brothers: "", sisters: "", position: "", marital: "", children: "", spouseJob: "", relativesAbroad: "", livesWith: "" };
export const TRIP_PURPOSES = ["tourism / holiday", "business", "visiting family or friends", "study", "work", "conference / training", "medical", "religious / pilgrimage", "transit", "sports event"];
export const FAMILY_OPTIONS = {
  parentJob: ["Government employee", "Retired government officer", "Private sector employee", "Business owner", "Self-employed", "Farmer", "Teacher", "Doctor / health worker", "Engineer", "Bank officer", "Retired bank officer", "Homemaker", "Retired", "Deceased"],
  count: ["0", "1", "2", "3", "4", "5+"],
  position: ["eldest child", "middle child", "youngest child", "only child", "eldest son", "eldest daughter", "younger son", "younger daughter"],
  marital: ["Single", "Married", "Engaged", "Divorced", "Widowed"],
  relativesAbroad: ["No relatives in the destination country", "A relative studies there", "A relative works there", "A relative is a citizen / permanent resident there"],
  livesWith: ["my parents", "my spouse", "my spouse and children", "my parents, spouse and children", "on my own"],
};

export type RefusalEntry = { country: string; year: string; visaType: string; reason: string; changes: string[] };

/** Quick-pick reasons the applicant ticks; "Write it for me" turns them into a paragraph. */
export const REASON_OPTIONS: Partial<Record<keyof SopInput, string[]>> = {
  whyCourse: ["it builds on my previous degree", "it builds on my work experience", "it fills the skill gaps I need for my career", "it is needed for promotion in my current field", "it is an industry-recognised qualification", "I want to specialise further in this area", "I am moving my career into this field", "it is the natural next step in my academic progression", "it combines theory with practical, hands-on projects", "it covers emerging technologies used in industry today"],
  whyUniversity: ["the course modules match my career goals", "strong industry links, placements and projects", "experienced, research-active teaching staff", "modern facilities, labs and learning resources", "high graduate satisfaction and teaching ratings", "I have been offered a scholarship", "the course is accredited by a professional body", "good support services for international students", "graduates rate it highly for teaching quality and skills development", "it is highly ranked in my discipline", "its research focuses on solving real-world problems", "it offers placement and networking opportunities with industry", "it welcomes a diverse international student community", "I can take part in university sport and student activities"],
  whyCountry: ["its qualifications are recognised worldwide", "it has a high-quality, well-regulated education system", "its qualifications are valued by employers in my home country", "teaching is practical and industry-focused", "it is safe and multicultural", "friends and relatives studied there and returned to good careers", "the total cost is reasonable compared with other study destinations", "it is a world leader in education standards and facilities", "the city is safe, liveable and welcoming to students", "I have visited before and complied fully with my visa"],
  whyNotHome: ["this course is not available in my home country", "this specialisation is not offered locally", "local programmes take longer to complete", "places are very limited and competitive locally", "local programmes lack international recognition", "local facilities and curriculum are less up to date", "local courses are often taught in mixed medium rather than fully in English", "studying locally gives limited international exposure", "local postgraduate courses are more theory-based than practical"],
  shortGoal: ["return to my current employer in a more senior role", "join a leading company in my field at home", "work in the public sector in my field", "join and grow my family business", "start my own business in this field", "work as a specialist / consultant in my field", "join a leading company at home that values overseas postgraduates", "apply new skills to improve systems at my current workplace"],
  longGoal: ["become a senior manager or specialist in my field", "start and grow my own company", "lead major projects in my industry", "train and mentor others in my field", "contribute to my country's development in this field", "move into research or teaching", "grow my current freelance / consultancy work into my own company", "build an international career while based in my home country"],
};
export const REFUSAL_REASONS = ["insufficient or unclear funds", "weak ties to my home country", "the purpose of my visit was not clear", "doubts that I was a genuine student", "missing or unclear documents", "the English requirement was not met", "my previous immigration history", "another reason"];
export const REFUSAL_CHANGES = ["I now have stronger financial evidence held for the required period", "I have a new employment / promotion letter showing my ties", "I have a clear study plan and a course that matches my background", "I have submitted every required document", "I have a new English test result", "I have explained my study and work gaps with evidence", "I have stronger evidence of family and property ties"];

export type SopInput = {
  picks: Partial<Record<string, string[]>>;
  refusalList: RefusalEntry[];
  /** write empty "why" and career sections automatically from the other details */
  autoWrite: boolean;
  trips: TripEntry[];
  travelNone: boolean;
  family: Family;
  /** student → SOP / Genuine Student / study plan; worker → work visa cover letter (letter of explanation) */
  applicantType: "student" | "worker";
  /** auto = country format (Australia GS, Canada study plan); full = full letter SOP with every section */
  style: "auto" | "full";
  /** short ≈ 2 pages, standard ≈ 3–4 pages, detailed ≈ 5–6 pages */
  length: "short" | "standard" | "detailed";
  destEmployer: string; destRole: string; destSalary: string; destStart: string; destContract: string; sponsorRef: string; whyEmployer: string; destAddress: string;
  education: EduEntry[];
  jobs: JobEntry[];
  travelHistory: string;
  fullName: string; nationality: string; homeCity: string; age: string;
  country: string; // destination country name
  countryCode: string;
  level: string; course: string; university: string; universityAddress: string; intake: string; duration: string;
  finalProject: string;
  prevDegree: string; prevInstitution: string; prevYear: string; prevResult: string; prevSubjects: string;
  englishTest: string; englishScore: string;
  workExperience: string; // free text: role, employer, years, duties
  whyCourse: string; whyUniversity: string; whyCountry: string; whyNotHome: string;
  modules: string; // modules / research that interest you
  shortGoal: string; longGoal: string; jobProspects: string; // home-country job/employer/salary prospects
  funding: string; sponsor: string; fundsAmount: string;
  familyTies: string; assets: string;
  gaps: string; refusals: string; achievements: string; extra: string;
};

export const EMPTY_SOP: SopInput = {
  applicantType: "student",
  style: "auto",
  length: "detailed",
  picks: {}, refusalList: [],
  autoWrite: true, trips: [], travelNone: false, family: { father: "", mother: "", brothers: "", sisters: "", position: "", marital: "", children: "", spouseJob: "", relativesAbroad: "", livesWith: "" },
  destEmployer: "", destRole: "", destSalary: "", destStart: "", destContract: "", sponsorRef: "", whyEmployer: "", destAddress: "",
  education: [], jobs: [], travelHistory: "",
  fullName: "", nationality: "", homeCity: "", age: "", country: "", countryCode: "",
  level: "", course: "", university: "", universityAddress: "", intake: "", duration: "", finalProject: "",
  prevDegree: "", prevInstitution: "", prevYear: "", prevResult: "", prevSubjects: "",
  englishTest: "", englishScore: "", workExperience: "",
  whyCourse: "", whyUniversity: "", whyCountry: "", whyNotHome: "", modules: "",
  shortGoal: "", longGoal: "", jobProspects: "", funding: "", sponsor: "", fundsAmount: "",
  familyTies: "", assets: "", gaps: "", refusals: "", achievements: "", extra: "",
};

export const ENGLISH_TEST_OPTIONS = [
  "IELTS Academic", "IELTS UKVI", "IELTS General Training", "PTE Academic", "PTE Academic UKVI", "TOEFL iBT", "Duolingo English Test",
  "OET", "Cambridge C1 Advanced", "Cambridge C2 Proficiency", "LanguageCert", "MOI waiver (Medium of Instruction letter)",
  "University English waiver", "Not required (English-speaking country)", "Not taken yet",
];

export const LEVEL_OPTIONS = [
  "Certificate in", "Diploma of", "Advanced Diploma of", "Foundation programme in", "Bachelor of", "Bachelor (Honours) of",
  "Graduate Certificate in", "Graduate Diploma in", "Postgraduate Diploma in", "Master of", "Master by Research in", "MBA in",
  "PhD / Doctor of Philosophy in", "English language course (ELICOS)", "Vocational course (VET) in",
];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const INTAKE_OPTIONS = [2026, 2027, 2028, 2029].flatMap((y) => MONTHS.map((m) => `${m} ${y}`));
export const DURATION_OPTIONS = ["3 months", "6 months", "9 months", "1 year", "15 months", "18 months", "2 years", "3 years", "4 years", "5 years"];
export const QUALIFICATION_OPTIONS = [
  "GCE O/L (Ordinary Level)", "GCE A/L (Advanced Level)", "High school / Grade 12", "Foundation programme", "Diploma",
  "Higher National Diploma (HND)", "Bachelor's degree", "Bachelor's degree (Honours)", "Postgraduate Diploma", "Master's degree", "PhD",
];
export const YEAR_OPTIONS = Array.from({ length: 31 }, (_, i) => String(2026 - i));
export const FUNDING_OPTIONS = [
  "my own savings", "my parents' savings", "my parents' savings and an education loan", "an education loan", "a full scholarship",
  "a partial scholarship and family support", "my sponsor (a close relative)", "my employer", "my spouse",
];
export const RELATIONSHIP_OPTIONS = ["Father", "Mother", "Both parents", "Spouse", "Brother", "Sister", "Uncle", "Aunt", "Grandparent", "Employer", "Self (no sponsor)"];

type FieldType = "text" | "textarea" | "select" | "country";
type FieldDef = [keyof SopInput, string, FieldType, string[]?];
type Section = { section: string; fields: FieldDef[] };

const ABOUT: Section = { section: "About you", fields: [["fullName", "Full name (as in passport)", "text"], ["nationality", "Nationality", "country"], ["homeCity", "Home city / country", "text"], ["age", "Age", "text"]] };
const OTHER: Section = { section: "Other (optional)", fields: [["gaps", "Explain any study / work gaps", "textarea"], ["refusals", "Previous visa refusals and what changed", "textarea"], ["achievements", "Achievements, awards, volunteering", "textarea"], ["extra", "Anything else", "textarea"]] };

/** Fields for students (SOP / Genuine Student / study plan). Education & jobs are edited as lists. */
export const SOP_FIELDS: Section[] = [
  ABOUT,
  { section: "Course you applied for", fields: [["level", "Course level", "select", LEVEL_OPTIONS], ["course", "Course name (e.g. Data Science)", "text"], ["university", "University / college (filled from offer letter)", "text"], ["universityAddress", "University address (filled from offer letter)", "textarea"], ["intake", "Intake", "select", INTAKE_OPTIONS], ["duration", "Course duration", "select", DURATION_OPTIONS], ["modules", "Modules / research areas that interest you", "textarea"]] },
  { section: "English & studies", fields: [["prevSubjects", "Main subjects of your last degree (tick suggestions or type)", "textarea"], ["finalProject", "Final project / dissertation title (optional)", "text"], ["englishTest", "English test (or MOI waiver)", "select", ENGLISH_TEST_OPTIONS], ["englishScore", "Score (overall band / total)", "text"]] },
  { section: "Why this course, university and country", fields: [["whyCourse", "Why this course (how it builds on your studies/work)", "textarea"], ["whyUniversity", "Why this university (modules, facilities, staff, industry links)", "textarea"], ["whyCountry", "Why this country", "textarea"], ["whyNotHome", "Why not study this in your home country", "textarea"]] },
  { section: "Career plans after the course", fields: [["shortGoal", "Short-term goal (1–3 years after graduating)", "textarea"], ["longGoal", "Long-term goal", "textarea"], ["jobProspects", "Job prospects at home (employers, roles, expected salary)", "textarea"]] },
  { section: "Funding & ties to home", fields: [["funding", "How you will pay", "select", FUNDING_OPTIONS], ["sponsor", "Sponsor relationship", "select", RELATIONSHIP_OPTIONS], ["fundsAmount", "Funds available (e.g. LKR 12,000,000)", "text"], ["familyTies", "Extra family details (optional)", "textarea"], ["assets", "Property / business / job to return to", "textarea"]] },
  OTHER,
];

/** Fields for workers (work visa cover letter / letter of explanation). */
export const WORK_FIELDS: Section[] = [
  ABOUT,
  { section: "Job offer in the destination country", fields: [["destRole", "Job title", "text"], ["destEmployer", "Employer (company name)", "text"], ["destAddress", "Workplace address / city", "text"], ["destStart", "Start date", "text"], ["destContract", "Contract length", "select", ["Permanent", "1 year", "2 years", "3 years", "4 years", "5 years", "Seasonal / temporary"]], ["destSalary", "Salary offered (e.g. GBP 38,700 per year)", "text"], ["sponsorRef", "Sponsorship / permit reference (CoS, LMIA, nomination, work permit no.)", "text"], ["whyEmployer", "Why this job matches your skills and experience", "textarea"]] },
  { section: "English", fields: [["englishTest", "English test (or exemption)", "select", ENGLISH_TEST_OPTIONS], ["englishScore", "Score", "text"]] },
  { section: "Ties & plans", fields: [["familyTies", "Family (travelling with you or at home)", "textarea"], ["assets", "Property / business at home", "textarea"], ["shortGoal", "Your plans (e.g. return after contract, career growth)", "textarea"]] },
  OTHER,
];

const v = (s: string, placeholder: string) => (s?.trim() ? s.trim() : `[${placeholder}]`);
const para = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");
const MONTHS_TXT = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "2008-03" → "March 2008"; anything else is returned as typed. */
export function monthText(s: string) {
  const m = s?.match(/^(\d{4})-(\d{2})/);
  return m ? `${MONTHS_TXT[Number(m[2]) - 1]} ${m[1]}` : (s ?? "").trim();
}
const monthIndex = (s: string) => {
  const m = s?.match(/^(\d{4})(?:-(\d{2}))?/);
  return m ? Number(m[1]) * 12 + (m[2] ? Number(m[2]) - 1 : 0) : null;
};
const period = (from: string, to: string, current: boolean) => (from ? `From ${monthText(from)} to ${current ? "the present" : monthText(to) || "[end date]"}` : "");

/** Periods of 6+ months not covered by any study or job (needs explaining). */
export function findGaps(i: SopInput): string[] {
  const spans = [
    ...i.education.map((e) => [monthIndex(e.from), monthIndex(e.to)] as const),
    ...i.jobs.map((j) => [monthIndex(j.from), j.current ? Number.POSITIVE_INFINITY : monthIndex(j.to)] as const),
  ].filter((x): x is readonly [number, number] => x[0] !== null && x[1] !== null).sort((a, b) => a[0] - b[0]);
  const gaps: string[] = [];
  let end = spans[0]?.[1] ?? 0;
  for (const [a, b] of spans.slice(1)) {
    if (a - end >= 6) gaps.push(`${MONTHS_TXT[end % 12]} ${Math.floor(end / 12)} – ${MONTHS_TXT[a % 12]} ${Math.floor(a / 12)}`);
    end = Math.max(end, b);
  }
  return gaps;
}

function educationText(i: SopInput) {
  const list = i.education.filter((e) => e.qualification || e.institution).sort((a, b) => (monthIndex(a.from) ?? 0) - (monthIndex(b.from) ?? 0));
  if (!list.length) {
    if (!i.prevDegree) return "[Add your qualifications in the “Academic qualifications” list]";
    return `I completed my ${i.prevDegree} at ${v(i.prevInstitution, "institution")} in ${v(i.prevYear, "year")}${i.prevResult ? `, achieving ${i.prevResult}` : ""}.`;
  }
  return list
    .map((e) => {
      const when = e.to ? `In ${monthText(e.to)}` : e.from ? `Since ${monthText(e.from)}` : "";
      return `${when ? `${when}, ` : ""}I ${e.to ? "completed" : "have been studying"} ${v(e.qualification, "qualification")} at ${v(e.institution, "institution")}${e.result ? `, achieving ${e.result}` : ""}.`;
    })
    .join(" ");
}

function englishText(i: SopInput) {
  if (!i.englishTest) return "";
  if (/waiver|moi/i.test(i.englishTest)) return /moi|medium/i.test(i.englishTest) ? "My previous studies were taught entirely in English, and my English proficiency is confirmed by a Medium of Instruction (MOI) letter." : "My English proficiency has been accepted by the university through an English language waiver, as my previous studies were taught in English.";
  if (/not required/i.test(i.englishTest)) return "I am exempt from an English test as I am from an English-speaking country.";
  if (/not taken/i.test(i.englishTest)) return "[Add your English test result once available]";
  return `I have taken the ${i.englishTest}${i.englishScore ? `, achieving an overall score of ${i.englishScore}` : ""}.`;
}

function workText(i: SopInput) {
  const list = i.jobs.filter((j) => j.role || j.employer).sort((a, b) => (monthIndex(a.from) ?? 0) - (monthIndex(b.from) ?? 0));
  if (!list.length) return i.workExperience.trim() ? `Professionally, ${i.workExperience.trim().replace(/^./, (c) => c.toLowerCase())}` : "";
  return list
    .map((j) => {
      const p = period(j.from, j.to, j.current);
      return `${p ? `${p}, ` : ""}I ${j.current ? "have been working" : "worked"} as ${v(j.role, "job title")} at ${v(j.employer, "employer")}${j.duties ? `, where I ${j.duties.trim().replace(/^./, (c) => c.toLowerCase()).replace(/\.$/, "")}` : ""}.`;
    })
    .join("\n");
}

function travelText(i: SopInput) {
  if (i.travelNone) return "This will be my first trip abroad. I understand the importance of complying with visa conditions and will do so fully.";
  const trips = (i.trips ?? []).filter((t) => t.country);
  if (trips.length) {
    const list = trips.sort((a, b) => (a.year || "").localeCompare(b.year || "")).map((t) => `${t.country}${t.year ? ` in ${t.year}` : ""}${t.purpose ? ` (${t.purpose})` : ""}`);
    const joined = list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0];
    return `I have previously travelled to ${joined}. On every trip I complied with all visa conditions and returned home on time.`;
  }
  return i.travelHistory?.trim() ? `I have travelled to ${i.travelHistory.trim().replace(/\.$/, "")}, and complied with all visa conditions.` : "";
}

function familyText(i: SopInput) {
  const f = i.family ?? EMPTY_FAMILY;
  const n = (x: string) => (x === "5+" ? "five or more" : ["no", "one", "two", "three", "four"][Number(x)] ?? x);
  const job = (x: string) => (/deceased/i.test(x) ? "has passed away" : /retired|homemaker/i.test(x) ? `is ${/^retired$/i.test(x) ? "retired" : x.toLowerCase().replace(/^retired/, "a retired")}` : `is ${/^[aeiou]/i.test(x) ? "an" : "a"} ${x.toLowerCase()}`);
  const sib = [f.brothers && f.brothers !== "0" ? `${n(f.brothers)} brother${f.brothers === "1" ? "" : "s"}` : "", f.sisters && f.sisters !== "0" ? `${n(f.sisters)} sister${f.sisters === "1" ? "" : "s"}` : ""].filter(Boolean).join(" and ");
  const parts = [
    f.position && `I am the ${f.position} in my family${sib ? `, with ${sib}` : ""}.`,
    !f.position && sib && `I have ${sib}.`,
    f.father && `My father ${job(f.father)}.`,
    f.mother && `My mother ${job(f.mother)}.`,
    f.marital && f.marital !== "Single" && `I am ${f.marital.toLowerCase()}${f.spouseJob ? `, and my spouse ${job(f.spouseJob)}` : ""}${f.children && f.children !== "0" ? `, with ${n(f.children)} child${f.children === "1" ? "" : "ren"}` : ""}.`,
    f.marital === "Single" && "I am single.",
    f.livesWith && `I live with ${f.livesWith} in ${i.homeCity.split(",").slice(-2).join(",").trim() || "my home country"}, and my close family will remain there while I study.`,
    f.relativesAbroad && (/^no relatives/i.test(f.relativesAbroad) ? `I have no relatives in ${i.country || "the destination country"}.` : `${f.relativesAbroad.replace(/^A relative/, "One of my relatives")}.`),
    i.familyTies.trim() && `${i.familyTies.trim().replace(/\.$/, "")}.`,
  ].filter(Boolean);
  return parts.join(" ");
}

const full = (x: string) => /^[A-Z]/.test((x ?? "").trim());
const joinList = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0] ?? "");

/** Text for one field from the ticked reasons (falls back to good default wording). */
/** 150+ word answer for one question, from the ticked reasons and the applicant's details. */
export function composeField(key: keyof SopInput, i: SopInput): string {
  if (key === "refusals") return composeRefusals(i);
  return composeLong(key, i);
}

function refusalText(i: SopInput) {
  return composeRefusals(i);
}
function refusalTextShort(i: SopInput) {
  const list = (i.refusalList ?? []).filter((r) => r.country || r.reason);
  return list
    .map((r) => `In ${r.year || "[year]"}, my ${r.visaType ? ({ "Visit / Tourist": "visitor", Work: "work", Student: "student", Business: "business", Family: "family", Transit: "transit" } as Record<string, string>)[r.visaType] ?? r.visaType.toLowerCase() : ""}${r.visaType ? " " : ""}visa application to ${/^(United|Netherlands|Philippines|Czech|Maldives|Bahamas|Gambia)/.test(r.country) ? "the " : ""}${r.country || "[country]"} was refused because of ${r.reason || "[reason]"}.${r.changes.length ? ` Since then, ${joinList(r.changes.map((c) => c.replace(/^I /, "I ")))}.` : ""} I have declared this refusal and addressed it fully in this application.`)
    .join(" ");
}

/** Good default wording built only from details already entered (used when "write automatically" is on). */
function auto(i: SopInput) {
  const home = homeCountryOf(i);
  const country = i.country || "the destination country";
  const course = `${i.level} ${i.course}`.replace(/\s+/g, " ").trim() || "this course";
  const lastEdu = [...(i.education ?? [])].filter((e) => e.qualification).sort((a, b) => (a.to || a.from).localeCompare(b.to || b.from)).pop();
  const lastJob = [...(i.jobs ?? [])].filter((j) => j.role).sort((a, b) => (a.current ? 1 : 0) - (b.current ? 1 : 0) || (a.from || "").localeCompare(b.from || "")).pop();
  return {
    whyCourse: `it builds directly on ${lastEdu ? lastEdu.qualification.trim().replace(/^(?!my |a |the )/i, "my ") : "my previous studies"}${lastJob ? ` and my experience as ${lastJob.role.trim()}${lastJob.employer ? ` at ${lastJob.employer.trim()}` : ""}` : ""}, and it will give me the advanced, up-to-date knowledge I need to progress in my career`,
    whyUniversity: `its ${course} is well structured and industry-relevant, covers the areas I want to specialise in, and offers the academic support, facilities and learning environment I need to succeed`,
    whyCountry: `${country} is known worldwide for high-quality education. Its qualifications are internationally recognised and respected by employers in ${home}, and studying there will give me valuable international exposure in a safe, multicultural environment.`,
    whyNotHome: `A programme with the same content, structure and international recognition is not available to me in ${home}. Studying in ${country} will also give me practical exposure to current technology and international best practice that I cannot gain locally.`,
    shortGoal: `apply the knowledge and skills gained from the ${course} in a more senior professional role${lastJob ? `, building on my experience as ${lastJob.role.trim()}` : ""}`,
    longGoal: `continue developing my career and contribute to the growth of my field in ${home}`,
  };
}

function homeCountryOf(i: SopInput) {
  return i.nationality.trim() || i.homeCity.split(",").pop()?.trim() || "[home country]";
}

function gapText(i: SopInput) {
  if (i.gaps.trim()) return i.gaps.trim();
  const g = findGaps(i);
  return g.length ? `[Explain what you were doing during: ${g.join("; ")}]` : "";
}

export function sopFormat(code: string, style: "auto" | "full" = "auto"): "au-gs" | "ca-plan" | "standard" | "full" {
  if (style === "full") return "full";
  return code === "AU" ? "au-gs" : code === "CA" ? "ca-plan" : "standard";
}

export function buildSop(input: SopInput): string {
  if (input.applicantType === "worker") return buildWorkLetter(input);
  const a = input.autoWrite ? auto(input) : null;
  const i: SopInput = a
    ? {
        ...input,
        whyCourse: input.whyCourse || composeField("whyCourse", input),
        whyUniversity: input.whyUniversity || composeField("whyUniversity", input),
        whyCountry: input.whyCountry || composeField("whyCountry", input),
        whyNotHome: input.whyNotHome || composeField("whyNotHome", input),
        shortGoal: input.shortGoal || composeField("shortGoal", input),
        longGoal: input.longGoal || composeField("longGoal", input),
        refusals: input.refusals || refusalText(input),
      }
    : { ...input, refusals: input.refusals || refusalText(input) };
  const name = v(i.fullName, "Your full name");
  const course = `${v(i.level, "level")} ${v(i.course, "course name")}`.replace(/\s+/g, " ");
  const uni = v(i.university, "university");
  const country = v(i.country, "destination country");
  const background = para(educationText(i), i.prevSubjects && `During my studies I focused on ${i.prevSubjects}.`, englishText(i));
  const work = workText(i);
  const whyCourseText = full(i.whyCourse) ? i.whyCourse.trim() : para(
    `I have chosen the ${course} because ${v(i.whyCourse, "explain how the course builds on your studies and work")}.`,
    i.modules && `The units that interest me most are ${i.modules}, which match the skills I need for my career.`,
    i.prevSubjects && `They build directly on what I studied before: ${i.prevSubjects}.`,
  );
  const whyUniText = full(i.whyUniversity) ? i.whyUniversity.trim() : `I chose ${uni} because ${v(i.whyUniversity, "reasons specific to this university")}.`;
  const why = para(whyCourseText, whyUniText);
  const whyCountry = para(full(i.whyCountry) ? i.whyCountry.trim() : `I chose to study in ${country} because ${v(i.whyCountry, "reasons for this country")}.`, i.whyNotHome && (full(i.whyNotHome) ? i.whyNotHome.trim() : `A comparable programme is not available to me at home because ${i.whyNotHome}.`));
  const career = para(
    full(i.shortGoal) ? i.shortGoal.trim() : `After completing the course, I plan to return to ${homeCountryOf(i)} and ${v(i.shortGoal, "short-term career goal")}.`,
    i.longGoal && (full(i.longGoal) ? i.longGoal.trim() : `In the long term, I aim to ${i.longGoal}.`),
    i.jobProspects && `There are strong opportunities for this qualification at home: ${i.jobProspects}.`,
  );
  const money = para(
    `My studies will be funded by ${v(i.funding, "source of funds")}${i.sponsor && !/self/i.test(i.sponsor) ? ` (sponsor: my ${/both parents/i.test(i.sponsor) ? "parents" : i.sponsor.toLowerCase()})` : ""}${i.fundsAmount ? `, with ${i.fundsAmount} available` : ""}.`,
    "The financial documents enclosed show that these funds are genuinely available to me.",
  );
  const fam = familyText(i);
  const ties = para(fam, i.assets && `I also have ${i.assets}, which I will return to.`, "I fully intend to comply with all visa conditions and return home after my studies.");
  const travel = travelText(i);
  const other = para(gapText(i), i.refusals && (/^In /.test(i.refusals) ? i.refusals : `I would like to disclose a previous visa refusal: ${i.refusals}.`), i.achievements && `Outside my studies, ${i.achievements}.`, i.extra);

  const fmt = sopFormat(i.countryCode, i.style);
  if (fmt === "full") {
    const homeCountry = homeCountryOf(i);
    return [
      [name, i.homeCity].filter(Boolean).join("\n"),
      "[Date]",
      ["The Visa Officer / Admissions Manager", uni, i.universityAddress.trim()].filter(Boolean).join("\n"),
      "Dear Sir/Madam,",
      `Statement of Purpose: ${name}`,
      `I, ${name}, write this statement of purpose in support of my application to study the ${course} at ${uni}, ${country}${i.intake ? `, starting ${i.intake}` : ""}${i.duration ? ` (${i.duration})` : ""}.`,
      `Education (Academic Qualifications by Date)\n${educationText(i)}`,
      englishText(i) && `English Language (IELTS / Waiver)\n${englishText(i)}`,
      work && `Work Experience\n${work}`,
      gapText(i) && `Gaps (Study and Work Gaps Explained)\n${gapText(i)}`,
      i.whyNotHome.trim() && `Why not Study in ${homeCountry}\n${i.whyNotHome.trim()}`,
      `Reasons for Choosing ${country}\n${v(i.whyCountry, "specific reasons for choosing this country")}`,
      `Reasons for Choosing the Course: ${course}\n${whyCourseText}`,
      `Reasons for Choosing the University: ${uni}\n${whyUniText}`,
      `Future Career Plans and Returning to ${homeCountry}\n${career}`,
      travel && `Travel History (Immigration History)\n${travel}`,
      (fam || i.assets) && `Family Background\n${para(fam, i.assets && `I also have ${i.assets}, which I will return to.`)}`,
      `Financial Support\n${money}`,
      para(i.refusals && (/^In /.test(i.refusals) ? i.refusals : `I would like to disclose a previous visa refusal: ${i.refusals}.`), i.achievements && `Outside my studies, ${i.achievements}.`, i.extra) && `Additional information\n${para(i.refusals && (/^In /.test(i.refusals) ? i.refusals : `I would like to disclose a previous visa refusal: ${i.refusals}.`), i.achievements && `Outside my studies, ${i.achievements}.`, i.extra)}`,
      `I fully intend to comply with all visa conditions and to return to ${homeCountry} on completion of my studies. I would be grateful if you would consider my application favourably.`,
      `Yours sincerely,\n\n\n${name}\n(Applicant)`,
    ].filter(Boolean).join("\n\n");
  }
  if (fmt === "au-gs") {
    return [
      `GENUINE STUDENT STATEMENT: ${name}`,
      `Course: ${course}, ${uni} (${v(i.intake, "intake")})`,
      `1. My current circumstances\n${para(`I am ${name}${i.age ? `, aged ${i.age},` : ""} from ${v(i.homeCity, "home city / country")}.`, background)}${work ? `\n${work}` : ""}\n${ties}`,
      `2. Why I want to study this course with this provider in Australia\n${why}\n${whyCountry}`,
      `3. How completing this course will benefit me in the future\n${career}`,
      `4. Other relevant information\n${money}${travel ? `\n${travel}` : ""}${other ? `\n${other}` : ""}`,
    ].join("\n\n");
  }
  if (fmt === "ca-plan") {
    return [
      `STUDY PLAN: ${name}`,
      `Program: ${course}, ${uni}${i.intake ? `, starting ${i.intake}` : ""}${i.duration ? ` (${i.duration})` : ""}`,
      `Educational background\n${background}`,
      work && `Work experience\n${work}`,
      `Why this program and institution\n${why}`,
      `Why Canada\n${whyCountry}`,
      `Career goals and plans after graduation\n${career}`,
      `Financial support\n${money}`,
      `Ties to my home country\n${ties}`,
      travel && `Travel history\n${travel}`,
      other && `Additional information\n${other}`,
    ].filter(Boolean).join("\n\n");
  }
  return [
    `STATEMENT OF PURPOSE: ${name}`,
    `${course} · ${uni} · ${country}${i.intake ? ` · ${i.intake}` : ""}`,
    `Introduction\nMy name is ${name} and I am applying to study the ${course} at ${uni}. This statement explains my academic background, my reasons for choosing this course, university and country, and my plans after graduation.`,
    `Academic background\n${background}`,
    work && `Work experience\n${work}`,
    `Why this course\n${whyCourseText}`,
    `Why ${uni}\n${whyUniText}`,
    `Why ${country}\n${whyCountry}`,
    `Career goals\n${career}`,
    `Funding\n${money}`,
    `Ties to my home country\n${ties}`,
    travel && `Travel history\n${travel}`,
    other && `Additional information\n${other}`,
    `Conclusion\nI am confident that the ${course} at ${uni} is the right next step for my career, and I am committed to completing it successfully and returning home to apply what I have learned.\n\n${name}`,
  ].filter(Boolean).join("\n\n");
}

/** Work visa cover letter / letter of explanation: short, factual, lists the job and enclosed documents. */
export function buildWorkLetter(i: SopInput): string {
  const name = v(i.fullName, "Your full name");
  const country = v(i.country, "destination country");
  const role = v(i.destRole, "job title");
  const employer = v(i.destEmployer, "employer");
  const work = workText(i);
  const education = educationText(i);
  const english = englishText(i);
  const travel = travelText(i);
  return [
    `COVER LETTER: WORK VISA APPLICATION`,
    `Applicant: ${name}${i.nationality ? `, ${i.nationality} national` : ""}`,
    `Position: ${role}, ${employer}${i.destAddress ? `, ${i.destAddress}` : ""}, ${country}`,
    `Dear Visa Officer,`,
    `I am applying for a work visa to take up the position of ${role} with ${employer} in ${country}${i.destStart ? `, starting ${i.destStart}` : ""}. ${para(i.destContract && `The contract is ${/permanent/i.test(i.destContract) ? "permanent" : `for ${i.destContract.toLowerCase()}`}`, i.destSalary && `with a salary of ${i.destSalary}`)}${i.destContract || i.destSalary ? "." : ""}${i.sponsorRef ? ` My sponsorship / permit reference is ${i.sponsorRef}.` : ""}`,
    `My experience\n${work || "[Add your jobs in the “Work experience” list]"}`,
    `My qualifications\n${para(education, english)}`,
    `Why I am suited to this role\n${v(i.whyEmployer, "explain how your skills and experience match the job")}`,
    para(familyText(i), i.assets && `At home I have ${i.assets}.`, i.shortGoal && `My plans: ${i.shortGoal}.`, travel, gapText(i), i.refusals && (/^In /.test(i.refusals) ? i.refusals : `I would like to disclose a previous visa refusal: ${i.refusals}.`), i.extra) || "",
    `I confirm that the information in this application is true, and I will comply with all the conditions of my visa.\n\nEnclosed: passport, signed employment contract / job offer, sponsorship or work permit document, qualification certificates, experience letters, English test result${i.travelHistory ? ", previous visas" : ""}.`,
    `Yours faithfully,\n\n\n${name}`,
  ].filter(Boolean).join("\n\n");
}

export function wordCount(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}

/**
 * Example SOP (structure and reasoning based on a real, successful-style Master of Computer Science SOP for Australia).
 * The applicant, address and employers are fictional so no personal data is published.
 */
export const EXAMPLE_SOP: SopInput = {
  ...EMPTY_SOP,
  applicantType: "student", style: "full", autoWrite: true,
  fullName: "Nimal Silva", nationality: "Sri Lanka", homeCity: "Maharagama, Colombo, Sri Lanka", age: "",
  countryCode: "AU", country: "Australia", level: "Master of", course: "Computer Science", university: "Edith Cowan University",
  universityAddress: "Joondalup Campus, 270 Joondalup Drive, Joondalup, Western Australia 6027", intake: "February 2027", duration: "2 years",
  education: [
    { ...EMPTY_EDU, qualification: "my GCE O/L (Ordinary Level)", institution: "a national school in Colombo", to: "2008-12", result: "Distinctions and Credits", certificate: true },
    { ...EMPTY_EDU, qualification: "my GCE A/L (Advanced Level) in the Science stream", institution: "a leading college in Colombo", to: "2011-08", certificate: true },
    { ...EMPTY_EDU, qualification: "the Pearson BTEC Level 5 Higher National Diploma in Computing", institution: "a private higher education institute", from: "2013-01", to: "2014-12", certificate: true },
    { ...EMPTY_EDU, qualification: "a BSc (Hons) Computing top-up degree", institution: "a UK university (local delivery partner)", from: "2015-01", to: "2016-01", result: "First Class Honours", certificate: true },
  ],
  jobs: [
    { ...EMPTY_JOB, role: "IT Assistant", employer: "a sports goods company", from: "2011-09", to: "2013-12", duties: "maintained the accounting system, entered source documents and produced monthly reports", letter: true },
    { ...EMPTY_JOB, role: "Banking Assistant (IT systems)", employer: "a national bank", from: "2014-01", current: true, duties: "run a module of the bank's core system, troubleshoot system issues, produce management reports and train junior staff", letter: true },
    { ...EMPTY_JOB, role: "freelance IT consultant", employer: "a packaging company", from: "2016-06", current: true, duties: "maintain and upgrade the company's software and hardware and carry out an annual IT quality audit", letter: true },
  ],
  englishTest: "MOI waiver (Medium of Instruction letter)",
  prevSubjects: "software development, databases, networking and systems analysis",
  modules: "Emerging Technologies and Innovation (core), Android App Development, Systems Analysis, Object Modelling and Professional Programming Practice",
  picks: {
    whyCourse: ["it is the natural next step in my academic progression", "it builds on my previous degree", "it builds on my work experience", "it covers emerging technologies used in industry today"],
    whyUniversity: ["the course modules match my career goals", "graduates rate it highly for teaching quality and skills development", "its research focuses on solving real-world problems", "it offers placement and networking opportunities with industry", "I can take part in university sport and student activities"],
    whyCountry: ["its qualifications are recognised worldwide", "its qualifications are valued by employers in my home country", "friends and relatives studied there and returned to good careers", "the city is safe, liveable and welcoming to students"],
    whyNotHome: ["this specialisation is not offered locally", "local programmes take longer to complete", "local courses are often taught in mixed medium rather than fully in English", "studying locally gives limited international exposure"],
    shortGoal: ["join a leading company at home that values overseas postgraduates"],
    longGoal: ["grow my current freelance / consultancy work into my own company"],
  },
  jobProspects: "leading software companies in Sri Lanka recruit postgraduates with up-to-date skills for senior engineering roles",
  funding: "my parents' savings", sponsor: "Both parents", fundsAmount: "",
  family: { father: "Retired bank officer", mother: "Business owner", brothers: "1", sisters: "1", position: "eldest son", marital: "Single", children: "", spouseJob: "", relativesAbroad: "No relatives in the destination country", livesWith: "my parents" },
  trips: [{ country: "Thailand", year: "2016", purpose: "business" }, { country: "France", year: "2018", purpose: "tourism / holiday" }, { country: "Australia", year: "2018", purpose: "tourism / holiday" }],
  gaps: "Between my studies I was in continuous full-time employment, which my employment letters confirm, while also coaching school sports part time.",
  achievements: "I represented my school in cricket and rugby, was a member of the debating team, and coach school sports teams part time",
};

/** Typical subjects by field, suggested from the applicant's last qualification. */
export const SUBJECTS_BY_FIELD: { field: string; match: RegExp; subjects: string[] }[] = [
  { field: "Computing / IT", match: /comput|software|information tech|\bit\b|cyber|data|network|systems/i, subjects: ["programming", "software engineering", "databases", "networking", "systems analysis and design", "web development", "object-oriented programming", "data structures and algorithms", "operating systems", "cyber security", "project management", "mobile application development"] },
  { field: "Business / Management", match: /business|management|mba|commerce|marketing|hrm|human resource/i, subjects: ["management principles", "marketing", "organisational behaviour", "human resource management", "business economics", "strategic management", "operations management", "business law", "entrepreneurship", "project management"] },
  { field: "Accounting / Finance", match: /account|financ|banking|economics|cima|acca/i, subjects: ["financial accounting", "management accounting", "corporate finance", "auditing", "taxation", "business law", "economics", "financial reporting", "investment analysis"] },
  { field: "Engineering", match: /engineer|mechanical|electrical|civil|electronic|mechatronic/i, subjects: ["engineering mathematics", "mechanics", "electrical circuits", "thermodynamics", "materials science", "engineering design", "control systems", "structural analysis", "project management"] },
  { field: "Nursing / Health", match: /nurs|health|medic|pharma|biomed|physio|public health/i, subjects: ["anatomy and physiology", "pharmacology", "patient care", "community health", "health promotion", "microbiology", "clinical practice", "research methods"] },
  { field: "Education / Teaching", match: /education|teaching|pedagog|early childhood/i, subjects: ["educational psychology", "curriculum development", "teaching methods", "classroom management", "assessment and evaluation", "inclusive education"] },
  { field: "Hospitality / Tourism", match: /hospitality|hotel|tourism|culinary|event/i, subjects: ["hospitality operations", "food and beverage management", "front office operations", "tourism management", "customer service", "event management"] },
  { field: "Science", match: /science|biology|chemistry|physics|bsc/i, subjects: ["mathematics", "statistics", "laboratory methods", "research methods", "chemistry", "biology", "physics", "data analysis"] },
  { field: "Arts / Social sciences", match: /arts|social|psychology|sociology|law|english|media|communication/i, subjects: ["research methods", "academic writing", "critical analysis", "communication", "sociology", "psychology"] },
];
export function suggestSubjects(i: SopInput): { field: string; subjects: string[] } | null {
  const last = [...(i.education ?? [])].filter((e) => e.qualification).pop()?.qualification ?? i.prevDegree ?? "";
  const hay = `${last} ${i.course}`;
  return SUBJECTS_BY_FIELD.find((x) => x.match.test(last)) ?? SUBJECTS_BY_FIELD.find((x) => x.match.test(hay)) ?? null;
}
