import { fieldOf, fieldRoles } from "./sopAuto";
// Career section: home-country job market, target employers, salary comparison and goals.
// Company names are suggestions only (well-known employers by country and field); salary figures
// are always entered by the applicant (with a source) because they change and must be verifiable.
import type { SopInput } from "./sop";

export type CareerField = "it" | "finance" | "engineering" | "health" | "business" | "general";

export const CURRENCY_BY_COUNTRY: Record<string, string> = {
  "Sri Lanka": "LKR", India: "INR", Nepal: "NPR", Pakistan: "PKR", Bangladesh: "BDT", Philippines: "PHP", Nigeria: "NGN",
  Ghana: "GHS", Kenya: "KES", Vietnam: "VND", Indonesia: "IDR", Malaysia: "MYR", Thailand: "THB", China: "CNY", Myanmar: "MMK",
  Bhutan: "BTN", Maldives: "MVR", "United Arab Emirates": "AED", "Saudi Arabia": "SAR", Egypt: "EGP", Zimbabwe: "ZWL",
  Uganda: "UGX", Tanzania: "TZS", Ethiopia: "ETB", "South Africa": "ZAR", Brazil: "BRL", Mexico: "MXN", Colombia: "COP",
  Iran: "IRR", Turkey: "TRY", "Türkiye": "TRY", Mongolia: "MNT", Cambodia: "KHR", Laos: "LAK", Uzbekistan: "UZS", Kazakhstan: "KZT",
};
export const currencyOf = (country: string) => CURRENCY_BY_COUNTRY[country] ?? "";

export function careerField(i: SopInput): CareerField {
  const f = fieldOf(i);
  if (f === "it" || f === "finance" || f === "engineering" || f === "health" || f === "business") return f;
  const hay = `${i.course} ${i.level}`.toLowerCase();
  if (/comput|software|information tech|\bit\b|cyber|data|network/.test(hay)) return "it";
  if (/account|financ|bank|econom|acca|cima/.test(hay)) return "finance";
  if (/engineer|mechan|electr|civil/.test(hay)) return "engineering";
  if (/nurs|health|medic|pharma|biomed/.test(hay)) return "health";
  if (/business|management|mba|marketing|commerce/.test(hay)) return "business";
  return "general";
}

