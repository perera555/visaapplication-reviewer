"use client";

const TOOLS: { icon: string; title: string; text: string; href: string; color: string }[] = [
  { icon: "🪪", title: "Register a customer", text: "Create a registration with photo, auto registration number and documents.", href: "/register", color: "from-indigo-500 to-violet-500" },
  { icon: "📂", title: "Document review & success rate", text: "Checklist, upload documents, status and success rate for any country and visa.", href: "/check?new=1", color: "from-emerald-500 to-cyan-500" },
  { icon: "🛡️", title: "Original or fake check", text: "Check documents for signs of editing; mark originals manually.", href: "/verify", color: "from-teal-500 to-emerald-600" },
  { icon: "🔍", title: "Support document & CV review", text: "Find errors in letters and statements, with corrected and rearranged versions.", href: "/review", color: "from-amber-500 to-orange-500" },
  { icon: "🎓", title: "SOP / Genuine Student writer", text: "Genuine SOP from uploaded documents or typed details, in each country's format.", href: "/sop", color: "from-violet-500 to-fuchsia-500" },
  { icon: "✍️", title: "Letter writer", text: "Reconsideration, appeal, re-application, resubmission, cover, sponsor and employer letters.", href: "/letter?new=1", color: "from-pink-500 to-rose-500" },
  { icon: "🚫", title: "Refusal review", text: "Analyse a refusal letter: reasons, documents to re-apply, appeal options.", href: "/refusal", color: "from-rose-500 to-red-500" },
  { icon: "📝", title: "Visa application form", text: "Country-specific form that fills from uploaded documents; official PDF filling.", href: "/form", color: "from-sky-500 to-indigo-500" },
  { icon: "🌍", title: "Country requirements", text: "Documents, process, online/offline mode and refusal options for 195 countries.", href: "/countries", color: "from-lime-500 to-emerald-500" },
  { icon: "📂", title: "Saved work", text: "Open, download, duplicate or delete saved applications, letters and forms.", href: "/saved", color: "from-slate-500 to-slate-700" },
  { icon: "📖", title: "User & admin guide", text: "Step-by-step instructions for customers and staff.", href: "/guide#admin", color: "from-yellow-500 to-amber-500" },
  { icon: "📲", title: "Install the app", text: "Install on Windows, Mac, iPhone, iPad and Android.", href: "/install", color: "from-cyan-500 to-blue-500" },
];

/** Every customer-facing tool, available from the admin panel (opens in a new tab). */
export function AdminTools() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">Everything on the website is available here for the team. Each tool opens in a new tab, so the dashboard stays open. Use <b>🪪 Registrations</b> to keep a customer's documents and decisions on file.</p>
      <div className="scene grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <a key={t.href} href={t.href} target="_blank" rel="noreferrer" className="card group transition duration-300 hover:-translate-y-1 hover:shadow-2xl hover:[transform:translateY(-4px)_rotateX(6deg)]">
            <div className="flex items-start gap-3">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${t.color} text-2xl shadow-lg`}>{t.icon}</span>
              <div className="min-w-0">
                <div className="font-bold">{t.title} <span className="text-slate-400 transition group-hover:text-indigo-600">↗</span></div>
                <p className="mt-0.5 text-sm text-slate-600">{t.text}</p>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
