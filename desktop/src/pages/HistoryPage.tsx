import { useState, useEffect, useMemo, useCallback } from 'react';
import { getGenerations, deleteGeneration, toggleFavorite } from '../lib/database';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { useStore } from '../store';
import type { Generation, ContentMode } from '../types';

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(dateStr).toLocaleDateString();
}

const MODE_BADGE: Record<ContentMode, { label: string; className: string }> = {
  lecture: { label: 'Lecture', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  'pre-read': { label: 'Pre-Read', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  assignment: { label: 'Assignment', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
};

export function HistoryPage() {
  const { addToast, navigate, startGeneration } = useStore();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [modeFilter, setModeFilter] = useState<ContentMode | 'all'>('all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const loadGenerations = useCallback(async () => {
    const data = await getGenerations({
      search: search.trim() || undefined,
      mode: modeFilter !== 'all' ? modeFilter : undefined,
      favorite: showFavoritesOnly || undefined,
    });
    setGenerations(data);
    if (data.length > 0 && !data.some((g) => g.id === selectedId)) {
      setSelectedId(data[0].id);
    }
  }, [search, modeFilter, showFavoritesOnly, selectedId]);

  useEffect(() => { loadGenerations(); }, [loadGenerations]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteGeneration(id);
    if (selectedId === id) setSelectedId(null);
    await loadGenerations();
    addToast({ type: 'success', message: 'Generation deleted' });
  }, [selectedId, loadGenerations, addToast]);

  const handleToggleFavorite = useCallback(async (id: string) => {
    await toggleFavorite(id);
    await loadGenerations();
  }, [loadGenerations]);

  const handleCopy = useCallback(async () => {
    const gen = generations.find((g) => g.id === selectedId);
    if (gen?.final_content) {
      await navigator.clipboard.writeText(gen.final_content);
      addToast({ type: 'success', message: 'Copied to clipboard' });
    }
  }, [selectedId, generations, addToast]);

  const handleExport = useCallback(() => {
    const gen = generations.find((g) => g.id === selectedId);
    if (!gen?.final_content) return;
    const blob = new Blob([gen.final_content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${gen.topic}-${gen.mode}.md`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', message: 'Exported as Markdown' });
  }, [selectedId, generations, addToast]);

  const handleReGenerate = useCallback(() => {
    const gen = generations.find((g) => g.id === selectedId);
    if (!gen) return;
    navigate('editor');
    // delay so the editor page mounts
    setTimeout(() => {
      startGeneration({
        topic: gen.topic,
        subtopics: gen.subject || '',
        mode: gen.mode,
      });
    }, 100);
  }, [selectedId, generations, navigate, startGeneration]);

  const selected = generations.find((g) => g.id === selectedId);

  const wordCount = useMemo(() => {
    if (!selected?.final_content) return 0;
    return selected.final_content.trim().split(/\s+/).length;
  }, [selected]);

  return (
    <div className="flex h-full" style={{ paddingTop: '38px' }}>
      {/* Master list */}
      <div className="w-[320px] flex-shrink-0 overflow-y-auto border-r border-border bg-card/30">
        {/* Search & filters */}
        <div className="sticky top-0 bg-card/95 backdrop-blur-sm z-10 p-3 border-b border-border space-y-2">
          <div className="relative">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search generations..."
              className="w-full rounded-lg border border-input bg-background pl-8 pr-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {(['all', 'lecture', 'pre-read', 'assignment'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setModeFilter(m)}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  modeFilter === m
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                }`}
              >
                {m === 'all' ? 'All' : MODE_BADGE[m].label}
              </button>
            ))}
            <button
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className={`ml-auto rounded-full px-2 py-1 text-[11px] transition-colors ${
                showFavoritesOnly
                  ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
              title="Show favorites only"
            >
              {showFavoritesOnly ? '★' : '☆'}
            </button>
          </div>
        </div>

        {/* Generation list */}
        {generations.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted mb-3">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
            <p className="text-sm font-medium text-foreground">No generations yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Content you generate will appear here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-1 p-2">
            {generations.map((gen) => {
              const isSelected = selectedId === gen.id;
              const badge = MODE_BADGE[gen.mode];
              return (
                <button
                  key={gen.id}
                  onClick={() => setSelectedId(gen.id)}
                  className={`group relative rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-primary/30 bg-primary/5 shadow-sm'
                      : 'border-transparent hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground truncate leading-snug">{gen.topic || gen.title}</span>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleToggleFavorite(gen.id); }}
                        className={`rounded-md p-0.5 transition-colors ${
                          gen.is_favorite === 1
                            ? 'text-yellow-500'
                            : 'text-muted-foreground/40 hover:text-yellow-500 opacity-0 group-hover:opacity-100'
                        }`}
                      >
                        {gen.is_favorite === 1 ? '★' : '☆'}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(gen.id); }}
                        className="rounded-md p-0.5 text-muted-foreground/40 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px]">
                    <span className={`rounded-full px-2 py-0.5 font-medium ${badge.className}`}>{badge.label}</span>
                    <span className="text-muted-foreground">{relativeTime(gen.created_at)}</span>
                    {gen.provider && (
                      <span className="text-muted-foreground/60 capitalize">{gen.provider}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Detail view */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Detail toolbar */}
            <div className="flex items-center justify-between border-b border-border px-6 py-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-foreground truncate">{selected.topic || selected.title}</h2>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className={`rounded-full px-2 py-0.5 font-medium ${MODE_BADGE[selected.mode].className}`}>
                    {MODE_BADGE[selected.mode].label}
                  </span>
                  <span>{new Date(selected.created_at).toLocaleString()}</span>
                  <span>{wordCount.toLocaleString()} words</span>
                  {selected.provider && <span className="capitalize">{selected.provider} · {selected.model}</span>}
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={handleCopy}
                  className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  title="Copy to clipboard"
                >
                  Copy
                </button>
                <button
                  onClick={handleExport}
                  className="rounded-lg border border-input px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
                  title="Export as markdown"
                >
                  Export
                </button>
                <button
                  onClick={handleReGenerate}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Re-generate
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-3xl px-8 py-6">
                <MarkdownRenderer content={selected.final_content || ''} />
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <p className="text-sm font-medium text-foreground">Select a generation</p>
              <p className="mt-1 text-xs text-muted-foreground">Choose from the list to preview</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
