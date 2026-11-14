// Connect custom domains to this Vercel project through the Vercel REST API.
// Needs VERCEL_API_TOKEN (create at vercel.com/account/tokens), VERCEL_PROJECT_ID and VERCEL_TEAM_ID.

const TOKEN = process.env.VERCEL_API_TOKEN;
const PROJECT = process.env.VERCEL_PROJECT_ID;
const TEAM = process.env.VERCEL_TEAM_ID;

export const domainsConfigured = Boolean(TOKEN && PROJECT);

export type DnsRecord = { type: "A" | "CNAME" | "TXT"; name: string; value: string; reason?: string };
export type DomainStatus = { name: string; verified: boolean; configured: boolean; records: DnsRecord[]; error?: string };

const q = () => (TEAM ? `?teamId=${encodeURIComponent(TEAM)}` : "");

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`https://api.vercel.com${path}${q()}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: { message?: string; code?: string } };
  if (!res.ok) throw new Error(json.error?.message ?? `Vercel API error ${res.status}`);
  return json;
}

/** Lower-case, strip protocol/path/www-less checks. Returns null when it is not a valid domain. */
export function cleanDomain(input: string) {
  const d = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/\.$/, "");
  return /^(?=.{4,253}$)([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(d) ? d : null;
}

const isApex = (d: string) => d.split(".").length === 2 || /\.(co|com|org|net|gov|ac|edu)\.[a-z]{2}$/.test(d) && d.split(".").length === 3;

type ProjectDomain = { name: string; verified: boolean; verification?: { type: string; domain: string; value: string; reason: string }[] };
type DomainConfig = { misconfigured: boolean; recommendedIPv4?: { rank: number; value: string[] }[]; recommendedCNAME?: { rank: number; value: string }[] };

async function status(d: ProjectDomain): Promise<DomainStatus> {
  let config: DomainConfig | null = null;
  try {
    config = await call<DomainConfig>("GET", `/v6/domains/${encodeURIComponent(d.name)}/config`);
  } catch {}
  const ip = config?.recommendedIPv4?.sort((a, b) => a.rank - b.rank)[0]?.value?.[0] ?? "76.76.21.21";
  const cname = config?.recommendedCNAME?.sort((a, b) => a.rank - b.rank)[0]?.value?.replace(/\.$/, "") ?? "cname.vercel-dns.com";
  const host = isApex(d.name) ? "@" : d.name.split(".").slice(0, -2).join(".");
  const records: DnsRecord[] = [isApex(d.name) ? { type: "A", name: "@", value: ip } : { type: "CNAME", name: host, value: cname }];
  for (const v of d.verification ?? []) records.push({ type: v.type as DnsRecord["type"], name: v.domain, value: v.value, reason: v.reason });
  return { name: d.name, verified: d.verified, configured: config ? !config.misconfigured : false, records };
}

export async function listDomains(): Promise<DomainStatus[]> {
  const r = await call<{ domains: ProjectDomain[] }>("GET", `/v9/projects/${PROJECT}/domains`);
  return Promise.all(r.domains.filter((d) => !d.name.endsWith(".vercel.app")).map(status));
}

export async function addDomain(domain: string): Promise<DomainStatus> {
  const d = await call<ProjectDomain>("POST", `/v10/projects/${PROJECT}/domains`, { name: domain });
  return status(d);
}

export async function verifyDomain(domain: string): Promise<DomainStatus> {
  let d: ProjectDomain;
  try {
    d = await call<ProjectDomain>("POST", `/v9/projects/${PROJECT}/domains/${encodeURIComponent(domain)}/verify`);
  } catch {
    d = await call<ProjectDomain>("GET", `/v9/projects/${PROJECT}/domains/${encodeURIComponent(domain)}`);
  }
  return status(d);
}

export async function removeDomain(domain: string) {
  await call("DELETE", `/v9/projects/${PROJECT}/domains/${encodeURIComponent(domain)}`);
}
