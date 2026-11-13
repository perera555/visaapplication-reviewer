"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui";

/** Admin sign-in. The first-owner setup form is only reachable at /admin/setup (never from the footer link). */
export function LoginForm({ setup = false }: { setup?: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"loading" | "login" | "setup" | "closed">("loading");
  const [f, setF] = useState({ identifier: "", password: "", name: "", email: "", phone: "", setupKey: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [keyRequired, setKeyRequired] = useState(false);

  useEffect(() => {
    fetch("/api/admin/me").then(async (r) => {
      const j = await r.json();
      if (j.admin) router.replace("/admin");
      else {
        setMode(setup ? (j.needsSetup ? "setup" : "closed") : "login");
        setKeyRequired(Boolean(j.setupKeyRequired));
      }
    }).catch(() => setMode("login"));
  }, [router, setup]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const url = mode === "setup" ? "/api/admin/setup" : "/api/admin/login";
    const body = mode === "setup" ? { name: f.name, email: f.email, phone: f.phone, password: f.password, setupKey: f.setupKey } : { identifier: f.identifier, password: f.password };
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((x) => ({ ...x, [k]: e.target.value }));

  return (
    <form onSubmit={submit} className="rounded-3xl border border-white/20 bg-white p-7 shadow-2xl shadow-indigo-900/50 [transform:rotateX(4deg)]">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-3xl shadow-xl shadow-indigo-500/40 [transform:translateZ(30px)]">🔐</div>
      <h1 className="mt-4 text-center text-2xl font-black">{mode === "setup" || mode === "closed" ? "Owner setup" : "Admin sign in"}</h1>
      <p className="mt-1 text-center text-sm text-slate-500">{mode === "setup" ? "First-time setup for the system owner. Other admins are added by an admin from the dashboard." : "Agency team access only"}</p>

      {mode === "closed" ? (
        <div className="mt-6 space-y-3 text-center">
          <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">Setup is closed. Admin accounts are created by an existing admin in the dashboard.</p>
          <Link href="/admin/login" className="btn-primary w-full">Go to sign in</Link>
        </div>
      ) : mode === "loading" ? <p className="mt-6 text-center text-sm text-slate-500">Loading…</p> : (
        <div className="mt-6 space-y-4">
          {mode === "setup" ? (
            <>
              <Field label="Name"><input className="input" value={f.name} onChange={set("name")} /></Field>
              <Field label="Email"><input className="input" type="email" required value={f.email} onChange={set("email")} /></Field>
              <Field label="Mobile (for reset codes)" hint="International format, e.g. +94771234567"><input className="input" type="tel" value={f.phone} onChange={set("phone")} /></Field>
              {keyRequired && <Field label="Owner setup key" hint="Only the system owner has this key."><input className="input" type="password" required autoComplete="off" value={f.setupKey} onChange={set("setupKey")} /></Field>}
            </>
          ) : (
            <Field label="Email or phone"><input className="input" required autoComplete="username" value={f.identifier} onChange={set("identifier")} /></Field>
          )}
          <Field label="Password"><input className="input" type="password" required minLength={mode === "setup" ? 8 : 1} autoComplete={mode === "setup" ? "new-password" : "current-password"} value={f.password} onChange={set("password")} /></Field>
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>{busy ? "Please wait…" : mode === "setup" ? "Create account" : "Sign in"}</button>
          {mode === "login" && (
            <div className="text-center">
              <Link href="/admin/forgot" className="text-sm font-semibold text-indigo-600 hover:underline">Forgot password?</Link>
            </div>
          )}
        </div>
      )}
    </form>
  );
}
