"use client";

import { useEffect, useMemo, useState } from "react";
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFTextField } from "pdf-lib";
import { FORM_SECTIONS, matchFieldValue } from "@/lib/formSchema";
import { getCountryForm } from "@/lib/countryForms";
import { COUNTRIES, flag, getCountry } from "@/lib/countries";
import { VISA_TYPES, type VisaTypeId } from "@/lib/requirements";
import { downloadBytes, textToPdf } from "@/lib/pdf";
import { Field, Stepper } from "@/components/ui";
import { extractFileText } from "@/components/SupportDocReview";
import { detailsToFormValues, extractDetails } from "@/lib/extractDetails";
import { activeId, debounce, getItem, putItem } from "@/lib/savedStore";
import { SaveBar } from "@/components/SaveBar";

const KEY = "visa-form-v1";

type PdfField = { name: string; kind: "text" | "check" | "dropdown" | "radio" | "list"; options?: string[]; value: string | boolean; multiline?: boolean };

export function FormTool() {
  const [tab, setTab] = useState<"guided" | "pdf">("guided");
  const [values, setValues] = useState<Record<string, string>>({});
  const [section, setSection] = useState(0);
  const [saved, setSaved] = useState(false);
  const [formId, setFormId] = useState("");
  const [savedAt, setSavedAt] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const fresh = Boolean(params.get("new"));
      const active = activeId("form");
      const id = params.get("id") || (fresh ? "" : active) || crypto.randomUUID();
      setFormId(id);
      activeId("form", id);
      let local: Record<string, string> = {};
      try {
        local = JSON.parse(localStorage.getItem(KEY) ?? "{}");
      } catch {}
      const item = fresh ? undefined : await getItem<Record<string, string>>(id);
      // the active form is mirrored in localStorage (other tools fill it there), so merge it in
      const v = fresh ? {} : id === active || !item ? { ...(item?.data ?? {}), ...local } : item.data;
      setValues(v);
      try {
        localStorage.setItem(KEY, JSON.stringify(v));
      } catch {}
      if (item) setSavedAt(item.updatedAt);
      setReady(true);
    })();
  }, []);

  const autosave = useMemo(
    () =>
      debounce(async (id: string, v: Record<string, string>) => {
        const name = [v.givenNames, v.surname].filter(Boolean).join(" ");
        await putItem({ id, kind: "form", title: `Visa application form${name ? ` – ${name}` : ""}`, subtitle: [v.destination, v.visaType].filter(Boolean).join(" · "), data: v });
        setSavedAt(new Date().toISOString());
      }, 800),
    [],
  );
  useEffect(() => {
    if (ready && formId) autosave(formId, values);
  }, [values, formId, ready, autosave]);

  function update(k: string, v: string) {
    setValues((x) => {
      const next = { ...x, [k]: v };
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        setSaved(true);
      } catch {}
      return next;
    });
  }

  const [grabMsg, setGrabMsg] = useState("");
  const [grabbing, setGrabbing] = useState(false);

  /** Read uploaded documents (passport, bank statement, letters…) and fill empty form fields. */
  const [slotStatus, setSlotStatus] = useState<Record<string, string>>({});
  async function grabFromDocs(list: FileList | null, slot = "Documents") {
    if (!list?.length) return;
    setGrabbing(true);
    setSlotStatus((s) => ({ ...s, [slot]: "Reading…" }));
    let filled = 0;
    const found: string[] = [];
    const next = { ...values };
    for (const f of [...list]) {
      const text = await extractFileText(f);
      const v = detailsToFormValues(extractDetails(text, f.name));
      for (const [k, val] of Object.entries(v)) {
        if (val && !next[k]?.trim()) {
          next[k] = val;
          filled++;
          found.push(k);
        }
      }
    }
    setValues(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setGrabbing(false);
    setSlotStatus((s) => ({ ...s, [slot]: filled ? `✅ ${filled} field(s) filled` : "⚠ no details found" }));
    setGrabMsg(filled ? `✓ ${filled} field(s) filled from your documents: ${found.join(", ")}. Check each one and edit anything that is wrong.` : "No new details found (scanned images cannot be read). Fill the fields manually.");
  }

  // country- and visa-specific form (e.g. Australia Student 500 adds CoE, OSHC, GS questions)
  const formCountry = values._country || "AU";
  const formVisa = (values._visa || "visit") as VisaTypeId;
  const cform = useMemo(() => getCountryForm(formCountry, formVisa), [formCountry, formVisa]);
  const SECTIONS = useMemo(() => [...FORM_SECTIONS, ...cform.sections], [cform]);
  function chooseForm(country: string, visa: string) {
    update("_country", country);
    update("_visa", visa);
    update("destination", getCountry(country)?.name ?? country);
    update("visaType", VISA_TYPES.find((v) => v.id === visa)?.name ?? visa);
    setSection(0);
  }

  const completed = SECTIONS.map((s) => s.fields.filter((f) => values[f.key]?.trim()).length / s.fields.length);
  const pct = Math.round((completed.reduce((a, b) => a + b, 0) / completed.length) * 100);

  async function downloadGuided() {
    const lines = SECTIONS.flatMap((s) => [`\n${s.title.toUpperCase()}`, ...s.fields.map((f) => `${f.label}: ${values[f.key] || "-"}`)]);
    const text = `Applicant: ${values.givenNames ?? ""} ${values.surname ?? ""}\nGenerated: ${new Date().toLocaleDateString()}\n${lines.join("\n")}\n\nDeclaration: I confirm that the information given is true and complete.\n\nSignature: ____________________   Date: ______________`;
    downloadBytes(await textToPdf(`${cform.officialForm}
Submit at: ${cform.officialUrl ?? "official embassy website"}
${text}`, { title: cform.title }), `${cform.title.replace(/[^A-Za-z0-9]+/g, "-")}.pdf`);
  }

  return (
    <div className="space-y-6">
      <SaveBar savedAt={savedAt} newLabel="+ New form" onNew={() => (window.location.href = "/form?new=1")} />
      <div className="scene">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-600 p-5 text-white shadow-2xl [transform:rotateX(3deg)]">
          <div className="grid gap-3 sm:grid-cols-2">
            <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-white/80">🌍 Which country are you applying to?</span>
              <select className="input py-3 font-semibold text-slate-900" value={formCountry} onChange={(e) => chooseForm(e.target.value, formVisa)}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
              </select>
            </label>
            <label><span className="mb-1 block text-xs font-bold uppercase tracking-wide text-white/80">Visa type</span>
              <select className="input py-3 font-semibold text-slate-900" value={formVisa} onChange={(e) => chooseForm(formCountry, e.target.value)}>
                {VISA_TYPES.map((v) => <option key={v.id} value={v.id}>{v.icon} {v.name}</option>)}
              </select>
            </label>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <div className="text-lg font-black">{cform.title}</div>
              <div className="text-sm text-white/85">Official form: {cform.officialForm}</div>
              <div className="mt-2 text-xs text-white/80">This form adds {cform.sections.reduce((n, s) => n + s.fields.length, 0)} {getCountry(formCountry)?.name}-specific questions to the standard ones.</div>
              {cform.officialUrl && <a href={cform.officialUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block rounded-xl bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow hover:bg-indigo-50">Open official application ↗</a>}
            </div>
            <div className="rounded-2xl bg-white/10 p-3">
              <div className="text-xs font-bold uppercase tracking-wide text-white/80">How to submit</div>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm">{cform.howToSubmit.map((h) => <li key={h}>{h}</li>)}</ol>
            </div>
          </div>
        </div>
      </div>
      <div className="inline-flex rounded-2xl border border-line bg-white p-1 shadow-sm">
        {([["guided", "📝 Guided form"], ["pdf", "📄 Fill an official PDF form"]] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === id ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"}`}>{l}</button>
        ))}
      </div>

      <>
          <div className="card border-indigo-200 bg-indigo-50/40">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🧾</span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">Fill the form from your documents</h2>
                <p className="text-sm text-slate-600">Upload each document separately (PDF). Details are read and put into the empty fields. You can still edit everything by hand.</p>
              </div>
              {grabbing && <span className="animate-pulse text-sm text-indigo-700">Reading…</span>}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["🛂", "Passport", "Name, passport no., dates, nationality"],
                ["🪪", "National ID", "ID number, address, date of birth"],
                ["🏦", "Bank statement", "Account holder, balance"],
                ["💼", "Employment letter", "Employer, job title, salary"],
                ["🎓", "Offer / admission letter", "University, course, start date"],
                ["🗣️", "IELTS / PTE / waiver", "Test and score, or MOI waiver"],
                ["📄", "CV", "Contact details, occupation"],
                ["➕", "Other document", "Any other PDF"],
              ].map(([icon, slot, hint]) => (
                <label key={slot} className={`cursor-pointer rounded-2xl border bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-md ${slotStatus[slot]?.startsWith("✅") ? "border-emerald-300" : "border-line"}`}>
                  <div className="flex items-center gap-2 font-semibold">{icon} {slot}</div>
                  <div className="text-xs text-slate-500">{hint}</div>
                  <div className="mt-2 text-xs font-semibold text-indigo-700">{slotStatus[slot] ?? "📎 Upload"}</div>
                  <input type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => { grabFromDocs(e.target.files, slot); e.target.value = ""; }} />
                </label>
              ))}
            </div>
            {grabMsg && <p className="mt-3 text-sm text-emerald-700">{grabMsg}</p>}
          </div>
      </>

      {tab === "guided" ? (
        <>
          <Stepper steps={SECTIONS.map((s) => `${s.icon} ${s.title}`)} current={section} onStep={setSection} />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <h2 className="text-lg font-bold">{SECTIONS[section].icon} {SECTIONS[section].title}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {SECTIONS[section].fields.map((f) => (
                  <div key={f.key} className={f.wide || f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <Field label={f.label}>
                      {f.type === "textarea" ? (
                        <textarea className="input min-h-20" value={values[f.key] ?? ""} onChange={(e) => update(f.key, e.target.value)} />
                      ) : f.type === "select" || f.type === "country" ? (
                        <ListField value={values[f.key] ?? ""} options={f.type === "country" ? COUNTRIES.map((c) => c.name) : f.options ?? []} onChange={(v) => update(f.key, v)} />
                      ) : (
                        <input className="input" type={f.type ?? "text"} value={values[f.key] ?? ""} onChange={(e) => update(f.key, e.target.value)} />
                      )}
                    </Field>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button className="btn-ghost" disabled={section === 0} onClick={() => setSection((s) => s - 1)}>← Back</button>
                {section < SECTIONS.length - 1 ? (
                  <button className="btn-primary" onClick={() => setSection((s) => s + 1)}>Next section →</button>
                ) : (
                  <button className="btn-primary" onClick={downloadGuided}>⬇ Download completed form (PDF)</button>
                )}
              </div>
            </div>
            <div className="space-y-6">
              <div className="card">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">Form progress</h3>
                  <span className="text-2xl font-black text-indigo-600">{pct}%</span>
                </div>
                <div className="mt-3 h-3 rounded-full bg-slate-100"><div className="h-3 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all" style={{ width: `${pct}%` }} /></div>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {SECTIONS.map((s, i) => (
                    <li key={s.id} className="flex items-center justify-between">
                      <button className="hover:text-indigo-600" onClick={() => setSection(i)}>{s.icon} {s.title}</button>
                      <span className={completed[i] === 1 ? "text-emerald-600" : "text-slate-400"}>{Math.round(completed[i] * 100)}%</span>
                    </li>
                  ))}
                </ul>
                {saved && <p className="mt-3 text-xs text-emerald-600">✓ Saved automatically on this device</p>}
              </div>
              <div className="card">
                <h3 className="font-bold">Next</h3>
                <p className="mt-1 text-sm text-slate-600">Have the official PDF form from the embassy? Upload it and we fill it using these answers.</p>
                <button className="btn-ghost mt-3 w-full" onClick={() => setTab("pdf")}>Fill official PDF →</button>
                <button className="btn-ghost mt-2 w-full" onClick={downloadGuided}>⬇ Download as PDF</button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <PdfFiller values={values} />
      )}
    </div>
  );
}

function PdfFiller({ values }: { values: Record<string, string> }) {
  const [bytes, setBytes] = useState<ArrayBuffer | null>(null);
  const [name, setName] = useState("");
  const [fields, setFields] = useState<PdfField[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  async function load(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const buf = await file.arrayBuffer();
      const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
      const form = doc.getForm();
      const out: PdfField[] = [];
      for (const f of form.getFields()) {
        const n = f.getName();
        const auto = matchFieldValue(n, values) ?? "";
        if (f instanceof PDFTextField) out.push({ name: n, kind: "text", value: f.getText() || auto, multiline: f.isMultiline() });
        else if (f instanceof PDFCheckBox) out.push({ name: n, kind: "check", value: f.isChecked() });
        else if (f instanceof PDFDropdown) out.push({ name: n, kind: "dropdown", options: f.getOptions(), value: f.getSelected()[0] ?? f.getOptions().find((o) => o.toLowerCase() === auto.toLowerCase()) ?? "" });
        else if (f instanceof PDFOptionList) out.push({ name: n, kind: "list", options: f.getOptions(), value: f.getSelected()[0] ?? "" });
        else if (f instanceof PDFRadioGroup) out.push({ name: n, kind: "radio", options: f.getOptions(), value: f.getSelected() ?? "" });
      }
      if (out.length === 0) setError("This PDF has no fillable fields (it is a flat/scanned form). Use the guided form and download it as a PDF instead, or print the official form and copy the answers by hand.");
      setBytes(buf);
      setName(file.name);
      setFields(out);
    } catch {
      setError("Could not open this PDF. It may be protected (some embassy forms, such as XFA forms, only open in Adobe Reader).");
    }
  }

  async function download(flatten: boolean) {
    if (!bytes) return;
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true });
    const form = doc.getForm();
    for (const f of fields) {
      try {
        if (f.kind === "text") form.getTextField(f.name).setText(String(f.value));
        else if (f.kind === "check") (f.value ? form.getCheckBox(f.name).check() : form.getCheckBox(f.name).uncheck());
        else if (f.kind === "dropdown" && f.value) form.getDropdown(f.name).select(String(f.value));
        else if (f.kind === "list" && f.value) form.getOptionList(f.name).select(String(f.value));
        else if (f.kind === "radio" && f.value) form.getRadioGroup(f.name).select(String(f.value));
      } catch {}
    }
    if (flatten) form.flatten();
    downloadBytes(await doc.save(), name.replace(/\.pdf$/i, "") + "-filled.pdf");
  }

  const setVal = (i: number, v: string | boolean) => setFields((fs) => fs.map((f, j) => (j === i ? { ...f, value: v } : f)));
  const autoCount = fields.filter((f) => f.kind === "text" && f.value).length;

  return (
    <div className="space-y-6">
      <div className="card border-2 border-dashed border-indigo-200 bg-indigo-50/40 text-center">
        <div className="text-4xl">📄</div>
        <h2 className="mt-2 text-lg font-bold">Upload the official visa application PDF</h2>
        <p className="text-sm text-slate-600">Fillable PDF forms only. Details from your documents (upload them above) and guided-form answers are filled in automatically where the field names match.</p>
        <label className="btn-primary mt-4 cursor-pointer">Choose PDF<input type="file" accept="application/pdf" className="hidden" onChange={(e) => { load(e.target.files?.[0]); e.target.value = ""; }} /></label>
        {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
      </div>

      {fields.length > 0 && (
        <div className="card">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="font-bold">{name}: {fields.length} fields</h3>
            <span className="chip bg-emerald-50 text-emerald-700">{autoCount} filled</span>
            <input className="input ml-auto max-w-xs" placeholder="Search fields…" value={filter} onChange={(e) => setFilter(e.target.value)} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {fields.map((f, i) => (!filter || f.name.toLowerCase().includes(filter.toLowerCase())) && (
              <div key={f.name} className={f.multiline ? "sm:col-span-2" : ""}>
                <Field label={f.name.replace(/[._]/g, " ").slice(0, 80)}>
                  {f.kind === "text" ? (
                    f.multiline ? <textarea className="input min-h-20" value={String(f.value)} onChange={(e) => setVal(i, e.target.value)} /> : <input className="input" value={String(f.value)} onChange={(e) => setVal(i, e.target.value)} />
                  ) : f.kind === "check" ? (
                    <input type="checkbox" className="h-5 w-5 accent-indigo-600" checked={Boolean(f.value)} onChange={(e) => setVal(i, e.target.checked)} />
                  ) : (
                    <select className="input" value={String(f.value)} onChange={(e) => setVal(i, e.target.value)}>
                      <option value="">Select…</option>
                      {f.options?.map((o) => <option key={o}>{o}</option>)}
                    </select>
                  )}
                </Field>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="btn-primary" onClick={() => download(false)}>⬇ Download filled PDF (editable)</button>
            <button className="btn-ghost" onClick={() => download(true)}>⬇ Download flattened (print-ready)</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Dropdown with an "Other (type it)" option so any answer can still be entered. */
function ListField({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  const custom = Boolean(value) && !options.includes(value);
  return (
    <>
      <select className="input" value={custom ? "__other" : value} onChange={(e) => onChange(e.target.value === "__other" ? " " : e.target.value)}>
        <option value="">Select…</option>
        {options.map((o) => <option key={o}>{o}</option>)}
        <option value="__other">Other (type it)…</option>
      </select>
      {custom && <input className="input mt-2" placeholder="Type your answer" value={value.trim()} onChange={(e) => onChange(e.target.value || " ")} />}
    </>
  );
}
