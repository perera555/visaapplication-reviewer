"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo, NAV } from "./brand";
import { InstallButton } from "./InstallButton";

export function SiteHeader() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const dark = path === "/";
  return (
    <header className={`no-print sticky top-0 z-40 border-b backdrop-blur-xl ${dark ? "border-white/10 bg-[#03140c]/70" : "border-line bg-white/80"}`}>
      <div className="container-x flex h-16 items-center gap-4">
        <Link href="/" onClick={() => setOpen(false)}>
          <Logo light={dark} />
        </Link>
        <nav className="ml-auto hidden items-center gap-0.5 xl:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`whitespace-nowrap rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                path.startsWith(n.href)
                  ? dark ? "bg-white/15 text-white" : "bg-indigo-50 text-indigo-700"
                  : dark ? "text-white/80 hover:bg-white/10 hover:text-white" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {n.label}
            </Link>
          ))}
          <InstallButton dark={dark} />
          <Link href="/check" className="btn-primary ml-1">Check my visa</Link>
        </nav>
        <div className="ml-auto flex items-center gap-1 xl:hidden">
          <InstallButton dark={dark} />
          <button onClick={() => setOpen((o) => !o)} className={`rounded-lg p-2 ${dark ? "text-white" : "text-slate-700"}`} aria-label="Menu">
            {open ? "✕" : "☰"}
          </button>
        </div>
      </div>
      {open && (
        <nav className={`container-x grid gap-1 pb-4 xl:hidden ${dark ? "text-white" : ""}`}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setOpen(false)} className={`rounded-lg px-3 py-2.5 text-sm font-medium ${dark ? "hover:bg-white/10" : "hover:bg-slate-100"}`}>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
