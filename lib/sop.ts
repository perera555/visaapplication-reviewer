// Statement of Purpose / Genuine Student / Study Plan writer. Uses ONLY the facts the applicant gives;
// anything missing stays as a [placeholder] so nothing is invented.

export type EduEntry = { qualification: string; institution: string; from: string; to: string; result: string; certificate: boolean };
export type JobEntry = { role: string; employer: string; from: string; to: string; current: boolean; duties: string; letter: boolean };
export const EMPTY_EDU: EduEntry = { qualification: "", institution: "", from: "", to: "", result: "", certificate: false };
export const EMPTY_JOB: JobEntry = { role: "", employer: "", from: "", to: "", current: false, duties: "", letter: false };

export type SopInput = {
  /** student → SOP / Genuine Student / study plan; worker → work visa cover letter (letter of explanation) */
  applicantType: "student" | "worker";
  /** auto = country format (Australia GS, Canada study plan); full = full letter SOP with every section */
  style: "auto" | "full";
  destEmployer: string; destRole: string; destSalary: string; destStart: string; destContract: string; sponsorRef: string; whyEmployer: string; destAddress: string;
  education: EduEntry[];
  jobs: JobEntry[];
  travelHistory: string;
  fullName: string; nationality: string; homeCity: string; age: string;
  country: string; // destination country name
  countryCode: string;
  level: string; course: string; university: string; universityAddress: string; intake: string; duration: string;
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
  destEmployer: "", destRole: "", destSalary: "", destStart: "", destContract: "", sponsorRef: "", whyEmployer: "", destAddress: "",
  education: [], jobs: [], travelHistory: "",
  fullName: "", nationality: "", homeCity: "", age: "", country: "", countryCode: "",
  level: "", course: "", university: "", universityAddress: "", intake: "", duration: "",
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
const OTHER: Section = { section: "Other (optional)", fields: [["travelHistory", "Travel history (countries, year, purpose; visas complied with)", "textarea"], ["gaps", "Explain any study / work gaps", "textarea"], ["refusals", "Previous visa refusals and what changed", "textarea"], ["achievements", "Achievements, awards, volunteering", "textarea"], ["extra", "Anything else", "textarea"]] };

/** Fields for students (SOP / Genuine Student / study plan). Education & jobs are edited as lists. */
export const SOP_FIELDS: Section[] = [
  ABOUT,
  { section: "Course you applied for", fields: [["level", "Course level", "select", LEVEL_OPTIONS], ["course", "Course name (e.g. Data Science)", "text"], ["university", "University / college (filled from offer letter)", "text"], ["universityAddress", "University address (filled from offer letter)", "textarea"], ["intake", "Intake", "select", INTAKE_OPTIONS], ["duration", "Course duration", "select", DURATION_OPTIONS], ["modules", "Modules / research areas that interest you", "textarea"]] },
  { section: "English & studies", fields: [["prevSubjects", "Main subjects / final project of your last degree", "textarea"], ["englishTest", "English test (or MOI waiver)", "select", ENGLISH_TEST_OPTIONS], ["englishScore", "Score (overall band / total)", "text"]] },
  { section: "Why this course, university and country", fields: [["whyCourse", "Why this course (how it builds on your studies/work)", "textarea"], ["whyUniversity", "Why this university (modules, facilities, staff, industry links)", "textarea"], ["whyCountry", "Why this country", "textarea"], ["whyNotHome", "Why not study this in your home country", "textarea"]] },
  { section: "Career plans after the course", fields: [["shortGoal", "Short-term goal (1–3 years after graduating)", "textarea"], ["longGoal", "Long-term goal", "textarea"], ["jobProspects", "Job prospects at home (employers, roles, expected salary)", "textarea"]] },
  { section: "Funding & ties to home", fields: [["funding", "How you will pay", "select", FUNDING_OPTIONS], ["sponsor", "Sponsor relationship", "select", RELATIONSHIP_OPTIONS], ["fundsAmount", "Funds available (e.g. LKR 12,000,000)", "text"], ["familyTies", "Family at home", "textarea"], ["assets", "Property / business / job to return to", "textarea"]] },
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

export function buildSop(i: SopInput): string {
  if (i.applicantType === "worker") return buildWorkLetter(i);
  const name = v(i.fullName, "Your full name");
  const course = `${v(i.level, "level")} ${v(i.course, "course name")}`.replace(/\s+/g, " ");
  const uni = v(i.university, "university");
  const country = v(i.country, "destination country");
  const background = para(educationText(i), i.prevSubjects && `During my studies I focused on ${i.prevSubjects}.`, englishText(i));
  const work = workText(i);
  const why = para(
    `I have chosen the ${course} at ${uni} because ${v(i.whyCourse, "explain how the course builds on your studies and work")}.`,
    i.modules && `I am particularly interested in ${i.modules}.`,
    `${uni} stands out to me because ${v(i.whyUniversity, "reasons specific to this university")}.`,
  );
  const whyCountry = para(`I chose to study in ${country} because ${v(i.whyCountry, "reasons for this country")}.`, i.whyNotHome && `A comparable programme is not available to me at home because ${i.whyNotHome}.`);
  const career = para(
    `After completing the course, I plan to return to ${homeCountryOf(i)} and ${v(i.shortGoal, "short-term career goal")}.`,
    i.longGoal && `In the long term, I aim to ${i.longGoal}.`,
    i.jobProspects && `There are strong opportunities for this qualification at home: ${i.jobProspects}.`,
  );
  const money = para(
    `My studies will be funded by ${v(i.funding, "source of funds")}${i.sponsor && !/self/i.test(i.sponsor) ? ` (sponsor: my ${/both parents/i.test(i.sponsor) ? "parents" : i.sponsor.toLowerCase()})` : ""}${i.fundsAmount ? `, with ${i.fundsAmount} available` : ""}.`,
    "The financial documents enclosed show that these funds are genuinely available to me.",
  );
  const ties = para(i.familyTies && `${i.familyTies.replace(/\.$/, "")}.`, i.assets && `I also have ${i.assets}, which I will return to.`, "I fully intend to comply with all visa conditions and return home after my studies.");
  const travel = i.travelHistory.trim() ? `I have travelled to ${i.travelHistory.trim().replace(/\.$/, "")}, and complied with all visa conditions.` : "";
  const other = para(gapText(i), i.refusals && `I would like to disclose a previous visa refusal: ${i.refusals}.`, i.achievements && `Outside my studies, ${i.achievements}.`, i.extra);

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
      `Education\n${para(educationText(i), i.prevSubjects && `During my studies I focused on ${i.prevSubjects}.`)}`,
      englishText(i) && `English language\n${englishText(i)}`,
      work && `Work experience\n${work}`,
      gapText(i) && `Gaps in my studies\n${gapText(i)}`,
      i.whyNotHome.trim() && `Why not study in ${homeCountry}\n${i.whyNotHome.trim()}`,
      `Why ${country}\n${v(i.whyCountry, "specific reasons for choosing this country")}`,
      `Why ${uni} and the ${course}\n${why}`,
      `Future career plans and returning to ${homeCountry}\n${career}`,
      travel && `Travel history\n${travel}`,
      `Family background and financial support\n${para(i.familyTies && `${i.familyTies.replace(/\.$/, "")}.`, money, i.assets && `I also have ${i.assets}, which I will return to.`)}`,
      para(i.refusals && `I would like to disclose a previous visa refusal: ${i.refusals}.`, i.achievements && `Outside my studies, ${i.achievements}.`, i.extra) && `Additional information\n${para(i.refusals && `I would like to disclose a previous visa refusal: ${i.refusals}.`, i.achievements && `Outside my studies, ${i.achievements}.`, i.extra)}`,
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
    `Why this course and university\n${why}`,
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
  const travel = i.travelHistory.trim() ? `I have previously travelled to ${i.travelHistory.trim().replace(/\.$/, "")} and complied with all visa conditions.` : "";
  return [
    `COVER LETTER: WORK VISA APPLICATION`,
    `Applicant: ${name}${i.nationality ? `, ${i.nationality} national` : ""}`,
    `Position: ${role}, ${employer}${i.destAddress ? `, ${i.destAddress}` : ""}, ${country}`,
    `Dear Visa Officer,`,
    `I am applying for a work visa to take up the position of ${role} with ${employer} in ${country}${i.destStart ? `, starting ${i.destStart}` : ""}. ${para(i.destContract && `The contract is ${/permanent/i.test(i.destContract) ? "permanent" : `for ${i.destContract.toLowerCase()}`}`, i.destSalary && `with a salary of ${i.destSalary}`)}${i.destContract || i.destSalary ? "." : ""}${i.sponsorRef ? ` My sponsorship / permit reference is ${i.sponsorRef}.` : ""}`,
    `My experience\n${work || "[Add your jobs in the “Work experience” list]"}`,
    `My qualifications\n${para(education, english)}`,
    `Why I am suited to this role\n${v(i.whyEmployer, "explain how your skills and experience match the job")}`,
    para(i.familyTies && `Family: ${i.familyTies}.`, i.assets && `At home I have ${i.assets}.`, i.shortGoal && `My plans: ${i.shortGoal}.`, travel, gapText(i), i.refusals && `I would like to disclose a previous visa refusal: ${i.refusals}.`, i.extra) || "",
    `I confirm that the information in this application is true, and I will comply with all the conditions of my visa.\n\nEnclosed: passport, signed employment contract / job offer, sponsorship or work permit document, qualification certificates, experience letters, English test result${i.travelHistory ? ", previous visas" : ""}.`,
    `Yours faithfully,\n\n\n${name}`,
  ].filter(Boolean).join("\n\n");
}

export function wordCount(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}
