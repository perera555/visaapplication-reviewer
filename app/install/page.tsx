import type { Metadata } from "next";
import { PageHero, TiltCard } from "@/components/ui";

export const metadata: Metadata = { title: "Install the app" };

const PLATFORMS = [
  { icon: "🪟", name: "Windows PC", steps: ["Open the site in Chrome or Microsoft Edge.", "Click the install icon ⊕ at the right of the address bar (or the “Install VisaReview” button at the top of the page).", "Click Install. The app appears in the Start menu and can be pinned to the taskbar."] },
  { icon: "🍎", name: "Mac", steps: ["Safari (macOS Sonoma+): File → Add to Dock.", "Chrome/Edge: click the install icon ⊕ in the address bar → Install.", "Open it from Launchpad or the Dock."] },
  { icon: "📱", name: "iPhone & iPad", steps: ["Open the site in Safari.", "Tap the Share button ⎋ at the bottom.", "Scroll and tap “Add to Home Screen”, then “Add”."] },
  { icon: "🤖", name: "Android", steps: ["Open the site in Chrome.", "Tap “Install now” at the top of the page, or the ⋮ menu → “Install app”.", "The app icon appears on your home screen."] },
  { icon: "🐧", name: "Linux / Chromebook", steps: ["Open in Chrome.", "Click the install icon ⊕ in the address bar.", "Launch it from your app launcher."] },
];

export default function InstallPage() {
  return (
    <>
      <PageHero icon="📲" title="Install VisaReview on any device" subtitle="VisaReview is a Progressive Web App. Install it on computers, tablets and phones straight from your browser. No app store needed." />
      <div className="container-x scene grid gap-5 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {PLATFORMS.map((p) => (
          <TiltCard key={p.name} className="card">
            <div className="pop text-5xl">{p.icon}</div>
            <h2 className="pop mt-3 text-lg font-bold">{p.name}</h2>
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-slate-700">
              {p.steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </TiltCard>
        ))}
      </div>
    </>
  );
}
