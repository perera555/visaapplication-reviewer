"use client";

import { useCallback, useEffect, useState } from "react";
import { DOC_CATEGORIES, EMPTY_REG_DETAILS, REG_STATUS_LABEL, type Registration, type RegistrationDetails, type RegistrationIndex, type RegistrationStatus } from "@/lib/types";
import { Field } from "@/components/ui";
import { SupportDocReview, type ReviewItem } from "@/components/SupportDocReview";

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `Error ${r.status}`);
  return j as T;
}

const STATUS_CLS: Record<RegistrationStatus, string> = {
  registered: "bg-emerald-100 text-emerald-800", "documents-pending": "bg-amber-100 text-amber-800", "in-process": "bg-indigo-100 text-indigo-800",
  submitted: "bg-cyan-100 text-cyan-800", approved: "bg-emerald-200 text-emerald-900", refused: "bg-rose-100 text-rose-800", closed: "bg-slate-200 text-slate-700",
};

export function Registrations() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<RegistrationIndex[]>([]);
  const [total, setTotal] = useState(0);
  const [sel, setSel] = useState<Registration | null>(null);
  const [error, setError] = useState("");

  const search = useCallback(async (term: string) => {
    try {
      const r = await api<RegistrationIndex[]>(`/api/registrations?q=${encodeURIComponent(term)}`);
      setRows(r);
      if (!term) setTotal(r.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(q), 250);
    return () => clearTimeout(t);
  }, [q, search]);

  async function open(id: string) {
    setSel(await api<Registration>(`/api/registrations/${id}`));
  }
  const refresh = async () => {
    if (sel) await open(sel.id);
    search(q);
  };

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-lg font-bold">🪪 Customer registrations <span className="text-sm font-normal text-slate-500">({total})</span></h2>
          <a href="/register" target="_blank" className="btn-primary ml-auto">+ Register new customer</a>
        </div>
        <input className="input mt-4 py-3 text-base" placeholder="🔍 Is this person registered? Search name, registration no., passport, national ID, email or phone…" value={q} onChange={(e) => setQ(e.target.value)} />
        {q.trim() && (
          <p className={`mt-3 rounded-xl p-3 text-sm font-semibold ${rows.length ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-700"}`}>
            {rows.length ? `✅ Registered: ${rows.length} match(es) found` : "❌ Not registered: no customer matches this search"}
          </p>
        )}
        {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-2">
          <ul className="max-h-[720px] divide-y divide-line overflow-y-auto">
            {rows.map((r) => (
              <li key={r.id}>
                <button onClick={() => open(r.id)} className={`flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-slate-50 ${sel?.id === r.id ? "bg-indigo-50" : ""}`}>
                  {r.hasPhoto ? <img src={`/api/registrations/${r.id}/photo`} alt="" className="h-12 w-10 rounded-lg object-cover" /> : <span className="grid h-12 w-10 place-items-center rounded-lg bg-slate-100">👤</span>}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{r.fullName}</span>
                    <span className="block font-mono text-xs text-indigo-700">{r.regNo}</span>
                    <span className="block truncate text-xs text-slate-500">{r.passportNo || r.nationalId} · {r.destination || "-"} · {r.docs} doc(s)</span>
                  </span>
                  <span className={`chip ${STATUS_CLS[r.status]}`}>{REG_STATUS_LABEL[r.status]}</span>
                </button>
              </li>
            ))}
            {rows.length === 0 && <li className="py-8 text-center text-sm text-slate-500">{q ? "No match." : "No registrations yet."}</li>}
          </ul>
        </div>
        <div className="lg:col-span-3">
          {sel ? <RegistrationDetail key={sel.id + sel.updatedAt} reg={sel} onChange={refresh} onDeleted={() => { setSel(null); search(q); }} /> : <div className="card grid min-h-60 place-items-center text-slate-500">Select a customer to see their details and documents.</div>}
        </div>
      </div>
    </div>
  );
}

/** Admin: review every stored document of a customer (fetched from the database, reviewed in the browser). */
function AdminDocReview({ reg }: { reg: Registration }) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  async function load() {
    setLoading(true);
    const list: ReviewItem[] = [];
    for (const doc of reg.documents.filter((x) => /pdf|text/.test(x.type) || /\.(pdf|txt)$/i.test(x.name))) {
      const res = await fetch(`/api/registrations/${reg.id}/documents/${doc.id}`);
      if (res.ok) list.push({ id: doc.id, name: `${doc.category}: ${doc.name}`, file: new File([await res.blob()], doc.name, { type: doc.type }) });
    }
    setItems(list);
    setLoading(false);
  }
  return (
    <div className="rounded-2xl border border-line p-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="flex-1 font-bold">🔍 Supporting document review</h3>
        <button className="btn-primary px-3 py-1.5 text-xs" disabled={loading || !reg.documents.length} onClick={load}>{loading ? "Loading documents…" : items.length ? "Re-load & review" : "Review all documents"}</button>
      </div>
      {items.length > 0 && <div className="mt-3"><SupportDocReview items={items} context={{ fullName: reg.details.fullName, passportNo: reg.details.passportNo, destination: reg.details.destination }} autoRun /></div>}
      {!items.length && !loading && <p className="mt-1 text-xs text-slate-500">Checks each PDF for wrong name, passport number or country, blanks and wording problems.</p>}
    </div>
  );
}

