// Long, detailed answers (150+ words) for the SOP "why" questions, built from the reasons the
// applicant ticks plus their real course / university / qualification / job details.
// Padding only uses neutral reasons that make no personal factual claim.
import type { SopInput } from "./sop";

type Ctx = { course: string; level: string; uni: string; country: string; home: string; lastEdu: string; prevSubjects: string; role: string; employer: string; duties: string; modules: string };
type Expander = (c: Ctx) => string;

const MIN_WORDS = 150;
const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);

export function sopContext(i: SopInput): Ctx {
  const edu = [...(i.education ?? [])].filter((e) => e.qualification).sort((a, b) => (a.to || a.from || "").localeCompare(b.to || b.from || "")).pop();
  const job = [...(i.jobs ?? [])].filter((j) => j.role).sort((a, b) => (a.current ? 1 : 0) - (b.current ? 1 : 0) || (a.from || "").localeCompare(b.from || "")).pop();
  const home = i.nationality.trim() || i.homeCity.split(",").pop()?.trim() || "my home country";
  return {
    course: `${i.level} ${i.course}`.replace(/\s+/g, " ").trim() || "this course",
    level: /master|mba|graduate|postgraduate|phd|doctor/i.test(i.level) ? "postgraduate" : "higher",
    uni: i.university.trim() || "this university",
    country: i.country.trim() || "the destination country",
    home,
    lastEdu: edu ? edu.qualification.trim().replace(/^(a|an|the) /i, "").replace(/^(?!my )/i, "my ") : "my previous studies",
    prevSubjects: i.prevSubjects.trim(),
    role: job?.role.trim().replace(/^(a|an) /i, "") ?? "",
    employer: job?.employer.trim() ?? "",
    duties: job?.duties.trim().replace(/\.$/, "") ?? "",
    modules: i.modules.trim(),
  };
}

const at = (c: Ctx) => (c.employer ? ` at ${c.employer}` : "");

