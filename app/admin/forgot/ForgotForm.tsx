"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Field, Stepper, PasswordInput } from "@/components/ui";

export function ForgotForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState<"email" | "sms" | "both">("both");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [info, setInfo] = useState("");
  const [devCode, setDevCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: unknown) {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error ?? "Failed");
    return j;
  }

  async function sendCode(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError("");
    try {
      const j = await post("/api/admin/forgot", { identifier, channel });
      setInfo(j.message);
      setDevCode(j.devCode ?? "");
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function reset(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== pw2) return setError("Passwords do not match.");
    setBusy(true);
    setError("");
    try {
      await post("/api/admin/reset", { identifier, code, password: pw });
      setStep(2);
      setTimeout(() => router.replace("/admin"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl bg-white p-7 shadow-2xl shadow-indigo-900/50 [transform:rotateX(4deg)]">
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-amber-400 to-pink-500 text-3xl shadow-xl">🔑</div>
      <h1 className="mt-4 text-center text-2xl font-black">Reset password</h1>
      <div className="mt-5"><Stepper steps={["Send code", "Verify & new password", "Done"]} current={step} /></div>

      {step === 0 && (
        <form onSubmit={sendCode} className="mt-4 space-y-4">
          <Field label="Admin email or phone"><input className="input" required value={identifier} onChange={(e) => setIdentifier(e.target.value)} /></Field>
          <div>
            <span className="label">Send the code by</span>
            <div className="grid grid-cols-3 gap-2">
              {([["email", "📧 Email"], ["sms", "📱 SMS"], ["both", "Both"]] as const).map(([v, l]) => (
                <button type="button" key={v} onClick={() => setChannel(v)} className={`rounded-xl border px-3 py-2 text-sm font-semibold ${channel === v ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-line"}`}>{l}</button>
              ))}
            </div>
          </div>
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>{busy ? "Sending…" : "Send reset code"}</button>
        </form>
      )}

      {step === 1 && (
        <form onSubmit={reset} className="mt-4 space-y-4">
          <p className="rounded-xl bg-indigo-50 p-3 text-sm text-indigo-800">{info}</p>
          {devCode && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Dev code: <b className="font-mono text-lg">{devCode}</b></p>}
          <Field label="6-digit code"><input className="input text-center font-mono text-2xl tracking-[0.5em]" inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} /></Field>
          <Field label="New password"><PasswordInput minLength={8} required autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          <Field label="Confirm new password"><PasswordInput minLength={8} required autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
          {error && <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={busy}>{busy ? "Saving…" : "Set new password"}</button>
          <button type="button" className="w-full text-sm text-indigo-600" onClick={() => sendCode()}>Resend code</button>
        </form>
      )}

      {step === 2 && <p className="mt-6 rounded-xl bg-emerald-50 p-4 text-center text-emerald-800">✓ Password updated. Signing you in…</p>}

      <div className="mt-5 text-center"><Link href="/admin/login" className="text-sm text-slate-500 hover:underline">← Back to login</Link></div>
    </div>
  );
}