function RegistrationDetail({ reg, onChange, onDeleted }: { reg: Registration; onChange: () => void; onDeleted: () => void }) {
  const [d, setD] = useState<RegistrationDetails>({ ...EMPTY_REG_DETAILS, ...reg.details });
  const [notes, setNotes] = useState(reg.adminNotes);
  const [cat, setCat] = useState(DOC_CATEGORIES[0]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const json = { "Content-Type": "application/json" };

  async function save(patch: object, note = "Saved.") {
    try {
      await api(`/api/registrations/${reg.id}`, { method: "PATCH", headers: json, body: JSON.stringify(patch) });
      setMsg(note);
      onChange();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  }
  async function upload(list: FileList | null) {
    if (!list?.length) return;
    for (const f of [...list]) {
      setBusy(`Uploading ${f.name}…`);
      const fd = new FormData();
      fd.append("file", f);
      fd.append("category", cat);
      try {
        await api(`/api/registrations/${reg.id}/documents`, { method: "POST", body: fd });
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Upload failed");
      }
    }
    setBusy("");
    onChange();
  }
  async function delDoc(id: string) {
    if (!confirm("Delete this document?")) return;
    await api(`/api/registrations/${reg.id}/documents?docId=${id}`, { method: "DELETE" });
    onChange();
  }
  async function replacePhoto(f?: File) {
    if (!f) return;
    const fd = new FormData();
    fd.append("photo", f);
    await api(`/api/registrations/${reg.id}/photo`, { method: "POST", body: fd });
    onChange();
  }
  async function remove() {
    if (!confirm(`Delete registration ${reg.regNo} (${reg.details.fullName}) and all documents? This cannot be undone.`)) return;
    await api(`/api/registrations/${reg.id}`, { method: "DELETE" });
    onDeleted();
  }

  const byCat = DOC_CATEGORIES.map((c) => [c, reg.documents.filter((x) => x.category === c)] as const).filter(([, l]) => l.length);
  const keys = Object.keys(EMPTY_REG_DETAILS).filter((k) => k !== "notes") as (keyof RegistrationDetails)[];

  return (
    <div className="card space-y-5">
      <div className="flex flex-wrap items-start gap-4">
        <div className="text-center">
          <img src={`/api/registrations/${reg.id}/photo?v=${reg.updatedAt}`} alt="Customer photo" className="h-36 w-28 rounded-2xl object-cover shadow-lg" />
          <label className="mt-1 block cursor-pointer text-xs text-indigo-600">Replace photo<input type="file" accept="image/*" className="hidden" onChange={(e) => replacePhoto(e.target.files?.[0])} /></label>
        </div>
        <div className="flex-1">
          <div className="font-mono text-2xl font-black text-indigo-700">{reg.regNo}</div>
          <h2 className="text-xl font-bold">{reg.details.fullName}</h2>
          <p className="text-sm text-slate-500">Registered {new Date(reg.createdAt).toLocaleString()} · {reg.documents.length} document(s)</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {(Object.keys(REG_STATUS_LABEL) as RegistrationStatus[]).map((s) => (
              <button key={s} onClick={() => save({ status: s }, `Status: ${REG_STATUS_LABEL[s]}`)} className={`chip cursor-pointer ${reg.status === s ? STATUS_CLS[s] + " ring-2 ring-indigo-400 ring-offset-1" : "bg-slate-100 text-slate-600"}`}>{REG_STATUS_LABEL[s]}</button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h3 className="label">Documents by category</h3>
        {byCat.length === 0 && <p className="text-sm text-slate-500">No documents uploaded yet.</p>}
        <div className="space-y-2">
          {byCat.map(([c, list]) => (
            <div key={c} className="rounded-xl border border-line p-2">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{c}</div>
              {list.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 py-1 text-sm">
                  <a className="flex-1 truncate text-indigo-700 hover:underline" href={`/api/registrations/${reg.id}/documents/${doc.id}`} target="_blank" rel="noreferrer">📄 {doc.name}</a>
                  <span className="text-xs text-slate-400">{Math.round(doc.size / 1024)} KB · {doc.by}</span>
                  <a className="text-xs text-slate-600 hover:underline" href={`/api/registrations/${reg.id}/documents/${doc.id}`} download={doc.name}>⬇</a>
                  <button className="text-xs text-rose-600" onClick={() => delDoc(doc.id)}>Delete</button>
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <select className="input sm:max-w-xs" value={cat} onChange={(e) => setCat(e.target.value)}>{DOC_CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <label className="btn-ghost cursor-pointer">+ Add document<input type="file" multiple className="hidden" onChange={(e) => { upload(e.target.files); e.target.value = ""; }} /></label>
          {busy && <span className="text-sm text-indigo-700">{busy}</span>}
        </div>
      </div>

      <AdminDocReview reg={reg} />

      <div>
        <h3 className="label">Customer details</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {keys.map((k) => (
            <Field key={k} label={k.replace(/([A-Z])/g, " $1")}>
              <input className="input py-1.5" value={d[k]} onChange={(e) => setD((x) => ({ ...x, [k]: e.target.value }))} />
            </Field>
          ))}
        </div>
        {reg.details.notes && <p className="mt-2 rounded-xl bg-slate-50 p-2 text-sm"><b>Customer note:</b> {reg.details.notes}</p>}
        <button className="btn-primary mt-3" onClick={() => save({ details: d }, "Details saved.")}>Save details</button>
      </div>

      <Field label="Internal notes">
        <textarea className="input min-h-20" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== reg.adminNotes && save({ adminNotes: notes }, "Notes saved.")} />
      </Field>
      {msg && <p className="text-sm text-emerald-700">{msg}</p>}
      <div className="flex flex-wrap gap-2">
        {reg.details.email && <a className="btn-ghost" href={`mailto:${reg.details.email}?subject=${encodeURIComponent(`Your registration ${reg.regNo}`)}`}>📧 Email</a>}
        {reg.details.phone && <a className="btn-ghost" href={`https://wa.me/${reg.details.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
        <button className="btn-danger ml-auto" onClick={remove}>Delete registration</button>
      </div>
    </div>
  );
}