const EXPAND: Record<string, Record<string, Expander>> = {
  whyCourse: {
    "it is the natural next step in my academic progression": (c) => `After completing ${c.lastEdu}, a ${c.level} qualification is the natural next step in my academic progression. It will move me from a broad understanding of the subject to advanced, specialised knowledge, and develop the analytical, problem-solving and research skills expected of a ${c.level === "postgraduate" ? "postgraduate" : "qualified"} professional.`,
    "it builds on my previous degree": (c) => `The course builds directly on ${c.lastEdu}.${c.prevSubjects ? ` The foundation I gained in ${c.prevSubjects} means I can engage with advanced topics from the start.` : " The foundation I gained there means I can engage with advanced topics from the start."} This continuity will help me make the most of the programme rather than repeating what I have already learned.`,
    "it builds on my work experience": (c) => (c.role ? `It also builds on my practical experience as ${c.role}${at(c)}${c.duties ? `, where I ${c.duties.replace(/^./, (x) => x.toLowerCase())}` : ""}. This experience has shown me exactly where my knowledge needs to grow, and the course addresses those areas.` : `It also builds on my practical work experience, which has shown me exactly where my knowledge needs to grow, and the course addresses those areas.`),
    "it fills the skill gaps I need for my career": () => `In my work I have identified specific skill gaps that limit my progress. The course is designed to close those gaps through structured learning, up-to-date content and assessed projects, so that I can take on more responsible and complex work.`,
    "it is needed for promotion in my current field": () => `In my field, senior positions increasingly require a postgraduate qualification. Completing this course will make me eligible for more senior roles, greater responsibility and better remuneration when I return.`,
    "it is an industry-recognised qualification": () => `The qualification is recognised by employers and professional bodies, so the knowledge and skills I gain will be valued and immediately useful when I return to work.`,
    "I want to specialise further in this area": () => `Rather than remaining a generalist, I want to specialise in this area. The course structure lets me focus on the topics most relevant to my career plans while still building a strong core of advanced knowledge.`,
    "I am moving my career into this field": () => `I am moving my career into this field, and the course gives me the structured, recognised training I need to make that transition successfully and credibly.`,
    "it combines theory with practical, hands-on projects": () => `The course combines theory with practical, hands-on projects, so I will not only learn concepts but apply them to realistic problems, which is how I learn best and what employers expect.`,
    "it covers emerging technologies used in industry today": (c) => `Its content covers emerging technologies and current industry practice that were not covered in depth in my previous studies and are increasingly in demand from employers in ${c.home}.`,
  },
  whyUniversity: {
    "the course modules match my career goals": (c) => `The structure of the ${c.course} at ${c.uni}, including its core and elective units, matches my career goals closely. After comparing several programmes, I found this one offers the best combination of content and specialisation for what I want to achieve.`,
    "strong industry links, placements and projects": (c) => `${c.uni} has strong links with industry, offering placements, industry projects and guest lectures that connect classroom learning with real workplaces. This practical exposure is important for my career.`,
    "experienced, research-active teaching staff": () => `The course is taught by experienced, research-active academic staff, so I will learn from people working at the forefront of the field and receive feedback that reflects current practice.`,
    "modern facilities, labs and learning resources": () => `The university provides modern facilities, specialist laboratories and extensive learning resources that will support both my coursework and my independent study.`,
    "high graduate satisfaction and teaching ratings": () => `Graduates consistently rate the university highly for teaching quality, skills development and learner support, which gives me confidence in the quality of the education I will receive.`,
    "I have been offered a scholarship": () => `I have also been offered a scholarship, which reflects the university's confidence in my academic record and makes the programme more manageable for my family financially.`,
    "the course is accredited by a professional body": () => `The course is accredited by a professional body, so the qualification meets recognised industry standards and will be respected by employers.`,
    "good support services for international students": () => `The university offers dedicated support for international students, including orientation, academic skills help and wellbeing services, which will help me settle in quickly and succeed.`,
    "graduates rate it highly for teaching quality and skills development": () => `Its graduates rate it highly for teaching quality and skills development, which shows that students are well taught and leave with skills employers value.`,
    "it is highly ranked in my discipline": (c) => `The university is well regarded in my discipline, and a qualification from it will be respected by employers in ${c.home}.`,
    "its research focuses on solving real-world problems": () => `Its research focuses on solving real-world problems, and I look forward to learning in an environment where research directly informs teaching.`,
    "it offers placement and networking opportunities with industry": () => `The opportunity to network with industry professionals and take part in placements will help me apply what I learn and build valuable professional connections.`,
    "it welcomes a diverse international student community": () => `It welcomes a diverse international student community, which will teach me to work with people from many backgrounds, an essential skill in a global industry.`,
    "I can take part in university sport and student activities": () => `I can also take part in university sport and student activities, which will help me keep a healthy balance alongside my studies.`,
  },
  whyCountry: {
    "its qualifications are recognised worldwide": (c) => `Qualifications from ${c.country} are recognised around the world, so the degree I earn will be valued wherever my career takes me, and especially in ${c.home}.`,
    "it has a high-quality, well-regulated education system": (c) => `${c.country} has a high-quality, well-regulated education system with strong quality assurance and protection for international students, which gives my family and me confidence in this choice.`,
    "its qualifications are valued by employers in my home country": (c) => `Employers in ${c.home} value qualifications from ${c.country}, and many senior professionals in my field studied there. This will give me a clear advantage when I return.`,
    "teaching is practical and industry-focused": (c) => `Teaching in ${c.country} is practical and industry-focused, with an emphasis on applying knowledge rather than simply memorising it.`,
    "it is safe and multicultural": (c) => `${c.country} is safe and multicultural, and international students are well supported, which will allow me to focus fully on my studies.`,
    "friends and relatives studied there and returned to good careers": (c) => `Friends and relatives who studied in ${c.country} returned to ${c.home} and built successful careers, and their experience encouraged me to make the same choice.`,
    "the total cost is reasonable compared with other study destinations": (c) => `The total cost of studying in ${c.country} is reasonable compared with other major study destinations and is within my family's means.`,
    "it is a world leader in education standards and facilities": (c) => `${c.country} is one of the world's leading education destinations, with excellent universities, facilities and learning resources.`,
    "the city is safe, liveable and welcoming to students": () => `The city where I will study is safe, liveable and welcoming to students, which will help me settle in quickly and concentrate on my course.`,
    "I have visited before and complied fully with my visa": (c) => `I have visited ${c.country} before and complied fully with my visa conditions, so I understand what is expected of visitors and students.`,
  },
  whyNotHome: {
    "this course is not available in my home country": (c) => `The ${c.course} is not offered by universities in ${c.home}, so I cannot obtain the same qualification locally.`,
    "this specialisation is not offered locally": (c) => `The specialisation I want to pursue is not offered by universities in ${c.home}, whose programmes are more general.`,
    "local programmes take longer to complete": (c) => `Comparable programmes in ${c.home} take longer to complete because of limited intakes and part-time delivery, which would delay my career progress.`,
    "places are very limited and competitive locally": () => `Places on local postgraduate programmes are very limited and highly competitive, and intake dates are unpredictable.`,
    "local programmes lack international recognition": () => `Local postgraduate qualifications are less widely recognised internationally, which would limit my opportunities in a global industry.`,
    "local facilities and curriculum are less up to date": () => `Local facilities and curricula are not always up to date with current industry practice and technology.`,
    "local courses are often taught in mixed medium rather than fully in English": () => `Local courses are often taught in mixed medium rather than fully in English, while my career requires strong professional English.`,
    "studying locally gives limited international exposure": () => `Studying locally would give me limited international exposure, whereas studying abroad will give me experience of different working cultures and international best practice that I can bring home.`,
    "local postgraduate courses are more theory-based than practical": () => `Local postgraduate courses tend to be more theory-based, while I need a practical, applied programme that prepares me directly for work.`,
  },
  shortGoal: {
    "return to my current employer in a more senior role": (c) => `My immediate plan is to return to my position${at(c)} and take on a more senior role, where I can use the advanced skills from the course to improve systems and lead projects.`,
    "join a leading company in my field at home": (c) => `On my return, I plan to join a leading company in my field in ${c.home}, where overseas postgraduate qualifications are valued for senior and specialist roles.`,
    "work in the public sector in my field": (c) => `I plan to work in the public sector in ${c.home}, using my qualification to improve services in my field.`,
    "join and grow my family business": () => `I plan to join my family business and use the knowledge from the course to modernise its systems and help it grow.`,
    "start my own business in this field": (c) => `I intend to start my own business in ${c.home}, offering services in my field that are currently in short supply.`,
    "work as a specialist / consultant in my field": (c) => `I plan to work as a specialist and consultant, advising organisations in ${c.home} on current best practice in my field.`,
    "join a leading company at home that values overseas postgraduates": (c) => `On my return, I plan to join a leading company in ${c.home} that values overseas postgraduates, where my qualification and experience will make me a strong candidate for senior positions.`,
    "apply new skills to improve systems at my current workplace": () => `I will apply my new skills to improve systems and processes at my workplace, where the need for these skills is growing quickly.`,
  },
  longGoal: {
    "become a senior manager or specialist in my field": () => `In the long term, I aim to become a senior manager or specialist in my field, leading teams and making decisions that shape my organisation's direction.`,
    "start and grow my own company": (c) => `In the long term, I plan to start and grow my own company in ${c.home}, creating jobs and contributing to the local economy.`,
    "lead major projects in my industry": () => `I aim to lead major projects in my industry, applying international standards to local challenges.`,
    "train and mentor others in my field": () => `I also want to train and mentor others, so that the knowledge I gain benefits my colleagues and the wider profession.`,
    "contribute to my country's development in this field": (c) => `Ultimately, I want to contribute to ${c.home}'s development in this field, which is growing quickly and needs well-qualified professionals.`,
    "move into research or teaching": () => `Later in my career I would like to move into research or teaching, passing on international best practice to the next generation.`,
    "grow my current freelance / consultancy work into my own company": () => `My long-term ambition is to grow my current freelance and consultancy work into my own company, working with capable partners to serve local and international clients.`,
    "build an international career while based in my home country": (c) => `I aim to build an international career while remaining based in ${c.home}, working with overseas clients and partners from home.`,
  },
};

