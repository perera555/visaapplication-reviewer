# VisaReview: Visa document review & success rate

A Next.js 16 app for visa agencies and their customers. It works for every country and visa type: student, work, visit, business, family, transit, medical, working holiday and residence.

## Features

| Area | What it does |
| --- | --- |
| **Document Review** (`/check`) | Asks which country first, then visa type and profile. You upload all documents and each one is auto-matched to the checklist. The page compares requirements with submitted documents, shows status, flags missing required documents, and gives a **success rate (0–100%)** with reasons. Customers can add extra documents manually and send everything to the agency. |
| **Support Doc Review** (`/review`) | Checks letters and statements for error documents: wrong name, passport number or country, blanks, risky sentences, spelling, informal words and wrong letter order. Shows the exact text to **replace with**, a corrected version, and a *rearranged-only* version (original wording). |
| **CV review** | Pulls name, contact, education, jobs, language test and gaps from a CV, then lists the documents needed to prove them. It can fill the customer profile. |
| **Countries** (`/countries`) | 195 countries, each showing **online / online + in-person / offline** application mode and a document checklist for every visa type. Also covers process steps, the official portal and refusal options. |
| **Refusal Review** (`/refusal`) | Upload or paste a refusal letter. It pulls out the refusal grounds (quoted), the documents needed to re-apply, step-by-step re-application, and appeal or review options. |
| **Letter Writer** (`/letter`) | Reconsideration, appeal, re-application cover, **document resubmission**, explanation, cover, sponsor, invitation and employer letters. Live preview, PDF download. |
| **Application Form** (`/form`) | Guided visa application form with autosave and PDF export. You can also **upload an official fillable PDF**, which is auto-filled from your answers, then download it. |
| **Admin** (`/admin`, link at bottom of home page) | Review applications (files, checklist, score, status, notes) and add **required documents** per country/visa type. Upload **support documents** (templates, samples) that customers see. Account settings. |
| **Password reset** | 6-digit code by **email (Resend)** and/or **SMS (Twilio)**, valid 10 minutes, max 5 attempts. |
| **Install anywhere** | PWA: install button at the top of every page. Works on Windows, Mac, Linux, iPhone/iPad and Android. |
| **Guide** (`/guide`) | Step-by-step user guide and admin guide. |

AI is optional. Everything runs on a built-in rule engine. Set `ANTHROPIC_API_KEY` to add Claude-powered refusal analysis, document review and letter polishing.

## Run locally

```bash
npm install
npm run dev
# open http://localhost:3000
```

Local data is stored in `.data/db.json`. Open **Admin login** (bottom of the home page) and create the first admin account. In dev, without email/SMS keys, the reset code is shown on screen and in the terminal.

## Customer registration (company side)

`/register`: customers upload documents one by one (details are read automatically), add a photo and get a registration number (`VR-YYYY-000001`). Admins search registrations by name, number, passport, ID, email or phone to see straight away whether someone is registered, then open their photo, details and categorised documents.

## Deploy to Vercel

1. Import this GitHub repo in Vercel (framework: Next.js).
2. **Storage → Create → Neon Postgres** and connect it to the project (sets `DATABASE_URL`). A `kv` table is created automatically. Without a database, data on Vercel is temporary.
3. **Settings → Environment Variables**: set `SESSION_SECRET` and `ADMIN_SETUP_KEY`, plus optional email, SMS and AI keys from `.env.example`.
4. Redeploy. The owner opens **`/admin/setup`** once with the setup key to create the first admin. After that, admins add more admins in **Dashboard → Admin users**. The footer **Admin login** link shows sign-in only.

## Notes

- Uploaded files are stored only when the customer sends an application (max 900 KB per file, about 4 MB per application). Larger files are listed by name, so ask the customer to email them.
- Success rates are estimates. Final decisions are always made by the embassy or high commission. Requirements change often, so confirm on the official government website.
