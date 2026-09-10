import type { Track } from "@/lib/music.functions";

/** Uploaded songs live in the browser (IndexedDB) so they survive reloads. */
const DB = "varity-dash";
const STORE = "tracks";

type Stored = { id: string; name: string; type: string; blob: Blob; added: number };

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      }),
  );
}

const urls = new Map<string, string>();

function toTrack(s: Stored): Track {
  let url = urls.get(s.id);
  if (!url) {
    url = URL.createObjectURL(s.blob);
    urls.set(s.id, url);
  }
  const base = s.name.replace(/\.[a-z0-9]+$/i, "");
  const [artist, title] = base.includes(" - ") ? base.split(" - ", 2) : ["My upload", base];
  return { id: s.id, title: title ?? base, artist: artist ?? "My upload", artwork: "", previewUrl: url, source: "local" };
}

export async function addLocalTrack(file: File): Promise<Track> {
  const id = `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const stored: Stored = { id, name: file.name, type: file.type, blob: file, added: Date.now() };
  await tx("readwrite", (s) => s.put(stored));
  return toTrack(stored);
}

export async function listLocalTracks(): Promise<Track[]> {
  if (typeof indexedDB === "undefined") return [];
  try {
    const all = await tx<Stored[]>("readonly", (s) => s.getAll() as IDBRequest<Stored[]>);
    return all.sort((a, b) => b.added - a.added).map(toTrack);
  } catch {
    return [];
  }
}

export async function removeLocalTrack(id: string) {
  await tx("readwrite", (s) => s.delete(id));
  const u = urls.get(id);
  if (u) URL.revokeObjectURL(u);
  urls.delete(id);
}
