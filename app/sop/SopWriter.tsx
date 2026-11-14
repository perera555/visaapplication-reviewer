"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { COUNTRIES, flag } from "@/lib/countries";
import { FIELD_EXAMPLES, suggestSubjects } from "@/lib/sop";
import { currencyOf, suggestCompanies } from "@/lib/sopCareer";
import { reasonOptions } from "@/lib/sopAuto";
import { EXAMPLE_SOP, EMPTY_FAMILY, FAMILY_OPTIONS, REASON_OPTIONS, REFUSAL_CHANGES, REFUSAL_REASONS, TRIP_PURPOSES, composeField, type Family, type RefusalEntry, type TripEntry } from "@/lib/sop";
import { EMPTY_EDU, EMPTY_JOB, EMPTY_SOP, QUALIFICATION_OPTIONS, SOP_FIELDS, WORK_FIELDS, buildSop, findGaps, sopFormat, wordCount, type EduEntry, type JobEntry, type SopInput } from "@/lib/sop";
import { extractDetails } from "@/lib/extractDetails";
import { analyzeCv } from "@/lib/cvAnalyzer";
import { reviewDocument } from "@/lib/docReview";
import { downloadBytes, estimatePages, textToPdf } from "@/lib/pdf";
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
  const [editMode, setEditMode] = useState(false);

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
        // module names from a transcript, e.g. "CS301 Database Systems 72 A" / "Software Engineering   Merit"
        const mods = [...new Set(t.split("\n").map((l) => l.trim().match(/^(?:[A-Z]{2,5}\s?\d{3,5}[A-Z]?\s+)?([A-Z][A-Za-z&,\- ]{4,60}?)\s+(?:\d{1,3}(?:\.\d+)?%?|[A-F][+-]?|Pass|Merit|Distinction|Credit)\s*$/)?.[1]?.trim()).filter((m): m is string => Boolean(m) && !/total|gpa|semester|year|credits?|grade|result|average|class/i.test(m!)))].slice(0, 8);
        if (mods.length) add.prevSubjects = mods.map((m) => m.toLowerCase()).join(", ");
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

  /** Bring details from the visa Application Form (saved on this device) into the SOP. */
  function importFromForm() {
    let v: Record<string, string> = {};
    try {
      v = JSON.parse(localStorage.getItem("visa-form-v1") ?? "{}");
    } catch {}
    if (!Object.keys(v).length) {
      setMsg("No application form found on this device. Fill the Application Form first (menu: Form).");
      return;
    }
    const ym = (d?: string) => (d ? d.slice(0, 7) : "");
    const yr = (y?: string) => (y && /\d{4}/.test(y) ? `${y.match(/\d{4}/)![0]}-12` : "");
    const edu: EduEntry[] = [];
    if (v.eduSchool) edu.push({ ...EMPTY_EDU, qualification: "Primary and secondary education (up to GCE O/L)", institution: v.eduSchool });
    if (v.eduOlYear || v.eduOlResult) edu.push({ ...EMPTY_EDU, qualification: "GCE O/L (Ordinary Level)", institution: v.eduSchool ?? "", to: yr(v.eduOlYear), result: v.eduOlResult ?? "", certificate: true });
    if (v.eduAlSchool || v.eduAlYear) edu.push({ ...EMPTY_EDU, qualification: "GCE A/L (Advanced Level)", institution: v.eduAlSchool ?? "", to: yr(v.eduAlYear), stream: v.eduAlStream ?? "", certificate: true });
    if (v.eduDiploma) edu.push({ ...EMPTY_EDU, qualification: v.eduDiploma, institution: v.eduDiplomaInstitution ?? "", from: ym(v.eduDiplomaFrom), to: ym(v.eduDiplomaTo), certificate: true });
    if (v.eduDegree) edu.push({ ...EMPTY_EDU, qualification: v.eduDegree, institution: v.eduDegreeInstitution ?? "", from: ym(v.eduDegreeFrom), to: ym(v.eduDegreeTo), result: v.eduDegreeResult ?? "", certificate: true });
    const job: JobEntry[] = v.employer ? [{ ...EMPTY_JOB, role: v.occupation && !/employed|student|retired|homemaker/i.test(v.occupation) ? v.occupation : "", employer: v.employer, from: ym(v.jobStart), current: true }] : [];
    setEdited(null);
    setS((x) => ({
      ...x,
      fullName: [v.givenNames, v.surname].filter(Boolean).join(" ") || x.fullName,
      nationality: v.nationality || x.nationality,
      homeCity: [v.address, v.city, v.country].filter(Boolean).join(", ") || x.homeCity,
      country: v.destination || x.country,
      countryCode: COUNTRIES.find((c) => c.name === v.destination)?.code ?? x.countryCode,
      education: edu.length ? edu : x.education,
      jobs: job.length && !x.jobs.length ? job : x.jobs,
      travelHistory: v.previousVisits || x.travelHistory,
      family: { ...EMPTY_FAMILY, ...x.family, marital: v.maritalStatus || x.family?.marital || "" },
    }));
    setMsg(`Imported from your application form: ${edu.length} education entr${edu.length === 1 ? "y" : "ies"}${job.length ? ", current job" : ""}, personal details. Check them below.`);
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
      <a href="#sop-preview" className="fixed bottom-4 right-4 z-40 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-3 text-sm font-bold text-white shadow-2xl lg:hidden">📄 See my SOP</a>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-bold">2. Your details (type or correct them)</h2>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={importFromForm}>📝 Import from my Application Form</button>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => { if (confirm("Replace the form with the example SOP? (Your current details will be replaced.)")) { setEdited(null); setS(EXAMPLE_SOP); setFilled({}); setMsg("Example loaded: Master of Computer Science, Australia (full letter style). Replace the details with your own."); } }}>📄 Load example SOP</button>
          </div>
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
                <option value="full">Full SOP (recommended): every section, like our model SOP</option>
                <option value="auto">Country format: Australia GS answers / Canada study plan / standard SOP</option>
              </select>
            </Field>
          )}
          {!worker && (
            <Field label="Length">
              <select className="input" value={s.length ?? "detailed"} onChange={(e) => { setEdited(null); setS((x) => ({ ...x, length: e.target.value as SopInput["length"] })); }}>
                <option value="short">Short: about 2 pages</option>
                <option value="standard">Standard: about 3–4 pages</option>
                <option value="detailed">Detailed: about 5–6 pages</option>
              </select>
            </Field>
          )}
          <label className="flex items-start gap-2 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2 text-sm">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={s.autoWrite} onChange={(e) => { setEdited(null); setS((x) => ({ ...x, autoWrite: e.target.checked })); }} />
            <span><b>✨ Write the other sections automatically</b>: “why this course / university / country”, “why not study at home” and career plans are written from your course, qualifications and jobs. Anything you type below replaces the automatic text.</span>
          </label>
          <EduJobEditors s={s} setList={setList} gaps={gaps} worker={worker} setAfterSchool={(v) => set("afterSchool", v)} />
          <TravelFamily s={s} update={(p) => { setEdited(null); setS((x) => ({ ...x, ...p })); }} />
          {sections.map((sec) => (
            <section key={sec.section}>
              <h3 className="label">{sec.section}</h3>
              {sec.section.startsWith("Career") && !worker && <CareerMarket s={s} update={(p) => { setEdited(null); setS((x) => ({ ...x, ...p })); }} />}
              <div className="grid gap-3 sm:grid-cols-2">
                {sec.fields.map(([k, label, type, options]) => {
                  const opts = type === "country" ? COUNTRIES.map((c) => c.name) : options ?? [];
                  const isList = type === "select" || type === "country";
                  const val = typeof s[k] === "string" ? (s[k] as string) : "";
                  const custom = isList && val && !opts.includes(val);
                  return (
                    <div key={k} className={type === "textarea" ? "sm:col-span-2" : ""}>
                      <Field label={`${label}${filled[k] ? " ✨" : ""}`} hint={filled[k] ? `from your ${filled[k]}` : FIELD_EXAMPLES[k] && !val.trim() ? `💡 Example: ${FIELD_EXAMPLES[k]}` : undefined}>
                        {k === "prevSubjects" && (() => {
                          const sug = suggestSubjects(s);
                          if (!sug) return <p className="mb-2 text-xs text-slate-500">Add your last qualification above to get subject suggestions, or type your subjects.</p>;
                          const have = val.split(/,\s*|\s+and\s+/).map((x) => x.trim().toLowerCase()).filter(Boolean);
                          return (
                            <div className="mb-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-2">
                              <div className="text-[11px] font-semibold text-slate-500">Suggested for {sug.field}: tick the subjects you studied</div>
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {sug.subjects.map((sub) => {
                                  const on = have.includes(sub.toLowerCase());
                                  return (
                                    <button type="button" key={sub} onClick={() => { const list = on ? have.filter((x) => x !== sub.toLowerCase()) : [...have, sub.toLowerCase()]; set("prevSubjects", list.length > 1 ? `${list.slice(0, -1).join(", ")} and ${list[list.length - 1]}` : list[0] ?? ""); }}
                                      className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-indigo-500 bg-indigo-600 text-white" : "border-line bg-white text-slate-700 hover:border-indigo-300"}`}>
                                      {on ? "✓ " : ""}{sub}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })()}
                        {k === "refusals" && <RefusalEditor s={s} update={(p) => { setEdited(null); setS((x) => ({ ...x, ...p })); }} />}
                        {REASON_OPTIONS[k] && (
                          <div className="mb-2 rounded-xl border border-indigo-100 bg-indigo-50/40 p-2">
                            <div className="text-[11px] font-semibold text-slate-500">Tick what applies to you:</div>
                            <div className="mt-1 flex flex-wrap gap-1.5">
                              {reasonOptions(k, s, REASON_OPTIONS[k]!).map((o) => {
                                const on = (s.picks?.[k] ?? []).includes(o);
                                return (
                                  <button type="button" key={o} onClick={() => { setEdited(null); setS((x) => ({ ...x, picks: { ...x.picks, [k]: on ? (x.picks?.[k] ?? []).filter((y) => y !== o) : [...(x.picks?.[k] ?? []), o] } })); }}
                                    className={`rounded-full border px-2.5 py-1 text-xs transition ${on ? "border-indigo-500 bg-indigo-600 text-white" : "border-line bg-white text-slate-700 hover:border-indigo-300"}`}>
                                    {on ? "✓ " : ""}{o.charAt(0).toUpperCase() + o.slice(1)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                        {(REASON_OPTIONS[k] || k === "refusals") && (
                          <button type="button" className="mb-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700" onClick={() => set(k, composeField(k, s))}>✨ Write it for me</button>
                        )}
                        {type === "textarea" ? (
                          <textarea className="input min-h-20" value={val} placeholder={REASON_OPTIONS[k] ? "Tick reasons above and press “Write it for me”, or type your own" : FIELD_EXAMPLES[k] ? `e.g. ${FIELD_EXAMPLES[k]}` : undefined} onChange={(e) => set(k, e.target.value)} />
                        ) : isList ? (
                          <select className={`input ${filled[k] ? "border-emerald-300 bg-emerald-50/40" : ""}`} value={custom ? "__other" : val} onChange={(e) => set(k, e.target.value === "__other" ? " " : e.target.value)}>
                            <option value="">Select…</option>
                            {opts.map((o) => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
                            <option value="__other">Other (type it)…</option>
                          </select>
                        ) : (
                          <input className={`input ${filled[k] ? "border-emerald-300 bg-emerald-50/40" : ""}`} value={val} placeholder={FIELD_EXAMPLES[k] ? `e.g. ${FIELD_EXAMPLES[k]}` : undefined} onChange={(e) => set(k, e.target.value)} />
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
            <button className="btn-primary" onClick={async () => downloadBytes(await textToPdf(text, { size: 12, spacing: 1.5, headings: true, pageNumbers: true }), `${(s.fullName || "SOP").replace(/\W+/g, "-")}-SOP.pdf`)}>⬇ Download PDF</button>
            <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(text.replace(/\*\*/g, "")).then(() => setMsg("Copied."))}>📋 Copy</button>
            {ai && <button className="btn-ghost" disabled={busy} onClick={polish}>{busy ? "Writing…" : "✨ Improve with AI"}</button>}
            {edited !== null && <button className="btn-ghost" onClick={() => setEdited(null)}>↺ Reset to generated</button>}
            <span className="w-full text-[11px] text-slate-400">Text between ** ** is printed in bold in the PDF.</span>
            <span className="ml-auto text-xs text-slate-500">{wordCount(text)} words · ≈ {estimatePages(text)} pages · {missing} to fill</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-xl border border-line bg-white p-0.5 text-xs font-semibold">
              <button type="button" onClick={() => setEditMode(false)} className={`rounded-lg px-3 py-1.5 ${!editMode ? "bg-indigo-600 text-white" : "text-slate-600"}`}>👁 Live preview</button>
              <button type="button" onClick={() => setEditMode(true)} className={`rounded-lg px-3 py-1.5 ${editMode ? "bg-indigo-600 text-white" : "text-slate-600"}`}>✏️ Edit text</button>
            </div>
            <span className="text-[11px] text-slate-500">Changes you make on the left flash <span className="rounded bg-amber-200 px-1">yellow</span> here.</span>
          </div>
          <div id="sop-preview" className="scroll-mt-20">
            {editMode ? (
              <textarea className="min-h-[560px] w-full rounded-2xl border border-line bg-white p-6 font-serif text-[15px] leading-relaxed shadow-xl outline-none" value={text} onChange={(e) => setEdited(e.target.value)} />
            ) : (
              <SopPreview text={text} />
            )}
          </div>
          <div className={`card ${review.verdict === "error" ? "border-rose-300" : review.verdict === "warning" ? "border-amber-300" : "border-emerald-300"}`}>
            <h3 className="font-bold">{review.verdict === "ok" ? "✅ Ready" : review.verdict === "error" ? "❌ Fix before using" : "⚠️ Can be improved"}</h3>
            <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto text-sm">
              {missing > 0 && (
                <li className="text-rose-700">
                  ❌ Blanks still to fill ({missing}):
                  <span className="mt-1 flex flex-wrap gap-1.5">
                    {[...new Set(text.match(/\[[^\]]+\]/g) ?? [])].map((b) => (
                      <span key={b} className="chip bg-rose-100 text-rose-800">{b}</span>
                    ))}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500">Fill the matching field on the left (or type straight into the SOP). [Date] is filled when you sign.</span>
                </li>
              )}
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
function EduJobEditors({ s, setList, gaps, worker, setAfterSchool }: { s: SopInput; setList: <K extends "education" | "jobs">(k: K, list: SopInput[K]) => void; gaps: string[]; worker: boolean; setAfterSchool: (v: string) => void }) {
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
      <h3 className="label">🎓 Education: from primary school to your latest qualification (one entry each)</h3>
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
              <input className="input sm:col-span-2" placeholder="Result, e.g. First Class Honours / GPA 3.6 / Distinctions and Credits" value={e.result} onChange={(ev) => upEdu(i, { result: ev.target.value })} />
              <input className="input sm:col-span-2" placeholder="Stream / main subjects, e.g. Science stream, Computing and Systems Development" value={e.stream ?? ""} onChange={(ev) => upEdu(i, { stream: ev.target.value })} />
              <textarea className="input min-h-16 sm:col-span-2" placeholder="Activities & achievements here, e.g. member of the debating team, represented the college First XI cricket team (2000–2001)" value={e.activities ?? ""} onChange={(ev) => upEdu(i, { activities: ev.target.value })} />
              <textarea className="input min-h-16 sm:col-span-2" placeholder="Note (optional), e.g. why you chose this route or what happened next: I chose the Foundation and Diploma route to combine study with work" value={e.note ?? ""} onChange={(ev) => upEdu(i, { note: ev.target.value })} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="checkbox" className="accent-emerald-600" checked={e.certificate} onChange={(ev) => upEdu(i, { certificate: ev.target.checked })} /> Certificate & transcript ready</label>
              {!e.certificate && <span className="text-xs font-semibold text-rose-600">⚠ Certificate & transcript required</span>}
              <button type="button" className="ml-auto text-xs text-rose-600" onClick={() => setList("education", s.education.filter((_, k) => k !== i))}>Remove</button>
            </div>
          </div>
        ))}
        <button type="button" className="btn-ghost w-full" onClick={() => setList("education", [...s.education, { ...EMPTY_EDU }])}>+ Add qualification</button>
        <label className="block text-xs text-slate-500">After school: what you did before higher studies (coaching, first job, reasons for delay)
          <textarea className="input mt-1 min-h-20" placeholder="e.g. After school I coached junior cricket and rugby at Lumbini College and worked in sales and marketing of sports equipment at Suprimo Sports, which delayed my higher studies." value={s.afterSchool ?? ""} onChange={(ev) => setAfterSchool(ev.target.value)} />
        </label>
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

/** Previous visa refusals: country, year, visa, reason and what has changed. */
function RefusalEditor({ s, update }: { s: SopInput; update: (p: Partial<SopInput>) => void }) {
  const list = s.refusalList ?? [];
  const setR = (i: number, p: Partial<RefusalEntry>) => update({ refusalList: list.map((r, k) => (k === i ? { ...r, ...p } : r)) });
  const years = Array.from({ length: 21 }, (_, k) => String(2026 - k));
  return (
    <div className="mb-2 space-y-2">
      {list.map((r, i) => (
        <div key={i} className="rounded-2xl border border-rose-200 bg-rose-50/40 p-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select className="input" value={r.country} onChange={(e) => setR(i, { country: e.target.value })}>
              <option value="">Country that refused…</option>
              {COUNTRIES.map((c) => <option key={c.code} value={c.name}>{flag(c.code)} {c.name}</option>)}
            </select>
            <select className="input" value={r.year} onChange={(e) => setR(i, { year: e.target.value })}>
              <option value="">Year…</option>
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
            <select className="input" value={r.visaType} onChange={(e) => setR(i, { visaType: e.target.value })}>
              <option value="">Visa type…</option>
              {["Student", "Visit / Tourist", "Work", "Business", "Family", "Transit"].map((v) => <option key={v}>{v}</option>)}
            </select>
            <select className="input" value={r.reason} onChange={(e) => setR(i, { reason: e.target.value })}>
              <option value="">Main refusal reason…</option>
              {REFUSAL_REASONS.map((v) => <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>)}
            </select>
          </div>
          <div className="mt-2 text-[11px] font-semibold text-slate-500">What has changed since:</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {REFUSAL_CHANGES.map((c) => {
              const on = r.changes.includes(c);
              return (
                <button type="button" key={c} onClick={() => setR(i, { changes: on ? r.changes.filter((x) => x !== c) : [...r.changes, c] })} className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-emerald-500 bg-emerald-600 text-white" : "border-line bg-white text-slate-700"}`}>
                  {on ? "✓ " : ""}{c}
                </button>
              );
            })}
          </div>
          <button type="button" className="mt-2 text-xs text-rose-600" onClick={() => update({ refusalList: list.filter((_, k) => k !== i) })}>Remove</button>
        </div>
      ))}
      <button type="button" className="btn-ghost w-full" onClick={() => update({ refusalList: [...list, { country: "", year: "", visaType: "", reason: "", changes: [] }] })}>+ Add a previous refusal</button>
    </div>
  );
}

/** Job market at home: target employers (suggested by home country and field) and salary comparison. */
function CareerMarket({ s, update }: { s: SopInput; update: (p: Partial<SopInput>) => void }) {
  const [custom, setCustom] = useState("");
  const [niche, setNiche] = useState("");
  const sug = suggestCompanies(s);
  const big = s.targetCompanies ?? [];
  const small = s.nicheCompanies ?? [];
  const home = s.nationality || "your home country";
  const cur = s.salaryCurrency || currencyOf(s.nationality);
  const toggle = (c: string) => update({ targetCompanies: big.includes(c) ? big.filter((x) => x !== c) : [...big, c] });
  return (
    <div className="mb-3 space-y-3 rounded-2xl border border-indigo-100 bg-indigo-50/30 p-3">
      <div className="text-sm font-semibold">💼 Job market in {home}: employers & salaries</div>
      {sug.length > 0 ? (
        <div>
          <div className="text-[11px] font-semibold text-slate-500">Leading employers you could work for (tick):</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {sug.map((c) => (
              <button type="button" key={c} onClick={() => toggle(c)} className={`rounded-full border px-2.5 py-1 text-xs ${big.includes(c) ? "border-indigo-500 bg-indigo-600 text-white" : "border-line bg-white text-slate-700"}`}>{big.includes(c) ? "✓ " : ""}{c}</button>
            ))}
          </div>
        </div>
      ) : <p className="text-xs text-slate-500">Choose your nationality to see suggested employers, or add companies below.</p>}
      <div className="flex gap-2">
        <input className="input" placeholder="Add another leading company" value={custom} onChange={(e) => setCustom(e.target.value)} />
        <button type="button" className="btn-ghost" onClick={() => { if (custom.trim()) { update({ targetCompanies: [...big, custom.trim()] }); setCustom(""); } }}>Add</button>
      </div>
      {big.filter((c) => !sug.includes(c)).length > 0 && <div className="flex flex-wrap gap-1.5">{big.filter((c) => !sug.includes(c)).map((c) => <span key={c} className="chip bg-indigo-100 text-indigo-800">{c} <button onClick={() => toggle(c)}>✕</button></span>)}</div>}
      <div className="flex gap-2">
        <input className="input" placeholder="Smaller niche company (optional)" value={niche} onChange={(e) => setNiche(e.target.value)} />
        <button type="button" className="btn-ghost" onClick={() => { if (niche.trim()) { update({ nicheCompanies: [...small, niche.trim()] }); setNiche(""); } }}>Add</button>
      </div>
      {small.length > 0 && <div className="flex flex-wrap gap-1.5">{small.map((c) => <span key={c} className="chip bg-slate-100 text-slate-700">{c} <button onClick={() => update({ nicheCompanies: small.filter((x) => x !== c) })}>✕</button></span>)}</div>}
      <div className="text-[11px] font-semibold text-slate-500">Salary comparison (enter real figures you can show, e.g. from job adverts or a salary survey)</div>
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="text-xs text-slate-500">Currency<input className="input mt-1" value={cur} onChange={(e) => update({ salaryCurrency: e.target.value })} /></label>
        <label className="text-xs text-slate-500">Period
          <select className="input mt-1" value={s.salaryPeriod || "per month"} onChange={(e) => update({ salaryPeriod: e.target.value })}><option>per month</option><option>per year</option></select>
        </label>
        <label className="text-xs text-slate-500">Local graduate salary<input className="input mt-1" placeholder="e.g. 150,000" value={s.salaryLocal ?? ""} onChange={(e) => update({ salaryLocal: e.target.value })} /></label>
        <label className="text-xs text-slate-500">Overseas postgraduate: from<input className="input mt-1" placeholder="e.g. 200,000" value={s.salaryOverseasMin ?? ""} onChange={(e) => update({ salaryOverseasMin: e.target.value })} /></label>
        <label className="text-xs text-slate-500">to<input className="input mt-1" placeholder="e.g. 400,000" value={s.salaryOverseasMax ?? ""} onChange={(e) => update({ salaryOverseasMax: e.target.value })} /></label>
        <label className="text-xs text-slate-500">Source<input className="input mt-1" placeholder="e.g. job adverts on topjobs.lk, 2026" value={s.salarySource ?? ""} onChange={(e) => update({ salarySource: e.target.value })} /></label>
      </div>
    </div>
  );
}

/** Formatted live preview: bold headings and **figures**, red [blanks], and changed paragraphs flash yellow. */
function SopPreview({ text }: { text: string }) {
  const paras = text.split("\n");
  const prev = useRef<Set<string> | null>(null);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  useEffect(() => {
    const now = new Set(paras.map((p) => p.trim()).filter(Boolean));
    if (prev.current) {
      const diff = new Set([...now].filter((p) => !prev.current!.has(p)));
      if (diff.size && diff.size < now.size) {
        setChanged(diff);
        const t = setTimeout(() => setChanged(new Set()), 2500);
        prev.current = now;
        return () => clearTimeout(t);
      }
    }
    prev.current = now;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  const isHeading = (p: string, next?: string) => p.length > 2 && p.length < 110 && !/[.,;:]$/.test(p) && /^[A-Z]/.test(p) && !/^(Yours|Dear|\(Applicant\))/.test(p) && Boolean(next?.trim());
  const inline = (p: string) =>
    p.split(/(\*\*[^*]+\*\*|\[[^\]]+\])/g).map((part, k) =>
      part.startsWith("**") ? <b key={k}>{part.slice(2, -2)}</b> : part.startsWith("[") ? <span key={k} className="rounded bg-rose-100 px-1 font-semibold text-rose-700">{part}</span> : <span key={k}>{part}</span>,
    );
  return (
    <div className="max-h-[75vh] min-h-[560px] overflow-y-auto rounded-2xl border border-line bg-white p-6 font-serif text-[15px] leading-relaxed shadow-xl">
      {paras.map((p, n) => {
        const t = p.trim();
        if (!t) return <div key={n} className="h-3" />;
        const hl = changed.has(t) ? "bg-amber-200/80 transition-colors duration-700" : "transition-colors duration-700";
        return isHeading(t, paras[n + 1]) ? (
          <h4 key={n} className={`mt-2 font-bold text-slate-900 ${hl}`}>{inline(t)}</h4>
        ) : (
          <p key={n} className={`${hl}`}>{inline(t)}</p>
        );
      })}
    </div>
  );
}
