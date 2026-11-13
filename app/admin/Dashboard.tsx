"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { COUNTRIES, flag, getCountry } from "@/lib/countries";
import { VISA_TYPES, visaTypeName } from "@/lib/requirements";
import type { Application, ApplicationStatus, CustomRequirement, SupportDoc } from "@/lib/types";
import { Field } from "@/components/ui";
import { Registrations } from "./Registrations";

type Me = { id: string; name: string; email: string; phone: string };
type Config = { ai: boolean; email: boolean; sms: boolean; storage: "postgres" | "redis" | "file" | "ephemeral" };
const TABS = [
  ["regs", "🪪 Registrations"],
  ["apps", "📥 Applications"],
  ["reqs", "📋 Required documents"],
  ["support", "📚 Support documents"],
  ["admins", "👥 Admin users"],
  ["account", "⚙️ Account & settings"],
] as const;
type Tab = (typeof TABS)[number][0];

const STATUS: Record<ApplicationStatus, string> = {
  new: "bg-indigo-100 text-indigo-800",
  reviewing: "bg-amber-100 text-amber-800",
  "docs-requested": "bg-orange-100 text-orange-800",
  submitted: "bg-cyan-100 text-cyan-800",
  approved: "bg-emerald-100 text-emerald-800",
  refused: "bg-rose-100 text-rose-800",
};

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((j as { error?: string }).error ?? `Error ${r.status}`);
  return j as T;
}

