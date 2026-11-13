"use client";

import { useEffect, useState } from "react";
import { PDFCheckBox, PDFDocument, PDFDropdown, PDFOptionList, PDFRadioGroup, PDFTextField } from "pdf-lib";
import { FORM_SECTIONS, matchFieldValue } from "@/lib/formSchema";
import { downloadBytes, textToPdf } from "@/lib/pdf";
import { Field, Stepper } from "@/components/ui";

const KEY = "visa-form-v1";

type PdfField = { name: string; kind: "text" | "check" | "dropdown" | "radio" | "list"; options?: string[]; value: string | boolean; multiline?: boolean };

export function FormTool() {
  const [tab, setTab] = useState<"guided" | "pdf">("guided");
  const [values, setValues] = useState<Record<string, string>>({});
  const [section, setSection] = useState(0);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      setValues(JSON.parse(localStorage.getItem(KEY) ?? "{}"));
    } catch {}
  }, []);

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

  const completed = FORM_SECTIONS.map((s) => s.fields.filter((f) => values[f.key]?.trim()).length / s.fields.length);
  const pct = Math.round((completed.reduce((a, b) => a + b, 0) / completed.length) * 100);

  async function downloadGuided() {
    const lines = FORM_SECTIONS.flatMap((s) => [`\n${s.title.toUpperCase()}`, ...s.fields.map((f) => `${f.label}: ${values[f.key] || "-"}`)]);
    const text = `Applicant: ${values.givenNames ?? ""} ${values.surname ?? ""}\nGenerated: ${new Date().toLocaleDateString()}\n${lines.join("\n")}\n\nDeclaration: I confirm that the information given is true and complete.\n\nSignature: ____________________   Date: ______________`;
    downloadBytes(await textToPdf(text, { title: "Visa Application Form" }), "visa-application-form.pdf");
  }

  return (
    <div className="space-y-6">
      <div className="inline-flex rounded-2xl border border-line bg-white p-1 shadow-sm">
        {([["guided", "📝 Guided form"], ["pdf", "📄 Fill an official PDF form"]] as const).map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === id ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg" : "text-slate-600 hover:bg-slate-50"}`}>{l}</button>
        ))}
      </div>

      {tab === "guided" ? (
        <>
          <Stepper steps={FORM_SECTIONS.map((s) => `${s.icon} ${s.title}`)} current={section} onStep={setSection} />
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="card lg:col-span-2">
              <h2 className="text-lg font-bold">{FORM_SECTIONS[section].icon} {FORM_SECTIONS[section].title}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {FORM_SECTIONS[section].fields.map((f) => (
                  <div key={f.key} className={f.wide || f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <Field label={f.label}>
                      {f.type === "textarea" ? (
                        <textarea className="input min-h-20" value={values[f.key] ?? ""} onChange={(e) => update(f.key, e.target.value)} />
                      ) : f.type === "select" ? (
                        <select className="input" value={values[f.key] ?? ""} onChange={(e) => update(f.key, e.target.value)}>
                          <option value="">Select…</option>
                          {f.options!.map((o) => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <input className="input" type={f.type ?? "text"} value={values[f.key] ?? ""} onChange={(e) => update(f.key, e.target.value)} />
                      )}
                    </Field>
                  </div>
                ))}
              </div>
              <div className="mt-6 flex justify-between">
                <button className="btn-ghost" disabled={section === 0} onClick={() => setSection((s) => s - 1)}>← Back</button>
                {section < FORM_SECTIONS.length - 1 ? (
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
                  {FORM_SECTIONS.map((s, i) => (
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
        <p className="text-sm text-slate-600">Fillable PDF forms only. Answers from the guided form are filled in automatically where the field names match.</p>
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
