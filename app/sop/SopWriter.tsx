"use client";

import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, flag } from "@/lib/countries";
import { EMPTY_SOP, SOP_FIELDS, buildSop, sopFormat, wordCount, type SopInput } from "@/lib/sop";
import { extractDetails } from "@/lib/extractDetails";
import { analyzeCv } from "@/lib/cvAnalyzer";
import { reviewDocument } from "@/lib/docReview";
import { downloadBytes, textToPdf } from "@/lib/pdf";
import { extractFileText } from "@/components/SupportDocReview";
import { Field } from "@/components/ui";

const KEY = "visa-sop-v1";
const FORMAT_LABEL = { "au-gs": "Australia: Genuine Student (GS) statement", "ca-plan": "Canada: Study plan", standard: "Statement of Purpose" } as const;

export function SopWriter() {
  const [s, setS] = useState<SopInput>(EMPTY_SOP);
  const [filled, setFilled] = useState<Record<string, string>>({});
  const [edited, setEdited] = useState<string | null>(null);
  const [reading, setReading] = useState("");
  const [msg, setMsg] = useState("");
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const d = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (d) {
        setS({ ...EMPTY_SOP, ...d.s });
        setEdited(d.edited ?? null);
      }
    } catch {}
    fetch("/api/config").then((r) => r.json()).then((c) => setAi(Boolean(c.ai))).catch(() => {});
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ s, edited }));
    } catch {}
  }, [s, edited]);

  const set = (k: keyof SopInput, val: string) => {
    setEdited(null);
    setS((x) => ({ ...x, [k]: val }));
  };
  const generated = useMemo(() => buildSop(s), [s]);
  const text = edited ?? generated;
  const review = useMemo(() => reviewDocument(text, { fullName: s.fullName, destination: s.country, visaType: "student" }), [text, s.fullName, s.country]);
  const missing = (text.match(/\[[^\]]+\]/g) ?? []).length;

  /** Fill empty fields from an uploaded document (CV, transcript, offer letter, IELTS…). */
  async function upload(slot: string, list: FileList | null) {
    if (!list?.length) return;
    const add: Partial<SopInput> = {};
    for (const file of [...list]) {
      setReading(`Reading ${file.name}…`);
      const t = await extractFileText(file);
      if (!t) continue;
      const d = Object.fromEntries(extractDetails(t, file.name).map((x) => [x.key, x.value]));
      if (d.fullName) add.fullName = d.fullName;
      if (d.nationality) add.nationality = d.nationality;
      if (d.institution) add[slot === "Offer letter" ? "university" : "prevInstitution"] = d.institution;
      if (d.course) add[slot === "Offer letter" ? "course" : "prevDegree"] = d.course;
      if (d.courseStart && slot === "Offer letter") add.intake = d.courseStart;
      if (d.englishTest) add.englishTest = d.englishTest;
      if (d.englishScore) add.englishScore = d.englishScore;
      if (d.bankBalance) add.fundsAmount = d.bankBalance;
      if (slot === "CV") {
        const cv = analyzeCv(t, "student");
        if (cv.name) add.fullName ??= cv.name;
        if (cv.education[0]) add.prevDegree ??= cv.education[0];
        if (cv.jobs.length) add.workExperience = cv.jobs.map((j) => `${j.title}${j.years ? ` (${j.years})` : ""}`).join("; ");
        if (cv.gaps.length) add.gaps = `gap(s) ${cv.gaps.join(", ")}: [explain what you did during this time]`;
      }
    }
    const got: Record<string, string> = {};
    setS((cur) => {
      const n = { ...cur };
      for (const [k, val] of Object.entries(add) as [keyof SopInput, string][]) {
        if (val && !n[k]) {
          n[k] = val;
          got[k] = slot;
        }
      }
      return n;
    });
    setFilled((f) => ({ ...f, ...got }));
    setEdited(null);
    setReading("");
    setMsg(Object.keys(got).length ? `Filled ${Object.keys(got).length} field(s) from your ${slot}. Check them below.` : `No new details found in the ${slot} (scanned files cannot be read). Fill the fields manually.`);
  }

  async function polish() {
    setBusy(true);
    try {
      const r = await fetch("/api/letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft: text, type: `${FORMAT_LABEL[sopFormat(s.countryCode)]} for a student visa (keep the section headings; do not invent facts)`, notes: s.extra }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setEdited(j.letter);
      setMsg("✨ Improved by AI. Check every fact before using it.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-bold">1. Upload documents to fill the details (optional)</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {["CV", "Transcripts / degree", "Offer letter", "IELTS / PTE", "Bank statement"].map((slot) => (
            <label key={slot} className="cursor-pointer rounded-2xl border border-line bg-white p-3 text-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="font-semibold">📎 {slot}</div>
              <div className="text-xs text-indigo-700">Upload</div>
              <input type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => { upload(slot, e.target.files); e.target.value = ""; }} />
            </label>
          ))}
        </div>
        {reading && <p className="mt-2 animate-pulse text-sm text-indigo-700">{reading}</p>}
        {msg && <p className="mt-2 text-sm text-emerald-700">{msg}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-5">
          <h2 className="font-bold">2. Your details (type or correct them)</h2>
          <Field label="Destination country">
            <select className="input" value={s.countryCode} onChange={(e) => { const c = COUNTRIES.find((x) => x.code === e.target.value); set("countryCode", e.target.value); set("country", c?.name ?? ""); }}>
              <option value="">Select…</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
            </select>
          </Field>
          <p className="-mt-3 text-xs text-indigo-700">Format: {FORMAT_LABEL[sopFormat(s.countryCode)]}</p>
          {SOP_FIELDS.map((sec) => (
            <section key={sec.section}>
              <h3 className="label">{sec.section}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {sec.fields.filter(([k]) => k !== "country").map(([k, label, type]) => (
                  <div key={k} className={type === "textarea" ? "sm:col-span-2" : ""}>
                    <Field label={`${label}${filled[k] ? " ✨" : ""}`} hint={filled[k] ? `from your ${filled[k]}` : undefined}>
                      {type === "textarea" ? <textarea className="input min-h-20" value={s[k]} onChange={(e) => set(k, e.target.value)} /> : <input className="input" value={s[k]} onChange={(e) => set(k, e.target.value)} />}
                    </Field>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn-primary" onClick={async () => downloadBytes(await textToPdf(text), `${(s.fullName || "SOP").replace(/\W+/g, "-")}-SOP.pdf`)}>⬇ Download PDF</button>
            <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(text).then(() => setMsg("Copied."))}>📋 Copy</button>
            {ai && <button className="btn-ghost" disabled={busy} onClick={polish}>{busy ? "Writing…" : "✨ Improve with AI"}</button>}
            {edited !== null && <button className="btn-ghost" onClick={() => setEdited(null)}>↺ Reset to generated</button>}
            <span className="ml-auto text-xs text-slate-500">{wordCount(text)} words · {missing} to fill</span>
          </div>
          <textarea className="min-h-[560px] w-full rounded-2xl border border-line bg-white p-6 font-serif text-[15px] leading-relaxed shadow-xl outline-none" value={text} onChange={(e) => setEdited(e.target.value)} />
          <div className={`card ${review.verdict === "error" ? "border-rose-300" : review.verdict === "warning" ? "border-amber-300" : "border-emerald-300"}`}>
            <h3 className="font-bold">{review.verdict === "ok" ? "✅ Ready" : review.verdict === "error" ? "❌ Fix before using" : "⚠️ Can be improved"}</h3>
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
              {missing > 0 && <li className="text-rose-700">❌ {missing} [placeholder(s)] still need your real information.</li>}
              {review.issues.filter((x) => x.problem !== "Unfilled placeholder / blank" && x.problem !== "No date found").map((x, k) => (
                <li key={k} className={x.severity === "error" ? "text-rose-700" : x.severity === "warning" ? "text-amber-700" : "text-slate-600"}>
                  {x.severity === "error" ? "❌" : x.severity === "warning" ? "⚠️" : "💡"} {x.problem}{x.found ? `: “${x.found.slice(0, 80)}”` : ""}{x.replaceWith ? ` → ${x.replaceWith}` : ""}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Write only what is true and can be backed by your documents. Officers compare the SOP with your CV, transcripts and interview answers.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