export function Dashboard() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [cfg, setCfg] = useState<Config | null>(null);
  const [tab, setTab] = useState<Tab>("regs");

  useEffect(() => {
    fetch("/api/admin/me").then(async (r) => {
      const j = await r.json();
      if (!j.admin) router.replace("/admin/login");
      else setMe(j.admin);
    });
    fetch("/api/config").then((r) => r.json()).then(setCfg).catch(() => {});
  }, [router]);

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.replace("/admin/login");
  }

  if (!me) return <div className="container-x py-20 text-center text-slate-500">Loading dashboard…</div>;

  return (
    <div className="container-x py-8">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h1 className="h-title">Admin dashboard</h1>
          <p className="text-sm text-slate-500">Signed in as {me.name} ({me.email})</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Link href="/guide#admin" className="btn-ghost">📖 Admin guide</Link>
          <button className="btn-ghost" onClick={logout}>Log out</button>
        </div>
      </div>

      {cfg && cfg.storage !== "redis" && cfg.storage !== "postgres" && (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          {cfg.storage === "ephemeral"
            ? "⚠️ Storage is temporary on this server. Data is lost when the server restarts. Connect PostgreSQL (Vercel → Storage → Neon Postgres) to keep registrations, documents, applications and admins permanently."
            : "ℹ️ Local development storage (.data/db.json). Set DATABASE_URL to use PostgreSQL."}
        </div>
      )}

      <div className="mt-6 flex gap-2 overflow-x-auto">
        {TABS.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${tab === id ? "bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/30" : "border border-line bg-white text-slate-600 hover:bg-slate-50"}`}>{label}</button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "regs" && <Registrations />}
        {tab === "apps" && <Applications />}
        {tab === "reqs" && <Requirements />}
        {tab === "support" && <SupportDocs />}
        {tab === "admins" && <AdminUsers me={me} />}
        {tab === "account" &&<Account me={me} setMe={setMe} cfg={cfg} />}
      </div>
    </div>
  );
}

function Applications() {
  const [apps, setApps] = useState<Application[]>([]);
  const [sel, setSel] = useState<Application | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(() => api<Application[]>("/api/applications").then(setApps).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
  }, [load]);

  async function update(patch: Partial<Application>) {
    if (!sel) return;
    const a = await api<Application>(`/api/applications/${sel.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
    setSel(a);
    setApps((x) => x.map((y) => (y.id === a.id ? a : y)));
  }
  async function remove() {
    if (!sel || !confirm(`Delete application of ${sel.profile.fullName}? This cannot be undone.`)) return;
    await api(`/api/applications/${sel.id}`, { method: "DELETE" });
    setSel(null);
    load();
  }

  const shown = apps.filter((a) => !q || `${a.profile.fullName} ${a.profile.email} ${a.profile.phone} ${getCountry(a.countryCode)?.name}`.toLowerCase().includes(q.toLowerCase()));
  const stats = [
    ["Total", apps.length],
    ["New", apps.filter((a) => a.status === "new").length],
    ["Avg. success", apps.length ? `${Math.round(apps.reduce((s, a) => s + a.score, 0) / apps.length)}%` : "-"],
    ["Approved", apps.filter((a) => a.status === "approved").length],
  ];

  return (
    <div className="space-y-6">
      <div className="scene grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map(([l, v], i) => (
          <div key={String(l)} className="card [transform:rotateX(8deg)]" style={{ transitionDelay: `${i * 40}ms` }}>
            <div className="label">{l}</div>
            <div className="text-3xl font-black text-indigo-700">{v}</div>
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="card lg:col-span-2">
          <input className="input" placeholder="Search name, email, country…" value={q} onChange={(e) => setQ(e.target.value)} />
          <ul className="mt-3 max-h-[640px] divide-y divide-line overflow-y-auto">
            {shown.map((a) => (
              <li key={a.id}>
                <button onClick={() => setSel(a)} className={`flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-slate-50 ${sel?.id === a.id ? "bg-indigo-50" : ""}`}>
                  <span className="text-2xl">{flag(a.countryCode)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold">{a.profile.fullName}</span>
                    <span className="block text-xs text-slate-500">{visaTypeName(a.visaType)} · {new Date(a.createdAt).toLocaleDateString()}</span>
                  </span>
                  <span className={`text-sm font-black ${a.score >= 80 ? "text-emerald-600" : a.score >= 60 ? "text-amber-600" : "text-rose-600"}`}>{a.score}%</span>
                  <span className={`chip ${STATUS[a.status]}`}>{a.status}</span>
                </button>
              </li>
            ))}
            {shown.length === 0 && <li className="py-8 text-center text-sm text-slate-500">No applications yet. Customers send them from the Document Review page.</li>}
          </ul>
        </div>
        <div className="lg:col-span-3">
          {sel ? (
            <div className="card space-y-5">
              <div className="flex flex-wrap items-start gap-3">
                <div className="flex-1">
                  <h2 className="text-xl font-bold">{sel.profile.fullName}</h2>
                  <p className="text-sm text-slate-500">{flag(sel.countryCode)} {getCountry(sel.countryCode)?.name} · {visaTypeName(sel.visaType)}</p>
                  <p className="mt-1 text-sm">📧 {sel.profile.email || "-"} · 📱 {sel.profile.phone || "-"}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black text-indigo-700">{sel.score}%</div>
                  <div className="text-xs text-slate-500">{sel.statusLabel}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(STATUS) as ApplicationStatus[]).map((s) => (
                  <button key={s} onClick={() => update({ status: s })} className={`chip cursor-pointer ${sel.status === s ? STATUS[s] + " ring-2 ring-offset-1 ring-indigo-400" : "bg-slate-100 text-slate-600"}`}>{s}</button>
                ))}
              </div>
              {sel.message && <p className="rounded-xl bg-slate-50 p-3 text-sm"><b>Customer message:</b> {sel.message}</p>}
              <div>
                <h3 className="label">Document checklist</h3>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {sel.docs.map((d) => (
                    <li key={d.reqId} className={`rounded-lg px-2 py-1.5 text-sm ${d.provided ? "bg-emerald-50" : d.mandatory ? "bg-rose-50" : "bg-slate-50"}`}>
                      {d.provided ? "✅" : d.mandatory ? "❌" : "⚪"} {d.name}
                      {d.fileName && <span className="block truncate text-xs text-slate-500">{d.fileName}</span>}
                    </li>
                  ))}
                </ul>
                {sel.extraDocs.length > 0 && <p className="mt-2 text-sm"><b>Extra documents:</b> {sel.extraDocs.map((e) => e.name).join(", ")}</p>}
              </div>
              <div>
                <h3 className="label">Uploaded files ({sel.files.length})</h3>
                <ul className="flex flex-wrap gap-2">
                  {sel.files.map((f) => f.stored ? (
                    <a key={f.id} className="chip bg-indigo-50 text-indigo-700" href={`/api/applications/${sel.id}/files/${f.id}`} target="_blank" rel="noreferrer">⬇ {f.name}</a>
                  ) : (
                    <span key={f.id} className="chip bg-slate-100 text-slate-500" title="Too large to store, so ask the customer to email it">{f.name} (not stored)</span>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="label">Profile</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
                  {Object.entries(sel.profile).filter(([k]) => !["fullName", "email", "phone"].includes(k)).map(([k, v]) => (
                    <div key={k}><dt className="text-xs text-slate-400">{k}</dt><dd>{typeof v === "boolean" ? (v ? "Yes" : "No") : String(v || "-")}</dd></div>
                  ))}
                </dl>
              </div>
              <Field label="Internal notes">
                <textarea className="input min-h-24" defaultValue={sel.adminNotes} key={sel.id} onBlur={(e) => e.target.value !== sel.adminNotes && update({ adminNotes: e.target.value })} />
              </Field>
              <div className="flex flex-wrap gap-2">
                {sel.profile.email && <a className="btn-primary" href={`mailto:${sel.profile.email}?subject=${encodeURIComponent("Your visa application")}`}>📧 Email customer</a>}
                {sel.profile.phone && <a className="btn-ghost" href={`https://wa.me/${sel.profile.phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer">💬 WhatsApp</a>}
                <button className="btn-danger ml-auto" onClick={remove}>Delete</button>
              </div>
            </div>
          ) : (
            <div className="card grid h-full min-h-60 place-items-center text-center text-slate-500">Select an application to review it.</div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScopeSelects({ country, setCountry, type, setType }: { country: string; setCountry: (v: string) => void; type: string; setType: (v: string) => void }) {
  return (
    <>
      <Field label="Country">
        <select className="input" value={country} onChange={(e) => setCountry(e.target.value)}>
          <option value="*">All countries</option>
          {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Visa type">
        <select className="input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="*">All visa types</option>
          {VISA_TYPES.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
      </Field>
    </>
  );
}

function Requirements() {
  const [items, setItems] = useState<CustomRequirement[]>([]);
  const [country, setCountry] = useState("*");
  const [type, setType] = useState("*");
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [kw, setKw] = useState("");
  const [mandatory, setMandatory] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(() => api<CustomRequirement[]>("/api/requirements?all=1").then(setItems).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/requirements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, description: desc, mandatory, countryCode: country, visaType: type, keywords: kw.split(",") }) });
      setName("");
      setDesc("");
      setKw("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  async function del(id: string) {
    await api(`/api/requirements?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={add} className="card space-y-4 lg:col-span-2">
        <h2 className="font-bold">Add a required document</h2>
        <p className="text-sm text-slate-500">This is added to the customer checklist for the country and visa type you choose, and it counts toward their success rate.</p>
        <div className="grid gap-3 sm:grid-cols-2"><ScopeSelects country={country} setCountry={setCountry} type={type} setType={setType} /></div>
        <Field label="Document name"><input className="input" required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grama Niladhari certificate" /></Field>
        <Field label="Description / instructions"><textarea className="input min-h-20" value={desc} onChange={(e) => setDesc(e.target.value)} /></Field>
        <Field label="Recognition keywords" hint="Comma-separated words found in the file name or PDF, used to auto-match uploads"><input className="input" value={kw} onChange={(e) => setKw(e.target.value)} placeholder="grama niladhari, gn certificate" /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-indigo-600" checked={mandatory} onChange={(e) => setMandatory(e.target.checked)} /> Required (otherwise recommended)</label>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="btn-primary w-full">+ Add document</button>
      </form>
      <div className="card lg:col-span-3">
        <h2 className="font-bold">Your added documents ({items.length})</h2>
        <ul className="mt-3 divide-y divide-line">
          {items.map((r) => (
            <li key={r.id} className="flex items-start gap-3 py-3">
              <span>{r.mandatory ? "🔴" : "⚪"}</span>
              <div className="flex-1">
                <div className="font-semibold">{r.name}</div>
                <div className="text-xs text-slate-500">{r.countryCode === "*" ? "All countries" : getCountry(r.countryCode)?.name} · {r.visaType === "*" ? "All visa types" : visaTypeName(r.visaType)}</div>
                {r.description && <p className="text-sm text-slate-600">{r.description}</p>}
              </div>
              <button className="text-sm text-rose-600" onClick={() => del(r.id)}>Delete</button>
            </li>
          ))}
          {items.length === 0 && <li className="py-8 text-center text-sm text-slate-500">No custom documents yet.</li>}
        </ul>
      </div>
    </div>
  );
}

function SupportDocs() {
  const [items, setItems] = useState<SupportDoc[]>([]);
  const [country, setCountry] = useState("*");
  const [type, setType] = useState("*");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<SupportDoc[]>("/api/support-docs?all=1").then(setItems).catch(() => {}), []);
  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("countryCode", country);
    fd.set("visaType", type);
    try {
      await api("/api/support-docs", { method: "POST", body: fd });
      form.reset();
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  async function del(id: string) {
    if (!confirm("Delete this support document?")) return;
    await api(`/api/support-docs?id=${id}`, { method: "DELETE" });
    load();
  }

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={add} className="card space-y-4 lg:col-span-2">
        <h2 className="font-bold">Upload a support document</h2>
        <p className="text-sm text-slate-500">Templates, sample letters, checklists or guides. Customers see them on the Document Review and country pages.</p>
        <div className="grid gap-3 sm:grid-cols-2"><ScopeSelects country={country} setCountry={setCountry} type={type} setType={setType} /></div>
        <Field label="Title"><input name="title" className="input" required placeholder="e.g. Sample sponsor letter" /></Field>
        <Field label="Description"><textarea name="description" className="input min-h-20" /></Field>
        <Field label="File (max 900 KB)"><input name="file" type="file" className="input" /></Field>
        <Field label="…or a link" hint="Google Drive, Dropbox or an official website"><input name="url" type="url" className="input" placeholder="https://" /></Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Uploading…" : "+ Add support document"}</button>
      </form>
      <div className="card lg:col-span-3">
        <h2 className="font-bold">Support documents ({items.length})</h2>
        <ul className="mt-3 divide-y divide-line">
          {items.map((d) => (
            <li key={d.id} className="flex items-start gap-3 py-3">
              <span className="text-xl">📄</span>
              <div className="flex-1">
                <div className="font-semibold">{d.title}</div>
                <div className="text-xs text-slate-500">{d.countryCode === "*" ? "All countries" : getCountry(d.countryCode)?.name} · {d.visaType === "*" ? "All visa types" : visaTypeName(d.visaType)}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {d.fileName && <a className="chip bg-indigo-50 text-indigo-700" href={`/api/support-docs/${d.id}`} target="_blank" rel="noreferrer">{d.fileName}</a>}
                  {d.url && <a className="chip bg-cyan-50 text-cyan-700" href={d.url} target="_blank" rel="noreferrer">link</a>}
                </div>
              </div>
              <button className="text-sm text-rose-600" onClick={() => del(d.id)}>Delete</button>
            </li>
          ))}
          {items.length === 0 && <li className="py-8 text-center text-sm text-slate-500">No support documents yet.</li>}
        </ul>
      </div>
    </div>
  );
}

function AdminUsers({ me }: { me: Me }) {
  const [list, setList] = useState<(Me & { createdAt: string })[]>([]);
  const [created, setCreated] = useState<(Me & { password: string }) | null>(null);
  const [copied, setCopied] = useState(false);
  const [f, setF] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api<(Me & { createdAt: string })[]>("/api/admin/users").then(setList).catch((e) => setError(e.message)), []);
  useEffect(() => {
    load();
  }, [load]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    if (f.password !== f.confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const a = await api<Me>("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      setCreated({ ...a, password: f.password });
      setMsg("");
      setF({ name: "", email: "", phone: "", password: "", confirm: "" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }
  async function resetPw(a: Me) {
    const pw = prompt(`New password for ${a.name} (min 8 characters). Tell them to change it under Account & settings.`);
    if (!pw) return;
    try {
      await api(`/api/admin/users/${a.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: pw }) });
      setMsg(`Password updated for ${a.name}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  async function remove(a: Me) {
    if (!confirm(`Remove admin ${a.name} (${a.email})?`)) return;
    try {
      await api(`/api/admin/users?id=${a.id}`, { method: "DELETE" });
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <form onSubmit={create} className="card space-y-4 lg:col-span-2">
        <h2 className="font-bold">➕ Create admin user</h2>
        <p className="text-sm text-slate-500">New admins can sign in, manage registrations and applications, and reset their password by email or SMS code.</p>
        <Field label="Full name"><input className="input" required value={f.name} onChange={set("name")} /></Field>
        <Field label="Email (login)"><input className="input" type="email" required value={f.email} onChange={set("email")} /></Field>
        <Field label="Mobile (for SMS reset codes)" hint="International format, e.g. +94771234567"><input className="input" type="tel" value={f.phone} onChange={set("phone")} /></Field>
        <Field label="Password (min 8 characters)"><input className="input" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={set("password")} /></Field>
        <Field label="Confirm password"><input className="input" type="password" required minLength={8} autoComplete="new-password" value={f.confirm} onChange={set("confirm")} /></Field>
        {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? "Creating…" : "Create admin"}</button>
      </form>
      <div className="space-y-6 lg:col-span-3">
      {created && (
        <div className="scene">
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-cyan-600 p-5 text-white shadow-2xl [transform:rotateX(5deg)]">
            <div className="flex items-start gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 text-2xl font-black">{created.name.slice(0, 1).toUpperCase()}</span>
              <div className="flex-1">
                <div className="text-xs font-bold uppercase tracking-widest text-white/80">✅ New admin account created</div>
                <div className="text-xl font-black">{created.name}</div>
              </div>
              <button className="text-white/80 hover:text-white" onClick={() => setCreated(null)} aria-label="Close">✕</button>
            </div>
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              <div className="rounded-xl bg-white/10 p-2"><dt className="text-xs text-white/70">Login page</dt><dd className="font-mono">{typeof window !== "undefined" ? window.location.origin : ""}/admin/login</dd></div>
              <div className="rounded-xl bg-white/10 p-2"><dt className="text-xs text-white/70">Email (username)</dt><dd className="font-mono">{created.email}</dd></div>
              <div className="rounded-xl bg-white/10 p-2"><dt className="text-xs text-white/70">Mobile (SMS reset codes)</dt><dd className="font-mono">{created.phone || "not set"}</dd></div>
              <div className="rounded-xl bg-white/10 p-2"><dt className="text-xs text-white/70">Password (shown only now)</dt><dd className="font-mono">{created.password}</dd></div>
            </dl>
            <div className="mt-4 flex flex-wrap gap-2">
              <button className="rounded-xl bg-white px-3 py-2 text-sm font-bold text-indigo-700" onClick={() => { navigator.clipboard.writeText(`VisaReview admin account\nLogin: ${window.location.origin}/admin/login\nEmail: ${created.email}\nPassword: ${created.password}\nPlease change your password after first sign-in (Account & settings).`); setCopied(true); }}>{copied ? "✓ Copied" : "📋 Copy login details"}</button>
              <a className="rounded-xl bg-white/15 px-3 py-2 text-sm font-semibold" href={`mailto:${created.email}?subject=${encodeURIComponent("Your VisaReview admin account")}&body=${encodeURIComponent(`Login: ${typeof window !== "undefined" ? window.location.origin : ""}/admin/login\nEmail: ${created.email}\nPlease change your password after first sign-in.`)}`}>📧 Email them</a>
            </div>
            <p className="mt-3 text-xs text-white/80">Share the password privately. They should change it under Account &amp; settings after signing in.</p>
          </div>
        </div>
      )}
      <div className="card">
        <h2 className="font-bold">Admin users ({list.length})</h2>
        <ul className="mt-3 divide-y divide-line">
          {list.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 font-bold text-white">{a.name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{a.name} {a.id === me.id && <span className="chip bg-indigo-50 text-indigo-700">you</span>}</div>
                <div className="truncate text-xs text-slate-500">{a.email} · {a.phone || "no phone"} · added {new Date(a.createdAt).toLocaleDateString()}</div>
              </div>
              {a.id !== me.id && <button className="text-sm text-indigo-600" onClick={() => resetPw(a)}>Reset password</button>}
              {a.id !== me.id && <button className="text-sm text-rose-600" onClick={() => remove(a)}>Remove</button>}
            </li>
          ))}
        </ul>
        {msg && <p className="mt-2 text-sm text-emerald-700">{msg}</p>}
      </div>
      </div>
    </div>
  );
}

function Account({ me, setMe, cfg }: { me: Me; setMe: (m: Me) => void; cfg: Config | null }) {
  const [f, setF] = useState({ name: me.name, email: me.email, phone: me.phone, currentPassword: "", newPassword: "" });
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setError("");
    try {
      const m = await api<Me>("/api/admin/account", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(f) });
      setMe(m);
      setF((x) => ({ ...x, currentPassword: "", newPassword: "" }));
      setMsg("Saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    }
  }
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));
  const ok = (b?: boolean) => (b ? <span className="chip bg-emerald-100 text-emerald-800">Connected</span> : <span className="chip bg-slate-100 text-slate-600">Not configured</span>);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form onSubmit={save} className="card space-y-4">
        <h2 className="font-bold">My account</h2>
        <Field label="Name"><input className="input" value={f.name} onChange={set("name")} /></Field>
        <Field label="Email (password reset codes)"><input className="input" type="email" value={f.email} onChange={set("email")} /></Field>
        <Field label="Mobile (SMS reset codes)" hint="International format, e.g. +94771234567"><input className="input" type="tel" value={f.phone} onChange={set("phone")} /></Field>
        <h3 className="label pt-2">Change password</h3>
        <Field label="Current password"><input className="input" type="password" autoComplete="current-password" value={f.currentPassword} onChange={set("currentPassword")} /></Field>
        <Field label="New password (min 8)"><input className="input" type="password" autoComplete="new-password" value={f.newPassword} onChange={set("newPassword")} /></Field>
        {error && <p className="text-sm text-rose-600">{error}</p>}
        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
        <button className="btn-primary">Save changes</button>
      </form>
      <div className="card space-y-3">
        <h2 className="font-bold">Integrations</h2>
        <div className="flex items-center justify-between text-sm"><span>Database ({cfg?.storage === "postgres" ? "PostgreSQL" : cfg?.storage === "redis" ? "Redis" : "PostgreSQL"})</span>{ok(cfg?.storage === "postgres" || cfg?.storage === "redis")}</div>
        <div className="flex items-center justify-between text-sm"><span>Email codes (Resend)</span>{ok(cfg?.email)}</div>
        <div className="flex items-center justify-between text-sm"><span>SMS codes (Twilio)</span>{ok(cfg?.sms)}</div>
        <div className="flex items-center justify-between text-sm"><span>AI analysis (Claude)</span>{ok(cfg?.ai)}</div>
        <p className="pt-2 text-xs text-slate-500">Set these in Vercel → Project → Settings → Environment Variables. The full list is in the README and the admin guide.</p>
      </div>
    </div>
  );
}
