// Key/value store used by the whole app.
// - PostgreSQL (preferred): set DATABASE_URL or POSTGRES_URL (Vercel → Storage → Neon Postgres sets these).
// - Upstash Redis / Vercel KV via REST: KV_REST_API_URL + KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_*).
// - Local dev: JSON file in ./.data (or /tmp on serverless, which is NOT persistent).
import { promises as fs } from "fs";
import path from "path";
import postgres from "postgres";

const PG_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const storageMode: "postgres" | "redis" | "file" | "ephemeral" = PG_URL ? "postgres" : URL_ && TOKEN ? "redis" : process.env.VERCEL ? "ephemeral" : "file";

// ---------- PostgreSQL ----------
type Sql = ReturnType<typeof postgres>;
const g = globalThis as typeof globalThis & { __vrSql?: Sql; __vrSqlReady?: Promise<void> };
function pg(): { sql: Sql; ready: Promise<void> } {
  if (!g.__vrSql) {
    g.__vrSql = postgres(PG_URL!, { max: 5, idle_timeout: 20, prepare: false, onnotice: () => {} });
    const sql = g.__vrSql;
    g.__vrSqlReady = (async () => {
      await sql`create table if not exists kv (key text primary key, value text not null, expires_at timestamptz, updated_at timestamptz not null default now())`;
    })();
  }
  return { sql: g.__vrSql, ready: g.__vrSqlReady! };
}

// ---------- Redis REST ----------
async function redis<T = unknown>(cmd: (string | number)[]): Promise<T> {
  const res = await fetch(URL_!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmd),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Storage error ${res.status}`);
  const json = (await res.json()) as { result: T; error?: string };
  if (json.error) throw new Error(json.error);
  return json.result;
}

// ---------- JSON file ----------
const FILE = path.join(process.env.VERCEL ? "/tmp" : path.join(process.cwd(), ".data"), "db.json");
let fileCache: Record<string, string> | null = null;
let writing: Promise<void> = Promise.resolve();
async function loadFile() {
  if (fileCache) return fileCache;
  try {
    fileCache = JSON.parse(await fs.readFile(FILE, "utf8"));
  } catch {
    fileCache = {};
  }
  return fileCache!;
}
async function saveFile() {
  const data = JSON.stringify(fileCache);
  writing = writing.then(async () => {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, data);
  });
  await writing;
}

// ---------- API ----------
export async function kvGet<T>(key: string): Promise<T | null> {
  if (storageMode === "postgres") {
    const { sql, ready } = pg();
    await ready;
    const rows = await sql<{ value: string }[]>`select value from kv where key = ${key} and (expires_at is null or expires_at > now())`;
    return rows[0] ? (JSON.parse(rows[0].value) as T) : null;
  }
  if (storageMode === "redis") {
    const v = await redis<string | null>(["GET", key]);
    return v ? (JSON.parse(v) as T) : null;
  }
  const db = await loadFile();
  return db[key] ? (JSON.parse(db[key]) as T) : null;
}

export async function kvSet(key: string, value: unknown, ttlSeconds?: number) {
  const s = JSON.stringify(value);
  if (storageMode === "postgres") {
    const { sql, ready } = pg();
    await ready;
    const exp = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000) : null;
    await sql`insert into kv (key, value, expires_at, updated_at) values (${key}, ${s}, ${exp}, now())
              on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at, updated_at = now()`;
    return;
  }
  if (storageMode === "redis") {
    await redis(ttlSeconds ? ["SET", key, s, "EX", ttlSeconds] : ["SET", key, s]);
    return;
  }
  const db = await loadFile();
  db[key] = s;
  await saveFile();
}

export async function kvDel(key: string) {
  if (storageMode === "postgres") {
    const { sql, ready } = pg();
    await ready;
    await sql`delete from kv where key = ${key}`;
    return;
  }
  if (storageMode === "redis") {
    await redis(["DEL", key]);
    return;
  }
  const db = await loadFile();
  delete db[key];
  await saveFile();
}

/** Atomic counter (used for registration numbers). */
export async function kvIncr(key: string): Promise<number> {
  if (storageMode === "postgres") {
    const { sql, ready } = pg();
    await ready;
    const rows = await sql<{ value: string }[]>`insert into kv (key, value) values (${key}, '1')
      on conflict (key) do update set value = ((kv.value)::bigint + 1)::text, updated_at = now() returning value`;
    return Number(rows[0].value);
  }
  if (storageMode === "redis") return Number(await redis<number>(["INCR", key]));
  const db = await loadFile();
  const n = Number(db[key] ? JSON.parse(db[key]) : 0) + 1;
  db[key] = JSON.stringify(n);
  await saveFile();
  return n;
}

// ---------- collections (stored as one JSON array each; fine for agency-scale data) ----------
export async function listAll<T>(collection: string): Promise<T[]> {
  return (await kvGet<T[]>(`col:${collection}`)) ?? [];
}
export async function saveAll<T>(collection: string, items: T[]) {
  await kvSet(`col:${collection}`, items);
}
export async function upsert<T extends { id: string }>(collection: string, item: T) {
  const items = await listAll<T>(collection);
  const i = items.findIndex((x) => x.id === item.id);
  if (i >= 0) items[i] = item;
  else items.unshift(item);
  await saveAll(collection, items);
  return item;
}
export async function removeById(collection: string, id: string) {
  const items = await listAll<{ id: string }>(collection);
  await saveAll(collection, items.filter((x) => x.id !== id));
}

export function newId() {
  return crypto.randomUUID();
}
