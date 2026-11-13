"use client";

import { useEffect, useState } from "react";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { COUNTRIES } from "@/lib/countries";
import { VISA_TYPES } from "@/lib/requirements";
import { extractDetails, iso3to2, type Detail } from "@/lib/extractDetails";
import { DOC_CATEGORIES, EMPTY_REG_DETAILS, type RegistrationDetails } from "@/lib/types";
import { SupportDocReview, extractFileText } from "@/components/SupportDocReview";
import { downloadBytes } from "@/lib/pdf";
import { Field, Stepper } from "@/components/ui";

type QueuedDoc = { id: string; category: string; file: File; status: "waiting" | "uploading" | "done" | "error"; error?: string };
type Done = { id: string; regNo: string; token: string };
const KEY = "visa-registration-v1";

const UPLOAD_SLOTS = ["Passport", "National ID", "Bank statement", "Employment letter", "Offer / admission letter", "IELTS / PTE / English waiver", "Academic certificates & transcripts", "CV"];

const LABELS: Partial<Record<keyof RegistrationDetails, string>> = {
  givenNames: "Given names", surname: "Surname", fullName: "Full name (as in passport)", dob: "Date of birth", sex: "Sex",
  nationality: "Nationality", passportNo: "Passport number", passportExpiry: "Passport expiry", nationalId: "National ID number",
  email: "Email", phone: "Phone / WhatsApp", address: "Home address", occupation: "Occupation", employer: "Employer / school",
  maritalStatus: "Marital status",
};

