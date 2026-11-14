"use client";

import { useState } from "react";
import { DOC_CATEGORIES } from "@/lib/types";
import { SupportDocReview, type ReviewItem } from "@/components/SupportDocReview";
import { Field } from "@/components/ui";

export function VerifyTool() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [cat, setCat] = useState("Bank statement");
  const [fullName, setFullName] = useState("");
  const [passportNo, setPassportNo] = useState("");

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="font-bold">1. Applicant (optional, used to check names and passport numbers)</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Full name as in passport"><input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} /></Field>
          <Field label="Passport number"><input className="input" value={passportNo} onChange={(e) => setPassportNo(e.target.value)} /></Field>
        </div>
      </div>

      <div className="card">
        <h2 className="font-bold">2. Upload a document to check</h2>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select className="input sm:max-w-xs" value={cat} onChange={(e) => setCat(e.target.value)}>
            {DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
          <label className="btn-primary cursor-pointer">📎 Upload & check
            <input type="file" multiple accept=".pdf,image/*" className="hidden" onChange={(e) => {
              const fs = [...(e.target.files ?? [])];
              setItems((x) => [...x, ...fs.map((f) => ({ id: crypto.randomUUID(), name: `${cat}: ${f.name}`, file: f }))]);
              e.target.value = "";
            }} />
          </label>
        </div>
        <p className="mt-2 text-xs text-slate-500">Files are checked on the server in memory and not stored. To keep a decision on a customer's file, use Admin → Registrations.</p>
      </div>

      <div className="card">
        <h2 className="font-bold">3. Results</h2>
        <div className="mt-3">
          <SupportDocReview items={items} context={{ fullName, passportNo }} autoRun />
        </div>
        {items.length > 0 && <button className="mt-3 text-sm text-rose-600" onClick={() => setItems([])}>Clear all</button>}
      </div>

      <div className="card text-sm text-slate-600">
        <h3 className="font-bold text-slate-900">How to read the result</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><b>✅ Likely original:</b> no editing signs found.</li>
          <li><b>🔍 Needs manual check:</b> some signs (re-saved, merged in a PDF tool, scanned). Often genuine; compare with the original.</li>
          <li><b>❌ Suspicious:</b> strong signs such as made in Photoshop or Canva, or passport MRZ numbers that don't match. Verify with the issuer.</li>
          <li><b>Flagged by mistake?</b> Open “Original or fake?” on the document and click <b>✅ Mark as original</b>. The manual decision always wins.</li>
        </ul>
      </div>
    </div>
  );
}
