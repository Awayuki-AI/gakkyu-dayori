import type {
  Announcement,
  Issue,
  Photo,
  PhotoFit,
  TopicSection,
} from "../types";
import { DEFAULT_BODY_FONT_PT } from "./sheet-fonts";

const META_KEY = "gakkyu-dayori-draft-v1";
const DB_NAME = "gakkyu-dayori-draft";
const DB_VERSION = 1;
const PHOTO_STORE = "photos";

type PhotoRef =
  | { id: string; name: string; kind: "url"; url: string }
  | { id: string; name: string; kind: "blob" };

export type DraftSnapshot = {
  issue: Issue;
  sections: TopicSection[];
  includeAnnouncement: boolean;
  announcement: Announcement;
  photos: Record<string, Photo>;
};

type DraftMeta = {
  version: 1;
  issue: Issue;
  sections: TopicSection[];
  includeAnnouncement: boolean;
  announcement: Announcement;
  photoRefs: PhotoRef[];
};

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("下書きDBを開けませんでした。"));
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        db.createObjectStore(PHOTO_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
  });
}

function idbGet<T>(db: IDBDatabase, store: string, key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result as T | undefined);
  });
}

function idbPut(db: IDBDatabase, store: string, key: string, value: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.onerror = () => reject(tx.error);
    tx.oncomplete = () => resolve();
    tx.objectStore(store).put(value, key);
  });
}

function normalizeSection(raw: Partial<TopicSection> & { id: string }): TopicSection {
  const photoFit: PhotoFit =
    raw.photoFit === "cover" || raw.photoFit === "contain" ? raw.photoFit : "contain";
  const tone =
    raw.tone === "cream" || raw.tone === "lavender" || raw.tone === "peach"
      ? raw.tone
      : "cream";
  return {
    id: raw.id,
    title: raw.title ?? "",
    body: raw.body ?? "",
    photoIds: Array.isArray(raw.photoIds) ? raw.photoIds : [],
    photoFit,
    bodyFontPt:
      typeof raw.bodyFontPt === "number" && Number.isFinite(raw.bodyFontPt)
        ? raw.bodyFontPt
        : DEFAULT_BODY_FONT_PT,
    tone,
    icon: raw.icon ?? "",
  };
}

function readMetaSync(): DraftMeta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftMeta>;
    if (parsed.version !== 1 || !parsed.issue || !Array.isArray(parsed.sections)) {
      return null;
    }
    return {
      version: 1,
      issue: parsed.issue,
      sections: parsed.sections.map((s) =>
        normalizeSection(s as Partial<TopicSection> & { id: string }),
      ),
      includeAnnouncement: Boolean(parsed.includeAnnouncement),
      announcement: parsed.announcement ?? { title: "", body: "" },
      photoRefs: Array.isArray(parsed.photoRefs) ? parsed.photoRefs : [],
    };
  } catch {
    return null;
  }
}

function writeMeta(meta: DraftMeta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

async function blobFromObjectUrl(objectUrl: string): Promise<Blob> {
  const res = await fetch(objectUrl);
  return res.blob();
}

export function hasSavedDraft(): boolean {
  return readMetaSync() !== null;
}

export function hasBlobPhotosInDraft(): boolean {
  const meta = readMetaSync();
  return meta?.photoRefs.some((r) => r.kind === "blob") ?? false;
}

/** 写真 blob 以外を同期的に復元（再読み込み直後のチラつき防止） */
export function loadDraftTextSync(): Omit<DraftSnapshot, "photos"> & {
  urlPhotos: Record<string, Photo>;
} | null {
  const meta = readMetaSync();
  if (!meta) return null;
  const urlPhotos: Record<string, Photo> = {};
  for (const ref of meta.photoRefs) {
    if (ref.kind === "url") {
      urlPhotos[ref.id] = { id: ref.id, name: ref.name, objectUrl: ref.url };
    }
  }
  return {
    issue: meta.issue,
    sections: meta.sections,
    includeAnnouncement: meta.includeAnnouncement,
    announcement: meta.announcement,
    urlPhotos,
  };
}

/** テキスト類は同期的に、写真 blob は IndexedDB から復元する */
export async function loadDraft(): Promise<DraftSnapshot | null> {
  const meta = readMetaSync();
  if (!meta) return null;

  const photos: Record<string, Photo> = {};
  const blobRefs = meta.photoRefs.filter((r): r is Extract<PhotoRef, { kind: "blob" }> => r.kind === "blob");

  let db: IDBDatabase | null = null;
  if (blobRefs.length > 0) {
    try {
      db = await openDb();
    } catch (err) {
      console.error(err);
    }
  }

  for (const ref of meta.photoRefs) {
    if (ref.kind === "url") {
      photos[ref.id] = { id: ref.id, name: ref.name, objectUrl: ref.url };
      continue;
    }
    if (!db) continue;
    try {
      const blob = await idbGet<Blob>(db, PHOTO_STORE, ref.id);
      if (blob) {
        photos[ref.id] = {
          id: ref.id,
          name: ref.name,
          objectUrl: URL.createObjectURL(blob),
        };
      }
    } catch (err) {
      console.error(err);
    }
  }

  db?.close();

  return {
    issue: meta.issue,
    sections: meta.sections,
    includeAnnouncement: meta.includeAnnouncement,
    announcement: meta.announcement,
    photos,
  };
}

export async function saveDraft(snapshot: DraftSnapshot): Promise<void> {
  const photoRefs: PhotoRef[] = [];
  const blobIds = new Set<string>();

  for (const photo of Object.values(snapshot.photos)) {
    if (photo.objectUrl.startsWith("blob:")) {
      photoRefs.push({ id: photo.id, name: photo.name, kind: "blob" });
      blobIds.add(photo.id);
    } else {
      photoRefs.push({
        id: photo.id,
        name: photo.name,
        kind: "url",
        url: photo.objectUrl,
      });
    }
  }

  writeMeta({
    version: 1,
    issue: snapshot.issue,
    sections: snapshot.sections,
    includeAnnouncement: snapshot.includeAnnouncement,
    announcement: snapshot.announcement,
    photoRefs,
  });

  if (blobIds.size === 0) return;

  try {
    const db = await openDb();
    for (const photo of Object.values(snapshot.photos)) {
      if (!photo.objectUrl.startsWith("blob:")) continue;
      const blob = await blobFromObjectUrl(photo.objectUrl);
      await idbPut(db, PHOTO_STORE, photo.id, blob);
    }

    const tx = db.transaction(PHOTO_STORE, "readwrite");
    const store = tx.objectStore(PHOTO_STORE);
    const keysReq = store.getAllKeys();
    await new Promise<void>((resolve, reject) => {
      keysReq.onerror = () => reject(keysReq.error);
      keysReq.onsuccess = () => {
        for (const key of keysReq.result) {
          if (typeof key === "string" && !blobIds.has(key)) {
            store.delete(key);
          }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (err) {
    console.error(err);
  }
}
