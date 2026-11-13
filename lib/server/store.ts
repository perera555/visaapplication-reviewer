// Tiny key/value store.
// - Production: Upstash Redis / Vercel KV via REST (set KV_REST_API_URL + KV_REST_API_TOKEN
//   or UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN).
// - Local dev: JSON file in ./.data (or /tmp on serverless, which is NOT persistent).
import { promises as fs } from "fs";
import path from "path";

const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

export const storageMode: "redis" | "file" | "ephemeral" = URL_ && TOKEN ? "redis" : process.env.VERCEL ? "ephemeral" : "file";

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

export async function kvGet<T>(key: string): Promise<T | null> {
  if (storageMode === "redis") {
    const v = await redis<string | null>(["GET", key]);
    return v ? (JSON.parse(v) as T) : null;
  }
  const db = await loadFile();
  return db[key] ? (JSON.parse(db[key]) as T) : null;
}

export async function kvSet(key: string, value: unknown, ttlSeconds?: number) {
  const s = JSON.stringify(value);
  if (storageMode === "redis") {
    await redis(ttlSeconds ? ["SET", key, s, "EX", ttlSeconds] : ["SET", key, s]);
    return;
  }
  const db = await loadFile();
  db[key] = s;
  await saveFile();
}

export async function kvDel(key: string) {
  if (storageMode === "redis") {
    await redis(["DEL", key]);
    return;
  }
  const db = await loadFile();
  delete db[key];
  await saveFile();
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
