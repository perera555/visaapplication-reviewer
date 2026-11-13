"use client";

import { useState } from "react";
import { COUNTRIES } from "@/lib/countries";
import { VISA_TYPES, type VisaTypeId } from "@/lib/requirements";
import { Field } from "@/components/ui";
import { CvSection } from "@/components/CvSection";
import { SupportDocReview, type ReviewItem } from "@/components/SupportDocReview";

export function ReviewTool() {
  const [fullName, setFullName] = useState("");
  const [passportNo, setPassportNo] = useState("");
  const [country, setCountry] = useState("GB");
  const [visaType, setVisaType] = useState<VisaTypeId>("visit");
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [pasteName, setPasteName] = useState("");
  const [paste, setPaste] = useState("");

  const destination = COUNTRIES.find((c) => c.code === country)?.name;

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-bold">1. Your details (used to check every document)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Full name as in passport"><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
          <Field label="Passport number"><input className="input" value={passportNo} onChange={(e) => setPassportNo(e.target.value)} /></Field>
          <Field label="Applying to">
            <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Visa type">
            <select className="input" value={visaType} onChange={(e) => setVisaType(e.target.value as VisaTypeId)}>
              {VISA_TYPES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold">2. Add support documents</h2>
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="btn-primary cursor-pointer">📤 Upload documents (PDF / TXT)
            <input type="file" multiple accept=".pdf,.txt" className="hidden" onChange={(e) => {
              const fs = [...(e.target.files ?? [])];
              setItems((x) => [...x, ...fs.map((f) => ({ id: crypto.randomUUID(), name: f.name.replace(/\.[^.]+$/, ""), file: f }))]);
              e.target.value = "";
            }} />
          </label>
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-indigo-600">…or paste a letter's text</summary>
          <div className="mt-2 space-y-2">
            <input className="input" placeholder="Document name, e.g. Sponsor letter" value={pasteName} onChange={(e) => setPasteName(e.target.value)} />
            <textarea className="input min-h-40" value={paste} onChange={(e) => setPaste(e.target.value)} />
            <button className="btn-ghost" disabled={paste.trim().length < 20} onClick={() => { setItems((x) => [...x, { id: crypto.randomUUID(), name: pasteName || "Pasted letter", text: paste }]); setPaste(""); setPasteName(""); }}>+ Add for review</button>
          </div>
        </details>
      </div>

      <div className="card">
        <h2 className="font-bold">3. Review results</h2>
        <div className="mt-3">
          <SupportDocReview items={items} context={{ fullName, passportNo, destination, visaType }} autoRun />
        </div>
        {items.length > 0 && <button className="mt-3 text-sm text-rose-600" onClick={() => setItems([])}>Clear all</button>}
      </div>

      <CvSection visaType={visaType} />
    </div>
  );
}
