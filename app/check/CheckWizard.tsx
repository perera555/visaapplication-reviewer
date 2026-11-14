"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { COUNTRIES, flag, getCountry } from "@/lib/countries";
import { APPLY_MODE_INFO, ENGLISH_TYPES, VISA_TYPES, getApplyMode, getCountryProfile, getProcessSteps, getRequirements, type DocRequirement, type VisaTypeId } from "@/lib/requirements";
import { ApplyModeBadge } from "@/components/ApplyModeBadge";
import { EMPTY_PROFILE, assess, classifyDocument, type Profile } from "@/lib/scoring";
import type { CustomRequirement, SupportDoc } from "@/lib/types";
import { Field, ScoreGauge, Stepper, TiltCard } from "@/components/ui";
import { SupportDocsList } from "@/components/SupportDocsList";
import { SupportDocReview } from "@/components/SupportDocReview";
import { CvSection } from "@/components/CvSection";
import { DetailsPanel } from "@/components/DetailsPanel";
import { SaveBar } from "@/components/SaveBar";
import { activeId, debounce, getFile, getItem, putFile, putItem } from "@/lib/savedStore";
import { extractDetails, iso3to2, parseAmount, type Detail } from "@/lib/extractDetails";

type Attached = { file: File; reqId: string; auto: boolean };
type WizardSave = {
  country: string;
  visaType: VisaTypeId;
  profile: Profile;
  manual: Record<string, boolean>;
  details: Detail[];
  attached: { fileKey: string; reqId: string; auto: boolean }[];
  extras: { id: string; name: string; fileKey?: string }[];
};
type Extra = { id: string; name: string; file?: File };

const STEPS = ["Destination & visa", "Your profile", "Documents", "Status & success rate"];
const DRAFT_KEY = "visa-review-draft-v1";

