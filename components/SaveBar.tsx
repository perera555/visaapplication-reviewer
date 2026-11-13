"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/** Shows auto-save status with links to the saved-work manager. */
export function SaveBar({ savedAt, onNew, newLabel = "+ New" }: { savedAt: string; onNew?: () => void; newLabel?: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    if (!savedAt) return;
    const update = () => {
      const s = Math.round((Date.now() - new Date(savedAt).getTime()) / 1000);
      setLabel(s < 5 ? "just now" : s < 60 ? `${s}s ago` : `${Math.round(s / 60)} min ago`);
    };
    update();
    const t = setInterval(update, 5000);
    return () => clearInterval(t);
  }, [savedAt]);

  return (
    <div className="no-print flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-2 text-sm">
      <span className="font-semibold text-emerald-800">💾 Auto-save on</span>
      <span className="text-emerald-700">{savedAt ? `Saved ${label} on this device` : "Your work saves automatically"}</span>
      <span className="ml-auto flex gap-2">
        {onNew && <button className="btn-ghost px-3 py-1 text-xs" onClick={onNew}>{newLabel}</button>}
        <Link href="/saved" className="btn-ghost px-3 py-1 text-xs">📂 My saved work</Link>
      </span>
    </div>
  );
}
