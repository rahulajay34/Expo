import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveContent,
  getAllContent,
  getContentById,
  deleteContent,
  updateContent,
  clearAllContent,
  searchContent,
  deleteMultipleContent,
  importContent,
  restoreContent,
  duplicateContent,
  StorageFullError,
} from './storage';

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------
function createLocalStorageMock() {
  let store: Record<string, string> = {};
  let shouldThrowQuota = false;

  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      if (shouldThrowQuota) {
        const err = new DOMException('quota exceeded', 'QuotaExceededError');
        throw err;
      }
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    key: vi.fn((idx: number) => Object.keys(store)[idx] ?? null),
    get length() { return Object.keys(store).length; },
    // test helpers
    _setQuotaExceeded(val: boolean) { shouldThrowQuota = val; },
    _getStore() { return store; },
    _reset() { store = {}; shouldThrowQuota = false; },
  };
}

let mockStorage: ReturnType<typeof createLocalStorageMock>;

beforeEach(() => {
  mockStorage = createLocalStorageMock();
  Object.defineProperty(globalThis, 'localStorage', {
    value: mockStorage,
    writable: true,
    configurable: true,
  });
  // Suppress console.warn from schema guard
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// ---------------------------------------------------------------------------
// saveContent / getAllContent
// ---------------------------------------------------------------------------
describe('saveContent + getAllContent', () => {
  it('saves an item and retrieves it', () => {
    const item = saveContent({
      type: 'lecture',
      title: 'Test Lecture',
      markdown: '# Hello',
      provider: 'minimax',
      sources: [],
      metadata: {},
    });

    expect(item.id).toBeDefined();
    expect(item.title).toBe('Test Lecture');
    expect(item.createdAt).toBeDefined();
    expect(item.updatedAt).toBeDefined();

    const all = getAllContent();
    expect(all).toHaveLength(1);
    expect(all[0].id).toBe(item.id);
  });

  it('prepends new items (newest first)', () => {
    const first = saveContent({
      type: 'lecture',
      title: 'First',
      markdown: '# 1',
      provider: 'minimax',
      sources: [],
      metadata: {},
    });
    const second = saveContent({
      type: 'lecture',
      title: 'Second',
      markdown: '# 2',
      provider: 'minimax',
      sources: [],
      metadata: {},
    });

    const all = getAllContent();
    expect(all).toHaveLength(2);
    expect(all[0].id).toBe(second.id);
    expect(all[1].id).toBe(first.id);
  });

  it('returns empty array when nothing stored', () => {
    expect(getAllContent()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getContentById
// ---------------------------------------------------------------------------
describe('getContentById', () => {
  it('returns the item when found', () => {
    const item = saveContent({
      type: 'assignment',
      title: 'Assignment 1',
      markdown: '## Q1',
      provider: 'minimax',
      sources: [],
      metadata: {},
    });

    const found = getContentById(item.id);
    expect(found).toBeDefined();
    expect(found!.title).toBe('Assignment 1');
  });

  it('returns undefined for non-existent id', () => {
    expect(getContentById('nonexistent-id')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// updateContent
// ---------------------------------------------------------------------------
describe('updateContent', () => {
  it('updates fields and sets updatedAt', () => {
    // Use fake timers to guarantee different timestamps
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));

    const item = saveContent({
      type: 'lecture',
      title: 'Original',
      markdown: '# Old',
      provider: 'minimax',
      sources: [],
      metadata: {},
    });

    // Advance time by 1 second
    vi.advanceTimersByTime(1000);

    const updated = updateContent(item.id, { title: 'Updated', markdown: '# New' });
    expect(updated).not.toBeNull();
    expect(updated!.title).toBe('Updated');
    expect(updated!.markdown).toBe('# New');
    expect(updated!.updatedAt).not.toBe(item.updatedAt);

    vi.useRealTimers();
  });

  it('returns null when id not found', () => {
    expect(updateContent('nope', { title: 'X' })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// deleteContent
// ---------------------------------------------------------------------------
describe('deleteContent', () => {
  it('removes item and returns true', () => {
    const item = saveContent({
      type: 'lecture',
      title: 'To Delete',
      markdown: '# Gone',
      provider: 'minimax',
      sources: [],
      metadata: {},
    });

    expect(deleteContent(item.id)).toBe(true);
    expect(getAllContent()).toHaveLength(0);
  });

  it('returns false when id not found', () => {
    expect(deleteContent('missing')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// deleteMultipleContent
// ---------------------------------------------------------------------------
describe('deleteMultipleContent', () => {
  it('deletes multiple items at once', () => {
    const a = saveContent({ type: 'lecture', title: 'A', markdown: '', provider: 'minimax', sources: [], metadata: {} });
    const b = saveContent({ type: 'lecture', title: 'B', markdown: '', provider: 'minimax', sources: [], metadata: {} });
    saveContent({ type: 'lecture', title: 'C', markdown: '', provider: 'minimax', sources: [], metadata: {} });

    const deleted = deleteMultipleContent([a.id, b.id]);
    expect(deleted).toBe(2);
    expect(getAllContent()).toHaveLength(1);
    expect(getAllContent()[0].title).toBe('C');
  });
});

// ---------------------------------------------------------------------------
// clearAllContent
// ---------------------------------------------------------------------------
describe('clearAllContent', () => {
  it('removes all items from storage', () => {
    saveContent({ type: 'lecture', title: 'X', markdown: '', provider: 'minimax', sources: [], metadata: {} });
    saveContent({ type: 'lecture', title: 'Y', markdown: '', provider: 'minimax', sources: [], metadata: {} });

    clearAllContent();
    expect(getAllContent()).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// searchContent
// ---------------------------------------------------------------------------
describe('searchContent', () => {
  it('finds items matching title', () => {
    saveContent({ type: 'lecture', title: 'React Hooks', markdown: '', provider: 'minimax', sources: [], metadata: {} });
    saveContent({ type: 'lecture', title: 'Vue Composables', markdown: '', provider: 'minimax', sources: [], metadata: {} });

    const results = searchContent('react');
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('React Hooks');
  });

  it('finds items matching markdown content', () => {
    saveContent({ type: 'lecture', title: 'L1', markdown: 'Learn about algorithms', provider: 'minimax', sources: [], metadata: {} });
    saveContent({ type: 'lecture', title: 'L2', markdown: 'Learn about databases', provider: 'minimax', sources: [], metadata: {} });

    const results = searchContent('algorithms');
    expect(results).toHaveLength(1);
  });

  it('finds items matching topic in metadata', () => {
    saveContent({ type: 'lecture', title: 'L1', markdown: '', provider: 'minimax', sources: [], metadata: { topic: 'Machine Learning' } });

    const results = searchContent('machine');
    expect(results).toHaveLength(1);
  });

  it('is case-insensitive', () => {
    saveContent({ type: 'lecture', title: 'TYPESCRIPT Basics', markdown: '', provider: 'minimax', sources: [], metadata: {} });

    expect(searchContent('typescript')).toHaveLength(1);
    expect(searchContent('TYPESCRIPT')).toHaveLength(1);
    expect(searchContent('TypeScript')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// importContent
// ---------------------------------------------------------------------------
describe('importContent', () => {
  it('imports new items and skips duplicates', () => {
    const existing = saveContent({ type: 'lecture', title: 'Existing', markdown: '', provider: 'minimax', sources: [], metadata: {} });

    const result = importContent([
      { ...existing, title: 'Duplicate' }, // same id — should skip
      { id: 'new-id', type: 'lecture', title: 'New', markdown: '', provider: 'minimax', sources: [], metadata: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    ]);

    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(getAllContent()).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// restoreContent
// ---------------------------------------------------------------------------
describe('restoreContent', () => {
  it('restores deleted items, skipping existing ids', () => {
    const item = saveContent({ type: 'lecture', title: 'A', markdown: '', provider: 'minimax', sources: [], metadata: {} });
    deleteContent(item.id);

    const restored = restoreContent([item]);
    expect(restored).toBe(1);
    expect(getAllContent()).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// duplicateContent
// ---------------------------------------------------------------------------
describe('duplicateContent', () => {
  it('creates a copy with "Copy of" prefix and new id', () => {
    const item = saveContent({ type: 'lecture', title: 'Original', markdown: '# Test', provider: 'minimax', sources: [], metadata: {} });
    const dup = duplicateContent(item.id);

    expect(dup).not.toBeNull();
    expect(dup!.id).not.toBe(item.id);
    expect(dup!.title).toBe('Copy of Original');
    expect(dup!.markdown).toBe('# Test');
    expect(getAllContent()).toHaveLength(2);
  });

  it('returns null for non-existent id', () => {
    expect(duplicateContent('nope')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// StorageFullError
// ---------------------------------------------------------------------------
describe('StorageFullError on quota exceeded', () => {
  it('throws StorageFullError when localStorage.setItem exceeds quota', () => {
    // Save one item first
    saveContent({ type: 'lecture', title: 'Ok', markdown: '', provider: 'minimax', sources: [], metadata: {} });

    // Now simulate quota exceeded
    mockStorage._setQuotaExceeded(true);

    expect(() => {
      saveContent({ type: 'lecture', title: 'Overflow', markdown: '', provider: 'minimax', sources: [], metadata: {} });
    }).toThrow(StorageFullError);
  });

  it('StorageFullError has correct code and message', () => {
    const err = new StorageFullError();
    expect(err.code).toBe('STORAGE_FULL');
    expect(err.message).toContain('Storage full');
    expect(err).toBeInstanceOf(Error);
  });

  it('duplicateContent throws StorageFullError on quota exceeded', () => {
    const item = saveContent({ type: 'lecture', title: 'A', markdown: '', provider: 'minimax', sources: [], metadata: {} });

    mockStorage._setQuotaExceeded(true);

    expect(() => duplicateContent(item.id)).toThrow(StorageFullError);
  });
});

// ---------------------------------------------------------------------------
// Schema corruption recovery
// ---------------------------------------------------------------------------
describe('schema corruption recovery', () => {
  it('drops items missing required fields', () => {
    // Directly set corrupted data into storage
    const corrupted = JSON.stringify([
      { id: 'valid', markdown: '# Hi', createdAt: '2024-01-01', type: 'lecture', title: 'Valid', provider: 'minimax', sources: [], metadata: {}, updatedAt: '2024-01-01' },
      { id: 123, markdown: '# Bad', createdAt: '2024-01-01' }, // id is number, not string
      { markdown: '# No ID', createdAt: '2024-01-01' },        // missing id
      null,                                                       // null entry
    ]);
    mockStorage.setItem('news13n_content', corrupted);

    const items = getAllContent();
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe('valid');
  });

  it('returns empty array for completely invalid JSON', () => {
    mockStorage.setItem('news13n_content', 'this is not json{{{');

    const items = getAllContent();
    expect(items).toEqual([]);
  });

  it('returns empty array for null storage value', () => {
    // No value set — getItem returns null
    expect(getAllContent()).toEqual([]);
  });
});
