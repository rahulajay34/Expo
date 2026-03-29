import { ContentItem, StorageStats } from './types';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'news13n_content';
const MAX_BYTES = 5 * 1024 * 1024; // 5MB browser limit
const WARN_THRESHOLD = 0.8; // warn at 80%

function getStorage(): ContentItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setStorage(items: ContentItem[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function getStorageStats(): StorageStats {
  const items = getStorage();
  const usedBytes = new Blob([JSON.stringify(items)]).size;
  return {
    usedBytes,
    maxBytes: MAX_BYTES,
    itemCount: items.length,
  };
}

export function shouldWarnStorage(): boolean {
  const { usedBytes } = getStorageStats();
  return usedBytes / MAX_BYTES >= WARN_THRESHOLD;
}

export function getAllContent(): ContentItem[] {
  return getStorage();
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
