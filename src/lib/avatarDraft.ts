const DATABASE_NAME = "dtt-avatar-studio";
const STORE_NAME = "drafts";
const PORTRAIT_KEY = "portrait-preview";

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  if (!window.indexedDB) { reject(new Error("Draft storage is unavailable.")); return; }
  const request = indexedDB.open(DATABASE_NAME, 1);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(STORE_NAME)) database.createObjectStore(STORE_NAME);
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("Draft storage is unavailable."));
});

export async function savePortraitDraft(blob: Blob) {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(blob, PORTRAIT_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Portrait draft could not be saved."));
  });
  database.close();
}

export async function readPortraitDraft(): Promise<Blob | undefined> {
  const database = await openDatabase();
  const portrait = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = database.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(PORTRAIT_KEY);
    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : undefined);
    request.onerror = () => reject(request.error ?? new Error("Portrait draft could not be restored."));
  });
  database.close();
  return portrait;
}

export async function clearPortraitDraft() {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(PORTRAIT_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Portrait draft could not be cleared."));
  });
  database.close();
}