"use client";

import { useEffect, useMemo, useState } from "react";
import { EMPTY_LETTER, LETTER_TYPES, buildLetter, type LetterInput, type LetterType } from "@/lib/letters";
import { downloadBytes, textToPdf } from "@/lib/pdf";
import { Field } from "@/components/ui";

const KEY = "visa-letter-draft-v1";

export function LetterWriter() {
  const [input, setInput] = useState<LetterInput>(EMPTY_LETTER);
  const [edited, setEdited] = useState<string | null>(null);
  const [aiAvailable, setAiAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [encl, setEncl] = useState("");
  const [dateText, setDateText] = useState("[Date]");

  useEffect(() => {
    setDateText(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
    let next = { ...EMPTY_LETTER };
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
      if (saved) next = { ...next, ...saved };
    } catch {}
    const params = new URLSearchParams(window.location.search);
    if (params.get("prefill")) {
      try {
        const p = JSON.parse(localStorage.getItem("visa-letter-prefill") ?? "null");
        if (p) next = { ...next, ...p };
        localStorage.removeItem("visa-letter-prefill");
      } catch {}
    }
    const t = params.get("type");
    if (t && LETTER_TYPES.some((l) => l.id === t)) next.type = t as LetterType;
    setInput(next);
    fetch("/api/config").then((r) => r.json()).then((c) => setAiAvailable(Boolean(c.ai))).catch(() => {});
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(input));
    } catch {}
  }, [input]);

  const generated = useMemo(() => buildLetter(input, dateText), [input, dateText]);
  const letter = edited ?? generated;
  const set = <K extends keyof LetterInput>(k: K, v: LetterInput[K]) => {
    setEdited(null);
    setInput((i) => ({ ...i, [k]: v }));
  };
  const usesReasons = ["reconsideration", "appeal", "reapply-cover", "resubmit", "explanation"].includes(input.type);
  const usesExtra = ["cover", "sponsor", "invitation", "employer"].includes(input.type);

  async function polish() {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch("/api/letter", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draft: letter, type: input.type, notes: input.purpose }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setEdited(j.letter);
      setMsg("✨ Letter improved by AI. Read it carefully and edit anything that is not accurate.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "AI failed");
    } finally {
      setBusy(false);
    }
  }

  async function pdf() {
    downloadBytes(await textToPdf(letter), `${input.type}-letter.pdf`);
  }

  return (
    <div className="space-y-6">
      <div className="scene grid grid-cols-2 gap-3 md:grid-cols-4">
        {LETTER_TYPES.map((t) => (
          <button key={t.id} type="button" onClick={() => set("type", t.id)} className={`rounded-2xl border p-3 text-left transition duration-300 ${input.type === t.id ? "border-transparent bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30 [transform:translateZ(20px)_rotateX(6deg)]" : "border-line bg-white hover:-translate-y-0.5 hover:shadow-md"}`}>
            <div className="text-sm font-bold">{t.name}</div>
            <div className={`text-xs ${input.type === t.id ? "text-white/80" : "text-slate-500"}`}>{t.hint}</div>
          </button>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-5">
          <section>
            <h3 className="font-bold">Applicant</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Full name"><input className="input" value={input.applicantName} onChange={(e) => set("applicantName", e.target.value)} /></Field>
              <Field label="Passport number"><input className="input" value={input.passportNo} onChange={(e) => set("passportNo", e.target.value)} /></Field>
              <Field label="Nationality"><input className="input" value={input.nationality} onChange={(e) => set("nationality", e.target.value)} /></Field>
              <Field label="Phone"><input className="input" value={input.applicantPhone} onChange={(e) => set("applicantPhone", e.target.value)} /></Field>
              <Field label="Email"><input className="input" value={input.applicantEmail} onChange={(e) => set("applicantEmail", e.target.value)} /></Field>
              <Field label="Address"><input className="input" value={input.applicantAddress} onChange={(e) => set("applicantAddress", e.target.value)} /></Field>
            </div>
          </section>
          <section>
            <h3 className="font-bold">Embassy / High Commission</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Addressed to"><input className="input" placeholder="e.g. British High Commission, Colombo" value={input.embassyName} onChange={(e) => set("embassyName", e.target.value)} /></Field>
              <Field label="Address"><input className="input" value={input.embassyAddress} onChange={(e) => set("embassyAddress", e.target.value)} /></Field>
              <Field label="Destination country"><input className="input" value={input.destination} onChange={(e) => set("destination", e.target.value)} /></Field>
              <Field label="Visa type"><input className="input" placeholder="e.g. Standard Visitor visa" value={input.visaType} onChange={(e) => set("visaType", e.target.value)} /></Field>
              <Field label="Application / reference no."><input className="input" value={input.reference} onChange={(e) => set("reference", e.target.value)} /></Field>
              <Field label="Refusal date"><input className="input" value={input.refusalDate} onChange={(e) => set("refusalDate", e.target.value)} /></Field>
              <Field label="Travel dates"><input className="input" placeholder="10 Jan 2026 to 24 Jan 2026" value={input.travelDates} onChange={(e) => set("travelDates", e.target.value)} /></Field>
              <Field label="Purpose of travel"><input className="input" value={input.purpose} onChange={(e) => set("purpose", e.target.value)} /></Field>
            </div>
          </section>

          {usesReasons && (
            <section>
              <h3 className="font-bold">{input.type === "explanation" ? "Points to explain" : input.type === "resubmit" ? "What was corrected / added" : "Refusal reasons & your answers"}</h3>
              <div className="mt-3 space-y-3">
                {input.reasons.map((r, i) => (
                  <div key={i} className="rounded-2xl border border-line bg-slate-50/60 p-3">
                    <input className="input" placeholder={`Reason ${i + 1}, e.g. not satisfied with source of funds`} value={r.reason} onChange={(e) => set("reasons", input.reasons.map((x, j) => (j === i ? { ...x, reason: e.target.value } : x)))} />
                    <textarea className="input mt-2 min-h-20" placeholder="Your response, with the evidence you are now providing" value={r.response} onChange={(e) => set("reasons", input.reasons.map((x, j) => (j === i ? { ...x, response: e.target.value } : x)))} />
                    {input.reasons.length > 1 && <button className="mt-1 text-xs text-rose-600" onClick={() => set("reasons", input.reasons.filter((_, j) => j !== i))}>Remove</button>}
                  </div>
                ))}
                <button className="btn-ghost" onClick={() => set("reasons", [...input.reasons, { reason: "", response: "" }])}>+ Add reason</button>
              </div>
            </section>
          )}

          {usesExtra && (
            <Field label={input.type === "cover" ? "Your story: who pays, job/studies, family ties, return plan" : input.type === "employer" ? "Extra statement (optional)" : "Sponsor / host details (name, address, phone, status)"}>
              <textarea className="input min-h-24" value={input.extra} onChange={(e) => set("extra", e.target.value)} />
            </Field>
          )}

          <section>
            <h3 className="font-bold">Enclosed documents</h3>
            <div className="mt-2 flex gap-2">
              <input className="input" placeholder="e.g. Bank statements Jan–Jun 2025" value={encl} onChange={(e) => setEncl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && encl.trim()) { set("enclosures", [...input.enclosures, encl.trim()]); setEncl(""); } }} />
              <button className="btn-ghost" onClick={() => { if (encl.trim()) { set("enclosures", [...input.enclosures, encl.trim()]); setEncl(""); } }}>Add</button>
            </div>
            <ul className="mt-2 flex flex-wrap gap-2">
              {input.enclosures.map((e, i) => (
                <li key={e + i} className="chip bg-indigo-50 text-indigo-700">{e}<button onClick={() => set("enclosures", input.enclosures.filter((_, j) => j !== i))}>✕</button></li>
              ))}
            </ul>
          </section>
        </div>

        <div className="space-y-3 lg:sticky lg:top-20 lg:self-start">
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" onClick={pdf}>⬇ Download PDF</button>
            <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(letter).then(() => setMsg("Copied to clipboard."))}>📋 Copy</button>
            <button className="btn-ghost" onClick={() => downloadBytes(letter, `${input.type}-letter.txt`, "text/plain")}>.txt</button>
            {aiAvailable && <button className="btn-ghost" disabled={busy} onClick={polish}>{busy ? "Writing…" : "✨ Improve with AI"}</button>}
            {edited !== null && <button className="btn-ghost" onClick={() => setEdited(null)}>↺ Reset to template</button>}
          </div>
          {msg && <p className="text-sm text-indigo-700">{msg}</p>}
          <div className="scene">
            <textarea
              className="min-h-[640px] w-full rounded-2xl border border-line bg-white p-8 font-serif text-[15px] leading-relaxed shadow-2xl shadow-slate-900/10 outline-none [transform:rotateX(2deg)] focus:ring-4 focus:ring-indigo-500/10"
              value={letter}
              onChange={(e) => setEdited(e.target.value)}
            />
          </div>
          <p className="text-xs text-slate-500">You can edit the letter directly. Replace every [bracketed] placeholder before sending. Only state facts you can prove.</p>
        </div>
      </div>
    </div>
  );
}
