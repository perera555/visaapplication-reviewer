import Link from "next/link";
import { CountryPicker } from "@/components/CountryPicker";
import { HomeHero } from "@/components/HomeHero";
import { TiltCard } from "@/components/ui";
import { VISA_TYPES } from "@/lib/requirements";

const FEATURES = [
  { icon: "📂", title: "Document review", text: "Upload all your documents. We recognise each one, tick off the checklist and flag what is missing.", href: "/check", color: "from-indigo-500 to-violet-500" },
  { icon: "📊", title: "Success rate 0–100%", text: "A score based on your documents, finances, ties, travel history and previous refusals, with reasons.", href: "/check", color: "from-emerald-500 to-cyan-500" },
  { icon: "🚫", title: "Refusal analysis", text: "Paste or upload a refusal letter. We pick out the officer's reasons and what you need to re-apply.", href: "/refusal", color: "from-rose-500 to-orange-500" },
  { icon: "✍️", title: "Appeal & letter writer", text: "Reconsideration, appeal and cover letters to the embassy or high commission, ready to print.", href: "/letter", color: "from-amber-500 to-pink-500" },
  { icon: "📝", title: "Application form filler", text: "Fill a guided visa form, or upload an official PDF form and fill it right here in the app.", href: "/form", color: "from-sky-500 to-indigo-500" },
  { icon: "🌍", title: "Country by country", text: "Requirements, process, portals and appeal options for 195 countries.", href: "/countries", color: "from-teal-500 to-lime-500" },
];

const STEPS = [
  ["Choose destination & visa", "Pick the country and the visa type: student, work, visit and more."],
  ["Answer a few questions", "Funds, job, travel history and any previous refusals."],
  ["Upload your documents", "Drop in all your files at once. We match each one to the checklist."],
  ["Get your status & success rate", "See what is missing and what to fix, then send it to our team."],
];

export default function Home() {
  return (
    <>
      <HomeHero />

      {/* visa types */}
      <section className="container-x -mt-10 relative z-10">
        <div className="scene grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
          {VISA_TYPES.map((v) => (
            <Link key={v.id} href={`/check?type=${v.id}`} className="group rounded-2xl border border-line bg-white p-4 text-center shadow-lg shadow-slate-900/5 transition duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-indigo-500/20 hover:[transform:translateY(-8px)_rotateX(10deg)]">
              <div className="text-3xl transition group-hover:scale-125">{v.icon}</div>
              <div className="mt-2 text-xs font-bold leading-tight">{v.name}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* features */}
      <section className="container-x py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-black tracking-tight sm:text-4xl">Everything for your visa, in one app</h2>
          <p className="mt-3 text-slate-600">From the first checklist to a refusal appeal, for customers and the agency team alike.</p>
        </div>
        <div className="scene mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <TiltCard key={f.title} className="card relative overflow-hidden">
              <Link href={f.href} className="block">
                <div className={`pop grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br ${f.color} text-2xl shadow-xl`}>{f.icon}</div>
                <h3 className="pop mt-4 text-lg font-bold">{f.title}</h3>
                <p className="mt-2 text-sm text-slate-600">{f.text}</p>
                <span className="mt-4 inline-block text-sm font-semibold text-indigo-600">Open →</span>
              </Link>
              <div className={`pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-gradient-to-br ${f.color} opacity-10 blur-2xl`} />
            </TiltCard>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="hero-bg relative overflow-hidden py-20 text-white">
        <div className="grid-floor opacity-60" />
        <div className="container-x relative">
          <h2 className="text-center text-3xl font-black sm:text-4xl">How it works</h2>
          <div className="scene mt-12 grid gap-5 md:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <div key={t} className="glass rounded-3xl p-6 transition duration-500 hover:[transform:translateZ(40px)_rotateX(8deg)]" style={{ transform: `rotateX(6deg) translateZ(${i * 6}px)` }}>
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-indigo-400 to-cyan-400 text-xl font-black shadow-lg shadow-indigo-500/40">{i + 1}</div>
                <h3 className="mt-4 font-bold">{t}</h3>
                <p className="mt-2 text-sm text-white/70">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/check" className="btn-primary px-8 py-3 text-base">Check my documents now</Link>
          </div>
        </div>
      </section>

      {/* countries */}
      <section className="container-x py-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight">Where are you applying?</h2>
            <p className="mt-2 text-slate-600">Country-by-country documents, process and appeal options.</p>
          </div>
        </div>
        <CountryPicker compact />
      </section>
    </>
  );
}
