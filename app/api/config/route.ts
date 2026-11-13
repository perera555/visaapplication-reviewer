import { connection } from "next/server";
import { aiConfigured } from "@/lib/server/ai";
import { emailConfigured, smsConfigured } from "@/lib/server/notify";
import { storageMode } from "@/lib/server/store";

export async function GET() {
  await connection();
  return Response.json({ ai: aiConfigured, email: emailConfigured, sms: smsConfigured, storage: storageMode });
}
