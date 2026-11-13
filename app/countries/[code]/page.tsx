import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COUNTRIES, SCHENGEN, flag, getCountry } from "@/lib/countries";
import { APPLY_MODE_INFO, VISA_TYPES, getApplyMode, getCountryProfile, getProcessSteps, getRequirements } from "@/lib/requirements";
import { ApplyModeBadge } from "@/components/ApplyModeBadge";
import { PageHero } from "@/components/ui";
import { CountryExtras } from "./CountryExtras";
import { DocTally } from "@/components/DocTally";

export function generateStaticParams() {
  return COUNTRIES.map((c) => ({ code: c.code.toLowerCase() }));
}

export async function generateMetadata({ params }: PageProps<"/countries/[code]">): Promise<Metadata> {
  const c = getCountry((await params).code);
  return { title: c ? `${c.name} visa requirements` : "Country" };
}

export default async function CountryPage({ params }: PageProps<"/countries/[code]">) {
  const { code } = await params;
  const country = getCountry(code);
  if (!country) notFound();
  const profile = getCountryProfile(country.code);

  return (
    <>
      <PageHero icon={flag(country.code)} title={`${country.name} visa guide`} subtitle={`Documents, application process and refusal options for every ${country.name} visa type.${SCHENGEN.has(country.code) ? " Part of the Schengen Area." : ""}`}>
        <div className="mt-4 flex flex-wrap gap-2">
          {profile.portal && <a href={profile.portal.url} target="_blank" rel="noreferrer" className="btn glass text-white hover:bg-white/15">{profile.portal.name} ↗</a>}
          <Link href={`/check?country=${country.code}`} className="btn-primary">Review my documents</Link>
        </div>
      </PageHero>

      <div className="container-x pt-10">
        <section className="card">
          <h2 className="text-xl font-black">🧮 Tally my documents vs. {country.name} requirements</h2>
          <p className="mb-4 text-sm text-slate-500">Choose your visa type, then tick or upload the documents you have. You see right away which required documents are still missing.</p>
          <DocTally country={country.code} selectable />
        </section>
      </div>

      <div className="container-x grid gap-6 py-10 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {VISA_TYPES.map((v) => {
            const reqs = getRequirements(country.code, v.id);
            return (
              <details key={v.id} className="card group" open={v.id === "visit"}>
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  <span className="text-2xl">{v.icon}</span>
                  <span className="flex-1">
                    <span className="flex flex-wrap items-center gap-2 font-bold">{v.name} visa <ApplyModeBadge country={country.code} visaType={v.id} long /></span>
                    <span className="block text-xs text-slate-500">{reqs.filter((r) => r.mandatory).length} required · {reqs.filter((r) => !r.mandatory).length} recommended documents</span>
                  </span>
                  <span className="text-slate-400 transition group-open:rotate-180">⌄</span>
                </summary>
                <div className="mt-4 grid gap-6 md:grid-cols-2">
                  <div>
                    <h4 className="label">Documents</h4>
                    <ul className="space-y-1.5 text-sm">
                      {reqs.map((r) => (
                        <li key={r.id} className="flex gap-2">
                          <span>{r.mandatory ? "🔴" : "⚪"}</span>
                          <span><b>{r.name}</b>{r.source === "country" && <span className="chip ml-1 bg-cyan-50 text-cyan-700">{country.name}</span>}<span className="block text-xs text-slate-500">{r.description}</span></span>
                        </li>
                      ))}
                    </ul>
                    <CountryExtras country={country.code} visaType={v.id} />
                  </div>
                  <div>
                    <h4 className="label">How to apply</h4>
                    <ol className="list-decimal space-y-1 pl-5 text-sm">
                      {getProcessSteps(country.code, v.id).map((s) => <li key={s}>{s}</li>)}
                    </ol>
                    <Link href={`/check?country=${country.code}&type=${v.id}`} className="btn-primary mt-4">Check my {v.name.toLowerCase()} documents</Link>
                  </div>
                </div>
              </details>
            );
          })}
        </div>

        <aside className="space-y-6">
          <div className="card">
            <h3 className="font-bold">Key facts</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div><dt className="label">Region</dt><dd>{country.region}</dd></div>
              <div><dt className="label">How you apply</dt><dd><ApplyModeBadge country={country.code} long /><span className="mt-1 block text-xs text-slate-500">{APPLY_MODE_INFO[getApplyMode(country.code)].detail}</span></dd></div>
              {profile.formName && <div><dt className="label">Application form</dt><dd>{profile.formName}</dd></div>}
              {profile.processing && <div><dt className="label">Processing</dt><dd>{profile.processing}</dd></div>}
              <div><dt className="label">Biometrics</dt><dd>{profile.biometrics ? "Required" : "Check with embassy"}</dd></div>
              {profile.interview && <div><dt className="label">Interview</dt><dd>{profile.interview}</dd></div>}
            </dl>
            {profile.notes && (
              <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-slate-700">
                {profile.notes.map((n) => <li key={n}>{n}</li>)}
              </ul>
            )}
          </div>
          <div className="card border-rose-100">
            <h3 className="font-bold">If your visa is refused</h3>
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-slate-700">
              {(profile.refusalOptions ?? []).map((n) => <li key={n}>{n}</li>)}
            </ul>
            <div className="mt-4 grid gap-2">
              <Link href={`/refusal?country=${country.code}`} className="btn-ghost">Analyse a refusal letter</Link>
              <Link href={`/letter?type=reconsideration`} className="btn-ghost">Write an appeal letter</Link>
            </div>
          </div>
          <p className="text-xs text-slate-500">Requirements change often. Always confirm on the official government website before you submit.</p>
        </aside>
      </div>
    </>
  );
}
