'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Search,
  RefreshCw,
  Trash2,
  ExternalLink,
  Library,
  Calendar,
  DollarSign,
  Hash,
  Coins,
  FileText,
  BookOpen,
  ClipboardList,
  ArchiveX,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Tag,
} from 'lucide-react';

import { useGenerations } from '@/lib/hooks/use-generations';
import { useAppStore } from '@/lib/store';
import { CONTENT_TYPE_COLORS, CONTENT_TYPE_LABELS } from '@/lib/constants';
import type { ContentType } from '@/lib/types';
import type { StoredGeneration } from '@/lib/storage/db';
import { updateGenerationTags } from '@/lib/storage/db';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

const ITEMS_PER_PAGE = 6;

// ---------------------------------------------------------------------------
// Content type icons
// ---------------------------------------------------------------------------

const contentTypeIcons: Record<ContentType, React.ElementType> = {
  lecture: FileText,
  'pre-read': BookOpen,
  assignment: ClipboardList,
};

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.4,
      ease: [0.21, 0.47, 0.32, 0.98] as const,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
};

// ---------------------------------------------------------------------------
// Tag color palette — cycles through colors for visual distinction
// ---------------------------------------------------------------------------

const TAG_COLORS = [
  'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700',
  'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/40 dark:text-violet-300 dark:border-violet-700',
  'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/40 dark:text-rose-300 dark:border-rose-700',
  'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/40 dark:text-teal-300 dark:border-teal-700',
  'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700',
  'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700',
  'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-900/40 dark:text-pink-300 dark:border-pink-700',
  'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/40 dark:text-cyan-300 dark:border-cyan-700',
];

function getTagColor(tag: string): string {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash << 5) - hash + tag.charCodeAt(i);
    hash |= 0;
  }
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

// ---------------------------------------------------------------------------
// Tag Filter Bar
// ---------------------------------------------------------------------------

