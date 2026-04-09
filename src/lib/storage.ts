import { ContentItem, StorageStats } from './types';
import { v4 as uuidv4 } from 'uuid';
import { StorageFullError } from './errors';
import { STORAGE_MAX_BYTES, STORAGE_WARN_THRESHOLD } from './config';

// Re-export so existing `import { StorageFullError } from '@/lib/storage'` keeps working.
export { StorageFullError };

const STORAGE_KEY = 'news13n_content';

function getStorage(): ContentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const items: ContentItem[] = JSON.parse(data);
    // Schema guard: filter out corrupted items
    const before = items.length;
    const valid = items.filter(item =>
      item && typeof item.id === 'string' && typeof item.markdown === 'string' && typeof item.createdAt === 'string'
    );
    if (valid.length < before) {
      console.warn(`[storage] Dropped ${before - valid.length} corrupted item(s) from localStorage`);
    }
    return valid;
  } catch {
    return [];
  }
}

function setStorage(items: ContentItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new StorageFullError();
    }
    throw err;
  }
  notifyStorageChanged();
}

export function getStorageStats(): StorageStats {
  const items = getStorage();
  const usedBytes = new Blob([JSON.stringify(items)]).size;
  return {
    usedBytes,
    maxBytes: STORAGE_MAX_BYTES,
    itemCount: items.length,
  };
}

export function shouldWarnStorage(): boolean {
  const { usedBytes } = getStorageStats();
  return usedBytes / STORAGE_MAX_BYTES >= STORAGE_WARN_THRESHOLD;
}

/** Calculate total localStorage usage across ALL keys (UTF-16 byte count). */
export function getTotalLocalStorageUsage(): { usedBytes: number; maxBytes: number; percent: number } {
  if (typeof window === 'undefined') return { usedBytes: 0, maxBytes: STORAGE_MAX_BYTES, percent: 0 };
  let totalChars = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    const value = localStorage.getItem(key) ?? '';
    totalChars += key.length + value.length;
  }
  const usedBytes = totalChars * 2; // UTF-16: 2 bytes per character
  return { usedBytes, maxBytes: STORAGE_MAX_BYTES, percent: usedBytes / STORAGE_MAX_BYTES };
}

/** Emit a custom event so the StorageWarningBanner can re-check usage after saves. */
export function notifyStorageChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('app-storage-changed'));
  }
}

/**
 * Subscribe to storage changes from BOTH the current tab (custom event)
 * and other tabs (native `storage` event). Returns an unsubscribe function.
 */
export function subscribeToStorageChanges(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const sameTab = () => callback();
  const crossTab = (e: StorageEvent) => {
    // `e.key === null` happens on localStorage.clear()
    if (e.key === STORAGE_KEY || e.key === null) callback();
  };
  window.addEventListener('app-storage-changed', sameTab);
  window.addEventListener('storage', crossTab);
  return () => {
    window.removeEventListener('app-storage-changed', sameTab);
    window.removeEventListener('storage', crossTab);
  };
}

export function getAllContent(): ContentItem[] {
  return getStorage();
}

export function importContent(items: ContentItem[]): { imported: number; skipped: number } {
  const existing = getStorage();
  const existingIds = new Set(existing.map(item => item.id));
  const newItems = items.filter(item => !existingIds.has(item.id));
  const merged = [...existing, ...newItems];
  setStorage(merged);
  return { imported: newItems.length, skipped: items.length - newItems.length };
}

export function getContentById(id: string): ContentItem | undefined {
  return getStorage().find((item) => item.id === id);
}

export function saveContent(item: Omit<ContentItem, 'id' | 'createdAt' | 'updatedAt'>): ContentItem {
  const items = getStorage();
  const now = new Date().toISOString();
  const newItem: ContentItem = {
    ...item,
    id: uuidv4(),
    createdAt: now,
    updatedAt: now,
  };
  items.unshift(newItem); // newest first
  setStorage(items);
  return newItem;
}

export function updateContent(id: string, updates: Partial<ContentItem>): ContentItem | null {
  const items = getStorage();
  const index = items.findIndex((item) => item.id === id);
  if (index === -1) return null;
  items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
  setStorage(items);
  return items[index];
}

export function deleteContent(id: string): boolean {
  const items = getStorage();
  const filtered = items.filter((item) => item.id !== id);
  if (filtered.length === items.length) return false;
  setStorage(filtered);
  return true;
}

export function deleteMultipleContent(ids: string[]): number {
  const items = getStorage();
  const idSet = new Set(ids);
  const filtered = items.filter((item) => !idSet.has(item.id));
  setStorage(filtered);
  return items.length - filtered.length;
}

export function clearAllContent(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function searchContent(query: string): ContentItem[] {
  const lower = query.toLowerCase();
  return getStorage().filter(
    (item) =>
      item.title.toLowerCase().includes(lower) ||
      item.markdown.toLowerCase().includes(lower) ||
      item.metadata.topic?.toLowerCase().includes(lower)
  );
}

/**
 * Re-insert previously deleted ContentItem[] back into localStorage.
 * Skips items whose IDs already exist (e.g. if the user recreated something).
 */
export function restoreContent(items: ContentItem[]): number {
  const existing = getStorage();
  const existingIds = new Set(existing.map(i => i.id));
  const toRestore = items.filter(i => !existingIds.has(i.id));
  if (toRestore.length === 0) return 0;
  const merged = [...toRestore, ...existing];
  setStorage(merged);
  return toRestore.length;
}

/**
 * Returns the N content items with the largest serialised byte footprint.
 * Useful for surfacing deletion candidates when storage is nearly full.
 */
export function getLargestItems(n: number): Array<ContentItem & { bytes: number }> {
  const items = getStorage();
  return items
    .map(item => ({ ...item, bytes: new Blob([JSON.stringify(item)]).size }))
    .sort((a, b) => b.bytes - a.bytes)
    .slice(0, n);
}

export function duplicateContent(id: string): ContentItem | null {
  const item = getContentById(id);
  if (!item) return null;
  const items = getStorage();
  const now = new Date().toISOString();
  const newItem: ContentItem = {
    ...item,
    id: uuidv4(),
    title: `Copy of ${item.title || 'Untitled'}`,
    createdAt: now,
    updatedAt: now,
  };
  items.unshift(newItem);
  try {
    setStorage(items);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new StorageFullError();
    }
    throw err;
  }
  return newItem;
}
