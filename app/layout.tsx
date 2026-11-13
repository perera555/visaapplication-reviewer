import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { InstallBanner } from "@/components/InstallBanner";
import { SiteHeader } from "@/components/SiteHeader";
import { Logo, NAV } from "@/components/brand";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "VisaReview – Visa document review & success rate", template: "%s · VisaReview" },
  description:
    "Review your visa documents, see what is missing and your estimated success rate for student, work, visit and every visa type — country by country. Refusal analysis, appeal letter writer and application form filling.",
  applicationName: "VisaReview",
  appleWebApp: { capable: true, title: "VisaReview", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#039855", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <InstallBanner />
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <footer className="no-print border-t border-white/10 bg-[#03140c] text-slate-300">
          <div className="container-x grid gap-8 py-10 sm:grid-cols-3">
            <div>
              <Logo light />
              <p className="mt-3 text-sm text-slate-400">
                Visa document review, success-rate estimates, refusal analysis and letters for every country and visa type.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-white">{n.label}</Link>
              ))}
              <Link href="/install" className="hover:text-white">Install app</Link>
            </div>
            <div className="text-xs text-slate-400 sm:text-right">
              <p>Success rates are estimates based on your documents and profile. Final decisions are always made by the embassy or high commission.</p>
              <Link href="/admin/login" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
                🔐 Admin login
              </Link>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
