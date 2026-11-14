"use client";

import { useCallback, useEffect, useState } from "react";

type DnsRecord = { type: string; name: string; value: string; reason?: string };
type DomainStatus = { name: string; verified: boolean; configured: boolean; records: DnsRecord[] };

/** Connect your own domain (e.g. visa.yourcompany.com) to this website. */
export function Domains() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [domains, setDomains] = useState<DomainStatus[]>([]);
  const [domain, setDomain] = useState("");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/domains");
    const j = await r.json();
    setConfigured(Boolean(j.configured));
    setDomains(j.domains ?? []);
    if (j.error) setError(j.error);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function call(method: string, body?: object, qs = "") {
    const r = await fetch(`/api/admin/domains${qs}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Failed");
    return j;
  }
  async function connect(e: React.FormEvent) {
    e.preventDefault();
    setBusy("connect");
    setError("");
    setMsg("");
    try {
      await call("POST", { domain });
      setMsg(`${domain} added. Now add the DNS record shown below at the company where you bought the domain.`);
      setDomain("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy("");
    }
  }
  async function check(name: string) {
    setBusy(name);
    try {
      const s = (await call("PATCH", { domain: name })) as DomainStatus;
      setDomains((x) => x.map((d) => (d.name === name ? s : d)));
      setMsg(s.verified && s.configured ? `✅ ${name} is connected and working.` : `${name} is not ready yet. DNS changes can take from a few minutes up to 48 hours.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy("");
    }
  }
  async function remove(name: string) {
    if (!confirm(`Disconnect ${name} from this website?`)) return;
    try {
      await call("DELETE", undefined, `?domain=${encodeURIComponent(name)}`);
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <h2 className="text-lg font-bold">🌐 Your website domain</h2>
        <p className="text-sm text-slate-600">Right now the site is at <b>visaapplication-reviewer.vercel.app</b>. Buy a domain (e.g. from GoDaddy, Namecheap or a local registrar), connect it here, and customers can use <b>yourcompany.com</b> instead.</p>
        {configured === false ? (
          <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
            <b>One-time setup needed:</b> create a token at <a className="underline" href="https://vercel.com/account/tokens" target="_blank" rel="noreferrer">vercel.com/account/tokens</a>, then add it in Vercel → this project → Settings → Environment Variables as <code>VERCEL_API_TOKEN</code> and redeploy. (<code>VERCEL_PROJECT_ID</code> and <code>VERCEL_TEAM_ID</code> are already set.)
          </div>
        ) : (
          <form onSubmit={connect} className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input className="input py-3 text-base" placeholder="yourcompany.com  or  visa.yourcompany.com" value={domain} onChange={(e) => setDomain(e.target.value)} />
            <button className="btn-primary px-6" disabled={!domain.trim() || busy === "connect" || configured === null}>{busy === "connect" ? "Connecting…" : "Connect domain"}</button>
          </form>
        )}
        {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        {msg && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{msg}</p>}
      </div>

      {domains.map((d) => {
        const ok = d.verified && d.configured;
        return (
          <div key={d.name} className={`card border-2 ${ok ? "border-emerald-300" : "border-amber-300"}`}>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-2xl">{ok ? "✅" : "⏳"}</span>
              <div className="flex-1">
                <a href={`https://${d.name}`} target="_blank" rel="noreferrer" className="text-lg font-bold text-indigo-700 hover:underline">{d.name} ↗</a>
                <div className={`text-sm font-semibold ${ok ? "text-emerald-700" : "text-amber-700"}`}>{ok ? "Connected and working (HTTPS is automatic)" : "Waiting for DNS: add the record(s) below"}</div>
              </div>
              <button className="btn-ghost px-3 py-1.5 text-xs" disabled={busy === d.name} onClick={() => check(d.name)}>{busy === d.name ? "Checking…" : "↻ Check status"}</button>
              <button className="text-xs text-rose-600" onClick={() => remove(d.name)}>Disconnect</button>
            </div>
            {!ok && (
              <div className="mt-4">
                <p className="text-sm text-slate-600">Sign in where you bought the domain → <b>DNS settings</b> → add this record:</p>
                <div className="mt-2 overflow-x-auto rounded-xl border border-line">
                  <table className="w-full min-w-[480px] text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-2">Type</th><th className="p-2">Name / Host</th><th className="p-2">Value / Points to</th><th className="p-2" /></tr></thead>
                    <tbody className="divide-y divide-line">
                      {d.records.map((r, i) => (
                        <tr key={i}>
                          <td className="p-2 font-mono font-bold">{r.type}</td>
                          <td className="p-2 font-mono">{r.name}</td>
                          <td className="p-2 font-mono break-all">{r.value}</td>
                          <td className="p-2"><button className="text-xs text-indigo-600" onClick={() => navigator.clipboard.writeText(r.value)}>Copy</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-slate-500">Remove any old A / CNAME record for the same name first. Changes usually work within an hour (up to 48 hours). Then click “Check status”.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
