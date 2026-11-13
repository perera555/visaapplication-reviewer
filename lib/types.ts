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
