"use client";

import { useEffect, useMemo, useState } from "react";
import { COUNTRIES, flag } from "@/lib/countries";
import { EMPTY_FAMILY, FAMILY_OPTIONS, TRIP_PURPOSES, type Family, type TripEntry } from "@/lib/sop";
import { EMPTY_EDU, EMPTY_JOB, EMPTY_SOP, QUALIFICATION_OPTIONS, SOP_FIELDS, WORK_FIELDS, buildSop, findGaps, sopFormat, wordCount, type EduEntry, type JobEntry, type SopInput } from "@/lib/sop";
import { extractDetails } from "@/lib/extractDetails";
import { analyzeCv } from "@/lib/cvAnalyzer";
import { reviewDocument } from "@/lib/docReview";
import { downloadBytes, textToPdf } from "@/lib/pdf";
import { extractFileText } from "@/components/SupportDocReview";
import { Field } from "@/components/ui";

const KEY = "visa-sop-v1";
const FORMAT_LABEL = { "au-gs": "Australia: Genuine Student (GS) statement", "ca-plan": "Canada: Study plan", standard: "Statement of Purpose", full: "Full letter SOP (all sections)" } as const;

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
  const setList = <K extends "education" | "jobs">(k: K, list: SopInput[K]) => {
    setEdited(null);
    setS((x) => ({ ...x, [k]: list }));
  };
  const worker = s.applicantType === "worker";
  const sections = worker ? WORK_FIELDS : SOP_FIELDS;
  const gaps = useMemo(() => findGaps(s), [s]);
  const docsReady = { certs: s.education.filter((e) => e.certificate).length, letters: s.jobs.filter((j) => j.letter).length };
  const generated = useMemo(() => buildSop(s), [s]);
  const text = edited ?? generated;
  const review = useMemo(() => reviewDocument(text, { fullName: s.fullName, destination: s.country, visaType: worker ? "work" : "student", university: worker ? undefined : s.university, knownInstitutions: s.education.map((e) => e.institution) }), [text, s.fullName, s.country, s.university, s.education, worker]);
  const missing = (text.match(/\[[^\]]+\]/g) ?? []).length;

  /** Fill empty fields from an uploaded document (CV, transcript, offer letter, IELTS…). */
  async function upload(slot: string, list: FileList | null) {
    if (!list?.length) return;
    const add: Partial<SopInput> = {};
    const newEdu: EduEntry[] = [];
    const newJobs: JobEntry[] = [];
    for (const file of [...list]) {
      setReading(`Reading ${file.name}…`);
      const t = await extractFileText(file);
      if (!t) continue;
      const d = Object.fromEntries(extractDetails(t, file.name).map((x) => [x.key, x.value]));
      if (d.fullName) add.fullName = d.fullName;
      if (d.nationality) add.nationality = d.nationality;
      if (slot === "Offer letter") {
        if (d.institution) add.university = d.institution;
        if (d.institutionAddress) add.universityAddress = d.institutionAddress;
        if (d.course) add.course = d.course.replace(/^(master|bachelor|doctor|graduate (certificate|diploma)) of /i, "");
        const lvl = d.course?.match(/^(Master|Bachelor|Doctor|Graduate Certificate|Graduate Diploma) of/i)?.[0];
        if (lvl) add.level = lvl.replace(/^Doctor of/i, "PhD / Doctor of Philosophy in");
        if (d.courseStart) add.intake = d.courseStart;
        if (d.duration) add.duration = d.duration;
      }
      if (slot === "Academic certificate") {
        const qual = d.course ?? t.match(/\b((?:Bachelor|Master|Doctor|BSc|BA|MSc|MBA|BEng|Higher National Diploma|Diploma|Certificate)[^\n.]{3,80})/)?.[1]?.trim() ?? "";
        const year = t.match(/\b(19|20)\d{2}\b(?![\s\S]*\b(19|20)\d{2}\b)/)?.[0];
        const cls = t.match(/\b(First Class(?: Honours)?|Second Class (?:Upper|Lower)(?: Division)?|Distinction|Merit|Pass|GPA[: ]*\d\.\d+)\b/i)?.[1];
        newEdu.push({ ...EMPTY_EDU, qualification: qual || file.name.replace(/\.[^.]+$/, ""), institution: d.institution ?? "", to: year ? `${year}-12` : "", result: cls ?? "", certificate: true });
      }
      if (slot === "Experience letter") {
        const from = t.match(/\b(?:since|from|joined (?:us )?on|with effect from)\s+(?:\d{1,2}(?:st|nd|rd|th)?\s+)?([A-Za-z]{3,9})?\.?\s*(\d{4})/i);
        const to = t.match(/\b(?:to|until|till)\s+(?:\d{1,2}(?:st|nd|rd|th)?\s+)?([A-Za-z]{3,9})?\.?\s*(\d{4})/i);
        const mon = (m?: string) => { const k = ["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].indexOf((m ?? "").slice(0, 3).toLowerCase()); return k >= 0 ? String(k + 1).padStart(2, "0") : "01"; };
        const current = /\b(is (?:currently )?employed|is working|presently|to date|till date|until now)\b/i.test(t) || !to;
        newJobs.push({ ...EMPTY_JOB, role: d.occupation ?? "", employer: d.employer ?? "", from: from ? `${from[2]}-${mon(from[1])}` : "", to: !current && to ? `${to[2]}-${mon(to[1])}` : "", current, letter: true });
      }
      if (d.englishTest) add.englishTest = d.englishTest;
      if (d.englishScore) add.englishScore = d.englishScore;
      if (d.bankBalance) add.fundsAmount = d.bankBalance;
      if (slot === "Job offer / contract") {
        if (d.employer) add.destEmployer = d.employer;
        if (d.occupation) add.destRole = d.occupation;
        if (d.income) add.destSalary = d.income;
      }
      if (slot === "CV") {
        const cv = analyzeCv(t, "student");
        if (cv.name) add.fullName ??= cv.name;
        cv.education.forEach((e) => newEdu.push({ ...EMPTY_EDU, qualification: e }));
        cv.jobs.forEach((j) => {
          const y = j.years?.match(/(d{4})D+(d{4}|present|current|now|till date)/i);
          newJobs.push({ ...EMPTY_JOB, role: j.title, from: y ? `${y[1]}-01` : "", to: y && /d{4}/.test(y[2]) ? `${y[2]}-12` : "", current: j.current });
        });
      }
    }
    const got: Record<string, string> = {};
    setS((cur) => {
      const n = { ...cur };
      if (newEdu.length) n.education = [...cur.education, ...newEdu.filter((e) => !cur.education.some((x) => x.qualification === e.qualification))];
      if (newJobs.length) n.jobs = [...cur.jobs, ...newJobs.filter((j) => !cur.jobs.some((x) => x.role === j.role))];
      if (newEdu.length) got.education = slot;
      if (newJobs.length) got.jobs = slot;
      for (const [k, val] of Object.entries(add) as [keyof SopInput, string][]) {
        if (val && !n[k]) {
          (n as Record<string, unknown>)[k] = val;
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
      const r = await fetch("/api/letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft: text, type: worker ? "Work visa cover letter (keep the section headings; do not invent facts)" : `${FORMAT_LABEL[sopFormat(s.countryCode, s.style)]} for a student visa (keep the section headings; do not invent facts)`, notes: s.extra }) });
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
        <p className="mt-1 text-xs text-slate-500">Upload one file per document. Each academic certificate adds a qualification and each experience letter adds a job, so upload them one by one (or several at once).</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(worker ? ["CV", "Job offer / contract", "Experience letter", "Academic certificate", "IELTS / PTE"] : ["Offer letter", "CV", "Academic certificate", "Experience letter", "IELTS / PTE", "Bank statement"]).map((slot) => (
            <label key={slot} className="cursor-pointer rounded-2xl border border-line bg-white p-3 text-sm transition hover:-translate-y-0.5 hover:shadow-md">
              <div className="font-semibold">📎 {slot}</div>
              <div className="text-xs text-slate-500">{({ "Offer letter": "Course, university, address, start date", CV: "Jobs and qualifications", "Academic certificate": "Adds a qualification (one per certificate)", "Experience letter": "Adds a job (one per letter)", "IELTS / PTE": "Test and score, or MOI letter", "Bank statement": "Funds available", "Job offer / contract": "Job title, employer, salary" } as Record<string, string>)[slot]}</div>
              <div className="mt-1 text-xs font-semibold text-indigo-700">📎 Upload</div>
              <input type="file" multiple accept=".pdf,.txt" className="hidden" onChange={(e) => { upload(slot, e.target.files); e.target.value = ""; }} />
            </label>
          ))}
        </div>
        {reading && <p className="mt-2 animate-pulse text-sm text-indigo-700">{reading}</p>}
        {msg && <p className="mt-2 text-sm text-emerald-700">{msg}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-5">
          <h2 className="font-bold">2. Your details (type or correct them)</h2>
          <div className="grid grid-cols-2 gap-2">
            {([["student", "🎓 Student", "SOP / Genuine Student / study plan"], ["worker", "💼 Worker", "Work visa cover letter"]] as const).map(([t, l, h]) => (
              <button key={t} type="button" onClick={() => { setEdited(null); setS((x) => ({ ...x, applicantType: t })); }} className={`rounded-2xl border p-3 text-left transition ${s.applicantType === t ? "border-transparent bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg" : "border-line bg-white hover:bg-slate-50"}`}>
                <div className="font-bold">{l}</div>
                <div className={`text-xs ${s.applicantType === t ? "text-white/80" : "text-slate-500"}`}>{h}</div>
              </button>
            ))}
          </div>
          {worker && <p className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900">Work visas usually do not ask for an SOP. A short cover letter (letter of explanation) about your job offer, experience and enclosed documents is recommended. Canada often asks for one; for the UK and many others it is optional.</p>}
          <Field label="Destination country">
            <select className="input" value={s.countryCode} onChange={(e) => { const c = COUNTRIES.find((x) => x.code === e.target.value); set("countryCode", e.target.value); set("country", c?.name ?? ""); }}>
              <option value="">Select…</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
            </select>
          </Field>
          <p className="-mt-3 text-xs text-indigo-700">Format: {worker ? "Work visa cover letter / letter of explanation" : FORMAT_LABEL[sopFormat(s.countryCode, s.style)]}</p>
          {!worker && (
            <Field label="SOP style">
              <select className="input" value={s.style} onChange={(e) => { setEdited(null); setS((x) => ({ ...x, style: e.target.value as SopInput["style"] })); }}>
                <option value="auto">Automatic: country format (Australia GS answers, Canada study plan, standard SOP)</option>
                <option value="full">Full letter SOP: every section (education, English, work, gaps, why not home, why country, why university & course, career, travel, family & funding)</option>
              </select>
            </Field>
          )}
          <label className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={s.autoWrite} onChange={(e) => { setEdited(null); setS((x) => ({ ...x, autoWrite: e.target.checked })); }} />
            <span><b>✨ Write the other sections automatically</b>: “why this course / university / country”, “why not study at home” and career plans are written from your course, qualifications and jobs. Anything you type below replaces the automatic text.</span>
          </label>
          <EduJobEditors s={s} setList={setList} gaps={gaps} worker={worker} />
          <TravelFamily s={s} update={(p) => { setEdited(null); setS((x) => ({ ...x, ...p })); }} />
          {sections.map((sec) => (
            <section key={sec.section}>
              <h3 className="label">{sec.section}</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                {sec.fields.map(([k, label, type, options]) => {
                  const opts = type === "country" ? COUNTRIES.map((c) => c.name) : options ?? [];
                  const isList = type === "select" || type === "country";
                  const val = typeof s[k] === "string" ? (s[k] as string) : "";
                  const custom = isList && val && !opts.includes(val);
                  return (
                    <div key={k} className={type === "textarea" ? "sm:col-span-2" : ""}>
                      <Field label={`${label}${filled[k] ? " ✨" : ""}`} hint={filled[k] ? `from your ${filled[k]}` : undefined}>
                        {type === "textarea" ? (
                          <textarea className="input min-h-20" value={val} onChange={(e) => set(k, e.target.value)} />
                        ) : isList ? (
                          <select className={`input ${filled[k] ? "border-emerald-300 bg-emerald-50/40" : ""}`} value={custom ? "__other" : val} onChange={(e) => set(k, e.target.value === "__other" ? " " : e.target.value)}>
                            <option value="">Select…</option>
                            {opts.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                            <option value="__other">Other (type it)…</option>
                          </select>
                        ) : (
                          <input className={`input ${filled[k] ? "border-emerald-300 bg-emerald-50/40" : ""}`} value={val} onChange={(e) => set(k, e.target.value)} />
                        )}
                        {custom && <input className="input mt-2" placeholder="Type your answer" value={val.trim()} onChange={(e) => set(k, e.target.value || " ")} />}
                      </Field>
                    </div>
                  );
                })}
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

/** Repeatable lists: academic qualifications (with certificate) and work experience (with experience letter). */
function EduJobEditors({ s, setList, gaps, worker }: { s: SopInput; setList: <K extends "education" | "jobs">(k: K, list: SopInput[K]) => void; gaps: string[]; worker: boolean }) {
  const upEdu = (i: number, p: Partial<EduEntry>) => setList("education", s.education.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const upJob = (i: number, p: Partial<JobEntry>) => setList("jobs", s.jobs.map((e, j) => (j === i ? { ...e, ...p } : e)));
  const jobsBlock = (
    <section>
      <h3 className="label">💼 Work experience (one entry per job)</h3>
      <div className="space-y-3">
        {s.jobs.map((j, i) => (
          <div key={i} className="rounded-2xl border border-line bg-slate-50/60 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <input className="input" placeholder="Job title, e.g. Bank Office Assistant" value={j.role} onChange={(e) => upJob(i, { role: e.target.value })} />
              <input className="input" placeholder="Employer, e.g. Central Bank of Sri Lanka" value={j.employer} onChange={(e) => upJob(i, { employer: e.target.value })} />
              <label className="text-xs text-slate-500">From<input type="month" className="input mt-1" value={j.from} onChange={(e) => upJob(i, { from: e.target.value })} /></label>
              <label className="text-xs text-slate-500">To<input type="month" className="input mt-1" disabled={j.current} value={j.current ? "" : j.to} onChange={(e) => upJob(i, { to: e.target.value })} /></label>
            </div>
            <textarea className="input mt-2 min-h-16" placeholder="Main duties (e.g. run the currency management module, generate management reports, train junior staff)" value={j.duties} onChange={(e) => upJob(i, { duties: e.target.value })} />
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-indigo-600" checked={j.current} onChange={(e) => upJob(i, { current: e.target.checked })} /> I work here now</label>
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-emerald-600" checked={j.letter} onChange={(e) => upJob(i, { letter: e.target.checked })} /> Experience / service letter ready</label>
              {!j.letter && <span className="text-xs font-semibold text-rose-600">⚠ Experience letter required</span>}
              <button type="button" className="ml-auto text-xs text-rose-600" onClick={() => setList("jobs", s.jobs.filter((_, k) => k !== i))}>Remove</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn-ghost w-full" onClick={() => setList("jobs", [...s.jobs, { ...EMPTY_JOB }])}>+ Add job</button>
      </div>
    </section>
  );
  const eduBlock = (
    <section>
      <h3 className="label">🎓 Academic qualifications (one entry per certificate)</h3>
      <div className="space-y-3">
        {s.education.map((e, i) => (
          <div key={i} className="rounded-2xl border border-line bg-slate-50/60 p-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <select className="input" value={QUALIFICATION_OPTIONS.includes(e.qualification) || !e.qualification ? e.qualification : "__other"} onChange={(ev) => upEdu(i, { qualification: ev.target.value === "__other" ? " " : ev.target.value })}>
                  <option value="">Qualification…</option>
                  {QUALIFICATION_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                  <option value="__other">Other (type it)…</option>
                </select>
                {e.qualification && !QUALIFICATION_OPTIONS.includes(e.qualification) && <input className="input mt-2" placeholder="e.g. BSc (Hons) Computing" value={e.qualification.trim()} onChange={(ev) => upEdu(i, { qualification: ev.target.value || " " })} />}
              </div>
              <input className="input" placeholder="School / university" value={e.institution} onChange={(ev) => upEdu(i, { institution: ev.target.value })} />
              <label className="text-xs text-slate-500">From<input type="month" className="input mt-1" value={e.from} onChange={(ev) => upEdu(i, { from: ev.target.value })} /></label>
              <label className="text-xs text-slate-500">Completed<input type="month" className="input mt-1" value={e.to} onChange={(ev) => upEdu(i, { to: ev.target.value })} /></label>
              <input className="input sm:col-span-2" placeholder="Result, e.g. First Class Honours / GPA 3.6 / 3 A passes" value={e.result} onChange={(ev) => upEdu(i, { result: ev.target.value })} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-emerald-600" checked={e.certificate} onChange={(ev) => upEdu(i, { certificate: ev.target.checked })} /> Certificate & transcript ready</label>
              {!e.certificate && <span className="text-xs font-semibold text-rose-600">⚠ Certificate & transcript required</span>}
              <button type="button" className="ml-auto text-xs text-rose-600" onClick={() => setList("education", s.education.filter((_, k) => k !== i))}>Remove</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn-ghost w-full" onClick={() => setList("education", [...s.education, { ...EMPTY_EDU }])}>+ Add qualification</button>
      </div>
    </section>
  );
  return (
    <>
      {worker ? <>{jobsBlock}{eduBlock}</> : <>{eduBlock}{jobsBlock}</>}
      {gaps.length > 0 && !s.gaps.trim() && (
        <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">⚠ Gap(s) found: <b>{gaps.join("; ")}</b>. Explain them in “Explain any study / work gaps” below (with evidence such as employment letters).</p>
      )}
    </>
  );
}

/** Travel history and family background, chosen from lists. */
function TravelFamily({ s, update }: { s: SopInput; update: (p: Partial<SopInput>) => void }) {
  const trips = s.trips ?? [];
  const fam: Family = { ...EMPTY_FAMILY, ...(s.family ?? {}) };
  const setTrip = (i: number, p: Partial<TripEntry>) => update({ trips: trips.map((t, k) => (k === i ? { ...t, ...p } : t)) });
  const setFam = (p: Partial<Family>) => update({ family: { ...fam, ...p } });
  const years = Array.from({ length: 27 }, (_, k) => String(2026 - k));
  const sel = (label: string, value: string, opts: string[], on: (v: string) => void) => (
    <label className="text-xs text-slate-500">{label}
      <select className="input mt-1" value={value} onChange={(e) => on(e.target.value)}>
        <option value="">Select…</option>
        {opts.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
    </label>
  );
  return (
    <>
      <section>
        <h3 className="label">✈️ Travel history (immigration history)</h3>
        <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" className="accent-indigo-600" checked={s.travelNone} onChange={(e) => update({ travelNone: e.target.checked })} /> I have not travelled abroad</label>
        {!s.travelNone && (
          <div className="space-y-2">
            {trips.map((t, i) => (
              <div key={i} className="grid gap-2 rounded-2xl border border-line bg-slate-50/60 p-3 sm:grid-cols-[1fr_110px_1fr_auto]">
                <select className="input" value={t.country} onChange={(e) => setTrip(i, { country: e.target.value })}>
                  <option value="">Country…</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{flag(c.code)} {c.name}</option>)}
                </select>
                <select className="input" value={t.year} onChange={(e) => setTrip(i, { year: e.target.value })}>
                  <option value="">Year…</option>
                  {years.map((y) => <option key={y}>{y}</option>)}
                </select>
                <select className="input" value={t.purpose} onChange={(e) => setTrip(i, { purpose: e.target.value })}>
                  <option value="">Purpose…</option>
                  {TRIP_PURPOSES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
                <button type="button" className="text-xs text-rose-600" onClick={() => update({ trips: trips.filter((_, k) => k !== i) })}>Remove</button>
              </div>
            ))}
            <button type="button" className="btn-ghost w-full" onClick={() => update({ trips: [...trips, { country: "", year: "", purpose: "" }] })}>+ Add trip</button>
          </div>
        )}
      </section>
      <section>
        <h3 className="label">👨‍👩‍👧 Family background</h3>
        <div className="grid gap-2 sm:grid-cols-2">
          {sel("Father", fam.father, FAMILY_OPTIONS.parentJob, (v) => setFam({ father: v }))}
          {sel("Mother", fam.mother, FAMILY_OPTIONS.parentJob, (v) => setFam({ mother: v }))}
          {sel("Brothers", fam.brothers, FAMILY_OPTIONS.count, (v) => setFam({ brothers: v }))}
          {sel("Sisters", fam.sisters, FAMILY_OPTIONS.count, (v) => setFam({ sisters: v }))}
          {sel("You are the", fam.position, FAMILY_OPTIONS.position, (v) => setFam({ position: v }))}
          {sel("Marital status", fam.marital, FAMILY_OPTIONS.marital, (v) => setFam({ marital: v }))}
          {fam.marital && fam.marital !== "Single" && sel("Spouse's occupation", fam.spouseJob, FAMILY_OPTIONS.parentJob, (v) => setFam({ spouseJob: v }))}
          {fam.marital && fam.marital !== "Single" && sel("Children", fam.children, FAMILY_OPTIONS.count, (v) => setFam({ children: v }))}
          {sel("You live with", fam.livesWith, FAMILY_OPTIONS.livesWith, (v) => setFam({ livesWith: v }))}
          {sel("Relatives in the destination country", fam.relativesAbroad, FAMILY_OPTIONS.relativesAbroad, (v) => setFam({ relativesAbroad: v }))}
        </div>
      </section>
    </>
  );
}
