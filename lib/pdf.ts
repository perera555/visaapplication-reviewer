// Client-side PDF helpers (pdf-lib).
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

// Standard fonts only support WinAnsi characters — replace anything else.
const safe = (s: string) =>
  s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/…/g, "...").replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, "");

function wrap(text: string, font: PDFFont, size: number, width: number) {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      out.push("");
      continue;
    }
    const lead = para.match(/^\s*/)?.[0] ?? "";
    let line = "";
    for (const word of para.trim().split(/\s+/)) {
      const test = line ? `${line} ${word}` : `${lead}${word}`;
      if (font.widthOfTextAtSize(test, size) > width && line) {
        out.push(line);
        line = `${lead}${word}`;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

export async function textToPdf(text: string, opts: { title?: string; size?: number } = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const size = opts.size ?? 11.5;
  const margin = 64;
  const lh = size * 1.45;
  let page = doc.addPage([595.28, 841.89]);
  const width = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;
  if (opts.title) {
    page.drawText(safe(opts.title), { x: margin, y, size: 15, font: bold, color: rgb(0.1, 0.1, 0.3) });
    y -= 28;
  }
  for (const line of wrap(safe(text), font, size, width)) {
    if (y < margin) {
      page = doc.addPage([595.28, 841.89]);
      y = page.getHeight() - margin;
    }
    const isSubject = /^Subject:/i.test(line);
    page.drawText(line, { x: margin, y, size, font: isSubject ? bold : font });
    y -= lh;
  }
  return doc.save();
}

export function downloadBytes(bytes: Uint8Array | string, name: string, type = "application/pdf") {
  const blob = new Blob([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
