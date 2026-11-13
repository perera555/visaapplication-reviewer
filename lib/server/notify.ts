// Email via Resend (RESEND_API_KEY + EMAIL_FROM) and SMS via Twilio
// (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM). Without keys, messages are logged to the server console.

export const emailConfigured = Boolean(process.env.RESEND_API_KEY);
export const smsConfigured = Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM);

export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  if (!emailConfigured) {
    console.log(`[email:not-configured] to=${to} subject=${subject}\n${text}`);
    return false;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: process.env.EMAIL_FROM || "Visa Review <onboarding@resend.dev>", to: [to], subject, text }),
  });
  if (!res.ok) console.error("Email send failed", res.status, await res.text());
  return res.ok;
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  if (!smsConfigured) {
    console.log(`[sms:not-configured] to=${to}\n${body}`);
    return false;
  }
  const sid = process.env.TWILIO_ACCOUNT_SID!;
  const auth = Buffer.from(`${sid}:${process.env.TWILIO_AUTH_TOKEN}`).toString("base64");
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ To: to, From: process.env.TWILIO_FROM!, Body: body }),
  });
  if (!res.ok) console.error("SMS send failed", res.status, await res.text());
  return res.ok;
}
