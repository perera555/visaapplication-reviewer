import { createHmac, timingSafeEqual, createHash } from "crypto";
import { kvDel, kvGet, kvIncr, kvSet, listAll, saveAll } from "./store";
import type { Registration, RegistrationIndex } from "../types";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9@.+]/g, "");
const normPhone = (s: string) => s.replace(/\D/g, "").slice(-9);

function secret() {
  return process.env.SESSION_SECRET || createHash("sha256").update(`vr-reg:${process.env.DATABASE_URL ?? process.env.KV_REST_API_TOKEN ?? "local"}`).digest("hex");
}

/** Token that lets the customer keep uploading documents to their own registration. */
export function uploadToken(regId: string) {
  return createHmac("sha256", secret()).update(`upload:${regId}`).digest("base64url");
}
export function checkUploadToken(regId: string, token: string) {
  const a = Buffer.from(uploadToken(regId));
  const b = Buffer.from(token ?? "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function nextRegNo() {
  const year = new Date().getFullYear();
  const n = await kvIncr(`seq:registration:${year}`);
  return `VR-${year}-${String(n).padStart(6, "0")}`;
}

export const getRegistration = (id: string) => kvGet<Registration>(`reg:${id}`);

export async function saveRegistration(r: Registration) {
  r.updatedAt = new Date().toISOString();
  await kvSet(`reg:${r.id}`, r);
  const idx = await listAll<RegistrationIndex>("registrations");
  const row: RegistrationIndex = {
    id: r.id, regNo: r.regNo, fullName: r.details.fullName, passportNo: r.details.passportNo, email: r.details.email,
    phone: r.details.phone, nationalId: r.details.nationalId, destination: r.details.destination, status: r.status,
    createdAt: r.createdAt, docs: r.documents.length, hasPhoto: Boolean(r.photo),
  };
  const i = idx.findIndex((x) => x.id === r.id);
  if (i >= 0) idx[i] = row;
  else idx.unshift(row);
  await saveAll("registrations", idx);
  return r;
}

export async function deleteRegistration(id: string) {
  const r = await getRegistration(id);
  if (r) {
    await Promise.all(r.documents.map((d) => kvDel(`regfile:${id}:${d.id}`)));
    await kvDel(`regphoto:${id}`);
  }
  await kvDel(`reg:${id}`);
  await saveAll("registrations", (await listAll<RegistrationIndex>("registrations")).filter((x) => x.id !== id));
}

/** Find an existing registration for the same person (passport, national ID, email or phone). */
export async function findDuplicate(d: { passportNo?: string; nationalId?: string; email?: string; phone?: string }) {
  const idx = await listAll<RegistrationIndex>("registrations");
  return idx.find(
    (x) =>
      (d.passportNo && x.passportNo && norm(x.passportNo) === norm(d.passportNo)) ||
      (d.nationalId && x.nationalId && norm(x.nationalId) === norm(d.nationalId)) ||
      (d.email && x.email && norm(x.email) === norm(d.email)) ||
      (d.phone && x.phone && normPhone(d.phone).length >= 7 && normPhone(x.phone) === normPhone(d.phone)),
  );
}

export async function searchRegistrations(q: string) {
  const idx = await listAll<RegistrationIndex>("registrations");
  const s = q.trim().toLowerCase();
  if (!s) return idx;
  const sn = norm(s);
  const sp = normPhone(s);
  return idx.filter(
    (x) =>
      x.regNo.toLowerCase().includes(s) ||
      x.fullName.toLowerCase().includes(s) ||
      (sn && norm(x.passportNo).includes(sn)) ||
      (sn && norm(x.nationalId).includes(sn)) ||
      x.email.toLowerCase().includes(s) ||
      (sp.length >= 5 && normPhone(x.phone).includes(sp)),
  );
}

export async function putRegFile(regId: string, fileId: string, file: File, name = file.name) {
  await kvSet(`regfile:${regId}:${fileId}`, { name, type: file.type || "application/octet-stream", data: Buffer.from(await file.arrayBuffer()).toString("base64") });
}
export const getRegFile = (regId: string, fileId: string) => kvGet<{ name: string; type: string; data: string }>(`regfile:${regId}:${fileId}`);

export async function putRegPhoto(regId: string, file: File) {
  await kvSet(`regphoto:${regId}`, { type: file.type || "image/jpeg", data: Buffer.from(await file.arrayBuffer()).toString("base64") });
}
export const getRegPhoto = (regId: string) => kvGet<{ type: string; data: string }>(`regphoto:${regId}`);
