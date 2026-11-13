import { getSessionAdmin, getAdmins, unauthorized } from "@/lib/server/auth";
import { sendEmail } from "@/lib/server/notify";
import { kvSet, listAll, newId, upsert } from "@/lib/server/store";
import { MAX_STORED_FILE, type Application, type StoredFileMeta } from "@/lib/types";
import { getCountry } from "@/lib/countries";
import { visaTypeName } from "@/lib/requirements";

// Customer submits their reviewed application (multipart: "data" JSON + files)
export async function POST(req: Request) {
  const form = await req.formData();
  const data = JSON.parse(String(form.get("data") ?? "{}")) as Partial<Application>;
  if (!data.profile?.fullName || (!data.profile.email && !data.profile.phone))
    return Response.json({ error: "Name and an email or phone number are required." }, { status: 400 });

  const id = newId();
  const files: StoredFileMeta[] = [];
  let total = 0;
  for (const [key, value] of form.entries()) {
    if (!key.startsWith("file:") || !(value instanceof File)) continue;
    const fileId = newId();
    const reqId = key.slice(5).split("|")[0];
    const canStore = value.size <= MAX_STORED_FILE && total + value.size <= 4 * 1024 * 1024;
    if (canStore) {
      total += value.size;
      await kvSet(`file:app:${id}:${fileId}`, { name: value.name, type: value.type || "application/octet-stream", data: Buffer.from(await value.arrayBuffer()).toString("base64") });
    }
    files.push({ id: fileId, name: value.name, type: value.type, size: value.size, reqId, stored: canStore });
  }

  const now = new Date().toISOString();
  const app: Application = {
    id,
    createdAt: now,
    updatedAt: now,
    countryCode: String(data.countryCode ?? ""),
    visaType: String(data.visaType ?? ""),
    profile: data.profile,
    docs: data.docs ?? [],
    extraDocs: data.extraDocs ?? [],
    files,
    score: Number(data.score ?? 0),
    statusLabel: String(data.statusLabel ?? ""),
    status: "new",
    adminNotes: "",
    message: String(data.message ?? "").slice(0, 4000),
  };
  await upsert("applications", app);

  // Notify admins (best effort)
  const admins = await getAdmins();
  const subject = `New visa application: ${app.profile.fullName} → ${getCountry(app.countryCode)?.name ?? app.countryCode} (${visaTypeName(app.visaType)})`;
  await Promise.allSettled(admins.map((a) => sendEmail(a.email, subject, `${subject}\nSuccess rate: ${app.score}%\nStatus: ${app.statusLabel}\nContact: ${app.profile.email} ${app.profile.phone}`)));

  return Response.json({ id, storedFiles: files.filter((f) => f.stored).length, skippedFiles: files.filter((f) => !f.stored).map((f) => f.name) });
}

export async function GET() {
  if (!(await getSessionAdmin())) return unauthorized();
  return Response.json(await listAll<Application>("applications"));
}
