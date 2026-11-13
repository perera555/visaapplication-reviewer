"use client";

import { useEffect, useState } from "react";
import { getCountry } from "@/lib/countries";
import { visaTypeName } from "@/lib/requirements";
import type { SupportDoc } from "@/lib/types";

/** Support documents (templates, samples, guides) uploaded by the admin team. */
export function SupportDocsList({ docs: given, country, visaType, title = "Support documents from our team" }: { docs?: SupportDoc[]; country?: string; visaType?: string; title?: string }) {
  const [docs, setDocs] = useState<SupportDoc[]>(given ?? []);
  useEffect(() => {
    if (given) {
      setDocs(given);
      return;
    }
    const qs = new URLSearchParams();
    if (country) qs.set("country", country);
    if (visaType) qs.set("type", visaType);
    fetch(`/api/support-docs?${qs}`).then((r) => r.json()).then(setDocs).catch(() => setDocs([]));
  }, [given, country, visaType]);

  if (!docs.length) return null;
  return (
    <div className="card">
      <h3 className="font-bold">📚 {title}</h3>
      <ul className="mt-3 space-y-2">
        {docs.map((d) => (
          <li key={d.id} className="rounded-xl border border-line p-3">
            <div className="text-sm font-semibold">{d.title}</div>
            {d.description && <p className="text-xs text-slate-600">{d.description}</p>}
            <div className="mt-1 text-[11px] text-slate-400">
              {d.countryCode === "*" ? "All countries" : getCountry(d.countryCode)?.name} · {d.visaType === "*" ? "All visa types" : visaTypeName(d.visaType)}
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {d.fileName && <a className="chip bg-indigo-50 text-indigo-700" href={`/api/support-docs/${d.id}`} target="_blank" rel="noreferrer">⬇ {d.fileName}</a>}
              {d.url && <a className="chip bg-cyan-50 text-cyan-700" href={d.url} target="_blank" rel="noreferrer">🔗 Open link</a>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
