// Heuristic document authenticity check (original vs. possibly edited/fake).
// It NEVER proves a document is fake: it lists signals so a person can decide, and a manual
// decision always overrides the automatic result.
import { extractText, getDocumentProxy } from "unpdf";

export type AuthSignal = { level: "good" | "info" | "warn" | "bad"; label: string; detail: string; points: number };
export type AuthVerdict = "likely-original" | "needs-check" | "suspicious";
export type AuthResult = {
  score: number; // 0..100, higher = more likely original
  verdict: AuthVerdict;
  verdictLabel: string;
  signals: AuthSignal[];
  meta: Record<string, string>;
  checkedAt: string;
};

const EDITORS_IMAGE = /photoshop|gimp|paint\.net|pixlr|canva|picsart|snapseed|affinity photo|fotor|lightroom|corel(draw|photo)/i;
const EDITORS_PDF = /ilovepdf|smallpdf|sejda|pdfescape|pdf-?xchange editor|foxit (phantom|pdf editor)|nitro|pdfelement|wondershare|sodapdf|pdfill|pdf candy|pdffiller|dochub|inkscape|libreoffice draw/i;
const DESIGN_TOOLS = /canva|photoshop|illustrator|indesign|coreldraw|affinity|figma|inkscape/i;
const OFFICE = /microsoft.*word|word for|libreoffice writer|openoffice|google docs|wps (writer|office)|pages/i;
const REPORT_GENERATORS = /itext|jasper|crystal reports|birt|wkhtmltopdf|reportlab|pdfsharp|aspose|oracle|sap|apache fop|tcpdf|dompdf|mpdf|fpdf|chrome|skia|qt|prince/i;
const SCANNERS = /scan|canon|epson|hewlett|hp |brother|xerox|ricoh|kyocera|konica|sharp|fujitsu|camscanner|adobe scan|genius scan|microsoft lens|office lens/i;
// documents that are normally produced by an institution's system, not typed in an editor
const INSTITUTIONAL = /bank|statement|payslip|salary|tax|transcript|certificate|offer|admission|cas|i-20|loa|coe|ielts|pte|toefl|passport|police|birth|marriage|insurance/i;

