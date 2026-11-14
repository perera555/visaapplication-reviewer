import type { DocRequirement } from "./requirements";
import type { DocStatus, Profile } from "./scoring";

export type CustomRequirement = DocRequirement & { countryCode: string; visaType: string; createdAt: string };

export type SupportDoc = {
  id: string;
  title: string;
  description: string;
  countryCode: string; // "*" = all
  visaType: string; // "*" = all
  url?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  createdAt: string;
};

export type StoredFileMeta = { id: string; name: string; type: string; size: number; reqId?: string; stored: boolean };

export type ApplicationStatus = "new" | "reviewing" | "docs-requested" | "submitted" | "approved" | "refused";

export type Application = {
  id: string;
  createdAt: string;
  updatedAt: string;
  countryCode: string;
  visaType: string;
  profile: Profile;
  docs: (DocStatus & { name: string; mandatory: boolean })[];
  extraDocs: { name: string; fileName?: string }[];
  files: StoredFileMeta[];
  score: number;
  statusLabel: string;
  status: ApplicationStatus;
  adminNotes: string;
  message: string;
};

export const MAX_STORED_FILE = 900 * 1024;

// ---------- customer registration (company side) ----------
export type RegistrationStatus = "registered" | "documents-pending" | "in-process" | "submitted" | "approved" | "refused" | "closed";

export const REG_STATUS_LABEL: Record<RegistrationStatus, string> = {
  registered: "Registered", "documents-pending": "Documents pending", "in-process": "In process",
  submitted: "Visa submitted", approved: "Visa approved", refused: "Visa refused", closed: "Closed",
};

export type RegistrationDetails = {
  fullName: string; surname: string; givenNames: string; dob: string; sex: string; nationality: string;
  passportNo: string; passportExpiry: string; nationalId: string; email: string; phone: string; address: string;
  occupation: string; employer: string; maritalStatus: string; destination: string; visaType: string; notes: string;
};

export const EMPTY_REG_DETAILS: RegistrationDetails = {
  fullName: "", surname: "", givenNames: "", dob: "", sex: "", nationality: "", passportNo: "", passportExpiry: "",
  nationalId: "", email: "", phone: "", address: "", occupation: "", employer: "", maritalStatus: "", destination: "",
  visaType: "", notes: "",
};

export type AuthVerdict = "likely-original" | "needs-check" | "suspicious";
export type AuthSummary = { score: number; verdict: AuthVerdict; verdictLabel: string; checkedAt: string; signals?: { level: "good" | "info" | "warn" | "bad"; label: string; detail: string }[] };
/** A person's decision. It ALWAYS overrides the automatic check (e.g. an original wrongly flagged as fake). */
export type ManualVerification = { status: "original" | "fake" | "needs-check"; note: string; by: string; at: string };

export const MANUAL_LABEL: Record<ManualVerification["status"], string> = { original: "Verified original", fake: "Marked fake / rejected", "needs-check": "Needs checking" };

export type RegDocument = {
  id: string; category: string; name: string; type: string; size: number; uploadedAt: string; by: "customer" | "admin";
  /** file name as uploaded (the stored name is "<customer> - <category>.ext") */
  originalName?: string;
  /** true when the category was detected automatically */
  autoDetected?: boolean;
  auth?: AuthSummary;
  manual?: ManualVerification;
};

/** Final status shown everywhere: manual decision first, then the automatic result. */
export function finalAuthStatus(d: { auth?: AuthSummary; manual?: ManualVerification }) {
  if (d.manual) return { key: d.manual.status === "original" ? "original" : d.manual.status === "fake" ? "fake" : "check", label: MANUAL_LABEL[d.manual.status], manual: true } as const;
  if (!d.auth) return { key: "unchecked", label: "Not checked", manual: false } as const;
  return { key: d.auth.verdict === "likely-original" ? "original" : d.auth.verdict === "suspicious" ? "fake" : "check", label: d.auth.verdictLabel, manual: false } as const;
}

export type Registration = {
  id: string;
  regNo: string;
  createdAt: string;
  updatedAt: string;
  status: RegistrationStatus;
  details: RegistrationDetails;
  photo?: { type: string; size: number };
  documents: RegDocument[];
  adminNotes: string;
};

/** Lightweight index row used for fast search ("is this person registered?"). */
export type RegistrationIndex = { id: string; regNo: string; fullName: string; passportNo: string; email: string; phone: string; nationalId: string; destination: string; status: RegistrationStatus; createdAt: string; docs: number; hasPhoto: boolean };

export const DOC_CATEGORIES = [
  "Passport", "National ID", "Birth certificate", "Bank statement", "Payslips", "Employment letter", "Business registration",
  "Tax returns", "Offer / admission letter", "Academic certificates & transcripts", "IELTS / PTE / English waiver",
  "Sponsor documents", "Marriage certificate", "Property documents", "Travel itinerary / tickets", "Hotel / accommodation",
  "Travel insurance", "Previous visas", "Refusal letter", "CV", "Police clearance", "Medical report", "Other",
];

export const MAX_REG_FILE = 4 * 1024 * 1024; // per upload (Vercel request limit is ~4.5 MB)
