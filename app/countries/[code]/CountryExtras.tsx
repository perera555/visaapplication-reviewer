"use client";

import { useEffect, useState } from "react";
import type { CustomRequirement } from "@/lib/types";
import { SupportDocsList } from "@/components/SupportDocsList";

/** Documents and support files the admin team added for this country + visa type. */
export function CountryExtras({ country, visaType }: { country: string; visaType: string }) {
  const [items, setItems] = useState<CustomRequirement[]>([]);
  useEffect(() => {
    fetch(`/api/requirements?country=${country}&type=${visaType}`).then((r) => r.json()).then(setItems).catch(() => {});
  }, [country, visaType]);
  return (
    <>
      {items.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm">
          {items.map((r) => (
            <li key={r.id} className="flex gap-2">
              <span>{r.mandatory ? "🔴" : "⚪"}</span>
              <span><b>{r.name}</b> <span className="chip bg-amber-50 text-amber-700">Our team</span><span className="block text-xs text-slate-500">{r.description}</span></span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3"><SupportDocsList country={country} visaType={visaType} title="Templates & guides" /></div>
    </>
  );
}
