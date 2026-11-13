"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { DocReview, ReviewContext } from "@/lib/docReview";
import { downloadBytes, textToPdf } from "@/lib/pdf";

export type ReviewItem = { id: string; name: string; file?: File; text?: string };

const VERDICT = {
  ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  error: "border-rose-300 bg-rose-50 text-rose-800",
};
const SEV = { error: "bg-rose-100 text-rose-800", warning: "bg-amber-100 text-amber-800", tip: "bg-slate-100 text-slate-700" };

export async function extractFileText(file: File) {
  if (!(file.type === "application/pdf" || /\.(pdf|txt)$/i.test(file.name) || file.type.startsWith("text/"))) return "";
  const fd = new FormData();
  fd.append("file", file);
  try {
    return ((await (await fetch("/api/extract", { method: "POST", body: fd })).json()) as { text?: string }).text ?? "";
  } catch {
    return "";
  }
}

/** Reviews each supporting document for errors, suggests replacements and offers corrected / rearranged versions. */
export function SupportDocReview({ items, context, autoRun = false }: { items: ReviewItem[]; context: ReviewContext; autoRun?: boolean }) {
  const [reviews, setReviews] = useState<Record<string, DocReview | "loading">>({});
  const [aiAvailable, setAiAvailable] = useState(false);
  const [useAi, setUseAi] = useState(false);

  useEffect(() => {
    fetch("/api/config").then((r) => r.json()).then((c) => setAiAvailable(Boolean(c.ai))).catch(() => {});
  }, []);

  async function run(item: ReviewItem) {
    setReviews((r) => ({ ...r, [item.id]: "loading" }));
    const text = item.text ?? (item.file ? await extractFileText(item.file) : "");
    try {
      const res = await fetch("/api/review-doc", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, context: { ...context, docName: item.name }, useAi: useAi && aiAvailable }) });
      if (!res.ok) throw new Error("review failed");
      const data = (await res.json()) as DocReview;
      setReviews((r) => ({ ...r, [item.id]: data }));
    } catch {
      setReviews((r) => {
        const n = { ...r };
        delete n[item.id];
        return n;
      });
    }
  }

  useEffect(() => {
    if (!autoRun) return;
    items.forEach((it) => {
      if (!reviews[it.id]) run(it);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRun, items]);

  const done = Object.values(reviews).filter((r) => r !== "loading") as DocReview[];
  const errorDocs = done.filter((r) => r.verdict === "error").length;

  if (!items.length) return <p className="text-sm text-slate-500">No supporting documents to review yet. Upload documents to check them.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button className="btn-primary" onClick={() => items.forEach(run)}>🔍 Review all ({items.length})</button>
        {aiAvailable && (
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input type="checkbox" className="accent-indigo-600" checked={useAi} onChange={(e) => setUseAi(e.target.checked)} /> Deeper AI review
          </label>
        )}
        {done.length > 0 && (
          <span className={`chip ${errorDocs ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800"}`}>
            {errorDocs ? `❌ ${errorDocs} error document(s)` : "✅ No error documents"} · {done.length}/{items.length} reviewed
          </span>
        )}
      </div>
      {items.map((it) => (
        <ReviewCard key={it.id} item={it} review={reviews[it.id]} onRun={() => run(it)} />
      ))}
    </div>
  );
}

