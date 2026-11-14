// Statement of Purpose / Genuine Student / Study Plan writer. Uses ONLY the facts the applicant gives;
// anything missing stays as a [placeholder] so nothing is invented.

export type SopInput = {
  fullName: string; nationality: string; homeCity: string; age: string;
  country: string; // destination country name
  countryCode: string;
  level: string; course: string; university: string; intake: string; duration: string;
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
  fullName: "", nationality: "", homeCity: "", age: "", country: "", countryCode: "",
  level: "", course: "", university: "", intake: "", duration: "",
  prevDegree: "", prevInstitution: "", prevYear: "", prevResult: "", prevSubjects: "",
  englishTest: "", englishScore: "", workExperience: "",
  whyCourse: "", whyUniversity: "", whyCountry: "", whyNotHome: "", modules: "",
  shortGoal: "", longGoal: "", jobProspects: "", funding: "", sponsor: "", fundsAmount: "",
  familyTies: "", assets: "", gaps: "", refusals: "", achievements: "", extra: "",
};

export const SOP_FIELDS: { section: string; fields: [keyof SopInput, string, "text" | "textarea"][] }[] = [
  { section: "About you", fields: [["fullName", "Full name", "text"], ["nationality", "Nationality", "text"], ["homeCity", "Home city / country", "text"], ["age", "Age", "text"]] },
  { section: "Course you applied for", fields: [["country", "Destination country", "text"], ["level", "Level (e.g. Master's, Bachelor's, Diploma)", "text"], ["course", "Course name", "text"], ["university", "University / college", "text"], ["intake", "Intake (e.g. February 2027)", "text"], ["duration", "Course duration", "text"], ["modules", "Modules / research areas that interest you", "textarea"]] },
  { section: "Education & English", fields: [["prevDegree", "Highest qualification", "text"], ["prevInstitution", "Institution", "text"], ["prevYear", "Year completed", "text"], ["prevResult", "Result / GPA / class", "text"], ["prevSubjects", "Main subjects / final project", "textarea"], ["englishTest", "English test (or MOI waiver)", "text"], ["englishScore", "Score", "text"]] },
  { section: "Work experience", fields: [["workExperience", "Jobs: role, employer, dates, main duties", "textarea"]] },
  { section: "Why this course, university and country", fields: [["whyCourse", "Why this course (how it builds on your studies/work)", "textarea"], ["whyUniversity", "Why this university (ranking, modules, facilities, staff, industry links)", "textarea"], ["whyCountry", "Why this country", "textarea"], ["whyNotHome", "Why not study this in your home country", "textarea"]] },
  { section: "Career plans after the course", fields: [["shortGoal", "Short-term goal (1–3 years after graduating)", "textarea"], ["longGoal", "Long-term goal", "textarea"], ["jobProspects", "Job prospects at home (employers, roles, expected salary)", "textarea"]] },
  { section: "Funding & ties to home", fields: [["funding", "How you will pay (savings, parents, loan, scholarship)", "textarea"], ["sponsor", "Sponsor name & relationship", "text"], ["fundsAmount", "Funds available", "text"], ["familyTies", "Family at home", "textarea"], ["assets", "Property / business / job to return to", "textarea"]] },
  { section: "Other (optional)", fields: [["gaps", "Explain any study / work gaps", "textarea"], ["refusals", "Previous visa refusals and what changed", "textarea"], ["achievements", "Achievements, awards, volunteering", "textarea"], ["extra", "Anything else", "textarea"]] },
];

const v = (s: string, placeholder: string) => (s?.trim() ? s.trim() : `[${placeholder}]`);
const para = (...parts: (string | false | undefined)[]) => parts.filter(Boolean).join(" ");

export function sopFormat(code: string): "au-gs" | "ca-plan" | "standard" {
  return code === "AU" ? "au-gs" : code === "CA" ? "ca-plan" : "standard";
}

export function buildSop(i: SopInput): string {
  const name = v(i.fullName, "Your full name");
  const course = `${v(i.level, "level")} ${v(i.course, "course name")}`.replace(/\s+/g, " ");
  const uni = v(i.university, "university");
  const country = v(i.country, "destination country");
  const background = para(
    `I completed my ${v(i.prevDegree, "highest qualification")} at ${v(i.prevInstitution, "institution")} in ${v(i.prevYear, "year")}${i.prevResult ? `, achieving ${i.prevResult}` : ""}.`,
    i.prevSubjects && `During my studies I focused on ${i.prevSubjects}.`,
    i.englishTest && `I have ${i.englishTest}${i.englishScore ? ` with a score of ${i.englishScore}` : ""}.`,
  );
  const work = i.workExperience.trim() ? `Professionally, ${i.workExperience.trim().replace(/^./, (c) => c.toLowerCase())}` : "";
  const why = para(
    `I have chosen the ${course} at ${uni} because ${v(i.whyCourse, "explain how the course builds on your studies and work")}.`,
    i.modules && `I am particularly interested in ${i.modules}.`,
    `${uni} stands out to me because ${v(i.whyUniversity, "reasons specific to this university")}.`,
  );
  const whyCountry = para(`I chose to study in ${country} because ${v(i.whyCountry, "reasons for this country")}.`, i.whyNotHome && `A comparable programme is not available to me at home because ${i.whyNotHome}.`);
  const career = para(
    `After completing the course, I plan to return to ${v(i.homeCity, "your home country")} and ${v(i.shortGoal, "short-term career goal")}.`,
    i.longGoal && `In the long term, I aim to ${i.longGoal}.`,
    i.jobProspects && `There are strong opportunities for this qualification at home: ${i.jobProspects}.`,
  );
  const money = para(
    `My studies will be funded by ${v(i.funding, "source of funds")}${i.sponsor ? ` (${i.sponsor})` : ""}${i.fundsAmount ? `, with ${i.fundsAmount} available` : ""}.`,
    "The financial documents enclosed show that these funds are genuinely available to me.",
  );
  const ties = para(i.familyTies && `My family lives in ${v(i.homeCity, "home city")}: ${i.familyTies}.`, i.assets && `I also have ${i.assets}, which I will return to.`, "I fully intend to comply with all visa conditions and return home after my studies.");
  const other = para(i.gaps && `Regarding the gap in my history: ${i.gaps}.`, i.refusals && `I would like to disclose a previous visa refusal: ${i.refusals}.`, i.achievements && `Outside my studies, ${i.achievements}.`, i.extra);

  const fmt = sopFormat(i.countryCode);
  if (fmt === "au-gs") {
    return [
      `GENUINE STUDENT STATEMENT: ${name}`,
      `Course: ${course}, ${uni} (${v(i.intake, "intake")})`,
      `1. My current circumstances\n${para(`I am ${name}${i.age ? `, aged ${i.age},` : ""} from ${v(i.homeCity, "home city / country")}.`, background, work)}\n${ties}`,
      `2. Why I want to study this course with this provider in Australia\n${why}\n${whyCountry}`,
      `3. How completing this course will benefit me in the future\n${career}`,
      `4. Other relevant information\n${money}${other ? `\n${other}` : ""}`,
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
    other && `Additional information\n${other}`,
    `Conclusion\nI am confident that the ${course} at ${uni} is the right next step for my career, and I am committed to completing it successfully and returning home to apply what I have learned.\n\n${name}`,
  ].filter(Boolean).join("\n\n");
}

export function wordCount(s: string) {
  return s.trim() ? s.trim().split(/\s+/).length : 0;
}
