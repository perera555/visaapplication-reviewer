import { createResetCode, findAdmin } from "@/lib/server/auth";
import { emailConfigured, sendEmail, sendSms, smsConfigured } from "@/lib/server/notify";

// Sends a 6-digit reset code to the admin's email and/or phone.
export async function POST(req: Request) {
  const { identifier, channel } = (await req.json()) as { identifier?: string; channel?: "email" | "sms" | "both" };
  if (!identifier) return Response.json({ error: "Enter your email or phone number." }, { status: 400 });
  const generic = { ok: true, message: "If an account exists, a reset code has been sent. It expires in 10 minutes." };
  const admin = await findAdmin(identifier);
  if (!admin) return Response.json(generic);

  const code = await createResetCode(admin.id);
  const text = `Your Visa Review admin password reset code is ${code}. It expires in 10 minutes. If you did not request this, ignore this message.`;
  const ch = channel ?? "both";
  const sent: string[] = [];
  if ((ch === "email" || ch === "both") && admin.email && (await sendEmail(admin.email, "Your password reset code", text))) sent.push("email");
  if ((ch === "sms" || ch === "both") && admin.phone && (await sendSms(admin.phone, text))) sent.push("sms");

  // Local development without email/SMS providers: return the code so the flow can be tested.
  if (process.env.NODE_ENV !== "production" && !emailConfigured && !smsConfigured) {
    return Response.json({ ...generic, devCode: code, message: "Dev mode: no email/SMS provider configured — code shown below and in the server console." });
  }
  return Response.json({ ...generic, sentVia: sent });
}