function TagFilterBar({
  allTags,
  selectedTags,
  onToggleTag,
  onClearTags,
}: {
  allTags: string[];
  selectedTags: Set<string>;
  onToggleTag: (tag: string) => void;
  onClearTags: () => void;
}) {
  if (allTags.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.12 }}
      className="flex flex-wrap items-center gap-2"
    >
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Tag className="h-3.5 w-3.5" />
        <span className="font-medium">Tags:</span>
      </div>
      {allTags.map((tag) => {
        const isActive = selectedTags.has(tag);
        return (
          <button
            key={tag}
            onClick={() => onToggleTag(tag)}
            className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
              isActive
                ? `${getTagColor(tag)} ring-1 ring-offset-1 ring-primary/30 dark:ring-offset-background`
                : 'border-border bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {tag}
          </button>
        );
      })}
      {selectedTags.size > 0 && (
        <button
          onClick={onClearTags}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-0.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
        >
          <X className="h-3 w-3" />
          Clear
        </button>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Inline Tag Editor (appears on card)
// ---------------------------------------------------------------------------

function InlineTagEditor({
  tags,
  onAddTag,
  onRemoveTag,
}: {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onAddTag(trimmed);
    }
    setNewTag('');
    setIsAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    } else if (e.key === 'Escape') {
      setNewTag('');
      setIsAdding(false);
    }
  };

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.slice(0, 3).map((tag) => (
        <span
          key={tag}
          className={`group/tag inline-flex items-center gap-0.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${getTagColor(tag)}`}
        >
          {tag}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveTag(tag);
            }}
            className="ml-0.5 inline-flex h-3 w-3 items-center justify-center rounded-full opacity-60 transition-opacity hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10"
          >
            <X className="h-2 w-2" />
          </button>
        </span>
      ))}
      {tags.length > 3 && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              +{tags.length - 3} more
            </span>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <div className="flex flex-wrap gap-1">
              {tags.slice(3).map((tag) => (
                <span key={tag} className="text-xs">{tag}</span>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>
      )}
      {isAdding ? (
        <input
          ref={inputRef}
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onBlur={handleAdd}
          onKeyDown={handleKeyDown}
          placeholder="Tag..."
          className="h-5 w-16 rounded-full border border-border bg-background px-2 text-[10px] outline-none focus:ring-1 focus:ring-primary/40"
        />
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsAdding(true);
              }}
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-dashed border-muted-foreground/30 text-muted-foreground/50 transition-colors hover:border-primary/50 hover:text-primary"
            >
              <Plus className="h-3 w-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Add tag</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  color,
  numericValue,
  numericFormat,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  /** If provided, the value is displayed with an AnimatedNumber counter. */
  numericValue?: number;
  /** Custom format function for AnimatedNumber. */
  numericFormat?: (n: number) => string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const }}
    >
      <Card className="relative overflow-hidden transition-shadow duration-200 hover:shadow-md">
        <CardContent className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
              <Icon className="h-4 w-4" />
            </div>
          </div>
          {numericValue !== undefined ? (
            <AnimatedNumber
              value={numericValue}
              format={numericFormat}
              duration={0.8}
              className="text-2xl font-bold tracking-tight"
            />
          ) : (
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          )}
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </CardContent>
        {/* Decorative gradient */}
        <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-[0.07] ${color}`} />
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Generation Card
// ---------------------------------------------------------------------------

function GenerationCard({
  generation,
  onOpen,
  onDelete,
  onUpdateTags,
}: {
  generation: StoredGeneration;
  onOpen: () => void;
  onDelete: () => void;
  onUpdateTags: (tags: string[]) => void;
}) {
  const contentType = generation.contentType as ContentType;
  const colors = CONTENT_TYPE_COLORS[contentType] ?? CONTENT_TYPE_COLORS['lecture'];
  const label = CONTENT_TYPE_LABELS[contentType] ?? CONTENT_TYPE_LABELS['lecture'];
  const Icon = contentTypeIcons[contentType] ?? contentTypeIcons['lecture'];

  const createdAt = new Date(generation.createdAt);
  const dateFormatted = format(createdAt, "MMM d, yyyy 'at' h:mm a");
  const timeAgo = formatDistanceToNow(createdAt, { addSuffix: true });

  const totalTokens =
    (generation.costDetails?.totalInputTokens || 0) +
    (generation.costDetails?.totalOutputTokens || 0);
  const cost = generation.costDetails?.totalCost || 0;

  return (
    <motion.div
      variants={cardVariants}
      layout
      whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
    >
      <Card className="group relative flex h-full flex-col overflow-hidden transition-shadow duration-300 hover:shadow-md dark:hover:shadow-lg dark:hover:shadow-primary/5">
        {/* Color accent top border */}
        <div className={`h-1 w-full ${colors.bg.replace('/10', '/40')}`} />

        <CardContent className="flex flex-1 flex-col gap-4 pt-5">
          {/* Header: Topic name and delete button */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 space-y-2">
              <h3 className="line-clamp-2 text-lg font-semibold leading-tight tracking-tight">
                {generation.topic}
              </h3>
              <Badge
                className={`${colors.badge} border-0 text-[11px] font-semibold uppercase tracking-wider`}
              >
                <Icon className="mr-1 h-3 w-3" />
                {label}
              </Badge>
            </div>

            <AlertDialog>
              <Tooltip>
                <TooltipTrigger asChild>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="shrink-0 text-muted-foreground/50 opacity-70 transition-all hover:text-destructive hover:opacity-100 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                </TooltipTrigger>
                <TooltipContent>Delete generation</TooltipContent>
              </Tooltip>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Generation</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this {label.toLowerCase()} for
                    &apos;{generation.topic}&apos;? This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    onClick={onDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Metadata */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{dateFormatted}</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Hash className="h-3.5 w-3.5 shrink-0" />
                {totalTokens.toLocaleString()} tokens
              </span>
              <span className="flex items-center gap-1.5">
                <Coins className="h-3.5 w-3.5 shrink-0" />
                ${cost.toFixed(4)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground/70">{timeAgo}</p>
          </div>

          {/* Tags */}
          <InlineTagEditor
            tags={generation.tags ?? []}
            onAddTag={(tag) => {
              const current = generation.tags ?? [];
              onUpdateTags([...current, tag]);
            }}
            onRemoveTag={(tag) => {
              const current = generation.tags ?? [];
              onUpdateTags(current.filter((t) => t !== tag));
            }}
          />

          {/* Subtopics preview */}
          {(() => {
            const subtopics = Array.isArray(generation.subtopics) ? generation.subtopics : [];
            return subtopics.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {subtopics.slice(0, 3).map((subtopic, i) => (
                  <span
                    key={i}
                    className="inline-flex max-w-[140px] truncate rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {subtopic}
                  </span>
                ))}
                {subtopics.length > 3 && (
                  <span className="inline-flex rounded-md bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                    +{subtopics.length - 3} more
                  </span>
                )}
              </div>
            ) : null;
          })()}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Open button */}
          <Separator />
          <Button
            onClick={onOpen}
            className="w-full gap-2"
            variant="outline"
          >
            <ExternalLink className="h-4 w-4" />
            Open in Editor
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Stat Card
// ---------------------------------------------------------------------------

function StatCardSkeleton() {
  return (
    <Card className="relative overflow-hidden">
      <CardContent className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-9 rounded-lg" />
        </div>
        <Skeleton className="mt-1 h-8 w-20" />
        <Skeleton className="mt-1 h-3 w-32" />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Skeleton Search Bar
// ---------------------------------------------------------------------------

function SearchBarSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-9 flex-1 rounded-md" />
      <Skeleton className="h-9 w-9 rounded-md" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Loading Skeleton Cards
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="h-1 w-full animate-pulse bg-muted" />
          <CardContent className="flex flex-col gap-4 pt-5">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="flex gap-1">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
            </div>
            <Separator />
            <Skeleton className="h-9 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full-page loading skeleton (stat cards + search bar + generation cards)
// ---------------------------------------------------------------------------

function ArchivesPageSkeleton() {
  return (
    <>
      {/* Skeleton stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Skeleton search bar */}
      <SearchBarSkeleton />

      {/* Skeleton generation cards */}
      <LoadingSkeleton />
    </>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] as const }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-muted">
        <ArchiveX className="h-10 w-10 text-muted-foreground/50" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">
        {filtered ? 'No matching generations' : 'No generations yet'}
      </h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        {filtered
          ? 'Try adjusting your search term, changing the content type filter, or clearing selected tags.'
          : 'Your generated content will appear here. Head to the editor to create your first generation.'}
      </p>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Archives Content Component
// ---------------------------------------------------------------------------

export function ArchivesContent() {
  const router = useRouter();
  const store = useAppStore();
  const { generations, loading, count, totalCost, latestDate, refresh, remove } =
    useGenerations();

  // Search state with debounce
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Debounce search input and reset page when debounced query changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery((prev) => {
        const next = searchQuery;
        if (prev !== next) setCurrentPage(1);
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Wrap tab change to also reset page
  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value);
    setCurrentPage(1);
  }, []);

  // Collect all unique tags across generations (sorted alphabetically)
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    for (const gen of generations) {
      if (gen.tags) {
        for (const tag of gen.tags) tagSet.add(tag);
      }
    }
    return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
  }, [generations]);

  // Tag filter handlers
  const handleToggleTag = useCallback((tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
    setCurrentPage(1);
  }, []);

  const handleClearTags = useCallback(() => {
    setSelectedTags(new Set());
    setCurrentPage(1);
  }, []);

  // Handle updating tags on a generation (persist to IndexedDB and refresh)
  const handleUpdateTags = useCallback(
    async (id: number, tags: string[]) => {
      await updateGenerationTags(id, tags);
      await refresh();
    },
    [refresh]
  );

  // Filter generations
  const filteredGenerations = useMemo(() => {
    return generations.filter((gen) => {
      // Content type filter
      if (activeTab !== 'all' && gen.contentType !== activeTab) {
        return false;
      }
      // Search filter
      if (debouncedQuery) {
        if (!gen.topic.toLowerCase().includes(debouncedQuery.toLowerCase())) {
          return false;
        }
      }
      // Tag filter (match ANY selected tag)
      if (selectedTags.size > 0) {
        const genTags = gen.tags ?? [];
        if (!genTags.some((t) => selectedTags.has(t))) {
          return false;
        }
      }
      return true;
    });
  }, [generations, activeTab, debouncedQuery, selectedTags]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredGenerations.length / ITEMS_PER_PAGE));
  const paginatedGenerations = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredGenerations.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredGenerations, currentPage]);

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  // Handle refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Handle opening a generation in the editor
  const handleOpen = (gen: StoredGeneration) => {
    store.setTopic(gen.topic);
    store.setSubtopics(Array.isArray(gen.subtopics) ? gen.subtopics.join('\n') : (gen.subtopics ?? ''));
    store.setContentType(gen.contentType);
    store.setContent(gen.content);
    if (gen.gapAnalysis) store.setGapAnalysis(gen.gapAnalysis);
    if (gen.questions) store.setQuestions(gen.questions);
    store.setCostDetails(gen.costDetails);
    store.setActiveGenerationId(gen.id!);
    if (gen.transcript) store.setTranscript(gen.transcript);
    if (gen.instructorQuality) store.setInstructorQuality(gen.instructorQuality);
    router.push('/editor');
  };

  // Handle deleting a generation
  const handleDelete = async (id: number) => {
    await remove(id);
  };

  // Format latest date
  const latestDateFormatted = latestDate
    ? format(new Date(latestDate), "MMM d, yyyy")
    : 'No generations';

  const isFiltered = debouncedQuery.length > 0 || activeTab !== 'all' || selectedTags.size > 0;

  return (
    <div className="flex flex-col gap-8 p-6 lg:p-8">
      {/* --------------------------------------------------------------- */}
      {/* Page Header                                                      */}
      {/* --------------------------------------------------------------- */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Library className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
              Library
            </h1>
            <p className="text-sm text-muted-foreground">
              Your saved content generations
            </p>
          </div>
        </div>
      </motion.div>

      {/* --------------------------------------------------------------- */}
      {/* Show full-page skeleton while data loads from IndexedDB          */}
      {/* --------------------------------------------------------------- */}
      {loading ? (
        <ArchivesPageSkeleton />
      ) : (
        <>
          {/* --------------------------------------------------------------- */}
          {/* Stat Cards                                                       */}
          {/* --------------------------------------------------------------- */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Generations"
              value={count.toString()}
              numericValue={count}
              numericFormat={(n) => Math.round(n).toString()}
              subtitle={`Out of 50 max capacity`}
              icon={Hash}
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              label="Latest Generation"
              value={latestDateFormatted}
              subtitle={
                latestDate
                  ? formatDistanceToNow(new Date(latestDate), { addSuffix: true })
                  : undefined
              }
              icon={Calendar}
              color="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Total Cost"
              value={`$${totalCost.toFixed(4)}`}
              numericValue={totalCost}
              numericFormat={(n) => `$${n.toFixed(4)}`}
              subtitle="Cumulative API usage"
              icon={DollarSign}
              color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
          </div>

          {/* --------------------------------------------------------------- */}
          {/* Search Bar                                                       */}
          {/* --------------------------------------------------------------- */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="flex items-center gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by topic name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw
                    className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh from storage</TooltipContent>
            </Tooltip>
          </motion.div>

          {/* --------------------------------------------------------------- */}
          {/* Tag Filter Bar                                                   */}
          {/* --------------------------------------------------------------- */}
          {allTags.length > 0 && (
            <TagFilterBar
              allTags={allTags}
              selectedTags={selectedTags}
              onToggleTag={handleToggleTag}
              onClearTags={handleClearTags}
            />
          )}

          {/* --------------------------------------------------------------- */}
          {/* Filter Tabs + Content                                            */}
          {/* --------------------------------------------------------------- */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Tabs value={activeTab} onValueChange={handleTabChange}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  {activeTab === 'all' && count > 0 && (
                    <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                      {count}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="lecture">
                  <FileText className="mr-1 h-3.5 w-3.5" />
                  Lecture
                </TabsTrigger>
                <TabsTrigger value="pre-read">
                  <BookOpen className="mr-1 h-3.5 w-3.5" />
                  Pre-Read
                </TabsTrigger>
                <TabsTrigger value="assignment">
                  <ClipboardList className="mr-1 h-3.5 w-3.5" />
                  Assignment
                </TabsTrigger>
              </TabsList>

              {/* Shared content area for all tabs */}
              <div className="mt-6">
                {filteredGenerations.length === 0 ? (
                  <EmptyState filtered={isFiltered} />
                ) : (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`${activeTab}-${debouncedQuery}-${currentPage}`}
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3"
                      >
                        {paginatedGenerations.map((gen) => (
                          <GenerationCard
                            key={gen.id}
                            generation={gen}
                            onOpen={() => handleOpen(gen)}
                            onDelete={() => handleDelete(gen.id!)}
                            onUpdateTags={(tags) => handleUpdateTags(gen.id!, tags)}
                          />
                        ))}
                      </motion.div>
                    </AnimatePresence>

                    {/* Pagination controls */}
                    {totalPages > 1 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.25 }}
                        className="mt-8 flex items-center justify-center gap-3"
                      >
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handlePreviousPage}
                          disabled={currentPage === 1}
                          className="gap-1.5"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Previous
                        </Button>
                        <span className="min-w-[100px] text-center text-sm text-muted-foreground">
                          Page {currentPage} of {totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          className="gap-1.5"
                        >
                          Next
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            </Tabs>
          </motion.div>

          {/* --------------------------------------------------------------- */}
          {/* Footer info                                                      */}
          {/* --------------------------------------------------------------- */}
          {count > 0 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-center text-xs text-muted-foreground/60"
            >
              Showing {paginatedGenerations.length} of {filteredGenerations.length}
              {isFiltered ? ' matching' : ''} generation{filteredGenerations.length !== 1 ? 's' : ''}
              {isFiltered && filteredGenerations.length !== count ? ` (${count} total)` : ''}.
              Storage auto-prunes at 50 entries.
            </motion.p>
          )}
        </>
      )}
    </div>
  );
}
