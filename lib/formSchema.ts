export type FormField = {
  key: string;
  label: string;
  type?: "text" | "date" | "email" | "tel" | "number" | "textarea" | "select";
  options?: string[];
  aliases?: string[]; // used to auto-fill official PDF forms
  wide?: boolean;
};

export type FormSection = { id: string; title: string; icon: string; fields: FormField[] };

export const FORM_SECTIONS: FormSection[] = [
  {
    id: "personal", title: "Personal details", icon: "👤",
    fields: [
      { key: "surname", label: "Surname / family name", aliases: ["surname", "lastname", "familyname"] },
      { key: "givenNames", label: "Given names", aliases: ["givenname", "givennames", "firstname", "forename", "firstnames"] },
      { key: "otherNames", label: "Other names used", aliases: ["othernames", "previousnames", "maidenname"] },
      { key: "sex", label: "Sex", type: "select", options: ["Male", "Female", "Other"], aliases: ["sex", "gender"] },
      { key: "dob", label: "Date of birth", type: "date", aliases: ["dateofbirth", "dob", "birthdate"] },
      { key: "placeOfBirth", label: "Place of birth (city)", aliases: ["placeofbirth", "cityofbirth", "birthplace"] },
      { key: "countryOfBirth", label: "Country of birth", aliases: ["countryofbirth"] },
      { key: "nationality", label: "Current nationality", aliases: ["nationality", "citizenship", "currentnationality"] },
      { key: "otherNationality", label: "Other nationalities", aliases: ["othernationality", "nationalityatbirth"] },
      { key: "maritalStatus", label: "Marital status", type: "select", options: ["Single", "Married", "Divorced", "Widowed", "Separated", "Civil partnership"], aliases: ["maritalstatus", "civilstatus"] },
      { key: "nationalId", label: "National ID number", aliases: ["nationalid", "idnumber", "nic", "nationalidentitynumber"] },
    ],
  },
  {
    id: "passport", title: "Passport", icon: "🛂",
    fields: [
      { key: "passportNo", label: "Passport number", aliases: ["passportnumber", "passportno", "traveldocumentnumber", "documentnumber"] },
      { key: "passportType", label: "Passport type", type: "select", options: ["Ordinary", "Diplomatic", "Official", "Service"], aliases: ["passporttype", "typeoftraveldocument"] },
      { key: "passportIssue", label: "Date of issue", type: "date", aliases: ["dateofissue", "issuedate", "passportissuedate"] },
      { key: "passportExpiry", label: "Expiry date", type: "date", aliases: ["expirydate", "dateofexpiry", "validuntil", "passportexpirydate"] },
      { key: "passportPlace", label: "Place of issue", aliases: ["placeofissue", "issuingplace"] },
      { key: "passportAuthority", label: "Issuing authority / country", aliases: ["issuingauthority", "issuedby", "issuingcountry"] },
    ],
  },
  {
    id: "contact", title: "Contact & address", icon: "🏠",
    fields: [
      { key: "address", label: "Home address", type: "textarea", wide: true, aliases: ["address", "homeaddress", "residentialaddress", "streetaddress"] },
      { key: "city", label: "City", aliases: ["city", "town"] },
      { key: "postcode", label: "Postal code", aliases: ["postcode", "postalcode", "zip", "zipcode"] },
      { key: "country", label: "Country of residence", aliases: ["countryofresidence", "country"] },
      { key: "phone", label: "Phone", type: "tel", aliases: ["phone", "telephone", "mobile", "phonenumber", "telephonenumber"] },
      { key: "email", label: "Email", type: "email", aliases: ["email", "emailaddress"] },
    ],
  },
  {
    id: "travel", title: "Travel plans", icon: "✈️",
    fields: [
      { key: "destination", label: "Destination country", aliases: ["destination", "countryofdestination", "mainDestination"] },
      { key: "visaType", label: "Visa type requested", aliases: ["visatype", "typeofvisa", "visacategory"] },
      { key: "purpose", label: "Main purpose of journey", type: "textarea", wide: true, aliases: ["purpose", "purposeofjourney", "purposeoftravel", "purposeofvisit"] },
      { key: "arrival", label: "Intended arrival date", type: "date", aliases: ["arrivaldate", "intendeddateofarrival", "dateofarrival"] },
      { key: "departure", label: "Intended departure date", type: "date", aliases: ["departuredate", "intendeddateofdeparture", "dateofdeparture"] },
      { key: "stayAddress", label: "Address during stay / host", type: "textarea", wide: true, aliases: ["addressduringstay", "hostaddress", "hotel", "accommodationaddress"] },
      { key: "payer", label: "Who pays for the trip", aliases: ["costcoveredby", "whopays", "sponsor", "payer"] },
      { key: "companions", label: "Travel companions", aliases: ["companions", "travellingwith"] },
    ],
  },
  {
    id: "work", title: "Employment / study", icon: "💼",
    fields: [
      { key: "occupation", label: "Current occupation", aliases: ["occupation", "currentoccupation", "profession", "jobtitle"] },
      { key: "employer", label: "Employer / school name", aliases: ["employer", "employername", "nameofemployer", "school", "institution"] },
      { key: "employerAddress", label: "Employer / school address", type: "textarea", wide: true, aliases: ["employeraddress", "addressofemployer"] },
      { key: "employerPhone", label: "Employer phone", type: "tel", aliases: ["employerphone", "employertelephone"] },
      { key: "jobStart", label: "Start date", type: "date", aliases: ["startdate", "employmentstartdate"] },
      { key: "income", label: "Monthly income", aliases: ["income", "monthlyincome", "salary"] },
    ],
  },
  {
    id: "family", title: "Family", icon: "👨‍👩‍👧",
    fields: [
      { key: "fatherName", label: "Father's full name", aliases: ["fathername", "fathersname", "father"] },
      { key: "motherName", label: "Mother's full name", aliases: ["mothername", "mothersname", "mother"] },
      { key: "spouseName", label: "Spouse / partner name", aliases: ["spousename", "spouse", "partnername"] },
      { key: "spouseDob", label: "Spouse date of birth", type: "date", aliases: ["spousedob", "spousedateofbirth"] },
      { key: "children", label: "Children (names & dates of birth)", type: "textarea", wide: true, aliases: ["children", "dependants", "dependents"] },
    ],
  },
  {
    id: "history", title: "Travel & immigration history", icon: "📜",
    fields: [
      { key: "previousVisits", label: "Countries visited in the last 10 years", type: "textarea", wide: true, aliases: ["previoustravel", "travelhistory", "previousvisits"] },
      { key: "previousVisas", label: "Previous visas for this country", type: "textarea", wide: true, aliases: ["previousvisas", "previousvisa"] },
      { key: "refusals", label: "Previous refusals (country, date, reason)", type: "textarea", wide: true, aliases: ["refusals", "previousrefusals", "refused"] },
      { key: "convictions", label: "Criminal convictions", type: "select", options: ["No", "Yes"], aliases: ["convictions", "criminalrecord", "criminal"] },
    ],
  },
];

export const ALL_FIELDS = FORM_SECTIONS.flatMap((s) => s.fields);

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Find the guided-form value that best matches an official PDF field name. */
export function matchFieldValue(pdfFieldName: string, values: Record<string, string>): string | undefined {
  const n = norm(pdfFieldName.split(/[.[\]]/).filter(Boolean).pop() ?? pdfFieldName);
  const full = norm(pdfFieldName);
  let best: { key: string; score: number } | undefined;
  for (const f of ALL_FIELDS) {
    for (const a of [f.key, ...(f.aliases ?? [])].map(norm)) {
      let score = 0;
      if (n === a) score = 100;
      else if (n.includes(a) && a.length >= 4) score = 50 + a.length;
      else if (full.includes(a) && a.length >= 6) score = 20 + a.length;
      if (score && (!best || score > best.score)) best = { key: f.key, score };
    }
  }
  return best ? values[best.key] : undefined;
}