/** Neutral reasons used only to reach 150 words (no personal factual claims). */
const PAD: Record<string, string[]> = {
  whyCourse: ["it is the natural next step in my academic progression", "it combines theory with practical, hands-on projects", "I want to specialise further in this area", "it is an industry-recognised qualification"],
  whyUniversity: ["the course modules match my career goals", "experienced, research-active teaching staff", "modern facilities, labs and learning resources", "good support services for international students"],
  whyCountry: ["its qualifications are recognised worldwide", "it has a high-quality, well-regulated education system", "teaching is practical and industry-focused", "it is safe and multicultural"],
  whyNotHome: ["studying locally gives limited international exposure", "local postgraduate courses are more theory-based than practical", "local facilities and curriculum are less up to date"],
  shortGoal: ["join a leading company in my field at home"],
  longGoal: ["become a senior manager or specialist in my field", "train and mentor others in my field", "contribute to my country's development in this field"],
};

const INTRO: Record<string, (c: Ctx) => string> = {
  whyCourse: (c) => `I have chosen the ${c.course} because it fits both my academic background and my career plans.`,
  whyUniversity: (c) => `I chose ${c.uni} after carefully comparing several universities that offer similar programmes.`,
  whyCountry: (c) => `Before choosing ${c.country}, I considered several study destinations.`,
  whyNotHome: (c) => `I carefully considered studying in ${c.home} before deciding to study abroad.`,
  shortGoal: (c) => `After completing the ${c.course}, I will return to ${c.home}.`,
  longGoal: () => ``,
};
const OUTRO: Record<string, (c: Ctx) => string> = {
  whyCourse: (c) => `${c.modules ? `The units that interest me most are ${c.modules}, and they match the skills I need for my career. ` : ""}For these reasons, the ${c.course} is the right course for me at this stage of my career.`,
  whyUniversity: (c) => `For these reasons, ${c.uni} is the best place for me to complete this qualification.`,
  whyCountry: (c) => `Together, these factors make ${c.country} the most suitable destination for my studies.`,
  whyNotHome: (c) => `Studying the ${c.course} at ${c.uni} gives me what I cannot get by studying locally, and I will bring these benefits back to ${c.home}.`,
  shortGoal: (c) => `${c.role ? `The qualification, combined with my experience as ${c.role}, will make me a strong candidate for these roles. ` : ""}My family, my career and my future are in ${c.home}, and that is where I will use what I learn.`,
  longGoal: () => ``,
};

