"use client";

import { useEffect, useState } from "react";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

type Platform = "ios" | "android" | "mac-safari" | "desktop" | "other";

function detect(): Platform {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (ua.includes("Macintosh") && navigator.maxTouchPoints > 1);
  if (iOS) return "ios";
  if (/Android/i.test(ua)) return "android";
  if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return "mac-safari";
  if (/Windows|Macintosh|Linux|CrOS/.test(ua)) return "desktop";
  return "other";
}

const HOW: Record<Platform, string> = {
  ios: "On iPhone/iPad: tap Share ⎋ then “Add to Home Screen” ➕",
  android: "On Android: tap ⋮ menu → “Install app” / “Add to Home screen”",
  "mac-safari": "On Mac Safari: File → “Add to Dock”",
  desktop: "On Windows / Mac / Linux (Chrome or Edge): click the install ⊕ icon in the address bar",
  other: "Use your browser menu → “Install app” or “Add to Home screen”",
};

export function InstallBanner() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [platform, setPlatform] = useState<Platform | null>(null);
  const [hidden, setHidden] = useState(true);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone;
    let dismissed = false;
    try {
      dismissed = sessionStorage.getItem("install-dismissed") === "1";
    } catch {}
    setPlatform(detect());
    setHidden(Boolean(standalone) || dismissed);

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      (window as Window & { __vrPrompt?: BIPEvent }).__vrPrompt = e as BIPEvent;
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden || !platform) return null;

  async function install() {
    if (evt) {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      if (outcome === "accepted") setHidden(true);
      setEvt(null);
    } else setShowHelp((s) => !s);
  }

  function dismiss() {
    setHidden(true);
    try {
      sessionStorage.setItem("install-dismissed", "1");
    } catch {}
  }

  return (
    <div className="no-print relative z-50 bg-gradient-to-r from-indigo-600 via-violet-600 to-cyan-500 text-white">
      <div className="container-x flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
        <span className="text-lg">📲</span>
        <span className="font-semibold">Install VisaReview app</span>
        <span className="hidden text-white/85 sm:inline">— works on Windows, Mac, iPhone, iPad & Android</span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={install} className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-indigo-700 shadow hover:bg-indigo-50">
            {evt ? "Install now" : "How to install"}
          </button>
          <button onClick={dismiss} aria-label="Dismiss" className="rounded-lg px-2 py-1 text-white/80 hover:bg-white/15">✕</button>
        </div>
        {showHelp && <p className="w-full pb-1 text-xs text-white/95">{HOW[platform]}</p>}
      </div>
    </div>
  );
}
