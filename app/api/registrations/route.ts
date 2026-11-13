import { getAdmins, getSessionAdmin, unauthorized } from "@/lib/server/auth";
import { sendEmail } from "@/lib/server/notify";
import { findDuplicate, nextRegNo, putRegPhoto, saveRegistration, searchRegistrations, uploadToken } from "@/lib/server/registrations";
import { newId } from "@/lib/server/store";
import { EMPTY_REG_DETAILS, MAX_REG_FILE, type Registration, type RegistrationDetails } from "@/lib/types";

// Customer registers: details (JSON) + photo. Returns an automatic registration number.
export async function POST(req: Request) {
  const form = await req.formData();
  const raw = JSON.parse(String(form.get("data") ?? "{}")) as Partial<RegistrationDetails>;
  const details: RegistrationDetails = { ...EMPTY_REG_DETAILS };
  for (const k of Object.keys(EMPTY_REG_DETAILS) as (keyof RegistrationDetails)[]) details[k] = String(raw[k] ?? "").trim().slice(0, k === "notes" || k === "address" ? 1000 : 200);
  if (!details.fullName) details.fullName = [details.givenNames, details.surname].filter(Boolean).join(" ");
  if (!details.fullName) return Response.json({ error: "Full name is required." }, { status: 400 });
  if (!details.passportNo && !details.nationalId) return Response.json({ error: "Passport number or national ID is required." }, { status: 400 });
  if (!details.email && !details.phone) return Response.json({ error: "Email or phone number is required." }, { status: 400 });

  const dup = await findDuplicate(details);
  if (dup) return Response.json({ error: `Already registered: ${dup.fullName}`, existingRegNo: dup.regNo, alreadyRegistered: true }, { status: 409 });

  const photo = form.get("photo");
  if (!(photo instanceof File) || photo.size === 0) return Response.json({ error: "Please add a passport-size photo." }, { status: 400 });
  if (!photo.type.startsWith("image/")) return Response.json({ error: "The photo must be an image (JPG or PNG)." }, { status: 400 });
  if (photo.size > MAX_REG_FILE) return Response.json({ error: "Photo is too large (max 4 MB)." }, { status: 413 });

  const now = new Date().toISOString();
  const reg: Registration = {
    id: newId(),
    regNo: await nextRegNo(),
    createdAt: now,
    updatedAt: now,
    status: "documents-pending",
    details,
    photo: { type: photo.type, size: photo.size },
    documents: [],
    adminNotes: "",
  };
  await putRegPhoto(reg.id, photo);
  await saveRegistration(reg);

  const admins = await getAdmins();
  await Promise.allSettled(admins.map((a) => sendEmail(a.email, `New registration ${reg.regNo}: ${details.fullName}`, `${reg.regNo}\n${details.fullName}\nPassport: ${details.passportNo}\n${details.email} ${details.phone}\nDestination: ${details.destination} (${details.visaType})`)));
  if (details.email) await sendEmail(details.email, `Your registration number: ${reg.regNo}`, `Dear ${details.fullName},\n\nThank you for registering. Your registration number is ${reg.regNo}.\nPlease quote it whenever you contact us.\n`).catch(() => {});

  return Response.json({ id: reg.id, regNo: reg.regNo, token: uploadToken(reg.id) });
}

// Admin: search registrations by name, registration no, passport, national ID, email or phone.
export async function GET(req: Request) {
  if (!(await getSessionAdmin())) return unauthorized();
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return Response.json(await searchRegistrations(q));
}
