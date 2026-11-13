"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, getCountry } from "@/lib/countries";
import { VISA_TYPES, visaTypeName, type VisaTypeId } from "@/lib/requirements";
import type { RefusalAnalysis } from "@/lib/refusal";
import { Field, Stepper } from "@/components/ui";

const SEV = {
  critical: "bg-red-600 text-white",
  high: "bg-rose-100 text-rose-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-700",
};

const SAMPLE = `Dear Applicant,
Your application for a Standard Visitor visa has been refused.
You have provided bank statements, however I note a large deposit of 1,200,000 made shortly before your application and you have not shown the source of these funds. I am therefore not satisfied that the funds are genuinely available to you.
You state you are employed, but you have not provided payslips. I am not satisfied that your circumstances in your home country are as stated, or that you will leave the UK at the end of your visit.
I have refused your application under paragraph V 4.2 (a) (c) and (e) of Appendix Visitor.
There is no right of appeal or right to administrative review against this decision.
Reference: GWF012345678  Date: 12/09/2025`;

export function RefusalTool() {
  const router = useRouter();
  const [country, setCountry] = useState("GB");
  const [visaType, setVisaType] = useState<VisaTypeId>("visit");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<RefusalAnalysis | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [done, setDone] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("country");
    if (c && getCountry(c)) setCountry(c.toUpperCase());
    fetch("/api/config").then((r) => r.json()).then((c) => setAiAvailable(Boolean(c.ai))).catch(() => {});
  }, []);

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy("Reading letter…");
    setError("");
    const fd = new FormData();
    fd.append("file", file);
    try {
      const j = await (await fetch("/api/extract", { method: "POST", body: fd })).json();
      if (j.text) setText(j.text);
      else setError(j.note ?? "Could not read text from this file. Please paste the letter text instead.");
    } catch {
      setError("Upload failed.");
    } finally {
      setBusy("");
    }
  }

  async function analyse() {
    setError("");
    setBusy(useAi && aiAvailable ? "AI is reading your refusal letter…" : "Analysing…");
    try {
      const r = await fetch("/api/refusal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, country, visaType, useAi: useAi && aiAvailable }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setResult(j);
      setDone({});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setBusy("");
    }
  }

  function writeLetter(type: "reconsideration" | "appeal" | "reapply-cover") {
    if (!result) return;
    try {
      localStorage.setItem(
        "visa-letter-prefill",
        JSON.stringify({
          type,
          destination: getCountry(country)?.name,
          visaType: `${visaTypeName(visaType)} visa`,
          reference: result.reference ?? "",
          refusalDate: result.decisionDate ?? "",
          reasons: result.grounds.map((g) => ({ reason: g.title + (g.matched[0] ? ` (“${g.matched[0].replace(/…/g, "")}”)` : ""), response: "" })),
          enclosures: result.reapplyDocs.slice(0, 12),
        }),
      );
    } catch {}
    router.push(`/letter?type=${type}&prefill=1`);
  }

  return (
    <div className="space-y-6">
      <Stepper steps={["Refusal letter", "Reasons found", "Documents to re-apply", "Re-apply / appeal"]} current={result ? 3 : text ? 1 : 0} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Country that refused">
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
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <label className="btn-ghost cursor-pointer">📄 Upload refusal letter (PDF)
              <input type="file" accept=".pdf,.txt" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }} />
            </label>
            <button className="text-sm font-medium text-indigo-600 hover:underline" onClick={() => setText(SAMPLE)}>Try a sample letter</button>
          </div>
          <textarea className="input mt-4 min-h-64 font-mono text-xs" placeholder="…or paste the full text of your refusal letter here (including the officer's reasons)" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button className="btn-primary" disabled={!text.trim() || Boolean(busy)} onClick={analyse}>{busy || "Analyse refusal →"}</button>
            {aiAvailable && (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input type="checkbox" className="accent-indigo-600" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} /> Use AI for a deeper analysis
              </label>
            )}
          </div>
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
          <p className="mt-3 text-xs text-slate-500">Your letter is analysed on the fly and not stored.</p>
        </div>
        <div className="card">
          <h3 className="font-bold">Tips</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-600">
            <li>Include the full “reasons for refusal” section. That is where the officer explains the decision.</li>
            <li>Canada: request your <b>GCMS notes</b> to see the officer's full notes.</li>
            <li>Schengen: include the ticked boxes on the standard refusal form.</li>
            <li>Never hide a previous refusal on a new application.</li>
          </ul>
        </div>
      </div>

      {result && (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-900 p-6 text-white shadow-2xl">
              <div className="flex flex-wrap gap-2 text-xs">
                {result.aiUsed && <span className="chip bg-violet-500/30 text-violet-100">✨ AI analysis</span>}
                {result.reference && <span className="chip bg-white/10">Ref: {result.reference}</span>}
                {result.decisionDate && <span className="chip bg-white/10">Date: {result.decisionDate}</span>}
              </div>
              <h2 className="mt-3 text-xl font-black">{result.summary}</h2>
              <div className="mt-4 rounded-2xl bg-white/10 p-4">
                <div className="text-xs font-bold uppercase tracking-widest text-cyan-200">Recommended route</div>
                <div className="mt-1 text-lg font-bold">{{ reapply: "Re-apply with stronger documents", "appeal-or-review": "Appeal / review, or re-apply", "legal-advice": "Get legal advice first" }[result.route]}</div>
                <p className="mt-1 text-sm text-white/80">{result.routeExplanation}</p>
              </div>
            </div>

            {result.grounds.map((g) => (
              <div key={g.id + g.title} className="card">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold">{g.title}</h3>
                  <span className={`chip ${SEV[g.severity]}`}>{g.severity}</span>
                </div>
                <p className="mt-2 text-sm text-slate-700">{g.explanation}</p>
                {g.matched.length > 0 && (
                  <blockquote className="mt-3 space-y-1 border-l-4 border-indigo-200 pl-3 text-xs italic text-slate-500">
                    {g.matched.map((m) => <p key={m}>{m}</p>)}
                  </blockquote>
                )}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <h4 className="label">Documents that fix this</h4>
                    <ul className="list-disc space-y-1 pl-5 text-sm">{g.docsToFix.map((d) => <li key={d}>{d}</li>)}</ul>
                  </div>
                  <div>
                    <h4 className="label">How to fix it</h4>
                    <ul className="list-disc space-y-1 pl-5 text-sm">{g.howToFix.map((d) => <li key={d}>{d}</li>)}</ul>
                  </div>
                </div>
              </div>
            ))}

            <div className="card">
              <h3 className="text-lg font-bold">How to re-apply, step by step</h3>
              <ol className="mt-3 space-y-2">
                {result.reapplySteps.map((s, i) => (
                  <li key={s} className="flex gap-3 text-sm">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white">{i + 1}</span>
                    <span className="pt-1">{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <h3 className="font-bold">Documents for your re-application</h3>
              <p className="text-xs text-slate-500">Tick them off as you collect them.</p>
              <ul className="mt-3 space-y-1.5">
                {result.reapplyDocs.map((d) => (
                  <li key={d}>
                    <label className="flex items-start gap-2 text-sm">
                      <input type="checkbox" className="mt-1 accent-indigo-600" checked={Boolean(done[d])} onChange={(e) => setDone((x) => ({ ...x, [d]: e.target.checked }))} />
                      <span className={done[d] ? "text-slate-400 line-through" : ""}>{d}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-semibold text-indigo-700">{Object.values(done).filter(Boolean).length}/{result.reapplyDocs.length} collected</p>
            </div>
            <div className="card">
              <h3 className="font-bold">Your options in {getCountry(country)?.name}</h3>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-slate-700">{result.countryOptions.map((o) => <li key={o}>{o}</li>)}</ul>
            </div>
            <div className="card">
              <h3 className="font-bold">Write your letter to the embassy</h3>
              <div className="mt-3 grid gap-2">
                <button className="btn-primary" onClick={() => writeLetter("reconsideration")}>✍️ Reconsideration request</button>
                <button className="btn-ghost" onClick={() => writeLetter("appeal")}>⚖️ Appeal / admin review letter</button>
                <button className="btn-ghost" onClick={() => writeLetter("reapply-cover")}>📨 Re-application cover letter</button>
              </div>
            </div>
            <Link href={`/check?country=${country}&type=${visaType}`} className="btn-ghost w-full">Re-check my new documents →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
