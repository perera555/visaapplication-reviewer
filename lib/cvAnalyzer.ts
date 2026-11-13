// Extracts key facts from a CV/resume and works out which supporting documents the applicant needs.

export type CvAnalysis = {
  name?: string;
  email?: string;
  phone?: string;
  education: string[];
  jobs: { title: string; current: boolean; years?: string }[];
  englishTest?: { test: string; score?: number };
  certifications: string[];
  totalYears?: number;
  gaps: string[];
  currentlyEmployed: boolean;
  neededDocs: { name: string; why: string; reqId?: string }[];
  tips: string[];
};

const DEGREE = /\b(ph\.?d|doctorate|master'?s?|msc|m\.sc|mba|ma\b|m\.a|bachelor'?s?|bsc|b\.sc|ba\b|b\.a|beng|b\.eng|meng|llb|llm|mbbs|diploma|higher national diploma|hnd|advanced level|a\/l|ordinary level|o\/l|gce|high school|certificate in)\b[^\n]{0,90}/gi;
const YEAR_RANGE = /\b((19|20)\d{2})\s*(?:-|–|—|to)\s*((19|20)\d{2}|present|current|now|date|till date)\b/gi;
const JOB_TITLE = /\b(manager|engineer|developer|accountant|nurse|teacher|officer|assistant|executive|analyst|consultant|technician|supervisor|director|designer|administrator|clerk|driver|chef|cook|lecturer|doctor|pharmacist|sales|marketing|intern|caregiver|electrician|plumber|welder|mechanic)\b[^\n]{0,70}/gi;
const CERT = /\b(certified|certification|certificate|ccna|pmp|acca|cima|aws|cpa|nvq|cisco|microsoft certified|google certified)\b[^\n]{0,70}/gi;

export function analyzeCv(text: string, visaType = "visit"): CvAnalysis {
  const t = text.replace(/\r/g, "");
  const lines = t.split("\n").map((l) => l.trim()).filter(Boolean);
  const email = t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0];
  const phone = t.match(/(\+?\d[\d\s()-]{7,16}\d)/)?.[0]?.replace(/\s+/g, " ");
  const name = lines.find((l) => /^[A-Za-z][A-Za-z.'\- ]{3,40}$/.test(l) && l.split(/\s+/).length >= 2 && l.split(/\s+/).length <= 5 && !/curriculum|resume|vitae|profile|contact|address/i.test(l));

  const education = [...new Set((t.match(DEGREE) ?? []).map((s) => s.trim().replace(/\s+/g, " ")))].slice(0, 8);
  const certifications = [...new Set((t.match(CERT) ?? []).map((s) => s.trim()))].filter((c) => !DEGREE.test(c)).slice(0, 8);

  // jobs: lines containing a title, with year ranges nearby
  const jobs: CvAnalysis["jobs"] = [];
  lines.forEach((l, i) => {
    const m = l.match(JOB_TITLE);
    if (!m) return;
    const near = [lines[i - 1], l, lines[i + 1]].filter(Boolean).join(" ");
    const yr = near.match(YEAR_RANGE)?.[0];
    if (jobs.some((j) => j.title.toLowerCase() === m[0].toLowerCase().trim())) return;
    jobs.push({ title: m[0].trim(), current: /present|current|now|till date/i.test(yr ?? ""), years: yr });
  });

  // years of experience & gaps from all ranges
  const thisYear = new Date().getFullYear();
  const ranges = [...t.matchAll(YEAR_RANGE)].map((m) => [Number(m[1]), /\d{4}/.test(m[3]) ? Number(m[3]) : thisYear] as [number, number]).filter(([a, b]) => a <= b).sort((a, b) => a[0] - b[0]);
  const gaps: string[] = [];
  for (let i = 1; i < ranges.length; i++) {
    const prevEnd = Math.max(...ranges.slice(0, i).map((r) => r[1]));
    if (ranges[i][0] - prevEnd >= 2) gaps.push(`${prevEnd}–${ranges[i][0]}`);
  }
  if (ranges.length && thisYear - Math.max(...ranges.map((r) => r[1])) >= 2) gaps.push(`${Math.max(...ranges.map((r) => r[1]))}–now`);
  const totalYears = ranges.length ? ranges.reduce((s, [a, b]) => s + (b - a), 0) : undefined;

  const eng = t.match(/\b(IELTS|PTE|TOEFL|Duolingo|OET)\b[^\n\d]{0,20}(\d{1,3}(\.\d)?)?/i);
  const englishTest = eng ? { test: eng[1].toUpperCase(), score: eng[2] ? Number(eng[2]) : undefined } : undefined;
  const currentlyEmployed = jobs.some((j) => j.current) || /present|current(ly)? (working|employed)/i.test(t);

  const neededDocs: CvAnalysis["neededDocs"] = [];
  education.forEach((e) => neededDocs.push({ name: `Certificate & transcript: ${e.slice(0, 60)}`, why: "Every qualification on your CV should be backed by its certificate and transcript.", reqId: "academic-transcripts" }));
  jobs.forEach((j) => neededDocs.push({ name: `Experience / service letter: ${j.title}${j.years ? ` (${j.years})` : ""}`, why: "Officers verify claimed work experience with letters showing dates, duties and salary.", reqId: "experience-letters" }));
  if (currentlyEmployed) {
    neededDocs.push({ name: "Current employment letter with approved leave / NOC", why: "Proves your current job and that you will return to it.", reqId: visaType === "visit" ? "employment-letter" : undefined });
    neededDocs.push({ name: "Last 3–6 months payslips", why: "Must match the salary credits on your bank statement.", reqId: "payslips" });
  }
  if (englishTest) neededDocs.push({ name: `${englishTest.test} test report form${englishTest.score ? ` (score ${englishTest.score})` : ""}`, why: "Your CV mentions a language test. Include the official result.", reqId: "english-test" });
  else if (["student", "work", "residence"].includes(visaType)) neededDocs.push({ name: "English language test result", why: "No test found on your CV, but this visa type usually requires one.", reqId: "english-test" });
  certifications.forEach((c) => neededDocs.push({ name: `Certificate copy: ${c.slice(0, 60)}`, why: "Professional certifications strengthen your profile." }));
  if (gaps.length) neededDocs.push({ name: `Gap explanation letter (${gaps.join(", ")})`, why: "Unexplained gaps are a common reason for doubts, so explain them with evidence.", reqId: visaType === "student" ? "sop" : undefined });
  neededDocs.push({ name: "Signed, up-to-date CV", why: "Make sure dates match every certificate and letter." });

  const tips: string[] = [];
  if (!email) tips.push("Add an email address to your CV.");
  if (!ranges.length) tips.push("Add start and end years (month/year) for every job and qualification.");
  if (gaps.length) tips.push(`Explain the gap(s) ${gaps.join(", ")} in your CV and cover letter / SOP.`);
  if (t.length > 12000) tips.push("Your CV is very long. Keep it to 2–3 pages.");

  return { name, email, phone, education, jobs, englishTest, certifications, totalYears, gaps, currentlyEmployed, neededDocs, tips };
}
