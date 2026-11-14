import { getSessionAdmin, unauthorized } from "@/lib/server/auth";
import { addDomain, cleanDomain, domainsConfigured, listDomains, removeDomain, verifyDomain } from "@/lib/server/vercelDomains";

const notReady = () => Response.json({ error: "Domain connection is not set up yet: add VERCEL_API_TOKEN, VERCEL_PROJECT_ID and VERCEL_TEAM_ID in Vercel → Settings → Environment Variables." }, { status: 503 });

// List connected domains with their DNS / verification status
export async function GET() {
  if (!(await getSessionAdmin())) return unauthorized();
  if (!domainsConfigured) return Response.json({ configured: false, domains: [] });
  try {
    return Response.json({ configured: true, domains: await listDomains() });
  } catch (e) {
    return Response.json({ configured: true, domains: [], error: e instanceof Error ? e.message : "Failed" }, { status: 502 });
  }
}

// Connect a domain to this project
export async function POST(req: Request) {
  if (!(await getSessionAdmin())) return unauthorized();
  if (!domainsConfigured) return notReady();
  const { domain } = (await req.json()) as { domain?: string };
  const d = cleanDomain(domain ?? "");
  if (!d) return Response.json({ error: "Enter a valid domain, e.g. visa.yourcompany.com" }, { status: 400 });
  try {
    const s = await addDomain(d);
    return Response.json(s);
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Could not add domain" }, { status: 400 });
  }
}

// Re-check verification / DNS
export async function PATCH(req: Request) {
  if (!(await getSessionAdmin())) return unauthorized();
  if (!domainsConfigured) return notReady();
  const { domain } = (await req.json()) as { domain?: string };
  const d = cleanDomain(domain ?? "");
  if (!d) return Response.json({ error: "Invalid domain" }, { status: 400 });
  try {
    return Response.json(await verifyDomain(d));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Check failed" }, { status: 400 });
  }
}

export async function DELETE(req: Request) {
  if (!(await getSessionAdmin())) return unauthorized();
  if (!domainsConfigured) return notReady();
  const d = cleanDomain(new URL(req.url).searchParams.get("domain") ?? "");
  if (!d) return Response.json({ error: "Invalid domain" }, { status: 400 });
  try {
    await removeDomain(d);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "Could not remove" }, { status: 400 });
  }
}
