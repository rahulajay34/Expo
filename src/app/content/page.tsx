'use client';

import { useState, useMemo, useEffect } from 'react';
import { getAllContent, deleteMultipleContent, searchContent } from '@/lib/storage';
import { ContentItem, ContentType } from '@/lib/types';
import { ContentCard } from '@/components/ContentCard';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

type SortOption = 'newest' | 'oldest' | 'az';

const FILTER_OPTIONS: { id: ContentType | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'lecture', label: 'Lecture Notes' },
  { id: 'pre-lecture', label: 'Pre-Lecture' },
  { id: 'assignment', label: 'Assignments' },
];

export default function ContentPage() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<ContentType | 'all'>('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { showToast } = useToast();

  useEffect(() => {
    setItems(getAllContent());
    setIsLoading(false);
  }, []);

  const filtered = useMemo(() => {
    let result = search.trim() ? searchContent(search) : [...items];

    if (filterType !== 'all') {
      result = result.filter((item) => item.type === filterType);
    }

    result = result.sort((a, b) => {
      if (sort === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return a.title.localeCompare(b.title);
    });

    return result;
  }, [items, search, filterType, sort]);

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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-border bg-white shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-text-primary">Content Library</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            {items.length} item{items.length !== 1 ? 's' : ''} saved
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
      <div className="px-8 py-3 border-b border-border bg-sidebar/30 shrink-0 space-y-3">
        <Input
          placeholder="Search by title, topic, or content..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
        <div className="flex items-center gap-3 flex-wrap">
          {/* Type filters */}
          <div className="flex items-center gap-1.5">
            {FILTER_OPTIONS.map(({ id, label }) => (
              <button
                key={id}
                onClick={() => setFilterType(id)}
                className={`px-3 py-1 text-xs rounded-full transition-colors font-medium ${
                  filterType === id
                    ? 'bg-accent text-white'
                    : 'bg-white text-text-secondary border border-border hover:text-text-primary hover:border-accent/40'
                }`}
              >
                {label}
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

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortOption)}
            className="text-xs border border-border rounded-md px-2 py-1.5 bg-white text-text-primary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="az">A–Z</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto px-8 py-6">
        {isLoading && items.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="p-4 rounded-lg border border-border bg-white animate-pulse">
                {/* Title bar */}
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-3" />
                {/* Metadata bar */}
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                {/* Topic bar */}
                <div className="h-3 bg-gray-200 rounded w-1/4" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            {items.length === 0 ? (
              <>
                <div className="text-5xl mb-4">📚</div>
                <h2 className="text-lg font-semibold text-text-primary mb-1">No content yet</h2>
                <p className="text-sm text-text-secondary mb-6 max-w-xs">
                  Generate your first educational content to start building your library.
                </p>
                <Link href="/">
                  <Button>✦ Generate Content</Button>
                </Link>
              </>
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((item) => (
              <ContentCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onSelect={handleSelect}
              />
            ))}
          </div>
        )}
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