export function RegisterTool() {
  const [step, setStep] = useState(0);
  const [d, setD] = useState<RegistrationDetails>(EMPTY_REG_DETAILS);
  const [filledFrom, setFilledFrom] = useState<Record<string, string>>({});
  const [docs, setDocs] = useState<QueuedDoc[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState("");
  const [reading, setReading] = useState("");
  const [error, setError] = useState("");
  const [existing, setExisting] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [otherCat, setOtherCat] = useState(DOC_CATEGORIES[0]);

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (s?.done) {
        setDone(s.done);
        setD({ ...EMPTY_REG_DETAILS, ...s.details });
        setStep(3);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!photo) return;
    const u = URL.createObjectURL(photo);
    setPhotoUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [photo]);

  const set = (k: keyof RegistrationDetails, v: string) => setD((x) => ({ ...x, [k]: v }));

  /** Fill empty fields from the details found in a document. */
  function applyDetails(found: Detail[], source: string) {
    const map: Partial<Record<string, keyof RegistrationDetails>> = {
      fullName: "fullName", surname: "surname", givenNames: "givenNames", dob: "dob", sex: "sex", passportNo: "passportNo",
      passportExpiry: "passportExpiry", nationalId: "nationalId", email: "email", phone: "phone", address: "address",
      occupation: "occupation", employer: "employer", maritalStatus: "maritalStatus", nationality: "nationality",
    };
    const filled: Record<string, string> = {};
    setD((cur) => {
      const next = { ...cur };
      for (const f of found) {
        const k = map[f.key];
        if (!k || next[k]) continue;
        let v = f.value;
        if (k === "nationality" && v.length === 3) v = COUNTRIES.find((c) => c.code === iso3to2(v))?.name ?? v;
        next[k] = v;
        filled[k] = source;
      }
      if (!next.fullName && (next.givenNames || next.surname)) next.fullName = `${next.givenNames} ${next.surname}`.trim();
      return next;
    });
    setFilledFrom((x) => ({ ...filled, ...x }));
  }

  async function addDoc(category: string, list: FileList | null) {
    if (!list?.length) return;
    for (const file of [...list]) {
      setDocs((x) => [...x, { id: crypto.randomUUID(), category, file, status: "waiting" }]);
      setReading(`Reading details from ${file.name}…`);
      const text = await extractFileText(file);
      if (text) applyDetails(extractDetails(text, file.name), `${category} (${file.name})`);
    }
    setReading("");
  }

  async function register() {
    setError("");
    setExisting("");
    if (!photo) return setError("Please add your photo.");
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("data", JSON.stringify(d));
      fd.append("photo", photo);
      const r = await fetch("/api/registrations", { method: "POST", body: fd });
      const j = await r.json();
      if (r.status === 409 && j.alreadyRegistered) {
        setExisting(j.existingRegNo);
        throw new Error(`You are already registered. Your registration number is ${j.existingRegNo}. Please contact us to update your file.`);
      }
      if (!r.ok) throw new Error(j.error ?? "Registration failed");
      const result: Done = { id: j.id, regNo: j.regNo, token: j.token };
      setDone(result);
      try {
        localStorage.setItem(KEY, JSON.stringify({ done: result, details: d }));
      } catch {}
      setStep(3);
      await uploadQueued(result, docs);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  // documents are uploaded ONE BY ONE after registration (each request stays small)
  async function uploadQueued(reg: Done, list: QueuedDoc[]) {
    for (const q of list) {
      if (q.status === "done") continue;
      setDocs((x) => x.map((y) => (y.id === q.id ? { ...y, status: "uploading" } : y)));
      const fd = new FormData();
      fd.append("file", q.file);
      fd.append("category", q.category);
      try {
        const r = await fetch(`/api/registrations/${reg.id}/documents`, { method: "POST", body: fd, headers: { "x-upload-token": reg.token } });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setDocs((x) => x.map((y) => (y.id === q.id ? { ...y, status: "done" } : y)));
      } catch (e) {
        setDocs((x) => x.map((y) => (y.id === q.id ? { ...y, status: "error", error: e instanceof Error ? e.message : "failed" } : y)));
      }
    }
  }

  async function addAfter(category: string, list: FileList | null) {
    if (!done || !list?.length) return;
    const items: QueuedDoc[] = [...list].map((file) => ({ id: crypto.randomUUID(), category, file, status: "waiting" }));
    setDocs((x) => [...x, ...items]);
    await uploadQueued(done, items);
  }

  async function slip() {
    if (!done) return;
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const safe = (s: string) => s.replace(/[^\x20-\x7E\xA0-\xFF]/g, "");
    page.drawRectangle({ x: 0, y: 760, width: 595.28, height: 82, color: rgb(0.01, 0.6, 0.33) });
    page.drawText("VisaReview - Customer Registration", { x: 40, y: 805, size: 18, font: bold, color: rgb(1, 1, 1) });
    page.drawText(`Registration No: ${done.regNo}`, { x: 40, y: 780, size: 14, font: bold, color: rgb(1, 1, 1) });
    if (photo && /jpe?g|png/i.test(photo.type)) {
      try {
        const bytes = new Uint8Array(await photo.arrayBuffer());
        const img = /png/i.test(photo.type) ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
        const h = 150;
        const w = (img.width / img.height) * h;
        page.drawImage(img, { x: 595.28 - 40 - w, y: 590, width: w, height: h });
      } catch {}
    }
    let y = 720;
    const rows: [string, string][] = [
      ["Full name", d.fullName], ["Date of birth", d.dob], ["Sex", d.sex], ["Nationality", d.nationality],
      ["Passport no.", d.passportNo], ["Passport expiry", d.passportExpiry], ["National ID", d.nationalId],
      ["Email", d.email], ["Phone", d.phone], ["Address", d.address], ["Occupation", d.occupation], ["Employer", d.employer],
      ["Applying to", d.destination], ["Visa type", d.visaType], ["Registered on", new Date().toLocaleDateString()],
    ];
    for (const [k, v] of rows) {
      page.drawText(safe(k), { x: 40, y, size: 10, font: bold, color: rgb(0.3, 0.3, 0.3) });
      page.drawText(safe(v || "-").slice(0, 70), { x: 160, y, size: 11, font });
      y -= 22;
    }
    y -= 10;
    page.drawText("Documents submitted", { x: 40, y, size: 12, font: bold });
    y -= 18;
    for (const q of docs.filter((x) => x.status === "done").slice(0, 18)) {
      page.drawText(safe(`- ${q.category}: ${q.file.name}`).slice(0, 90), { x: 48, y, size: 10, font });
      y -= 15;
    }
    page.drawText("Please quote your registration number whenever you contact us.", { x: 40, y: 40, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    downloadBytes(await pdf.save(), `registration-${done.regNo}.pdf`);
  }

  function startOver() {
    if (!confirm("Register another person? (This device will forget the current registration.)")) return;
    try {
      localStorage.removeItem(KEY);
    } catch {}
    window.location.reload();
  }

  const uploaded = (cat: string) => docs.filter((x) => x.category === cat);

  return (
    <div className="space-y-6">
      <Stepper steps={["Upload documents", "Check details & photo", "Register", "Registration number"]} current={step} onStep={(i) => !done && i < 3 && setStep(i)} />

      {step === 0 && (
        <div className="card">
          <h2 className="text-lg font-bold">📎 Upload your documents one by one</h2>
          <p className="text-sm text-slate-500">Each document gets its own upload. Details are read from PDFs and filled in for you, and you can still change anything in the next step.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {UPLOAD_SLOTS.map((cat) => (
              <div key={cat} className={`rounded-2xl border p-3 ${uploaded(cat).length ? "border-emerald-200 bg-emerald-50/60" : "border-line"}`}>
                <div className="flex items-center gap-2">
                  <span className="flex-1 font-semibold">{uploaded(cat).length ? "✅" : "📄"} {cat}</span>
                  <label className={`cursor-pointer px-3 py-1.5 text-xs ${uploaded(cat).length ? "btn-ghost" : "btn-primary"}`}>
                    {uploaded(cat).length ? "Add more" : "Upload"}
                    <input type="file" multiple accept=".pdf,image/*,.doc,.docx" className="hidden" onChange={(e) => { addDoc(cat, e.target.files); e.target.value = ""; }} />
                  </label>
                </div>
                {uploaded(cat).map((q) => (
                  <div key={q.id} className="mt-1 flex items-center gap-2 text-xs text-slate-600">
                    <span className="truncate">{q.file.name}</span>
                    <button className="text-rose-600" onClick={() => setDocs((x) => x.filter((y) => y.id !== q.id))}>✕</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-col gap-2 rounded-2xl border border-dashed border-line p-3 sm:flex-row sm:items-center">
            <span className="text-sm font-semibold">Other document:</span>
            <select className="input sm:max-w-xs" value={otherCat} onChange={(e) => setOtherCat(e.target.value)}>
              {DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <label className="btn-ghost cursor-pointer">+ Upload<input type="file" multiple className="hidden" onChange={(e) => { addDoc(otherCat, e.target.files); e.target.value = ""; }} /></label>
          </div>
          {reading && <p className="mt-3 animate-pulse text-sm text-indigo-700">{reading}</p>}
          {docs.length > 0 && (
            <div className="mt-5 rounded-2xl border border-line p-4">
              <h3 className="font-bold">🔍 Supporting document review (automatic)</h3>
              <p className="mb-3 text-xs text-slate-500">Each document is checked for errors, mismatched names or numbers, blanks and wording problems.</p>
              <SupportDocReview items={docs.map((q) => ({ id: q.id, name: `${q.category}: ${q.file.name}`, file: q.file }))} context={{ fullName: d.fullName, passportNo: d.passportNo, destination: d.destination, visaType: VISA_TYPES.find((v) => v.name === d.visaType)?.id }} autoRun />
            </div>
          )}
          <div className="mt-5 flex justify-between">
            <span className="text-sm text-slate-500">{docs.length} document(s) ready · {Object.keys(filledFrom).length} detail(s) found</span>
            <button className="btn-primary" onClick={() => setStep(1)}>Continue →</button>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <h2 className="text-lg font-bold">Your details</h2>
            <p className="text-sm text-slate-500">Fields marked ✨ were filled from your documents. Check them carefully.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(Object.keys(LABELS) as (keyof RegistrationDetails)[]).map((k) => (
                <Field key={k} label={`${LABELS[k]}${filledFrom[k] ? " ✨" : ""}`} hint={filledFrom[k] ? `from ${filledFrom[k]}` : undefined}>
                  {k === "sex" ? (
                    <select className="input" value={d.sex} onChange={(e) => set("sex", e.target.value)}><option value="">Select…</option><option>Male</option><option>Female</option><option>Other</option></select>
                  ) : k === "maritalStatus" ? (
                    <select className="input" value={d.maritalStatus} onChange={(e) => set("maritalStatus", e.target.value)}><option value="">Select…</option>{["Single", "Married", "Divorced", "Widowed", "Separated"].map((o) => <option key={o}>{o}</option>)}</select>
                  ) : (
                    <input className={`input ${filledFrom[k] ? "border-emerald-300 bg-emerald-50/40" : ""}`} type={k === "dob" || k === "passportExpiry" ? "date" : k === "email" ? "email" : "text"} value={d[k]} onChange={(e) => set(k, e.target.value)} />
                  )}
                </Field>
              ))}
              <Field label="Country you want to apply to">
                <select className="input" value={d.destination} onChange={(e) => set("destination", e.target.value)}>
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => <option key={c.code}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Visa type">
                <select className="input" value={d.visaType} onChange={(e) => set("visaType", e.target.value)}>
                  <option value="">Select…</option>
                  {VISA_TYPES.map((v) => <option key={v.id}>{v.name}</option>)}
                </select>
              </Field>
              <div className="sm:col-span-2"><Field label="Anything else we should know"><textarea className="input min-h-20" value={d.notes} onChange={(e) => set("notes", e.target.value)} /></Field></div>
            </div>
          </div>
          <div className="space-y-6">
            <div className="card text-center">
              <h3 className="font-bold">Your photo</h3>
              <p className="text-xs text-slate-500">Passport-size photo, plain background (JPG or PNG)</p>
              <div className="scene mx-auto mt-3 grid h-48 w-40 place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 shadow-xl [transform:rotateY(-8deg)]">
                {photoUrl ? <img src={photoUrl} alt="Your photo" className="h-full w-full object-cover" /> : <span className="text-5xl">👤</span>}
              </div>
              <label className="btn-primary mt-3 cursor-pointer">{photo ? "Change photo" : "Add photo"}
                <input type="file" accept="image/jpeg,image/png" capture="user" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setPhoto(f); e.target.value = ""; }} />
              </label>
            </div>
            <button className="btn-primary w-full py-3" onClick={() => setStep(2)}>Continue →</button>
            <button className="btn-ghost w-full" onClick={() => setStep(0)}>← Back to documents</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card mx-auto max-w-2xl">
          <h2 className="text-lg font-bold">Confirm & register</h2>
          <div className="mt-4 flex gap-4">
            {photoUrl ? <img src={photoUrl} alt="" className="h-28 w-24 rounded-xl object-cover shadow" /> : <div className="grid h-28 w-24 place-items-center rounded-xl bg-rose-50 text-xs text-rose-600">No photo</div>}
            <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {([["Name", d.fullName], ["Passport", d.passportNo], ["Date of birth", d.dob], ["Nationality", d.nationality], ["Email", d.email], ["Phone", d.phone], ["Applying to", d.destination], ["Visa type", d.visaType]] as const).map(([k, v]) => (
                <div key={k}><dt className="text-xs text-slate-400">{k}</dt><dd className="font-medium">{v || "-"}</dd></div>
              ))}
            </dl>
          </div>
          <p className="mt-4 text-sm text-slate-600">{docs.length} document(s) will be uploaded one by one after you register.</p>
          {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          {existing && <p className="mt-2 text-sm">Your existing registration number: <b className="font-mono">{existing}</b></p>}
          <div className="mt-5 flex justify-between">
            <button className="btn-ghost" onClick={() => setStep(1)}>← Back</button>
            <button className="btn-primary px-6" disabled={busy} onClick={register}>{busy ? "Registering…" : "✔ Register & get my number"}</button>
          </div>
        </div>
      )}

      {step === 3 && done && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <div className="scene">
              <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-600 p-6 text-white shadow-2xl [transform:rotateX(6deg)]">
                <div className="flex items-center gap-5">
                  {photoUrl ? <img src={photoUrl} alt="" className="h-28 w-24 rounded-2xl border-2 border-white/60 object-cover shadow-lg" /> : <div className="grid h-28 w-24 place-items-center rounded-2xl bg-white/15 text-4xl">👤</div>}
                  <div>
                    <div className="text-xs font-bold uppercase tracking-widest text-white/80">Registration number</div>
                    <div className="mt-1 font-mono text-3xl font-black tracking-wider">{done.regNo}</div>
                    <div className="mt-2 text-lg font-semibold">{d.fullName}</div>
                    <div className="text-sm text-white/80">{[d.destination, d.visaType].filter(Boolean).join(" · ")}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              <button className="btn-primary" onClick={slip}>⬇ Download registration slip (PDF)</button>
              <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(done.regNo)}>📋 Copy number</button>
              <button className="btn-ghost" onClick={startOver}>Register another person</button>
            </div>
            <p className="mt-3 text-sm text-slate-600">Keep this number. Quote it whenever you contact us.</p>
          </div>
          <div className="card">
            <h3 className="font-bold">Your documents</h3>
            <ul className="mt-3 space-y-1.5 text-sm">
              {docs.map((q) => (
                <li key={q.id} className="flex items-center gap-2">
                  <span>{q.status === "done" ? "✅" : q.status === "uploading" ? "⏳" : q.status === "error" ? "❌" : "•"}</span>
                  <span className="flex-1 truncate"><b>{q.category}</b>: {q.file.name}</span>
                </li>
              ))}
              {docs.some((q) => q.status === "error") && <li className="text-xs text-rose-600">{docs.filter((q) => q.status === "error").map((q) => q.error).join("; ")}</li>}
              {docs.length === 0 && <li className="text-slate-500">No documents yet.</li>}
            </ul>
            <h4 className="label mt-4">Add another document</h4>
            <div className="flex gap-2">
              <select className="input" value={otherCat} onChange={(e) => setOtherCat(e.target.value)}>
                {DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
              <label className="btn-primary cursor-pointer">Upload<input type="file" className="hidden" onChange={(e) => { addAfter(otherCat, e.target.files); e.target.value = ""; }} /></label>
            </div>
          </div>
        </div>
      )}

      {step === 0 && <CheckRegistration />}
    </div>
  );
}

function CheckRegistration() {
  const [regNo, setRegNo] = useState("");
  const [passport, setPassport] = useState("");
  const [res, setRes] = useState<{ registered: boolean; regNo?: string; name?: string; status?: string; documents?: number } | null>(null);
  async function check(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/registrations/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ regNo, passport }) });
    setRes(await r.json());
  }
  return (
    <form onSubmit={check} className="card">
      <h3 className="font-bold">Already registered? Check your registration</h3>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input className="input" placeholder="Registration no. (VR-2026-000123)" value={regNo} onChange={(e) => setRegNo(e.target.value)} />
        <input className="input" placeholder="Passport or national ID number" value={passport} onChange={(e) => setPassport(e.target.value)} />
        <button className="btn-ghost">Check</button>
      </div>
      {res && (res.registered ? (
        <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">✅ Registered: <b>{res.name}</b> ({res.regNo}) · Status: {res.status} · {res.documents} document(s) on file</p>
      ) : (
        <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">No registration found with those details.</p>
      ))}
    </form>
  );
}
