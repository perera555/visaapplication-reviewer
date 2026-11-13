"use client";

import { useEffect, useMemo, useState } from "react";
import { EMPTY_LETTER, LETTER_TYPES, buildLetter, type LetterInput, type LetterType } from "@/lib/letters";
import { downloadBytes, textToPdf } from "@/lib/pdf";
import { reviewDocument } from "@/lib/docReview";
import { letterSupportDocs } from "@/lib/letterSupport";
import { activeId, debounce, getItem, putItem } from "@/lib/savedStore";
import { SaveBar } from "@/components/SaveBar";
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

  const [letterId, setLetterId] = useState("");
  const [savedAt, setSavedAt] = useState("");

  useEffect(() => {
    setDateText(new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }));
    (async () => {
      const params = new URLSearchParams(window.location.search);
      // a refusal/review prefill or ?new starts a new saved letter; ?id opens a saved one
      const fresh = Boolean(params.get("new") || params.get("prefill"));
      const id = params.get("id") || (fresh ? "" : activeId("letter")) || crypto.randomUUID();
      setLetterId(id);
      activeId("letter", id);
      let next = { ...EMPTY_LETTER };
      const saved = fresh ? undefined : await getItem<{ input: LetterInput; edited: string | null }>(id);
      if (saved) {
        next = { ...next, ...saved.data.input };
        setEdited(saved.data.edited);
        setSavedAt(saved.updatedAt);
      } else if (!fresh) {
        try {
          const old = JSON.parse(localStorage.getItem(KEY) ?? "null");
          if (old) next = { ...next, ...old };
        } catch {}
      }
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
    })();
    fetch("/api/config").then((r) => r.json()).then((c) => setAiAvailable(Boolean(c.ai))).catch(() => {});
  }, []);

  const autosave = useMemo(
    () =>
      debounce(async (id: string, inp: LetterInput, ed: string | null) => {
        const typeName = LETTER_TYPES.find((l) => l.id === inp.type)?.name ?? "Letter";
        await putItem({ id, kind: "letter", title: `${typeName}${inp.applicantName ? ` – ${inp.applicantName}` : ""}`, subtitle: [inp.destination, inp.embassyName].filter(Boolean).join(" · "), data: { input: inp, edited: ed } });
        setSavedAt(new Date().toISOString());
      }, 800),
    [],
  );

  useEffect(() => {
    if (!letterId) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(input));
    } catch {}
    autosave(letterId, input, edited);
  }, [input, edited, letterId, autosave]);

  const generated = useMemo(() => buildLetter(input, dateText), [input, dateText]);
  const letter = edited ?? generated;
  const review = useMemo(() => {
    const vt = /student/i.test(input.visaType) ? "student" : /work|skilled/i.test(input.visaType) ? "work" : /business/i.test(input.visaType) ? "business" : /family|spouse/i.test(input.visaType) ? "family" : "visit";
    return reviewDocument(letter, { fullName: input.applicantName, destination: input.destination, passportNo: input.passportNo, visaType: vt, docName: input.type });
  }, [letter, input.applicantName, input.destination, input.passportNo, input.visaType, input.type]);
  const supportDocs = useMemo(() => letterSupportDocs(input), [input]);
  const enclosed = (d: string) => input.enclosures.some((e) => e.toLowerCase() === d.toLowerCase());
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
      <SaveBar savedAt={savedAt} newLabel="+ New letter" onNew={() => (window.location.href = "/letter?new=1")} />
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* full letter review */}
        <div className={`card ${review.verdict === "error" ? "border-rose-300" : review.verdict === "warning" ? "border-amber-300" : "border-emerald-300"}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl">{review.verdict === "error" ? "❌" : review.verdict === "warning" ? "⚠️" : "✅"}</span>
            <div className="flex-1">
              <h3 className="font-bold">Full letter review</h3>
              <p className={`text-sm font-semibold ${review.verdict === "error" ? "text-rose-700" : review.verdict === "warning" ? "text-amber-700" : "text-emerald-700"}`}>{review.verdict === "ok" ? "Ready to send" : review.verdictLabel}</p>
            </div>
            {review.corrected !== letter && <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => setEdited(review.corrected)}>✏️ Apply corrections</button>}
            {review.isLetter && review.rearranged !== letter && <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setEdited(review.rearranged)}>↕️ Rearrange only</button>}
          </div>
          <p className="mt-1 text-xs text-slate-500">Updates live as you type. It checks your name, passport number, destination, blanks, risky wording, spelling, informal words and letter order.</p>
          {review.issues.length > 0 ? (
            <ul className="mt-3 max-h-96 space-y-2 overflow-y-auto">
              {review.issues.map((i, k) => (
                <li key={k} className={`rounded-xl px-3 py-2 text-sm ${i.severity === "error" ? "bg-rose-50" : i.severity === "warning" ? "bg-amber-50" : "bg-slate-50"}`}>
                  <div className="font-semibold">{i.severity === "error" ? "❌" : i.severity === "warning" ? "⚠️" : "💡"} {i.problem}</div>
                  {(i.found || i.replaceWith) && (
                    <div className="mt-1 text-xs">
                      {i.found && <span className="rounded bg-rose-100 px-1 text-rose-700 line-through">{i.found.slice(0, 120)}</span>}
                      {i.found && i.replaceWith && " → "}
                      {i.replaceWith && <span className="rounded bg-emerald-100 px-1 font-medium text-emerald-800">{i.replaceWith}</span>}
                    </div>
                  )}
                  <div className="text-xs text-slate-600">{i.suggestion}</div>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-sm text-emerald-700">No problems found.</p>}
        </div>

        {/* supporting documents for this letter */}
        <div className="card">
          <h3 className="font-bold">📎 Supporting documents to attach with this letter</h3>
          <p className="text-xs text-slate-500">Based on the letter type and the reasons you wrote. Add the ones you will send to the enclosure list.</p>
          <ul className="mt-3 space-y-2">
            {supportDocs.map((d) => (
              <li key={d.name} className={`flex items-start gap-3 rounded-xl px-3 py-2 text-sm ${enclosed(d.name) ? "bg-emerald-50" : "bg-slate-50"}`}>
                <span>{enclosed(d.name) ? "✅" : "📄"}</span>
                <div className="flex-1">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs text-slate-500">{d.why}</div>
                </div>
                {!enclosed(d.name) && <button className="shrink-0 text-xs font-semibold text-indigo-600 hover:underline" onClick={() => set("enclosures", [...input.enclosures, d.name])}>+ Enclose</button>}
              </li>
            ))}
          </ul>
          {supportDocs.some((d) => !enclosed(d.name)) && (
            <button className="btn-ghost mt-3 w-full" onClick={() => set("enclosures", [...input.enclosures, ...supportDocs.filter((d) => !enclosed(d.name)).map((d) => d.name)])}>+ Enclose all</button>
          )}
        </div>
      </div>

      <VerifyPanel input={input} letter={letter} reviewErrors={review.issues.filter((i) => i.severity === "error").length} supportMissing={supportDocs.filter((d) => !enclosed(d.name)).length} onDownload={pdf} />
    </div>
  );
}

function VerifyPanel({ input, letter, reviewErrors, supportMissing, onDownload }: { input: LetterInput; letter: string; reviewErrors: number; supportMissing: number; onDownload: () => void }) {
  const [confirm, setConfirm] = useState<Record<string, boolean>>({});
  const needsRef = ["reconsideration", "appeal", "reapply-cover", "resubmit"].includes(input.type);
  const usesReasons = ["reconsideration", "appeal", "reapply-cover", "resubmit", "explanation"].includes(input.type);
  const auto: { label: string; ok: boolean; hint: string }[] = [
    { label: "Applicant full name entered", ok: Boolean(input.applicantName.trim()), hint: "Enter your name exactly as in your passport." },
    { label: "Passport number entered", ok: input.passportNo.trim().length >= 6, hint: "Add your passport number." },
    { label: "Embassy / High Commission named", ok: Boolean(input.embassyName.trim()), hint: "Address the letter to the right embassy or high commission." },
    { label: "Destination country stated", ok: Boolean(input.destination.trim()), hint: "Enter the destination country." },
    ...(needsRef ? [{ label: "Application / reference number", ok: Boolean(input.reference.trim()), hint: "Add the reference number from your refusal or request letter (e.g. GWF…)." }] : []),
    ...(usesReasons ? [{ label: "Every reason has a response", ok: input.reasons.length > 0 && input.reasons.every((r) => r.reason.trim() && r.response.trim().length >= 15), hint: "Write a clear response (with evidence) for each reason." }] : []),
    { label: "No [placeholders] left in the letter", ok: !/\[[^\]\n]{1,60}\]/.test(letter), hint: "Replace every [bracketed] text with real information." },
    { label: "Letter is dated", ok: !letter.includes("[Date]"), hint: "The date is added automatically. Do not remove it." },
    { label: "No errors in the full review", ok: reviewErrors === 0, hint: "Fix the ❌ errors shown in the full letter review." },
    { label: "Supporting documents listed as enclosures", ok: input.enclosures.length > 0 && supportMissing === 0, hint: "Enclose the supporting documents suggested above (or remove ones you will not send)." },
  ];
  const manual = [
    "Every fact in the letter is true and I can prove it",
    "Names, dates and amounts match my passport, form and documents",
    "I have all the enclosed documents ready (originals + copies)",
    "I will sign the printed letter by hand",
  ];
  const autoOk = auto.filter((a) => a.ok).length;
  const manualOk = manual.filter((m) => confirm[m]).length;
  const verified = autoOk === auto.length && manualOk === manual.length;

  return (
    <div className={`card border-2 ${verified ? "border-emerald-400 bg-emerald-50/50" : "border-line"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className={`grid h-12 w-12 place-items-center rounded-2xl text-2xl text-white shadow-lg [transform:perspective(300px)_rotateY(-14deg)] ${verified ? "bg-gradient-to-br from-emerald-500 to-lime-500" : "bg-gradient-to-br from-slate-400 to-slate-500"}`}>{verified ? "✔" : "🛡"}</span>
        <div className="flex-1">
          <h3 className="text-lg font-bold">Verify before sending</h3>
          <p className={`text-sm font-semibold ${verified ? "text-emerald-700" : "text-slate-600"}`}>
            {verified ? "✅ Verified. This letter is ready to sign and send." : `${autoOk}/${auto.length} automatic checks · ${manualOk}/${manual.length} confirmations`}
          </p>
        </div>
        <button className={verified ? "btn-primary" : "btn-ghost"} onClick={onDownload}>{verified ? "⬇ Download verified letter (PDF)" : "⬇ Download anyway"}</button>
      </div>
      <div className="mt-4 grid gap-6 md:grid-cols-2">
        <ul className="space-y-1.5">
          {auto.map((a) => (
            <li key={a.label} className="text-sm">
              <span className={a.ok ? "text-emerald-700" : "text-rose-700"}>{a.ok ? "✅" : "❌"} {a.label}</span>
              {!a.ok && <span className="block pl-6 text-xs text-slate-500">{a.hint}</span>}
            </li>
          ))}
        </ul>
        <div className="space-y-2">
          {manual.map((m) => (
            <label key={m} className="flex items-start gap-2 rounded-xl border border-line bg-white px-3 py-2 text-sm">
              <input type="checkbox" className="mt-0.5 h-4 w-4 accent-emerald-600" checked={Boolean(confirm[m])} onChange={(e) => setConfirm((c) => ({ ...c, [m]: e.target.checked }))} />
              {m}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
