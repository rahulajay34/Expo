'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { getAllContent, deleteMultipleContent, searchContent, duplicateContent, updateContent } from '@/lib/storage';
import { cn, getErrorMessage, countWords } from '@/lib/utils';
import { ContentItem, ContentType } from '@/lib/types';
import { ContentCard } from '@/components/ContentCard';
import { ContentListItem } from '@/components/ContentListItem';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';
import { ErrorBoundary } from '@/components/ErrorBoundary';

type SortOption = 'newest' | 'oldest' | 'az' | 'longest';
type DateFilter = 'all' | '7d' | '30d' | '90d';

const FILTER_OPTIONS: { id: ContentType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'lecture', label: 'Lecture Notes' },
  { id: 'pre-lecture', label: 'Pre-Lecture' },
  { id: 'assignment', label: 'Assignments' },
];

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [hydrated, setHydrated] = useState(false);

  // Load from localStorage/sessionStorage after hydration
  useEffect(() => {
    setItems(getAllContent());
    const savedFilter = sessionStorage.getItem('content_filter') as ContentType | 'all';
    if (savedFilter) setFilterType(savedFilter);
    const savedSort = sessionStorage.getItem('content_sort') as SortOption;
    if (savedSort) setSort(savedSort);
    const savedView = sessionStorage.getItem('content_view') as 'grid' | 'list';
    if (savedView) setViewMode(savedView);
    setHydrated(true);
  }, []);
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { showToast } = useToast();
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => { if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current); };
  }, [search]);

  // Persist filter and sort to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('content_filter', filterType);
  }, [filterType]);

  useEffect(() => {
    sessionStorage.setItem('content_sort', sort);
  }, [sort]);

  useEffect(() => {
    sessionStorage.setItem('content_view', viewMode);
  }, [viewMode]);

  const filtered = useMemo(() => {
    let result = debouncedSearch.trim() ? searchContent(debouncedSearch) : [...items];

    if (filterType !== 'all') {
      result = result.filter((item) => item.type === filterType);
    }

    if (dateFilter !== 'all') {
      const now = Date.now();
      const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
      const cutoff = now - days * 24 * 60 * 60 * 1000;
      result = result.filter((item) => new Date(item.createdAt).getTime() >= cutoff);
    }

    result = result.sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === 'longest') return b.markdown.length - a.markdown.length;
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [items, debouncedSearch, filterType, sort, dateFilter]);

  const { lectureCount, preLectureCount, assignmentCount, totalWords } = useMemo(() => {
    return {
      lectureCount: items.filter(i => i.type === 'lecture').length,
      preLectureCount: items.filter(i => i.type === 'pre-lecture').length,
      assignmentCount: items.filter(i => i.type === 'assignment').length,
      totalWords: items.reduce((sum, i) => sum + countWords(i.markdown), 0),
    };
  }, [items]);

  const handleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map(i => i.id)));
    }
  };

  const handleDelete = () => {
    const count = selectedIds.size;
    deleteMultipleContent(Array.from(selectedIds));
    setItems(getAllContent());
    setSelectedIds(new Set());
    setShowDeleteModal(false);
    showToast(`Deleted ${count} item${count !== 1 ? 's' : ''}`, 'success');
  };

  const handleDuplicate = (id: string) => {
    try {
      duplicateContent(id);
      setItems(getAllContent());
      showToast('Content duplicated — find it at the top of your library', 'success');
    } catch (err) {
      const msg = getErrorMessage(err);
      if (msg.includes('Storage full')) {
        showToast('Storage full — please delete old content before duplicating', 'error');
      } else {
        showToast('Failed to duplicate content', 'error');
      }
    }
  };

  const handleRename = (id: string, title: string) => {
    updateContent(id, { title });
    setItems(getAllContent());
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b border-border bg-background shrink-0 gap-2 sm:gap-0">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Content Library</h1>
          <p className="text-xs text-text-secondary mt-0.5 flex items-center gap-2 sm:gap-4 flex-wrap">
            <span>{items.length} total</span>
            <span>📖 {lectureCount}</span>
            <span>🔍 {preLectureCount}</span>
            <span>📝 {assignmentCount}</span>
            <span className="hidden sm:inline">~{totalWords.toLocaleString()} words</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-text-secondary">{selectedIds.size} selected</span>
              <Button variant="danger" size="sm" onClick={() => setShowDeleteModal(true)}>
                Delete Selected
              </Button>
            </>
          )}
          <Link href="/">
            <Button size="sm">+ Generate New</Button>
          </Link>
        </div>
      </header>

      {/* Filters */}
      <div className="px-4 sm:px-8 py-3 border-b border-border bg-sidebar/30 shrink-0 space-y-3">
        <Input
          placeholder="Search by title, topic, or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:max-w-md"
        />
        <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 sm:flex-wrap">
          {/* Type filters */}
          <div className="flex items-center gap-1.5 shrink-0">
            {FILTER_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilterType(id)}
                className={`px-3 py-1.5 sm:py-1 text-xs rounded-full transition-colors font-medium whitespace-nowrap min-h-[36px] sm:min-h-0 ${
                  filterType === id
                    ? 'bg-accent text-white'
                    : 'bg-background text-text-secondary border border-border hover:text-text-primary hover:border-accent/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date filters */}
          <div className="flex items-center gap-1.5 border-l border-border pl-3 shrink-0">
            {(['all', '7d', '30d', '90d'] as const).map((df) => (
              <button
                key={df}
                onClick={() => setDateFilter(df)}
                className={`px-3 py-1.5 sm:py-1 text-xs rounded-full transition-colors font-medium whitespace-nowrap min-h-[36px] sm:min-h-0 ${
                  dateFilter === df
                    ? 'bg-accent text-white'
                    : 'bg-background text-text-secondary border border-border hover:text-text-primary hover:border-accent/40'
                }`}
              >
                {df === 'all' ? 'All' : `Last ${df}`}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Select all */}
          {filtered.length > 0 && (
            <button
              onClick={handleSelectAll}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              {selectedIds.size === filtered.length ? 'Deselect all' : 'Select all'}
            </button>
          )}

          {/* View toggle */}
          <div className="flex items-center border border-border rounded-md overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 transition-colors',
                viewMode === 'grid' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-sidebar'
              )}
              title="Grid view"
              aria-label="Grid view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" />
                <rect x="14" y="3" width="7" height="7" />
                <rect x="3" y="14" width="7" height="7" />
                <rect x="14" y="14" width="7" height="7" />
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-1.5 transition-colors border-l border-border',
                viewMode === 'list' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-sidebar'
              )}
              title="List view"
              aria-label="List view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
            </button>
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="text-xs border border-border rounded-md px-2 py-1.5 bg-background text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="longest">Longest first</option>
            <option value="az">A–Z</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-4 sm:px-8 py-4 sm:py-6">
        <ErrorBoundary label="Content library failed to load">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                {/* Animated floating documents */}
                <div className="relative w-24 h-24 mb-6">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-14 h-18 rounded-md border-2 border-border bg-sidebar animate-float-slow" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center -translate-x-3 translate-y-1">
                    <div className="w-14 h-18 rounded-md border-2 border-border bg-sidebar animate-float-medium opacity-60" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center translate-x-3 translate-y-2">
                    <div className="w-14 h-18 rounded-md border-2 border-border bg-sidebar animate-float-fast opacity-40" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-text-primary mb-2">No content yet</h3>
                <p className="text-sm text-text-secondary text-center max-w-sm">
                  Generate your first content to see it here. Head to the Generate page to get started.
                </p>
              </div>
            ) : (
              <>
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-sm text-text-secondary">No results for &ldquo;{search || filterType}&rdquo;</p>
                <button
                  onClick={() => { setSearch(''); setFilterType('all'); }}
                  className="text-xs text-accent hover:underline mt-2"
                >
                  Clear filters
                </button>
              </>
            )}
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onSelect={handleSelect}
                onDuplicate={handleDuplicate}
                onRename={handleRename}
              />
            ))}
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden bg-background dark:bg-card-bg">
            {/* List header */}
            <div className="flex items-center gap-4 px-4 py-2 bg-sidebar/50 border-b border-border text-xs text-text-secondary font-medium">
              <span className="w-5" /> {/* checkbox spacer */}
              <span className="flex-1">Title</span>
              <span className="w-24">Type</span>
              <span className="w-28">Date</span>
              <span className="w-24">Words</span>
              <span className="w-16">Files</span>
              <span className="w-16" /> {/* actions spacer */}
            </div>
            {filtered.map((item) => (
              <ContentListItem
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onSelect={handleSelect}
                onDuplicate={handleDuplicate}
                onRename={handleRename}
              />
            ))}
          </div>
        )}
        </ErrorBoundary>
      </div>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Content"
      >
        <p className="text-sm text-text-secondary mb-6">
          Are you sure you want to delete <strong>{selectedIds.size}</strong> item{selectedIds.size !== 1 ? 's' : ''}?
          This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
