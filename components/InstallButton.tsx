"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Always-visible install button: opens the native install prompt when available, otherwise the install guide. */
export function InstallButton({ dark }: { dark?: boolean }) {
  const router = useRouter();
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    setInstalled(window.matchMedia("(display-mode: standalone)").matches);
  }, []);

  if (installed) return null;

  async function click() {
    const w = window as Window & { __vrPrompt?: BIPEvent };
    if (w.__vrPrompt) {
      await w.__vrPrompt.prompt();
      const { outcome } = await w.__vrPrompt.userChoice;
      w.__vrPrompt = undefined;
      if (outcome === "accepted") setInstalled(true);
    } else router.push("/install");
  }

  return (
    <button onClick={click} className={`btn px-3 py-2 ${dark ? "border border-white/25 bg-white/10 text-white hover:bg-white/20" : "border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100"}`}>
      📲 <span>Install app</span>
    </button>
  );
}
