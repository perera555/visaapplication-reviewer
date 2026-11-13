import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/ui";
import { DocTally } from "@/components/DocTally";

export const metadata: Metadata = { title: "User & admin guide" };

type Step = { title: string; body: string; link?: [string, string] };

const CUSTOMER: { section: string; icon: string; steps: Step[] }[] = [
  {
    section: "Check your documents & success rate",
    icon: "📂",
    steps: [
      { title: "Open Document Review", body: "Click “Check my visa” at the top of any page.", link: ["/check", "Open Document Review"] },
      { title: "Choose country & visa type", body: "Select the destination country, your nationality and the visa type (visit, student, work, family and more). The right side shows how to apply for that country." },
      { title: "Fill in your profile", body: "Enter your name, contact details, passport expiry, travel dates, job, income, savings, travel history and any previous refusals. Be honest, because this decides your success rate." },
      { title: "Upload your documents one by one", body: "In the checklist, click 📎 Upload next to each document and choose the file (PDF, JPG, PNG). Red rows say “This document is required” until you upload them." },
      { title: "Tick or add extra documents", body: "Tick “I have it” if you will send a document later. Use “Add other supporting documents” for anything not on the list. (Optional: “upload many at once” auto-matches several files.)" },
      { title: "See your status & success rate", body: "Step 4 shows your success rate (0–100%), your status (Ready / Almost / Not ready / High risk), the missing required documents, what helps or hurts your chances, and your next steps." },
      { title: "Send it to our team", body: "Type a message and click “Send application”. Our team receives your checklist, score and files and will contact you. You can also print or save the page as a PDF." },
    ],
  },
  {
    section: "My visa was refused",
    icon: "🚫",
    steps: [
      { title: "Open Refusal Review", body: "Choose the country that refused you and the visa type.", link: ["/refusal", "Open Refusal Review"] },
      { title: "Add the refusal letter", body: "Upload the refusal letter PDF or paste its full text, including the officer's reasons." },
      { title: "Read the reasons found", body: "Each refusal reason is explained in plain language, quoted from your letter, with the documents and actions that fix it." },
      { title: "Follow the re-apply plan", body: "Follow the step-by-step re-application plan and tick off the document checklist as you collect each item." },
      { title: "Write your letter", body: "Click “Reconsideration request”, “Appeal letter” or “Re-application cover letter”. The Letter Writer opens with your reasons already filled in." },
    ],
  },
  {
    section: "Write a letter to the embassy / high commission",
    icon: "✍️",
    steps: [
      { title: "Choose the letter type", body: "Reconsideration, appeal, re-application cover, explanation, cover, sponsor, invitation or employer letter.", link: ["/letter", "Open Letter Writer"] },
      { title: "Fill in the details", body: "Your details, the embassy, reference number and refusal date, then answer each refusal reason with your evidence." },
      { title: "Check the preview", body: "The letter updates live. You can type directly into it. Replace every [bracketed] placeholder." },
      { title: "Download", body: "Download as PDF, copy it, or save it as .txt. Sign the printed letter before you submit it." },
    ],
  },
  {
    section: "Fill the visa application form",
    icon: "📝",
    steps: [
      { title: "Guided form", body: "Fill each section (personal, passport, contact, travel, employment, family, history). Answers are saved on your device automatically.", link: ["/form", "Open Application Form"] },
      { title: "Download the form", body: "At the last section, click “Download completed form (PDF)”." },
      { title: "Official PDF form", body: "Switch to “Fill an official PDF form” and upload the embassy's fillable PDF. Matching fields are filled from your guided answers. Check every field, then download the filled PDF." },
    ],
  },
  {
    section: "Install the app",
    icon: "📲",
    steps: [
      { title: "Use the top banner", body: "Click “Install now” or “How to install” in the purple banner at the top of the page.", link: ["/install", "Install instructions"] },
      { title: "Any device", body: "Works on Windows, Mac, Linux, iPhone, iPad and Android, with no app store needed." },
    ],
  },
];