function pdfDate(s?: string) {
  const m = s?.match(/D?:?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?/);
  if (!m) return undefined;
  const d = new Date(`${m[1]}-${m[2] ?? "01"}-${m[3] ?? "01"}T${m[4] ?? "00"}:${m[5] ?? "00"}:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

// ---- passport MRZ check digits (ICAO 9303, weights 7-3-1) ----
function mrzValue(c: string) {
  if (c === "<") return 0;
  if (/\d/.test(c)) return Number(c);
  return c.charCodeAt(0) - 55; // A=10
}
function checkDigit(s: string) {
  const w = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += mrzValue(s[i]) * w[i % 3];
  return String(sum % 10);
}
export function validateMrz(text: string): AuthSignal | null {
  const lines = text.split("\n").map((l) => l.replace(/\s+/g, "").toUpperCase());
  for (let i = 0; i < lines.length - 1; i++) {
    if (!/^P[A-Z<][A-Z<]{3}[A-Z<]{5,}$/.test(lines[i])) continue;
    const l2 = lines[i + 1];
    if (!/^[A-Z0-9<]{28,44}$/.test(l2) || l2.length < 28) continue;
    const num = l2.slice(0, 9), numC = l2[9], dob = l2.slice(13, 19), dobC = l2[19], exp = l2.slice(21, 27), expC = l2[27];
    const bad: string[] = [];
    if (checkDigit(num) !== numC) bad.push("passport number");
    if (checkDigit(dob) !== dobC) bad.push("date of birth");
    if (checkDigit(exp) !== expC) bad.push("expiry date");
    return bad.length
      ? { level: "bad", label: "Passport MRZ check digits do not match", detail: `The machine-readable zone check digit fails for: ${bad.join(", ")}. This happens with altered passports, but also with poor scans or OCR errors, so check the original passport.`, points: -40 }
      : { level: "good", label: "Passport MRZ check digits are valid", detail: "Passport number, date of birth and expiry check digits are consistent.", points: 10 };
  }
  return null;
}

function verdictOf(score: number): [AuthVerdict, string] {
  if (score >= 75) return ["likely-original", "Likely original"];
  if (score >= 45) return ["needs-check", "Needs manual check"];
  return ["suspicious", "Suspicious: possible edited / fake document"];
}

export async function checkAuthenticity(bytes: Uint8Array, fileName: string, mime: string, category = ""): Promise<AuthResult> {
  const signals: AuthSignal[] = [];
  const meta: Record<string, string> = {};
  const add = (s: AuthSignal) => signals.push(s);
  const kind = `${category} ${fileName}`.toLowerCase();
  const institutional = INSTITUTIONAL.test(kind);
  const raw = Buffer.from(bytes).toString("latin1");
  const isPdf = mime === "application/pdf" || /\.pdf$/i.test(fileName) || raw.startsWith("%PDF");
  const isImage = mime.startsWith("image/") || /\.(jpe?g|png|webp|heic)$/i.test(fileName);

  if (isPdf) {
    let text = "";
    try {
      const pdf = await getDocumentProxy(new Uint8Array(bytes));
      const info = ((await pdf.getMetadata()).info ?? {}) as Record<string, unknown>;
      for (const k of ["Producer", "Creator", "Author", "Title", "CreationDate", "ModDate"]) if (info[k]) meta[k] = String(info[k]);
      text = (await extractText(pdf, { mergePages: true })).text;
      meta.Pages = String(pdf.numPages);
    } catch {
      add({ level: "warn", label: "PDF could not be fully read", detail: "The file may be encrypted, damaged or unusual. Check the original.", points: -15 });
    }
    const tool = `${meta.Producer ?? ""} ${meta.Creator ?? ""}`;
    if (tool.trim()) {
      if (EDITORS_IMAGE.test(tool) || DESIGN_TOOLS.test(tool))
        add({ level: institutional ? "bad" : "warn", label: "Made or edited with design / photo software", detail: `Created with “${tool.trim()}”. Bank statements, certificates and letters from institutions are not normally made in design tools.`, points: institutional ? -45 : -15 });
      else if (EDITORS_PDF.test(tool))
        add({ level: "warn", label: "Passed through a PDF editing tool", detail: `“${tool.trim()}” can edit text. It is also commonly used just to merge or compress files, so this alone does not mean fake.`, points: -15 });
      else if (OFFICE.test(tool))
        add({ level: institutional && /bank|statement|payslip|transcript|certificate/.test(kind) ? "warn" : "info", label: "Created in a word processor", detail: `Created with “${tool.trim()}”. Normal for letters; unusual for bank statements or certificates downloaded from an institution.`, points: institutional && /bank|statement|payslip|transcript|certificate/.test(kind) ? -15 : 0 });
      else if (SCANNERS.test(tool)) add({ level: "info", label: "Scanned copy", detail: `Produced by a scanner/scanning app (“${tool.trim()}”). Content cannot be verified digitally. Compare with the original.`, points: -5 });
      else if (REPORT_GENERATORS.test(tool)) add({ level: "good", label: "Generated by a system / report engine", detail: `Produced by “${tool.trim()}”, typical of documents downloaded from banks and institutions.`, points: 5 });
      else add({ level: "info", label: "Creating software", detail: tool.trim(), points: 0 });
    } else add({ level: "info", label: "No creator information", detail: "The PDF has no producer/creator data (it may have been removed).", points: -5 });

    const created = pdfDate(meta.CreationDate);
    const modified = pdfDate(meta.ModDate);
    if (created && modified && modified.getTime() - created.getTime() > 2 * 60 * 1000)
      add({ level: "warn", label: "Modified after it was created", detail: `Created ${created.toISOString().slice(0, 16).replace("T", " ")}, modified ${modified.toISOString().slice(0, 16).replace("T", " ")}.`, points: modified.getTime() - created.getTime() > 86400000 ? -20 : -10 });
    if (created && created.getTime() > Date.now() + 86400000) add({ level: "bad", label: "Creation date is in the future", detail: meta.CreationDate ?? "", points: -25 });

    const eofs = (raw.match(/%%EOF/g) ?? []).length;
    if (eofs > 1) add({ level: "warn", label: `Saved ${eofs} times (incremental updates)`, detail: "The file was changed and re-saved after it was first produced. Signing tools and form-filling also do this.", points: eofs > 3 ? -20 : -10 });
    if (/\/Annots/.test(raw) && /\/FreeText|\/Typewriter/.test(raw)) add({ level: "warn", label: "Text boxes added on top of the page", detail: "Typed annotations can be used to cover or change values. Check the original.", points: -15 });
    if (/\/Sig\b|\/ByteRange/.test(raw)) add({ level: "good", label: "Contains a digital signature field", detail: "Digitally signed documents are harder to alter. Verify the signature in Adobe Reader.", points: 10 });

    const fonts = new Set([...raw.matchAll(/\/BaseFont\s*\/([A-Za-z0-9+_-]+)/g)].map((m) => m[1].replace(/^[A-Z]{6}\+/, "")));
    if (fonts.size) meta.Fonts = [...fonts].slice(0, 8).join(", ");
    if (fonts.size >= 6 && /bank|statement|payslip/.test(kind)) add({ level: "warn", label: `Many different fonts (${fonts.size})`, detail: "Edited statements often contain extra fonts where numbers were replaced.", points: -10 });

    if (text) {
      const mrz = validateMrz(text);
      if (mrz) add(mrz);
      if (/\[[^\]\n]{1,40}\]|lorem ipsum|sample|specimen|template/i.test(text)) add({ level: "warn", label: "Template / sample wording found", detail: "Words like “sample”, “specimen”, “template” or [placeholders] appear in the text.", points: -15 });
    } else if (!signals.some((s) => s.label === "Scanned copy")) add({ level: "info", label: "No text layer", detail: "Image-only PDF (scan or photo). Content cannot be checked automatically.", points: -5 });
  } else if (isImage) {
    const sw = raw.slice(0, 200000).match(/(Adobe Photoshop[^\0]{0,30}|GIMP[^\0]{0,20}|paint\.net[^\0]{0,15}|Canva|PicsArt|Snapseed|Pixlr|Lightroom)/i)?.[1];
    if (sw) add({ level: institutional ? "bad" : "warn", label: "Image edited with photo software", detail: `The image contains an editing-software tag: “${sw.replace(/[^\x20-\x7E]/g, "").trim()}”.`, points: institutional ? -35 : -15 });
    const cam = raw.slice(0, 4000).match(/(Canon|NIKON|SONY|samsung|Apple|HUAWEI|Xiaomi|OPPO|vivo|Google|OnePlus)[^\0]{0,20}/)?.[0];
    if (cam) {
      meta.Camera = cam.replace(/[^\x20-\x7E]/g, "").trim();
      add({ level: "info", label: "Photo taken with a camera / phone", detail: `Device: ${meta.Camera}. Photos of documents cannot be verified digitally. Compare with the original.`, points: -5 });
    } else if (!sw) add({ level: "info", label: "No camera information", detail: "The image has no camera data (screenshots and edited images often lose it).", points: -10 });
    add({ level: "info", label: "Image file", detail: "Ask for the original PDF from the issuer, or see the physical document, for anything important.", points: 0 });
  } else {
    add({ level: "info", label: "File type cannot be analysed", detail: "Only PDF and image files can be checked automatically.", points: -10 });
  }

  const score = Math.max(0, Math.min(100, 85 + signals.reduce((s, x) => s + x.points, 0)));
  const [verdict, verdictLabel] = verdictOf(score);
  return { score, verdict, verdictLabel, signals, meta, checkedAt: new Date().toISOString() };
}
