"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { COUNTRIES, REGIONS, flag } from "@/lib/countries";
import { APPLY_MODE_INFO, getApplyMode, type ApplyMode } from "@/lib/requirements";
import { ApplyModeBadge } from "./ApplyModeBadge";

export function CountryPicker({ compact = false }: { compact?: boolean }) {
  const [q, setQ] = useState("");
  const [region, setRegion] = useState<string>("");
  const [mode, setMode] = useState<ApplyMode | "">("");
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return COUNTRIES.filter((c) => (!region || c.region === region) && (!mode || getApplyMode(c.code) === mode) && (!s || c.name.toLowerCase().includes(s) || c.code.toLowerCase() === s));
  }, [q, region, mode]);
  const shown = compact && !q && !region && !mode ? list.filter((c) => ["GB", "US", "CA", "AU", "NZ", "DE", "FR", "IE", "JP", "AE", "SG", "IT"].includes(c.code)) : list;

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input className="input sm:max-w-sm" placeholder="Search a country… e.g. Canada" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="input sm:max-w-xs" value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="">All regions</option>
          {REGIONS.map((r) => <option key={r}>{r}</option>)}
        </select>
        <select className="input sm:max-w-xs" value={mode} onChange={(e) => setMode(e.target.value as ApplyMode | "")}>
          <option value="">Online & offline</option>
          {(Object.keys(APPLY_MODE_INFO) as ApplyMode[]).map((m) => <option key={m} value={m}>{APPLY_MODE_INFO[m].icon} {APPLY_MODE_INFO[m].label}</option>)}
        </select>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
        {(Object.keys(APPLY_MODE_INFO) as ApplyMode[]).map((m) => (
          <span key={m}><span className={`chip ${APPLY_MODE_INFO[m].className}`}>{APPLY_MODE_INFO[m].icon} {APPLY_MODE_INFO[m].short}</span> {APPLY_MODE_INFO[m].detail.split(".")[0]}</span>
        ))}
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((c) => (
          <Link
            key={c.code}
            href={`/countries/${c.code.toLowerCase()}`}
            className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 transition hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-500/10"
          >
            <span className="text-3xl transition group-hover:scale-110 group-hover:[transform:perspective(200px)_rotateY(-20deg)]">{flag(c.code)}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{c.name}</span>
              <span className="block text-xs text-slate-500">{c.region}</span>
              <span className="mt-1 block"><ApplyModeBadge country={c.code} /></span>
            </span>
          </Link>
        ))}
        {shown.length === 0 && <p className="col-span-full text-sm text-slate-500">No country found.</p>}
      </div>
      {compact && !q && !region && !mode && (
        <Link href="/countries" className="btn-ghost mt-5">View all {COUNTRIES.length} countries →</Link>
      )}
    </div>
  );
}