function ReviewCard({ item, review, onRun }: { item: ReviewItem; review?: DocReview | "loading"; onRun: () => void }) {
  const router = useRouter();
  const [view, setView] = useState<"issues" | "corrected" | "rearranged">("issues");
  const r = review && review !== "loading" ? review : null;

  function resubmitLetter() {
    if (!r) return;
    try {
      localStorage.setItem(
        "visa-letter-prefill",
        JSON.stringify({
          type: "resubmit",
          reasons: r.issues.filter((i) => i.severity !== "tip").slice(0, 8).map((i) => ({ reason: `${item.name}: ${i.problem}${i.found ? ` (“${i.found.slice(0, 80)}”)` : ""}`, response: i.replaceWith ? `Corrected to “${i.replaceWith}”.` : i.suggestion })),
          enclosures: [`Corrected ${item.name}`],
        }),
      );
    } catch {}
    router.push("/letter?type=resubmit&prefill=1");
  }

  const text = r ? (view === "corrected" ? r.corrected : r.rearranged) : "";

  return (
    <div className={`rounded-2xl border p-4 ${r ? VERDICT[r.verdict] : "border-line bg-white"}`}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xl">{r ? (r.verdict === "error" ? "❌" : r.verdict === "warning" ? "⚠️" : "✅") : "📄"}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-slate-900">{item.name}</div>
          {item.file && item.file.name !== item.name && <div className="truncate text-xs text-slate-500">{item.file.name}</div>}
          {r && <div className="text-sm font-bold">{r.verdictLabel}{r.aiUsed && " · ✨ AI"}</div>}
        </div>
        <button className="btn-ghost px-3 py-1.5 text-xs" onClick={onRun} disabled={review === "loading"}>{review === "loading" ? "Reviewing…" : r ? "Re-check" : "Review"}</button>
      </div>

      {r && (
        <div className="mt-3">
          <div className="flex flex-wrap gap-1">
            {([["issues", `Issues (${r.issues.length})`], ["corrected", "✏️ Corrected version"], ...(r.isLetter ? [["rearranged", "↕️ Rearranged only (no corrections)"]] : [])] as [typeof view, string][]).map(([v, l]) => (
              <button key={v} onClick={() => setView(v)} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${view === v ? "bg-white text-slate-900 shadow" : "text-slate-600 hover:bg-white/60"}`}>{l}</button>
            ))}
          </div>

          {view === "issues" ? (
            r.issues.length ? (
              <div className="mt-2 overflow-x-auto rounded-xl bg-white">
                <table className="w-full min-w-[520px] text-left text-sm text-slate-800">
                  <thead><tr className="border-b border-line text-xs uppercase text-slate-500"><th className="p-2">Problem</th><th className="p-2">Wrong text</th><th className="p-2">Replace with</th></tr></thead>
                  <tbody className="divide-y divide-line">
                    {r.issues.map((i, k) => (
                      <tr key={k}>
                        <td className="p-2 align-top"><span className={`chip ${SEV[i.severity]}`}>{i.severity}</span><div className="mt-1 font-medium">{i.problem}</div><div className="text-xs text-slate-500">{i.suggestion}</div></td>
                        <td className="p-2 align-top">{i.found ? <span className="rounded bg-rose-50 px-1 text-rose-700 line-through decoration-rose-400">{i.found}</span> : "-"}</td>
                        <td className="p-2 align-top">{i.replaceWith ? <span className="rounded bg-emerald-50 px-1 font-medium text-emerald-800">{i.replaceWith}</span> : "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <p className="mt-2 text-sm">No problems found.</p>
          ) : (
            <div className="mt-2">
              <textarea readOnly className="input min-h-60 bg-white font-serif text-sm" value={text} />
              <div className="mt-2 flex flex-wrap gap-2">
                <button className="btn-primary px-3 py-1.5 text-xs" onClick={async () => downloadBytes(await textToPdf(text), `${item.name.replace(/\W+/g, "-")}-${view}.pdf`)}>⬇ PDF</button>
                <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => navigator.clipboard.writeText(text)}>📋 Copy</button>
              </div>
              {view === "rearranged" && <p className="mt-1 text-xs text-slate-500">Your original wording, with only the letter parts moved into the standard order.</p>}
            </div>
          )}

          {r.verdict !== "ok" && (
            <button className="btn-ghost mt-3 px-3 py-1.5 text-xs" onClick={resubmitLetter}>📨 Write a resubmission letter for the corrected document</button>
          )}
        </div>
      )}
    </div>
  );
}
