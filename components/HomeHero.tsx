"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, flag } from "@/lib/countries";
import { APPLY_MODE_INFO, VISA_TYPES, getApplyMode, type VisaTypeId } from "@/lib/requirements";
import { ApplyModeBadge } from "./ApplyModeBadge";

export function HomeHero() {
  const scene = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [country, setCountry] = useState("GB");
  const [type, setType] = useState("visit");

  function move(e: React.PointerEvent) {
    const el = scene.current;
    if (!el || e.pointerType === "touch") return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `rotateY(${x * 18}deg) rotateX(${-y * 14}deg)`;
  }

  return (
    <section className="hero-bg relative overflow-hidden text-white" onPointerMove={move} onPointerLeave={() => scene.current && (scene.current.style.transform = "")}>
      <div className="grid-floor" />
      <div className="container-x relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <span className="glass chip px-3 py-1 text-white/90">🌍 195 countries · every visa type</span>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">
            Know your visa <span className="text-gradient">success rate</span> before you apply
          </h1>
          <p className="mt-5 max-w-xl text-lg text-white/75">
            Upload your documents, and we review every one against the official checklist for your country and visa type.
            You see what is missing, how strong your file is, and what to fix. Student, work, visit, family and more.
          </p>
          <form
            className="glass mt-8 max-w-xl rounded-3xl p-4 shadow-2xl shadow-indigo-950/50 [transform:perspective(900px)_rotateX(6deg)]"
            onSubmit={(e) => { e.preventDefault(); router.push(`/check?country=${country}&type=${type}`); }}
          >
            <label className="block text-sm font-bold text-white">🌍 Which country are you applying to?</label>
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <select className="input py-3 text-base font-semibold text-slate-900" value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
              </select>
              <select className="input py-3 text-slate-900" value={type} onChange={(e) => setType(e.target.value)}>
                {VISA_TYPES.map((v) => <option key={v.id} value={v.id}>{v.icon} {v.name}</option>)}
              </select>
              <button className="btn-primary px-5 py-3">Start →</button>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-white/80">
              <ApplyModeBadge country={country} visaType={type as VisaTypeId} long /> {APPLY_MODE_INFO[getApplyMode(country, type as VisaTypeId)].detail}
            </div>
          </form>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href={`/countries/${country.toLowerCase()}`} className="btn glass px-5 py-2.5 text-white hover:bg-white/15">See {COUNTRIES.find((c) => c.code === country)?.name} requirements</Link>
            <Link href="/sop" className="btn glass px-5 py-2.5 text-white hover:bg-white/15">🎓 Write my SOP</Link>
            <Link href="/refusal" className="btn glass px-5 py-2.5 text-white hover:bg-white/15">My visa was refused</Link>
          </div>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-3 text-center">
            {[["9", "visa types"], ["195", "countries"], ["100%", "free review"]].map(([n, l]) => (
              <div key={l} className="glass rounded-2xl px-2 py-3">
                <div className="text-2xl font-black">{n}</div>
                <div className="text-xs text-white/70">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="scene relative mx-auto grid h-[420px] w-full max-w-[520px] place-items-center sm:h-[480px]">
          <div ref={scene} className="preserve relative grid place-items-center transition-transform duration-300 ease-out">
            <div className="globe">
              <div className="globe-map" />
            </div>
            <div className="orbit orbit-1"><span className="orbit-dot" /></div>
            <div className="orbit orbit-2"><span className="orbit-dot !bg-cyan-300 ![box-shadow:0_0_20px_#67e8f9]" /></div>

            <div className="float-card left-[-30%] top-[4%] w-48 p-4 [transform:translateZ(90px)_rotateY(18deg)] sm:left-[-36%]">
              <div className="text-xs uppercase tracking-wider text-white/70">Success rate</div>
              <div className="mt-1 flex items-end gap-2">
                <span className="text-4xl font-black text-emerald-300">87%</span>
                <span className="mb-1 text-xs text-white/70">UK · Student</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/15"><div className="h-2 w-[87%] rounded-full bg-gradient-to-r from-emerald-400 to-cyan-300" /></div>
            </div>

            <div className="float-card right-[-28%] top-[38%] w-52 p-4 [animation-delay:-2s] [transform:translateZ(130px)_rotateY(-20deg)] sm:right-[-34%]">
              <div className="text-xs uppercase tracking-wider text-white/70">Documents</div>
              <ul className="mt-2 space-y-1.5 text-sm">
                <li>✅ Passport</li>
                <li>✅ Bank statements</li>
                <li className="text-amber-200">⚠️ Offer letter (CAS)</li>
              </ul>
            </div>

            <div className="float-card bottom-[-2%] left-[-18%] w-56 p-4 [animation-delay:-4s] [transform:translateZ(60px)_rotateX(10deg)]">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 text-xl">✍️</span>
                <div>
                  <div className="text-sm font-bold">Appeal letter ready</div>
                  <div className="text-xs text-white/70">to the High Commission</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
