import { listAll } from "@/lib/server/store";
import { REG_STATUS_LABEL, type RegistrationIndex } from "@/lib/types";

// Public: a customer can confirm they are registered using registration no + passport/ID number.
export async function POST(req: Request) {
  const { regNo, passport } = (await req.json()) as { regNo?: string; passport?: string };
  if (!regNo || !passport) return Response.json({ error: "Enter your registration number and passport / ID number." }, { status: 400 });
  const n = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const idx = await listAll<RegistrationIndex>("registrations");
  const r = idx.find((x) => n(x.regNo) === n(regNo) && (n(x.passportNo) === n(passport) || n(x.nationalId) === n(passport)));
  if (!r) return Response.json({ registered: false });
  return Response.json({ registered: true, regNo: r.regNo, name: r.fullName, status: REG_STATUS_LABEL[r.status], documents: r.docs, since: r.createdAt });
}