export function CheckWizard() {
  const [step, setStep] = useState(0);
  const [country, setCountry] = useState("GB");
  const [visaType, setVisaType] = useState<VisaTypeId>("visit");
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE);
  const [manual, setManual] = useState<Record<string, boolean>>({});
  const [attached, setAttached] = useState<Attached[]>([]);
  const [unmatched, setUnmatched] = useState<File[]>([]);
  const [extras, setExtras] = useState<Extra[]>([]);
  const [custom, setCustom] = useState<CustomRequirement[]>([]);
  const [support, setSupport] = useState<SupportDoc[]>([]);
  const [busy, setBusy] = useState<string>("");
  const [details, setDetails] = useState<Detail[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [draftId, setDraftId] = useState("");
  const [savedAt, setSavedAt] = useState("");

  // restore the saved application (incl. uploaded files) + ?type= / ?country= / ?draft=
  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("draft") || (params.get("new") ? "" : activeId("application")) || crypto.randomUUID();
      setDraftId(id);
      activeId("application", id);
      const saved = params.get("new") ? undefined : await getItem<WizardSave>(id);
      if (saved) {
        const d = saved.data;
        setCountry(d.country);
        setVisaType(d.visaType);
        setProfile({ ...EMPTY_PROFILE, ...d.profile });
        setManual(d.manual ?? {});
        setDetails(d.details ?? []);
        const att: Attached[] = [];
        for (const a of d.attached ?? []) {
          const file = await getFile(a.fileKey);
          if (file) att.push({ file, reqId: a.reqId, auto: a.auto });
        }
        setAttached(att);
        const ex: Extra[] = [];
        for (const e of d.extras ?? []) ex.push({ id: e.id, name: e.name, file: e.fileKey ? await getFile(e.fileKey) : undefined });
        setExtras(ex);
        setSavedAt(saved.updatedAt);
      } else if (!params.get("new")) {
        try {
          const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null");
          if (d) {
            setCountry(d.country ?? "GB");
            setVisaType(d.visaType ?? "visit");
            setProfile({ ...EMPTY_PROFILE, ...d.profile });
            setManual(d.manual ?? {});
          }
        } catch {}
      }
      const t = params.get("type");
      if (t && VISA_TYPES.some((v) => v.id === t)) setVisaType(t as VisaTypeId);
      const c = params.get("country");
      if (c && getCountry(c)) setCountry(c.toUpperCase());
      setLoaded(true);
    })();
  }, []);

  // auto-save everything (debounced): answers, ticks, details and the uploaded files themselves
  const autosave = useMemo(
    () =>
      debounce(async (id: string, s: { country: string; visaType: VisaTypeId; profile: Profile; manual: Record<string, boolean>; details: Detail[]; attached: Attached[]; extras: Extra[] }) => {
        const data: WizardSave = {
          country: s.country,
          visaType: s.visaType,
          profile: s.profile,
          manual: s.manual,
          details: s.details,
          attached: await Promise.all(s.attached.map(async (a) => ({ fileKey: await putFile(a.file), reqId: a.reqId, auto: a.auto }))),
          extras: await Promise.all(s.extras.map(async (e) => ({ id: e.id, name: e.name, fileKey: e.file ? await putFile(e.file) : undefined }))),
        };
        await putItem({ id, kind: "application", title: s.profile.fullName || "Untitled application", subtitle: `${getCountry(s.country)?.name} · ${VISA_TYPES.find((v) => v.id === s.visaType)?.name} · ${s.attached.length} file(s)`, data });
        setSavedAt(new Date().toISOString());
      }, 800),
    [],
  );

  useEffect(() => {
    if (!loaded || !draftId) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ country, visaType, profile, manual }));
    } catch {}
    autosave(draftId, { country, visaType, profile, manual, details, attached, extras });
  }, [loaded, draftId, country, visaType, profile, manual, details, attached, extras, autosave]);

  function newApplication() {
    if (!confirm("Start a new application? Your current one stays saved under My Saved Work.")) return;
    window.location.href = "/check?new=1";
  }

  // admin-added requirements + support documents
  useEffect(() => {
    const qs = `country=${country}&type=${visaType}`;
    fetch(`/api/requirements?${qs}`).then((r) => r.json()).then(setCustom).catch(() => setCustom([]));
    fetch(`/api/support-docs?${qs}`).then((r) => r.json()).then(setSupport).catch(() => setSupport([]));
  }, [country, visaType]);

  const requirements: DocRequirement[] = useMemo(() => [...getRequirements(country, visaType, { englishWaiver: profile.englishWaiver }), ...custom], [country, visaType, custom, profile.englishWaiver]);

  const docs = useMemo(
    () =>
      requirements.map((r) => {
        const files = attached.filter((a) => a.reqId === r.id);
        return { reqId: r.id, provided: files.length > 0 || Boolean(manual[r.id]), fileName: files.map((f) => f.file.name).join(", ") || undefined };
      }),
    [requirements, attached, manual],
  );

  const result = useMemo(() => assess(country, visaType, requirements, docs, profile), [country, visaType, requirements, docs, profile]);

  const set = <K extends keyof Profile>(k: K, v: Profile[K]) => setProfile((p) => ({ ...p, [k]: v }));
  const num = (v: string) => (v === "" ? "" : Number(v));

  async function readText(file: File) {
    if (!(file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf") || file.type.startsWith("text/"))) return "";
    const fd = new FormData();
    fd.append("file", file);
    try {
      const r = await fetch("/api/extract", { method: "POST", body: fd });
      return ((await r.json()) as { text?: string }).text ?? "";
    } catch {
      return "";
    }
  }

  async function uploadAll(files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    const nextAttached: Attached[] = [];
    const nextUnmatched: File[] = [];
    for (let i = 0; i < list.length; i++) {
      const f = list[i];
      setBusy(`Reading ${i + 1}/${list.length}: ${f.name}`);
      const text = await readText(f);
      grabDetails(text, f.name);
      const match = classifyDocument(f.name, text, requirements);
      if (match) nextAttached.push({ file: f, reqId: match.id, auto: true });
      else nextUnmatched.push(f);
    }
    setAttached((a) => [...a, ...nextAttached]);
    setUnmatched((u) => [...u, ...nextUnmatched]);
    setBusy("");
  }

  function grabDetails(text: string, source: string) {
    if (!text.trim()) return;
    const found = extractDetails(text, source);
    if (found.length) setDetails((d) => [...d, ...found.filter((f) => !d.some((x) => x.key === f.key && x.value === f.value))]);
  }

  async function attachTo(reqId: string, files: FileList | null) {
    if (!files?.length) return;
    const list = [...files];
    setAttached((a) => [...a, ...list.map((file) => ({ file, reqId, auto: false }))]);
    for (const f of list) {
      setBusy(`Reading details from ${f.name}…`);
      grabDetails(await readText(f), f.name);
    }
    setBusy("");
  }

  function fillProfileFromDetails() {
    const get = (k: string) => details.find((d) => d.key === k)?.value;
    const fullName = get("fullName") ?? [get("givenNames"), get("surname")].filter(Boolean).join(" ");
    const nat = get("nationality");
    const natCode = nat ? (nat.length === 3 ? iso3to2(nat) : COUNTRIES.find((c) => c.name.toLowerCase() === nat.toLowerCase())?.code ?? "") : "";
    const balance = parseAmount(get("bankBalance"));
    const score = parseAmount(get("englishScore"));
    setProfile((p) => ({
      ...p,
      fullName: fullName || p.fullName,
      email: get("email") ?? p.email,
      phone: get("phone") ?? p.phone,
      nationality: natCode || p.nationality,
      passportExpiry: get("passportExpiry") && /^\d{4}-\d{2}-\d{2}$/.test(get("passportExpiry")!) ? get("passportExpiry")! : p.passportExpiry,
      englishScore: score && score <= 9 ? score : p.englishScore,
      englishWaiver: /waiver|moi/i.test(get("englishTest") ?? "") || p.englishWaiver,
      employment: get("employer") || get("occupation") ? p.employment || "employed" : p.employment,
      savingsUSD: p.savingsUSD === "" && balance && /\$|usd/i.test(get("bankBalance") ?? "") ? balance : p.savingsUSD,
    }));
  }

  const selected = getCountry(country);

  return (
    <div className="space-y-6">
      <SaveBar savedAt={savedAt} onNew={newApplication} />
      <Stepper steps={STEPS} current={step} onStep={setStep} />

      {step === 0 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="card lg:col-span-2">
            <h2 className="text-2xl font-black">🌍 Which country are you applying to?</h2>
            <p className="text-sm text-slate-500">Start here. Everything else (documents, process, success rate) depends on the destination.</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Destination country">
                <select className="input py-3 text-base font-semibold" value={country} onChange={(e) => setCountry(e.target.value)}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
                </select>
                <span className="mt-2 flex items-center gap-2 text-xs text-slate-500"><ApplyModeBadge country={country} visaType={visaType} long /> {APPLY_MODE_INFO[getApplyMode(country, visaType)].detail}</span>
              </Field>
              <Field label="Your nationality">
                <select className="input" value={profile.nationality} onChange={(e) => set("nationality", e.target.value)}>
                  <option value="">Select…</option>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </Field>
            </div>
            <h3 className="label mt-6">Visa type</h3>
            <div className="scene grid grid-cols-2 gap-3 sm:grid-cols-3">
              {VISA_TYPES.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setVisaType(v.id)}
                  className={`rounded-2xl border p-3 text-left transition duration-300 ${visaType === v.id ? "border-transparent bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 [transform:translateZ(20px)_rotateX(6deg)]" : "border-line bg-white hover:-translate-y-0.5 hover:shadow-md"}`}
                >
                  <div className="text-2xl">{v.icon}</div>
                  <div className="mt-1 text-sm font-bold">{v.name}</div>
                  <div className={`text-xs ${visaType === v.id ? "text-white/80" : "text-slate-500"}`}>{v.blurb}</div>
                </button>
              ))}
            </div>
          </div>
          <CountryInfo country={country} visaType={visaType} />
          <Nav onNext={() => setStep(1)} />
        </div>
      )}

      {step === 1 && (
        <div className="card">
          <h2 className="text-lg font-bold">About you</h2>
          <p className="text-sm text-slate-500">These answers are used for your success-rate estimate. They stay on this device unless you send the application to us.</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Full name (as in passport)"><input className="input" value={profile.fullName} onChange={(e) => set("fullName", e.target.value)} /></Field>
            <Field label="Email"><input className="input" type="email" value={profile.email} onChange={(e) => set("email", e.target.value)} /></Field>
            <Field label="Phone / WhatsApp"><input className="input" type="tel" value={profile.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            <Field label="Age"><input className="input" type="number" min={0} value={profile.age} onChange={(e) => set("age", num(e.target.value))} /></Field>
            <Field label="Passport expiry date"><input className="input" type="date" value={profile.passportExpiry} onChange={(e) => set("passportExpiry", e.target.value)} /></Field>
            <Field label="Planned travel date"><input className="input" type="date" value={profile.travelDate} onChange={(e) => set("travelDate", e.target.value)} /></Field>
            <Field label="Length of stay (days)"><input className="input" type="number" min={0} value={profile.stayDays} onChange={(e) => set("stayDays", num(e.target.value))} /></Field>
            <Field label="Employment status">
              <select className="input" value={profile.employment} onChange={(e) => set("employment", e.target.value as Profile["employment"])}>
                <option value="">Select…</option><option value="employed">Employed</option><option value="self-employed">Self-employed / business owner</option><option value="student">Student</option><option value="unemployed">Unemployed</option><option value="retired">Retired</option>
              </select>
            </Field>
            <Field label="Monthly income (USD)"><input className="input" type="number" min={0} value={profile.monthlyIncomeUSD} onChange={(e) => set("monthlyIncomeUSD", num(e.target.value))} /></Field>
            <Field label="Available funds / savings (USD)" hint="Amount shown on bank statements"><input className="input" type="number" min={0} value={profile.savingsUSD} onChange={(e) => set("savingsUSD", num(e.target.value))} /></Field>
            <Field label="Travel history">
              <select className="input" value={profile.travelHistory} onChange={(e) => set("travelHistory", e.target.value as Profile["travelHistory"])}>
                <option value="">Select…</option><option value="none">Never travelled abroad</option><option value="regional">Nearby / regional countries only</option><option value="some-developed">Visited UK/US/Schengen/Canada/Australia etc. once or twice</option><option value="frequent-developed">Frequently visited those countries</option>
              </select>
            </Field>
            <Field label="Number of previous visa refusals"><input className="input" type="number" min={0} value={profile.previousRefusals} onChange={(e) => set("previousRefusals", num(e.target.value))} /></Field>
            {["student", "work", "residence"].includes(visaType) && (
              <Field label="English score (IELTS band equivalent)" hint={profile.englishWaiver ? "Waived. Leave empty if you have no test." : undefined}><input className="input" type="number" step="0.5" min={0} max={9} value={profile.englishScore} onChange={(e) => set("englishScore", num(e.target.value))} /></Field>
            )}
            {ENGLISH_TYPES.includes(visaType) && (
              <label className="flex items-start gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 px-3 py-2.5 text-sm sm:col-span-2">
                <input type="checkbox" className="mt-0.5 h-4 w-4 accent-indigo-600" checked={profile.englishWaiver} onChange={(e) => set("englishWaiver", e.target.checked)} />
                <span><b>IELTS / PTE waived</b><span className="block text-xs text-slate-600">e.g. Medium of Instruction (MOI) letter, previous degree taught in English, university/employer waiver, or nationality of a majority English-speaking country. The checklist will ask for waiver evidence instead of a test result.</span></span>
              </label>
            )}
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {([
              ["hasOfferOrInvitation", visaType === "student" ? "I have an offer / admission letter" : visaType === "work" ? "I have a job offer / sponsorship" : "I have an invitation / host / sponsor letter"],
              ["sponsor", "Someone else is sponsoring my costs"],
              ["propertyOrFamilyTies", "I own property / have close family at home"],
              ["dependentsAtHome", "I have dependents (spouse/children/parents) at home"],
              ["refusedThisCountry", "I was previously refused by THIS country"],
              ["overstayOrViolation", "I have overstayed or broken visa rules before"],
              ["criminalRecord", "I have a criminal record"],
            ] as [keyof Profile, string][]).map(([k, l]) => (
              <label key={k} className="flex items-center gap-3 rounded-xl border border-line bg-slate-50/60 px-3 py-2.5 text-sm">
                <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={Boolean(profile[k])} onChange={(e) => set(k, e.target.checked as never)} />
                {l}
              </label>
            ))}
          </div>
          <Nav onBack={() => setStep(0)} onNext={() => setStep(2)} />
        </div>
      )}

      {step === 2 && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="card flex flex-wrap items-center gap-3 border-indigo-200 bg-indigo-50/40">
              <div className="text-3xl">📎</div>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">Upload your documents one by one</h2>
                <p className="text-sm text-slate-600">Click <b>Upload</b> next to each document in the checklist below (PDF, JPG or PNG). Each file goes exactly where it belongs.</p>
              </div>
              <label className="cursor-pointer text-xs font-semibold text-indigo-700 underline-offset-2 hover:underline">
                or upload many at once (auto-match)
                <input type="file" multiple className="hidden" accept=".pdf,image/*,.doc,.docx,.txt" onChange={(e) => { uploadAll(e.target.files); e.target.value = ""; }} />
              </label>
              {busy && <p className="w-full animate-pulse text-sm font-medium text-indigo-700">{busy}</p>}
            </div>

            {unmatched.length > 0 && (
              <div className="card border-amber-200 bg-amber-50">
                <h3 className="font-bold text-amber-900">We could not recognise {unmatched.length} file(s). Tell us what each one is:</h3>
                <ul className="mt-3 space-y-2">
                  {unmatched.map((f, i) => (
                    <li key={`${f.name}-${i}`} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <span className="flex-1 truncate text-sm">📄 {f.name}</span>
                      <select className="input sm:max-w-xs" defaultValue="" onChange={(e) => {
                        const v = e.target.value;
                        if (!v) return;
                        if (v === "__extra") setExtras((x) => [...x, { id: crypto.randomUUID(), name: f.name, file: f }]);
                        else setAttached((a) => [...a, { file: f, reqId: v, auto: false }]);
                        setUnmatched((u) => u.filter((_, j) => j !== i));
                      }}>
                        <option value="">Assign to…</option>
                        {requirements.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        <option value="__extra">Other supporting document</option>
                      </select>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-bold">Document checklist: {flag(country)} {selected?.name} · {VISA_TYPES.find((v) => v.id === visaType)?.name}</h2>
                <span className="chip bg-indigo-50 text-indigo-700">{docs.filter((d) => d.provided).length}/{requirements.length} provided</span>
              </div>
              <ul className="mt-4 divide-y divide-line">
                {requirements.map((r) => {
                  const files = attached.filter((a) => a.reqId === r.id);
                  const ok = files.length > 0 || manual[r.id];
                  return (
                    <li key={r.id} className="py-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm ${ok ? "bg-emerald-100 text-emerald-700" : r.mandatory ? "bg-rose-100 text-rose-700" : "bg-slate-100 text-slate-500"}`}>{ok ? "✓" : r.mandatory ? "!" : "○"}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold">{r.name}</span>
                            {r.mandatory ? <span className="chip bg-rose-50 text-rose-700">Required</span> : <span className="chip bg-slate-100 text-slate-600">Recommended</span>}
                            {r.source === "country" && <span className="chip bg-cyan-50 text-cyan-700">{selected?.name} specific</span>}
                            {r.source === "admin" && <span className="chip bg-amber-50 text-amber-700">Added by our team</span>}
                          </div>
                          <p className="mt-0.5 text-sm text-slate-600">{r.description}</p>
                          {!ok && r.mandatory && <p className="mt-1 text-xs font-bold text-rose-600">⚠ This document is required. Upload it, or tick “I have it” if you will send it later.</p>}
                          {!ok && !r.mandatory && r.weight >= 2 && <p className="mt-1 text-xs font-medium text-amber-700">Recommended: adding this improves your success rate.</p>}
                          {["sop", "gs-statement", "ca-plan"].includes(r.id) && <Link href="/sop" className="mt-1 inline-block text-xs font-semibold text-indigo-600 hover:underline">🎓 Write it with the SOP writer →</Link>}
                          {files.length > 0 && (
                            <ul className="mt-2 flex flex-wrap gap-2">
                              {files.map((a) => (
                                <li key={a.file.name + a.file.size} className="chip bg-emerald-50 text-emerald-800">
                                  📄 {a.file.name} {a.auto && <span className="opacity-60">(auto)</span>}
                                  <button type="button" aria-label="Remove" className="ml-1 opacity-60 hover:opacity-100" onClick={() => setAttached((x) => x.filter((y) => y !== a))}>✕</button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <label className={`cursor-pointer px-3 py-1.5 text-xs ${ok ? "btn-ghost" : "btn-primary"}`}>
                            📎 {files.length ? "Add more" : "Upload"}
                            <input type="file" multiple className="hidden" accept=".pdf,image/*,.doc,.docx" onChange={(e) => { attachTo(r.id, e.target.files); e.target.value = ""; }} />
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-slate-600" title="Tick if you have this document but will send it later">
                            <input type="checkbox" className="accent-indigo-600" checked={Boolean(manual[r.id])} onChange={(e) => setManual((m) => ({ ...m, [r.id]: e.target.checked }))} />
                            I have it
                          </label>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <DetailsPanel
              details={details}
              setDetails={setDetails}
              onFillProfile={fillProfileFromDetails}
              formExtra={{ destination: selected?.name ?? "", visaType: VISA_TYPES.find((v) => v.id === visaType)?.name ?? "", _country: country, _visa: visaType }}
            />

            <ExtraDocs extras={extras} setExtras={setExtras} requirements={requirements} onMatch={(file, req) => setAttached((a) => [...a, { file, reqId: req.id, auto: true }])} />

            <CvSection
              visaType={visaType}
              providedReqIds={docs.filter((d) => d.provided).map((d) => d.reqId)}
              onApply={(cv, file) => {
                setProfile((p) => ({
                  ...p,
                  fullName: p.fullName || cv.name || "",
                  email: p.email || cv.email || "",
                  phone: p.phone || cv.phone || "",
                  englishScore: p.englishScore === "" && cv.englishTest?.score && cv.englishTest.score <= 9 ? cv.englishTest.score : p.englishScore,
                  employment: p.employment || (cv.currentlyEmployed ? "employed" : ""),
                }));
                if (file) {
                  if (requirements.some((r) => r.id === "cv")) setAttached((a) => [...a, { file, reqId: "cv", auto: true }]);
                  else setExtras((x) => [...x, { id: crypto.randomUUID(), name: "CV / resume", file }]);
                }
              }}
            />

            <div className="card">
              <div className="flex flex-wrap items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-rose-500 text-xl text-white shadow-lg [transform:perspective(300px)_rotateY(-14deg)]">🔍</span>
                <div className="flex-1">
                  <h2 className="text-lg font-bold">Support document review</h2>
                  <p className="text-sm text-slate-500">Every uploaded document is reviewed automatically for errors: wrong name, passport number or country, blanks, risky sentences, spelling and letter order. You get the exact words to replace.</p>
                </div>
              </div>
              <div className="mt-4">
                <SupportDocReview
                  items={[
                    ...attached.map((a, i) => ({ id: `a${i}-${a.file.name}`, name: requirements.find((r) => r.id === a.reqId)?.name ?? a.file.name, file: a.file })),
                    ...extras.filter((e) => e.file).map((e) => ({ id: e.id, name: e.name, file: e.file })),
                  ]}
                  context={{ fullName: profile.fullName, destination: selected?.name, visaType, passportNo: details.find((x) => x.key === "passportNo")?.value }}
                  autoRun
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <TiltCard className="card sticky top-20 text-center" max={6}>
              <div className="pop mx-auto w-fit"><ScoreGauge score={result.score} size={150} /></div>
              <p className="mt-3 text-sm font-semibold">{result.statusLabel}</p>
              <button className="btn-primary mt-4 w-full" onClick={() => setStep(3)}>See full status →</button>
            </TiltCard>
            <div className={`card ${result.missingMandatory.length ? "border-rose-200" : "border-emerald-200"}`}>
              {result.missingMandatory.length ? (
                <>
                  <h3 className="font-bold text-rose-700">❌ Required documents not submitted ({result.missingMandatory.length})</h3>
                  <ul className="mt-3 space-y-2">
                    {result.missingMandatory.map((r) => (
                      <li key={r.id} className="flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-sm">
                        <span className="flex-1">{r.name}</span>
                        <label className="cursor-pointer text-xs font-semibold text-indigo-600">
                          Upload
                          <input type="file" multiple className="hidden" accept=".pdf,image/*,.doc,.docx" onChange={(e) => { attachTo(r.id, e.target.files); e.target.value = ""; }} />
                        </label>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm font-semibold text-emerald-700">✅ All required documents are provided.</p>
              )}
              {docs.some((d) => d.provided && !d.fileName) && (
                <p className="mt-3 text-xs text-amber-700">🟡 {docs.filter((d) => d.provided && !d.fileName).length} document(s) are marked “I have it” but not uploaded yet. Remember to send them.</p>
              )}
            </div>
            <SupportDocsList docs={support} />
          </div>
          <div className="lg:col-span-3"><Nav onBack={() => setStep(1)} onNext={() => setStep(3)} nextLabel="See my status & success rate" /></div>
        </div>
      )}

      {step === 3 && (
        <Result
          result={result}
          country={country}
          visaType={visaType}
          profile={profile}
          requirements={requirements}
          docs={docs}
          attached={attached}
          extras={extras}
          support={support}
          onBack={() => setStep(2)}
        />
      )}
    </div>
  );
}

function Nav({ onBack, onNext, nextLabel = "Continue" }: { onBack?: () => void; onNext?: () => void; nextLabel?: string }) {
  return (
    <div className="flex justify-between gap-3 pt-5 lg:col-span-3">
      {onBack ? <button className="btn-ghost" onClick={onBack}>← Back</button> : <span />}
      {onNext && <button className="btn-primary" onClick={onNext}>{nextLabel} →</button>}
    </div>
  );
}

function CountryInfo({ country, visaType }: { country: string; visaType: VisaTypeId }) {
  const p = getCountryProfile(country);
  const c = getCountry(country);
  return (
    <TiltCard className="card relative overflow-hidden" max={6}>
      <div className="pop text-5xl">{flag(country)}</div>
      <h3 className="mt-2 text-lg font-bold">{c?.name}</h3>
      {p.portal && <a href={p.portal.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-indigo-600 hover:underline">{p.portal.name} ↗</a>}
      {p.processing && <p className="mt-2 text-sm text-slate-600">⏱ {p.processing}</p>}
      <h4 className="label mt-4">How to apply</h4>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700">
        {getProcessSteps(country, visaType).map((s) => <li key={s}>{s}</li>)}
      </ol>
      <Link href={`/countries/${country.toLowerCase()}`} className="mt-4 inline-block text-sm font-semibold text-indigo-600">Full {c?.name} guide →</Link>
    </TiltCard>
  );
}

function ExtraDocs({ extras, setExtras, requirements, onMatch }: { extras: Extra[]; setExtras: React.Dispatch<React.SetStateAction<Extra[]>>; requirements: DocRequirement[]; onMatch: (file: File, req: DocRequirement) => void }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  function add() {
    const f = fileRef.current?.files?.[0];
    if (!name.trim() && !f) return;
    const label = name.trim() || f!.name;
    // Tally against the visa requirements: if this "extra" is really a checklist document, count it there.
    const match = f ? classifyDocument(`${label} ${f.name}`, "", requirements) : undefined;
    if (match && f) {
      onMatch(f, match);
      setNote(`“${label}” matches the requirement “${match.name}” and was counted there.`);
    } else {
      setExtras((x) => [...x, { id: crypto.randomUUID(), name: label, file: f }]);
      setNote("");
    }
    setName("");
    if (fileRef.current) fileRef.current.value = "";
  }
  return (
    <div className="card">
      <h2 className="text-lg font-bold">Add other supporting documents</h2>
      <p className="text-sm text-slate-500">Anything not on the list: sponsor letters, property deeds, award certificates, and so on.</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input className="input" placeholder="Document name, e.g. Land deed" value={name} onChange={(e) => setName(e.target.value)} />
        <input ref={fileRef} type="file" className="input sm:max-w-xs" accept=".pdf,image/*,.doc,.docx" />
        <button className="btn-primary" type="button" onClick={add}>+ Add</button>
      </div>
      {note && <p className="mt-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">✅ {note}</p>}
      {extras.length > 0 && (
        <ul className="mt-4 space-y-2">
          {extras.map((e) => (
            <li key={e.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
              <span>📎 <b>{e.name}</b> {e.file && <span className="text-slate-500">· {e.file.name}</span>}</span>
              <button className="text-rose-600" onClick={() => setExtras((x) => x.filter((y) => y.id !== e.id))}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Result(props: {
  result: ReturnType<typeof assess>;
  country: string;
  visaType: VisaTypeId;
  profile: Profile;
  requirements: DocRequirement[];
  docs: { reqId: string; provided: boolean; fileName?: string }[];
  attached: Attached[];
  extras: Extra[];
  support: SupportDoc[];
  onBack: () => void;
}) {
  const { result, country, visaType, profile, requirements, docs, attached, extras, support } = props;
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState<string>("");
  const [err, setErr] = useState("");
  const tone = { ready: "from-emerald-500 to-teal-500", almost: "from-amber-500 to-orange-500", incomplete: "from-rose-500 to-pink-500", "high-risk": "from-rose-700 to-red-600" }[result.status];

  async function submit() {
    setErr("");
    if (!profile.fullName || (!profile.email && !profile.phone)) {
      setErr("Add your name and email or phone in step 2 so our team can contact you.");
      return;
    }
    setSending(true);
    const fd = new FormData();
    fd.append(
      "data",
      JSON.stringify({
        countryCode: country,
        visaType,
        profile,
        score: result.score,
        statusLabel: result.statusLabel,
        message,
        docs: requirements.map((r) => ({ ...docs.find((d) => d.reqId === r.id)!, name: r.name, mandatory: r.mandatory })),
        extraDocs: extras.map((e) => ({ name: e.name, fileName: e.file?.name })),
      }),
    );
    attached.forEach((a, i) => fd.append(`file:${a.reqId}|${i}`, a.file));
    extras.forEach((e, i) => e.file && fd.append(`file:extra|${i}`, e.file));
    try {
      const r = await fetch("/api/applications", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error ?? "Could not send");
      setSent(j.skippedFiles?.length ? `Sent! ${j.skippedFiles.length} large file(s) were not uploaded: ${j.skippedFiles.join(", ")}. Please email them to us.` : "Sent! Our team will review your application and contact you.");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not send");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${tone} p-6 text-white shadow-2xl`}>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <ScoreGauge score={result.score} />
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-white/80">Application status</div>
              <h2 className="mt-1 text-2xl font-black">{result.statusLabel}</h2>
              <p className="mt-2 text-white/90">
                {result.score >= 80 ? "If you submit as it is, your chances look good." : result.score >= 60 ? "You could get the visa, but fix the weak points below to raise your chances." : "Submitting now carries a high risk of refusal. Complete the items below first."}
              </p>
              <div className="mt-4 flex gap-3 text-sm">
                <span className="glass rounded-xl px-3 py-1.5">Documents: <b>{result.docScore}%</b></span>
                <span className="glass rounded-xl px-3 py-1.5">Profile: <b>{result.profileScore}%</b></span>
              </div>
            </div>
          </div>
        </div>

        <div className="card overflow-x-auto">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-bold">Visa requirements vs. your documents</h3>
            <span className="text-xs text-slate-500">
              ✅ {docs.filter((d) => d.provided && d.fileName).length} submitted · 🟡 {docs.filter((d) => d.provided && !d.fileName).length} marked “I have it” · ❌ {docs.filter((d) => !d.provided).length} still needed
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Required met", `${requirements.filter((r) => r.mandatory && docs.find((d) => d.reqId === r.id)?.provided).length}/${requirements.filter((r) => r.mandatory).length}`],
              ["Recommended met", `${requirements.filter((r) => !r.mandatory && docs.find((d) => d.reqId === r.id)?.provided).length}/${requirements.filter((r) => !r.mandatory).length}`],
              ["Files uploaded", String(attached.length + extras.filter((e) => e.file).length)],
              ["Extra supporting", String(extras.length)],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl bg-slate-50 px-3 py-2 text-center">
                <div className="text-lg font-black text-indigo-700">{v}</div>
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{l}</div>
              </div>
            ))}
          </div>
          <table className="mt-3 w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-3">Requirement</th>
                <th className="py-2 pr-3">Needed</th>
                <th className="py-2 pr-3">Your document</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {requirements.map((r) => {
                const d = docs.find((x) => x.reqId === r.id);
                const status = d?.fileName ? "submitted" : d?.provided ? "marked" : "missing";
                return (
                  <tr key={r.id} className={status === "missing" && r.mandatory ? "bg-rose-50/60" : ""}>
                    <td className="py-2 pr-3 font-medium">{r.name}</td>
                    <td className="py-2 pr-3">{r.mandatory ? <span className="chip bg-rose-50 text-rose-700">Required</span> : <span className="chip bg-slate-100 text-slate-600">Recommended</span>}</td>
                    <td className="max-w-[220px] truncate py-2 pr-3 text-slate-600">{d?.fileName ?? (d?.provided ? "Will send later" : "-")}</td>
                    <td className="py-2">
                      {status === "submitted" ? <span className="chip bg-emerald-100 text-emerald-800">✅ Submitted</span> : status === "marked" ? <span className="chip bg-amber-100 text-amber-800">🟡 Not uploaded</span> : <span className={`chip ${r.mandatory ? "bg-rose-100 text-rose-800" : "bg-slate-100 text-slate-600"}`}>❌ {r.mandatory ? "Needed" : "Missing"}</span>}
                    </td>
                  </tr>
                );
              })}
              {extras.map((e) => (
                <tr key={e.id}>
                  <td className="py-2 pr-3 font-medium">{e.name}</td>
                  <td className="py-2 pr-3"><span className="chip bg-indigo-50 text-indigo-700">Extra</span></td>
                  <td className="py-2 pr-3 text-slate-600">{e.file?.name ?? "-"}</td>
                  <td className="py-2"><span className="chip bg-emerald-100 text-emerald-800">✅ Added</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {result.missingMandatory.length > 0 && (
          <div className="card border-rose-200">
            <h3 className="font-bold text-rose-700">Required documents still missing ({result.missingMandatory.length})</h3>
            <ul className="mt-3 space-y-2">
              {result.missingMandatory.map((r) => (
                <li key={r.id} className="rounded-xl bg-rose-50 px-3 py-2 text-sm"><b>{r.name}</b>: {r.description}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="card">
          <h3 className="font-bold">What affects your success rate</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {result.factors.map((f) => (
              <li key={f.label} className={`rounded-xl px-3 py-2 text-sm ${f.impact >= 0 ? "bg-emerald-50 text-emerald-900" : "bg-amber-50 text-amber-900"}`}>
                <b>{f.impact >= 0 ? "▲" : "▼"} {f.label}</b>
                <span className="block text-xs opacity-80">{f.detail}</span>
              </li>
            ))}
            {result.factors.length === 0 && <li className="text-sm text-slate-500">Fill in your profile (step 2) to see personal factors.</li>}
          </ul>
        </div>

        <div className="card">
          <h3 className="font-bold">Your next steps</h3>
          <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm">
            {result.nextSteps.map((s) => <li key={s}>{s}</li>)}
          </ol>
          {result.missingOptional.length > 0 && (
            <>
              <h4 className="label mt-5">Recommended extra documents</h4>
              <ul className="flex flex-wrap gap-2">
                {result.missingOptional.map((r) => <li key={r.id} className="chip bg-slate-100 text-slate-700">{r.name}</li>)}
              </ul>
            </>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="card">
          <h3 className="font-bold">Send to our team for a full review</h3>
          <p className="mt-1 text-sm text-slate-500">We receive your checklist, score and uploaded files (up to 900 KB each).</p>
          <textarea className="input mt-3 min-h-24" placeholder="Message (optional)" value={message} onChange={(e) => setMessage(e.target.value)} />
          {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
          {sent ? <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{sent}</p> : (
            <button className="btn-primary mt-3 w-full" disabled={sending} onClick={submit}>{sending ? "Sending…" : "Send application"}</button>
          )}
          <button className="btn-ghost mt-2 w-full" onClick={() => window.print()}>🖨 Print / save as PDF</button>
        </div>
        <div className="card">
          <h3 className="font-bold">Helpful tools</h3>
          <div className="mt-3 grid gap-2 text-sm">
            <Link className="btn-ghost justify-start" href="/form">📝 Fill the visa application form</Link>
            <Link className="btn-ghost justify-start" href="/letter?type=cover">✍️ Write a cover letter</Link>
            <Link className="btn-ghost justify-start" href="/refusal">🚫 Had a previous refusal? Analyse it</Link>
          </div>
        </div>
        <SupportDocsList docs={support} />
        <button className="btn-ghost w-full" onClick={props.onBack}>← Back to documents</button>
      </div>
    </div>
  );
}
