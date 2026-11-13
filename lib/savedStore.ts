"use client";
// Auto-save for the whole app, stored in the browser (IndexedDB) on this device.
// Items: applications (document reviews), letters, application forms. Files are stored as blobs.

export type SavedKind = "application" | "letter" | "form";
export type SavedItem<T = unknown> = { id: string; kind: SavedKind; title: string; subtitle?: string; data: T; updatedAt: string };

const DB = "visareview";
let dbp: Promise<IDBDatabase> | null = null;

function db(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("no indexedDB"));
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains("items")) d.createObjectStore("items", { keyPath: "id" });
      if (!d.objectStoreNames.contains("files")) d.createObjectStore("files");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}

async function tx<T>(store: string, mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = fn(d.transaction(store, mode).objectStore(store));
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

export async function listItems(kind?: SavedKind): Promise<SavedItem[]> {
  try {
    const all = await tx<SavedItem[]>("items", "readonly", (s) => s.getAll());
    return all.filter((i) => !kind || i.kind === kind).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } catch {
    return [];
  }
}
export async function getItem<T>(id: string): Promise<SavedItem<T> | undefined> {
  try {
    return await tx<SavedItem<T>>("items", "readonly", (s) => s.get(id));
  } catch {
    return undefined;
  }
}
export async function putItem<T>(item: Omit<SavedItem<T>, "updatedAt">) {
  try {
    await tx("items", "readwrite", (s) => s.put({ ...item, updatedAt: new Date().toISOString() }));
  } catch {}
}
export async function deleteItem(id: string, fileIds: string[] = []) {
  try {
    await tx("items", "readwrite", (s) => s.delete(id));
    for (const f of fileIds) await tx("files", "readwrite", (s) => s.delete(f));
  } catch {}
}

export const fileKey = (f: File) => `${f.name}|${f.size}|${f.lastModified}`;
export async function putFile(f: File) {
  const k = fileKey(f);
  try {
    const exists = await tx<IDBValidKey | undefined>("files", "readonly", (s) => s.getKey(k));
    if (!exists) await tx("files", "readwrite", (s) => s.put(f, k));
  } catch {}
  return k;
}
export async function getFile(k: string): Promise<File | undefined> {
  try {
    const v = await tx<Blob | File | undefined>("files", "readonly", (s) => s.get(k));
    if (!v) return undefined;
    return v instanceof File ? v : new File([v], k.split("|")[0]);
  } catch {
    return undefined;
  }
}

/** Remember which draft each tool is editing. */
export function activeId(tool: SavedKind, set?: string) {
  const key = `visa-active-${tool}`;
  try {
    if (set) localStorage.setItem(key, set);
    return localStorage.getItem(key);
  } catch {
    return set ?? null;
  }
}

/** Debounce helper for auto-save. */
export function debounce<A extends unknown[]>(fn: (...a: A) => void, ms = 700) {
  let t: ReturnType<typeof setTimeout> | undefined;
  return (...a: A) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}
