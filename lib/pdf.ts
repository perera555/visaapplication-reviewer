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
      if (font.widthOfTextAtSize(test.replace(/\*\*/g, ""), size) > width && line) {
        out.push(line);
        line = `${lead}${word}`;
      } else line = test;
    }
    out.push(line);
  }
  return out;
}

/** A short line without a full stop that is followed by a paragraph is treated as a section heading. */
const isHeading = (line: string) => line.length > 2 && line.length < 110 && !/[.,;:]$/.test(line) && !/^(Yours|Dear|\[Date\]|\(Applicant\))/.test(line) && /^[A-Z]/.test(line);

export async function textToPdf(text: string, opts: { title?: string; size?: number; spacing?: number; headings?: boolean; pageNumbers?: boolean } = {}) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const size = opts.size ?? 11.5;
  const margin = opts.headings ? 72 : 64; // 2.5 cm for document-style output
  const lh = size * (opts.spacing ?? 1.45);
  let page = doc.addPage([595.28, 841.89]);
  const width = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;
  if (opts.title) {
    page.drawText(safe(opts.title), { x: margin, y, size: 15, font: bold, color: rgb(0.1, 0.1, 0.3) });
    y -= 28;
  }
  const newPage = () => {
    page = doc.addPage([595.28, 841.89]);
    y = page.getHeight() - margin;
  };
  const paras = safe(text).split("\n");
  let boldOn = false;
  for (let p = 0; p < paras.length; p++) {
    const raw = paras[p];
    const heading = opts.headings && isHeading(raw.trim()) && (paras[p + 1] ?? "").trim().length > 0 && !/^\[?Date/.test(raw);
    const f = heading || /^Subject:/i.test(raw) ? bold : font;
    if (heading && y < margin + lh * 3) newPage(); // keep a heading with its paragraph
    if (heading) y -= lh * 0.4;
    for (const line of wrap(raw, f, size, width)) {
      if (y < margin) newPage();
      if (line) {
        // inline **bold** segments (bold state carries across wrapped lines)
        let x = margin;
        for (const part of line.split("**")) {
          if (part) {
            const pf = boldOn ? bold : f;
            page.drawText(part, { x, y, size, font: pf });
            x += pf.widthOfTextAtSize(part, size);
          }
          boldOn = !boldOn;
        }
        boldOn = !boldOn; // undo the toggle after the last segment
      }
      y -= line ? lh : lh * 0.6;
    }
  }
  if (opts.pageNumbers) {
    const pages = doc.getPages();
    pages.forEach((pg, n) => pg.drawText(`${n + 1}`, { x: pg.getWidth() / 2 - 3, y: 30, size: 10, font }));
  }
  return doc.save();
}

/** Rough page estimate for the document-style PDF (12 pt, 1.5 spacing, A4). */
export const estimatePages = (text: string) => Math.max(1, Math.round((text.trim().split(/\s+/).length / 330) * 10) / 10);

export function downloadBytes(bytes: Uint8Array | string, name: string, type = "application/pdf") {
  const blob = new Blob([typeof bytes === "string" ? bytes : new Uint8Array(bytes)], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
