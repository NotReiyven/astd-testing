/*
 * src/lib/safeStorage.ts
 * Safe wrapper around localStorage (and fallback in‑memory map) that never throws.
 * All values are JSON‑encoded/decoded with graceful handling of corrupted data.
 */

interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

// In‑memory fallback used when localStorage is unavailable (e.g., private mode).
class MemoryStorage implements StorageBackend {
  private store = new Map<string, string>();
  getItem(key: string) {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.store.set(key, value);
  }
  removeItem(key: string) {
    this.store.delete(key);
  }
}

function getBackend(): StorageBackend {
  try {
    // Accessing localStorage may throw in some browsers (e.g., Safari private mode).
    const testKey = '__astd_storage_test__';
    window.localStorage.setItem(testKey, 'test');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return new MemoryStorage();
  }
}

const backend = getBackend();

/**
 * Get a JSON‑parsed value from storage.
 * @param key storage key
 * @param defaultValue value returned when key is missing or parsing fails.
 */
export function safeGet<T>(key: string, defaultValue: T): T {
  try {
    const raw = backend.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (e) {
    // Corrupted JSON – log and fall back.
    // Import logger lazily to avoid circular deps.
    import('./logger').then(mod => {
      mod.logger.warn('ASTD-STORAGE-JSON-001', 'Corrupted JSON in storage, clearing key', { key });
    });
    backend.removeItem(key);
    return defaultValue;
  }
}

/**
 * Store a value as JSON.
 */
export function safeSet<T>(key: string, value: T): void {
  try {
    const serialized = JSON.stringify(value);
    backend.setItem(key, serialized);
  } catch (e) {
    import('./logger').then(mod => {
      mod.logger.error('ASTD-STORAGE-SET-001', 'Failed to write to storage', { key, error: e });
    });
    // ignore – fail‑soft.
  }
}

/**
 * Remove a key from storage.
 */
export function safeRemove(key: string): void {
  try {
    backend.removeItem(key);
  } catch (e) {
    import('./logger').then(mod => {
      mod.logger.error('ASTD-STORAGE-REMOVE-001', 'Failed to remove storage key', { key, error: e });
    });
  }
}