/** Well-known employers by home country and field (suggestions; the applicant chooses). */
export const COMPANY_SUGGESTIONS: Record<string, Partial<Record<CareerField, string[]>>> = {
  "Sri Lanka": {
    it: ["Virtusa", "99X", "WSO2", "MillenniumIT (LSEG)", "IFS", "Sysco LABS", "hSenid", "Dialog Axiata", "John Keells IT", "CodeGen"],
    finance: ["Commercial Bank of Ceylon", "Hatton National Bank", "Sampath Bank", "Bank of Ceylon", "People's Bank", "NDB Bank", "KPMG Sri Lanka", "PwC Sri Lanka", "Ernst & Young Sri Lanka"],
    engineering: ["Access Engineering", "Sierra Construction", "MAGA Engineering", "Ceylon Electricity Board", "Dialog Axiata", "Hayleys"],
    health: ["Asiri Health", "Nawaloka Hospitals", "Lanka Hospitals", "Durdans Hospital", "Hemas Hospitals"],
    business: ["John Keells Holdings", "Hayleys", "MAS Holdings", "Brandix", "Dialog Axiata", "Hemas Holdings", "Unilever Sri Lanka"],
  },
  India: {
    it: ["Tata Consultancy Services", "Infosys", "Wipro", "HCLTech", "Tech Mahindra", "Zoho", "Accenture India", "Capgemini India"],
    finance: ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra Bank", "Deloitte India", "KPMG India"],
    engineering: ["Larsen & Toubro", "Tata Projects", "BHEL", "Siemens India", "Bosch India"],
    health: ["Apollo Hospitals", "Fortis Healthcare", "Max Healthcare", "Manipal Hospitals"],
    business: ["Reliance Industries", "Tata Group", "Hindustan Unilever", "Mahindra Group", "ITC"],
  },
  Nepal: {
    it: ["F1Soft International", "Leapfrog Technology", "Deerwalk", "CloudFactory", "Verisk Nepal", "Fusemachines Nepal"],
    finance: ["Nabil Bank", "NIC Asia Bank", "Global IME Bank", "Himalayan Bank", "Standard Chartered Nepal"],
    business: ["Chaudhary Group", "Ncell", "Nepal Telecom", "Unilever Nepal"],
  },
  Pakistan: {
    it: ["Systems Limited", "NetSol Technologies", "10Pearls", "Arbisoft", "TRG Pakistan", "Jazz"],
    finance: ["Habib Bank Limited", "MCB Bank", "United Bank Limited", "Meezan Bank", "Bank Alfalah"],
    business: ["Engro Corporation", "Lucky Cement", "Unilever Pakistan", "Nestlé Pakistan"],
  },
  Bangladesh: {
    it: ["Brain Station 23", "BJIT", "Enosis Solutions", "SELISE", "Grameenphone", "bKash"],
    finance: ["BRAC Bank", "Dutch-Bangla Bank", "City Bank", "Eastern Bank"],
    business: ["BRAC", "Square Group", "Beximco", "Unilever Bangladesh"],
  },
  Philippines: {
    it: ["Accenture Philippines", "Globe Telecom", "PLDT", "Thinking Machines", "Exist Software Labs"],
    finance: ["BDO Unibank", "Bank of the Philippine Islands", "Metrobank", "SGV & Co (EY)"],
    business: ["Ayala Corporation", "SM Investments", "San Miguel Corporation", "JG Summit"],
  },
  Nigeria: {
    it: ["Interswitch", "Flutterwave", "Paystack", "Andela", "MTN Nigeria", "SystemSpecs"],
    finance: ["Access Bank", "Zenith Bank", "GTBank", "First Bank of Nigeria", "Stanbic IBTC"],
    business: ["Dangote Group", "Nestlé Nigeria", "Unilever Nigeria", "MTN Nigeria"],
  },
  Vietnam: {
    it: ["FPT Software", "Viettel", "VNG Corporation", "KMS Technology", "NashTech Vietnam"],
    finance: ["Vietcombank", "Techcombank", "VPBank", "BIDV"],
    business: ["Vingroup", "Vinamilk", "Masan Group"],
  },
  Kenya: {
    it: ["Safaricom", "Cellulant", "Andela Kenya", "Craft Silicon", "Microsoft ADC Kenya"],
    finance: ["KCB Group", "Equity Bank", "Co-operative Bank of Kenya", "Absa Kenya"],
    business: ["East African Breweries", "Bamburi Cement", "Unilever Kenya"],
  },
  Ghana: {
    it: ["MTN Ghana", "Hubtel", "IT Consortium", "expressPay"],
    finance: ["Ecobank Ghana", "GCB Bank", "Stanbic Bank Ghana", "Absa Ghana"],
    business: ["Unilever Ghana", "Nestlé Ghana", "Tullow Ghana"],
  },
};

export function suggestCompanies(i: SopInput): string[] {
  const home = i.nationality.trim() || i.homeCity.split(",").pop()?.trim() || "";
  const byCountry = COMPANY_SUGGESTIONS[home];
  if (!byCountry) return [];
  const f = careerField(i);
  return byCountry[f] ?? byCountry.business ?? [];
}

const FIELD_NAME: Record<CareerField, string> = {
  it: "software engineering and IT", finance: "banking and finance", engineering: "engineering", health: "healthcare", business: "business and management", general: "my field",
};

const list = (xs: string[]) => (xs.length > 1 ? `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}` : xs[0] ?? "");
const money = (cur: string, v: string) => `**${cur ? cur + " " : ""}${v.trim()}**`;