/** 150+ word explanation for one question. */
export function composeLong(key: string, i: SopInput): string {
  const c = sopContext(i);
  const ex = EXPAND[key];
  if (!ex) return "";
  const picked = (i.picks?.[key] ?? []).filter((p) => ex[p]);
  const parts: string[] = [INTRO[key]?.(c) ?? "", ...picked.map((p) => ex[p](c))];
  const out = () => [...parts, OUTRO[key]?.(c) ?? ""].filter(Boolean).join(" ");
  for (const p of PAD[key] ?? []) {
    if (words(out()) >= MIN_WORDS) break;
    if (!picked.includes(p) && ex[p]) parts.push(ex[p](c));
  }
  return out();
}

const REASON_EXPLAIN: Record<string, string> = {
  "insufficient or unclear funds": "the officer was not satisfied that I had enough funds, or that the source of my funds was clear",
  "weak ties to my home country": "the officer was not satisfied that I had strong enough ties to return home",
  "the purpose of my visit was not clear": "the officer was not satisfied that the purpose of my visit was clear and genuine",
  "doubts that I was a genuine student": "the officer was not satisfied that I was a genuine student",
  "missing or unclear documents": "some of my documents were missing or not clear enough",
  "the English requirement was not met": "my evidence of English language ability did not meet the requirement",
  "my previous immigration history": "of concerns about my previous immigration history",
  "another reason": "of the reasons stated in the refusal letter",
};
const CHANGE_EXPLAIN: Record<string, string> = {
  "I now have stronger financial evidence held for the required period": "I now provide stronger financial evidence: funds held for the required period, with clear documents showing where the money comes from",
  "I have a new employment / promotion letter showing my ties": "I provide a new employment letter confirming my position and approved leave, which shows the job I will return to",
  "I have a clear study plan and a course that matches my background": "I have chosen a course that follows directly from my studies and work, and explained clearly how it fits my career plan",
  "I have submitted every required document": "I have checked the official checklist and submitted every required document, clearly labelled",
  "I have a new English test result": "I have taken a new English test and my result meets the requirement",
  "I have explained my study and work gaps with evidence": "I have explained every gap in my study and work history, with supporting evidence",
  "I have stronger evidence of family and property ties": "I provide stronger evidence of my family and property ties at home",
};

/** 150+ word explanation of previous refusals and what has changed. */
export function composeRefusals(i: SopInput): string {
  const list = (i.refusalList ?? []).filter((r) => r.country || r.reason);
  if (!list.length) return "";
  const visa = (v: string) => ({ "Visit / Tourist": "visitor", Work: "work", Student: "student", Business: "business", Family: "family", Transit: "transit" } as Record<string, string>)[v] ?? v.toLowerCase();
  const the = (c: string) => (/^(United|Netherlands|Philippines|Czech|Maldives|Bahamas|Gambia)/.test(c) ? "the " : "");
  const body = list.map((r) => {
    const head = `In ${r.year || "[year]"}, my ${r.visaType ? visa(r.visaType) + " " : ""}visa application to ${the(r.country)}${r.country || "[country]"} was refused because ${REASON_EXPLAIN[r.reason] ?? r.reason ?? "[reason]"}.`;
    const accept = "I accept that my previous application did not show this clearly enough, and I have taken the refusal seriously.";
    const changes = r.changes.length ? `Since then, I have addressed this directly. ${r.changes.map((x) => (CHANGE_EXPLAIN[x] ?? x).replace(/^./, (m) => m.toUpperCase()) + ".").join(" ")}` : "Since then, I have reviewed every reason given and strengthened my application with clear, complete evidence.";
    return [head, accept, changes].join(" ");
  });
  const close = "I have declared this refusal honestly on my application form, as required. I have always respected immigration rules, and I will comply fully with all the conditions of my visa. I respectfully ask that my application be assessed on the new evidence I have provided, which shows that the concerns raised previously have now been resolved.";
  let text = [...body, close].join(" ");
  if (words(text) < MIN_WORDS) text += " I have also included copies of the refusal letter so that the officer can see exactly how each concern has been addressed in this application.";
  return text;
}
