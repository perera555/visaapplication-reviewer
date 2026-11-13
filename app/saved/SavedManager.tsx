"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildLetter, type LetterInput } from "@/lib/letters";
import { FORM_SECTIONS } from "@/lib/formSchema";
import { downloadBytes, textToPdf } from "@/lib/pdf";
import { deleteItem, getFile, listItems, putItem, type SavedItem, type SavedKind } from "@/lib/savedStore";

type AppData = { country: string; visaType: string; profile: { fullName: string }; attached: { fileKey: string; reqId: string }[]; extras: { name: string; fileKey?: string }[] };
type LetterData = { input: LetterInput; edited: string | null };

const KINDS: { kind: SavedKind; title: string; icon: string; open: (id: string) => string; newHref: string; newLabel: string }[] = [
  { kind: "application", title: "Document reviews / applications", icon: "📂", open: (id) => `/check?draft=${id}`, newHref: "/check?new=1", newLabel: "+ New application" },
  { kind: "letter", title: "Letters", icon: "✍️", open: (id) => `/letter?id=${id}`, newHref: "/letter?new=1", newLabel: "+ New letter" },
  { kind: "form", title: "Visa application forms", icon: "📝", open: (id) => `/form?id=${id}`, newHref: "/form?new=1", newLabel: "+ New form" },
];

const today = () => new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
const safeName = (s: string) => s.replace(/[^\w-]+/g, "-").slice(0, 60);

function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function SavedManager() {
  const [items, setItems] = useState<SavedItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");

  async function load() {
    setItems(await listItems());
    setLoaded(true);
  }
  useEffect(() => {
    load();
  }, []);

  function fileKeys(i: SavedItem) {
    if (i.kind !== "application") return [];
    const d = i.data as AppData;
    return [...(d.attached ?? []).map((a) => a.fileKey), ...(d.extras ?? []).map((e) => e.fileKey).filter(Boolean)] as string[];
  }

  async function remove(i: SavedItem) {
    if (!confirm(`Delete “${i.title}”? This cannot be undone.`)) return;
    // only delete files no other saved application uses
    const others = items.filter((x) => x.id !== i.id).flatMap(fileKeys);
    await deleteItem(i.id, fileKeys(i).filter((k) => !others.includes(k)));
    setMsg(`Deleted “${i.title}”.`);
    load();
  }

  async function duplicate(i: SavedItem) {
    await putItem({ ...i, id: crypto.randomUUID(), title: `${i.title} (copy)` });
    setMsg(`Duplicated “${i.title}”.`);
    load();
  }

  async function rename(i: SavedItem) {
    if (!newTitle.trim()) return;
    await putItem({ ...i, title: newTitle.trim() });
    setRenaming(null);
    load();
  }

  async function download(i: SavedItem) {
    if (i.kind === "letter") {
      const d = i.data as LetterData;
      const text = d.edited ?? buildLetter(d.input, today());
      downloadBytes(await textToPdf(text), `${safeName(i.title)}.pdf`);
    } else if (i.kind === "form") {
      const v = i.data as Record<string, string>;
      const lines = FORM_SECTIONS.flatMap((s) => [`\n${s.title.toUpperCase()}`, ...s.fields.map((f) => `${f.label}: ${v[f.key] || "-"}`)]);
      downloadBytes(await textToPdf(`${lines.join("\n")}\n\nDeclaration: I confirm that the information given is true and complete.\n\nSignature: ____________________   Date: ______________`, { title: "Visa Application Form" }), `${safeName(i.title)}.pdf`);
    } else {
      const d = i.data as AppData;
      downloadBlob(new Blob([JSON.stringify(i, null, 2)], { type: "application/json" }), `${safeName(i.title)}-summary.json`);
      let n = 0;
      for (const k of fileKeys(i)) {
        const f = await getFile(k);
        if (f) {
          downloadBlob(f, f.name);
          n++;
          await new Promise((r) => setTimeout(r, 300));
        }
      }
      setMsg(`Downloaded the summary and ${n} document(s) for ${d.profile?.fullName || i.title}.`);
    }
  }

  function exportAll() {
    downloadBlob(new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), items }, null, 2)], { type: "application/json" }), `visareview-backup-${new Date().toISOString().slice(0, 10)}.json`);
    setMsg("Backup downloaded. Uploaded files are not inside the backup; download them from each application.");
  }

  async function importAll(file: File | undefined) {
    if (!file) return;
    try {
      const j = JSON.parse(await file.text()) as { items?: SavedItem[] };
      for (const it of j.items ?? []) if (it.id && it.kind) await putItem(it);
      setMsg(`Imported ${j.items?.length ?? 0} item(s).`);
      load();
    } catch {
      setMsg("That file is not a VisaReview backup.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => <Link key={k.kind} href={k.newHref} className="btn-primary">{k.newLabel}</Link>)}
        <span className="ml-auto flex gap-2">
          <button className="btn-ghost" onClick={exportAll} disabled={!items.length}>⬇ Backup all</button>
          <label className="btn-ghost cursor-pointer">⬆ Restore backup<input type="file" accept="application/json" className="hidden" onChange={(e) => { importAll(e.target.files?.[0]); e.target.value = ""; }} /></label>
        </span>
      </div>
      {msg && <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}

      {KINDS.map((k) => {
        const list = items.filter((i) => i.kind === k.kind);
        return (
          <section key={k.kind} className="card">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">{k.icon} {k.title} <span className="text-sm font-normal text-slate-500">({list.length})</span></h2>
              <Link href={k.newHref} className="btn-ghost px-3 py-1.5 text-xs">{k.newLabel}</Link>
            </div>
            {!loaded ? <p className="mt-3 text-sm text-slate-500">Loading…</p> : list.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nothing saved yet.</p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {list.map((i) => (
                  <li key={i.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      {renaming === i.id ? (
                        <div className="flex gap-2">
                          <input className="input py-1.5" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rename(i)} autoFocus />
                          <button className="btn-primary px-3 py-1.5 text-xs" onClick={() => rename(i)}>Save</button>
                          <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setRenaming(null)}>Cancel</button>
                        </div>
                      ) : (
                        <div className="truncate font-semibold">{i.title}</div>
                      )}
                      <div className="truncate text-xs text-slate-500">{i.subtitle} · saved {new Date(i.updatedAt).toLocaleString()}</div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Link href={k.open(i.id)} className="btn-primary px-3 py-1.5 text-xs">✏️ Open / edit</Link>
                      <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => download(i)}>⬇ Download</button>
                      <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => { setRenaming(i.id); setNewTitle(i.title); }}>Rename</button>
                      <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => duplicate(i)}>Duplicate</button>
                      <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => remove(i)}>🗑 Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      <p className="text-xs text-slate-500">Saved work is stored privately in this browser on this device. It is not sent anywhere until you click “Send application”. Clearing browser data removes it, so use “Backup all” to keep a copy.</p>
    </div>
  );
}