const ADMIN: { section: string; icon: string; steps: Step[] }[] = [
  {
    section: "Customer registrations",
    icon: "🪪",
    steps: [
      { title: "Customers register", body: "Customers open “Register”, upload documents one by one (details fill in automatically), add a photo and get a registration number like VR-2026-000123.", link: ["/register", "Registration page"] },
      { title: "Is this person registered?", body: "Dashboard → “🪪 Registrations”. Type a name, registration no., passport, national ID, email or phone. It says ✅ Registered or ❌ Not registered straight away." },
      { title: "Open the file", body: "Click a customer to see their photo, details, status and documents by category. Download, view, add or delete documents, and edit details." },
      { title: "Review documents", body: "Click “Review all documents” to check every PDF for errors (wrong name or passport number, blanks, wording)." },
      { title: "Update status & notes", body: "Set the status (Registered → In process → Visa submitted → Approved / Refused) and add internal notes." },
    ],
  },
  {
    section: "First-time setup",
    icon: "🛠️",
    steps: [
      { title: "Owner creates the first admin", body: "The system owner opens /admin/setup once and enters the owner setup key (ADMIN_SETUP_KEY on the server), name, email, mobile and password. Setup closes automatically after the first admin exists, and visitors can never create admins." },
      { title: "Admins add more admins", body: "Signed-in admins open “👥 Admin users” in the dashboard to add as many admins as needed. A details card shows the new login, which you can copy or email. Admins can also reset another admin's password there." },
      { title: "Sign in", body: "Everyone uses “🔐 Admin login” at the bottom of the home page. It only shows the sign-in form.", link: ["/admin/login", "Admin login"] },
      { title: "Connect the PostgreSQL database", body: "On Vercel: Project → Storage → create “Neon Postgres” and connect it (sets DATABASE_URL). Registrations, documents, applications and admins are then stored permanently." },
      { title: "Connect email & SMS for password reset", body: "Add RESEND_API_KEY + EMAIL_FROM (email) and TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM (SMS) as environment variables, then redeploy. Check the status under Account & settings." },
      { title: "Optional: AI analysis", body: "Add ANTHROPIC_API_KEY to turn on AI refusal analysis and “Improve with AI” for letters." },
    ],
  },
  {
    section: "Review customer applications",
    icon: "📥",
    steps: [
      { title: "Open Applications", body: "The dashboard lists every application with country, visa type, success rate and status." },
      { title: "Open an application", body: "Click a customer to see their checklist (✅ provided, ❌ missing), uploaded files (click to download), profile answers and message." },
      { title: "Update the status", body: "Click a status: new → reviewing → docs-requested → submitted → approved / refused." },
      { title: "Add notes & contact", body: "Write internal notes (saved when you click away). Use “Email customer” or “WhatsApp” to request missing documents." },
    ],
  },
  {
    section: "Add required documents for customers",
    icon: "📋",
    steps: [
      { title: "Open “Required documents”", body: "Choose a country (or All) and a visa type (or All)." },
      { title: "Describe the document", body: "Enter the name, instructions and recognition keywords (words in the file name or PDF so uploads are matched automatically)." },
      { title: "Required or recommended", body: "Tick “Required” to make it mandatory. Missing required documents lower the customer's success rate." },
      { title: "Done", body: "It appears immediately in the customer's checklist and on the country page with an “Added by our team” label." },
    ],
  },
  {
    section: "Share support documents",
    icon: "📚",
    steps: [
      { title: "Open “Support documents”", body: "Upload a file (max 900 KB) or paste a link (Google Drive, Dropbox, official site) for templates, samples and guides." },
      { title: "Target it", body: "Choose the country and visa type it applies to, or All." },
      { title: "Customers see it", body: "It shows on the Document Review page and the country guide, ready to download." },
    ],
  },
  {
    section: "Forgot password",
    icon: "🔑",
    steps: [
      { title: "Click “Forgot password?”", body: "On the admin login page.", link: ["/admin/forgot", "Reset password"] },
      { title: "Request a code", body: "Enter your admin email or phone and choose Email, SMS or Both. A 6-digit code is sent and is valid for 10 minutes." },
      { title: "Set a new password", body: "Enter the code and your new password. You are signed in automatically. After 5 wrong codes, request a new one." },
      { title: "Keep details current", body: "Keep your email and mobile up to date under Account & settings so codes reach you." },
    ],
  },
];

function GuideSection({ items, color }: { items: typeof CUSTOMER; color: string }) {
  return (
    <div className="space-y-8">
      {items.map((s) => (
        <div key={s.section} className="card">
          <h3 className="flex items-center gap-3 text-xl font-bold">
            <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${color} text-2xl shadow-lg [transform:perspective(300px)_rotateY(-14deg)]`}>{s.icon}</span>
            {s.section}
          </h3>
          <ol className="mt-5 space-y-4">
            {s.steps.map((st, i) => (
              <li key={st.title} className="flex gap-4">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${color} font-black text-white shadow-md`}>{i + 1}</span>
                <div>
                  <div className="font-semibold">{st.title}</div>
                  <p className="text-sm text-slate-600">{st.body}</p>
                  {st.link && <Link href={st.link[0]} className="mt-1 inline-block text-sm font-semibold text-indigo-600 hover:underline">{st.link[1]} →</Link>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </div>
  );
}

export default function GuidePage() {
  return (
    <>
      <PageHero icon="📖" title="Step-by-step guide" subtitle="How to use VisaReview, for customers and for the admin team.">
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="#tally" className="btn glass text-white hover:bg-white/15">🧮 Tally my documents</a>
          <a href="#customer" className="btn glass text-white hover:bg-white/15">👤 Customer guide</a>
          <a href="#admin" className="btn glass text-white hover:bg-white/15">🔐 Admin guide</a>
        </div>
      </PageHero>
      <div className="container-x grid gap-12 py-10">
        <section id="tally" className="card scroll-mt-24">
          <h2 className="h-title">🧮 Tally your documents with the visa requirements</h2>
          <p className="mb-4 mt-1 text-sm text-slate-500">Pick the country and visa type, then tick or upload what you have. Required documents you are missing are shown in red.</p>
          <DocTally selectable />
        </section>
        <section id="customer" className="scroll-mt-24">
          <h2 className="h-title mb-6">👤 Customer guide</h2>
          <GuideSection items={CUSTOMER} color="from-indigo-500 to-violet-500" />
        </section>
        <section id="admin" className="scroll-mt-24">
          <h2 className="h-title mb-6">🔐 Admin guide</h2>
          <GuideSection items={ADMIN} color="from-amber-500 to-pink-500" />
        </section>
      </div>
    </>
  );
}