/** Full career section: market, employers, salaries, goals and return. */
export function composeCareer(i: SopInput, shortGoalText: string, longGoalText: string): string {
  const home = i.nationality.trim() || i.homeCity.split(",").pop()?.trim() || "my home country";
  const f = FIELD_NAME[careerField(i)];
  const course = `${i.level} ${i.course}`.replace(/\s+/g, " ").trim() || "this qualification";
  const cur = i.salaryCurrency || currencyOf(home);
  const per = i.salaryPeriod || "per month";
  const out: string[] = [];

  out.push(`I have studied the job market in ${home} carefully. ${i.marketNotes?.trim() ? i.marketNotes.trim().replace(/\.?$/, ".") : `The ${f} sector is growing quickly and is increasingly connected to the global market. Small specialist companies look for high-quality professionals with up-to-date skills, while large companies compete for top graduates and offer very good employment packages.`}`);

  out.push(`With the ${course}, I will be qualified for roles such as ${fieldRoles(i)}, where employers in ${home} value an international postgraduate qualification.`);
  const big = (i.targetCompanies ?? []).filter(Boolean);
  const niche = (i.nicheCompanies ?? []).filter(Boolean);
  if (big.length) out.push(`Leading employers in ${home} such as ${list(big)} actively recruit professionals with an international postgraduate qualification and current knowledge of industry developments.${niche.length ? ` Smaller niche companies such as ${list(niche)} also look for graduates with specialist, up-to-date skills.` : ""}`);
  else if (niche.length) out.push(`Specialist companies in ${home} such as ${list(niche)} look for graduates with up-to-date skills.`);

  let salary = "";
  const levels = [
    i.salaryLocal?.trim() && `graduate and junior roles start at around ${money(cur, i.salaryLocal)} ${per}`,
    i.salaryMid?.trim() && `mid-level professionals with three to five years' experience earn around ${money(cur, i.salaryMid)} ${per}`,
    i.salarySenior?.trim() && `senior and managerial roles pay ${money(cur, i.salarySenior)} ${per} or more`,
  ].filter(Boolean) as string[];
  const structure = levels.length >= 2 ? `In ${home}, salaries in ${f} follow a clear structure: ${levels.length > 1 ? `${levels.slice(0, -1).join(", ")} and ${levels[levels.length - 1]}` : levels[0]}.` : "";
  if (i.salaryLocal?.trim() || i.salaryOverseasMin?.trim()) {
    const local = i.salaryLocal?.trim() ? `Local graduates typically start at around ${money(cur, i.salaryLocal)} ${per}` : "";
    const range = i.salaryOverseasMin?.trim() ? `${money(cur, i.salaryOverseasMin)}${i.salaryOverseasMax?.trim() ? ` to ${money(cur, i.salaryOverseasMax)}` : ""} ${per}` : "";
    const overseas = range ? `professionals with an overseas postgraduate qualification and a few years' experience can earn ${range}` : "";
    salary = `${structure ? structure + " " : ""}${[structure ? "" : local, overseas ? (structure ? `Professionals with an overseas postgraduate qualification and a few years' experience can earn ${range}` : overseas) : ""].filter(Boolean).join(", while ")}${i.salarySource?.trim() ? ` (source: ${i.salarySource.trim()})` : ""}. This shows the clear career and financial benefit of the ${course}: combined with my experience, it will place me in these higher-level roles in ${home}.`;
  }

  if (shortGoalText.trim()) out.push(shortGoalText.trim());
  if (longGoalText.trim()) out.push(longGoalText.trim());
  if (i.jobProspects?.trim()) out.push(`${i.jobProspects.trim().replace(/^./, (x) => x.toUpperCase()).replace(/\.$/, "")}.`);
  if (salary) out.push(`\nJob Market and Salary Structure in ${home}`, salary);
  out.push(`My career, my family and my future are in ${home}. I have no intention of remaining abroad after my studies; I will return to ${home} and use the knowledge and skills I gain to build my career there.`);
  return out.join("\n");
}
