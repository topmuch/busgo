// Offline storage utility using IndexedDB for Bus Go Agent
// Stores trajet data and pending scan operations for offline support

interface StoredBillet {
  id: string;
  trajetId: string;
  seatNumber: number;
  ticketNumber: string;
  qrCode: string;
  status: "sold" | "boarded" | "absent" | "cancelled";
  client: { id: string; name: string; phone: string; reliabilityScore: number | null };
}

interface StoredTrajet {
  id: string;
  origin: string;
  destination: string;
  date: string;
  time: string;
  price: number;
  status: string;
  bus: { id: string; number: string; capacity: number };
  billets: StoredBillet[];
  cachedAt: number;
}

interface PendingScan {
  id: string;
  qrCode: string;
  trajetId: string;
  timestamp: number;
}

interface PendingStatusChange {
  id: string;
  billetId: string;
  status: "absent" | "boarded" | "sold";
  timestamp: number;
}

const DB_NAME = "busgo-agent-offline";
const DB_VERSION = 1;

function isClient(): boolean {
  return typeof window !== "undefined" && typeof indexedDB !== "undefined";
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    // Guard against SSR / non-browser environments — indexedDB is undefined
    // on the server, and accessing it throws. This allows the module to be
    // imported by Server Components (via AgentPWAProvider in the agent
    // layout) without crashing the build / runtime.
    if (!isClient()) {
      reject(new Error("IndexedDB is not available in this environment"));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains("trajets")) {
        db.createObjectStore("trajets", { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains("pendingScans")) {
        const scanStore = db.createObjectStore("pendingScans", { keyPath: "id" });
        scanStore.createIndex("timestamp", "timestamp");
      }
      if (!db.objectStoreNames.contains("pendingStatusChanges")) {
        const statusStore = db.createObjectStore("pendingStatusChanges", { keyPath: "id" });
        statusStore.createIndex("timestamp", "timestamp");
      }
    };
  });
}

// Cache a trajet with its billets for offline use
export async function cacheTrajet(trajet: StoredTrajet): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction("trajets", "readwrite");
    const store = tx.objectStore("trajets");
    store.put({ ...trajet, cachedAt: Date.now() });
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("Failed to cache trajet offline:", e);
  }
}

// Get a cached trajet
export async function getCachedTrajet(trajetId: string): Promise<StoredTrajet | null> {
  try {
    const db = await openDB();
    const tx = db.transaction("trajets", "readonly");
    const store = tx.objectStore("trajets");
    const result = await new Promise<StoredTrajet | null>((resolve) => {
      const request = store.get(trajetId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => resolve(null);
    });
    return result;
  } catch (e) {
    console.warn("Failed to get cached trajet:", e);
    return null;
  }
}

// Queue a scan for later sync
export async function queuePendingScan(qrCode: string, trajetId: string): Promise<string> {
  const id = `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const scan: PendingScan = { id, qrCode, trajetId, timestamp: Date.now() };

  try {
    const db = await openDB();
    const tx = db.transaction("pendingScans", "readwrite");
    tx.objectStore("pendingScans").put(scan);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("Failed to queue scan:", e);
  }
  return id;
}

// Queue a status change for later sync
export async function queuePendingStatusChange(
  billetId: string,
  status: "absent" | "boarded" | "sold"
): Promise<string> {
  const id = `status-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const change: PendingStatusChange = { id, billetId, status, timestamp: Date.now() };

  try {
    const db = await openDB();
    const tx = db.transaction("pendingStatusChanges", "readwrite");
    tx.objectStore("pendingStatusChanges").put(change);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("Failed to queue status change:", e);
  }
  return id;
}

// Get all pending operations count
export async function getPendingCount(): Promise<number> {
  try {
    const db = await openDB();
    const scans = await new Promise<number>((resolve) => {
      const tx = db.transaction("pendingScans", "readonly");
      const req = tx.objectStore("pendingScans").count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
    const statuses = await new Promise<number>((resolve) => {
      const tx = db.transaction("pendingStatusChanges", "readonly");
      const req = tx.objectStore("pendingStatusChanges").count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(0);
    });
    return scans + statuses;
  } catch {
    return 0;
  }
}

// Sync all pending operations
export async function syncPendingOperations(): Promise<{
  scansSynced: number;
  statusesSynced: number;
  errors: number;
}> {
  let scansSynced = 0;
  let statusesSynced = 0;
  let errors = 0;

  try {
    const db = await openDB();

    // Sync pending scans
    const scanTx = db.transaction("pendingScans", "readwrite");
    const scanStore = scanTx.objectStore("pendingScans");
    const allScans = await new Promise<PendingScan[]>((resolve) => {
      const req = scanStore.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve([]);
    });

    for (const scan of allScans) {
      try {
        const res = await fetch("/api/agent/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrCode: scan.qrCode, trajetId: scan.trajetId }),
        });
        if (res.ok) {
          scanStore.delete(scan.id);
          scansSynced++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    // Sync pending status changes
    const statusTx = db.transaction("pendingStatusChanges", "readwrite");
    const statusStore = statusTx.objectStore("pendingStatusChanges");
    const allStatuses = await new Promise<PendingStatusChange[]>((resolve) => {
      const req = statusStore.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve([]);
    });

    for (const change of allStatuses) {
      try {
        const res = await fetch(`/api/agent/billets/${change.billetId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: change.status }),
        });
        if (res.ok) {
          statusStore.delete(change.id);
          statusesSynced++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }
  } catch (e) {
    console.warn("Error during sync:", e);
    errors++;
  }

  return { scansSynced, statusesSynced, errors };
}

// Clear all cached data
export async function clearOfflineCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx1 = db.transaction("trajets", "readwrite");
    tx1.objectStore("trajets").clear();
    await new Promise((resolve) => { tx1.oncomplete = resolve; });

    const tx2 = db.transaction("pendingScans", "readwrite");
    tx2.objectStore("pendingScans").clear();
    await new Promise((resolve) => { tx2.oncomplete = resolve; });

    const tx3 = db.transaction("pendingStatusChanges", "readwrite");
    tx3.objectStore("pendingStatusChanges").clear();
    await new Promise((resolve) => { tx3.oncomplete = resolve; });
  } catch (e) {
    console.warn("Failed to clear offline cache:", e);
  }
}