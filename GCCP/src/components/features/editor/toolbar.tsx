'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Download,
  Sparkles,
  Square,
  ScrollText,
  FileDown,
  Loader2,
  Timer,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Wand2,
  Maximize2,
  Image as ImageIcon,
  Layers,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
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
import { AnimatedButton } from '@/components/ui/animated-button';
import { useAppStore } from '@/lib/store';
import { usePipeline } from '@/lib/hooks/use-pipeline';
import { exportToPDF, formatTranscript } from '@/lib/utils/index';
import { AGENT_COLORS } from '@/lib/constants';
import { getInputZoneValidation } from './input-zone';
import { TranscriptDropZone } from './transcript-drop-zone';
import { InsertImageDialog } from './insert-image-dialog';

const LONG_TRANSCRIPT_THRESHOLD = 5000;
const COLLAPSED_LINE_COUNT = 5;

const COOLDOWN_SECONDS = 5;

export function Toolbar() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const wasGeneratingRef = useRef(false);

  const topic = useAppStore((s) => s.topic);
  const transcript = useAppStore((s) => s.transcript);
  const setTranscript = useAppStore((s) => s.setTranscript);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const currentAgent = useAppStore((s) => s.currentAgent);
  const content = useAppStore((s) => s.content);
  const contentType = useAppStore((s) => s.contentType);
  const questions = useAppStore((s) => s.questions);
  const batchMode = useAppStore((s) => s.batchMode);
  const batchProgress = useAppStore((s) => s.batchProgress);
  const batchTotal = useAppStore((s) => s.batchTotal);

  const { startGeneration, stopGeneration, startBatchGeneration } = usePipeline();

  const handleGenerate = () => {
    const validation = getInputZoneValidation();
    if (validation && !validation.validate()) {
      return;
    }

    if (batchMode) {
      const topics = validation?.getBatchTopics() ?? [];
      if (topics.length > 0) {
        startBatchGeneration(topics);
      }
    } else {
      startGeneration();
    }
  };

  // Start a 5-second cooldown when generation transitions from true -> false
  useEffect(() => {
    if (wasGeneratingRef.current && !isGenerating) {
      // Use queueMicrotask so the setState is not synchronous within the effect body
      queueMicrotask(() => setCooldown(COOLDOWN_SECONDS));
    }
    wasGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Tick down the cooldown counter every second
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const isCoolingDown = cooldown > 0;

  // Word count and line count for the transcript draft
  const wordCount = useMemo(() => {
    if (!transcriptDraft) return 0;
    return transcriptDraft.split(/\s+/).filter(Boolean).length;
  }, [transcriptDraft]);

  const isLongTranscript = wordCount > LONG_TRANSCRIPT_THRESHOLD;

  const transcriptLines = useMemo(() => {
    return transcriptDraft.split('\n');
  }, [transcriptDraft]);

  const needsCollapse = transcriptLines.length > COLLAPSED_LINE_COUNT;

  const handleOpenSheet = () => {
    setTranscriptDraft(transcript);
    setTranscriptExpanded(false);
    setSheetOpen(true);
  };

  const handleSaveTranscript = () => {
    setTranscript(transcriptDraft);
    setSheetOpen(false);
  };

  const handleFileContent = useCallback((fileContent: string, _fileName: string) => {
    setTranscriptDraft(fileContent);
    // Expand if the content is short enough, otherwise collapse
    setTranscriptExpanded(fileContent.split('\n').length <= COLLAPSED_LINE_COUNT);
  }, []);

  const handleAutoFormat = useCallback(() => {
    setTranscriptDraft((prev) => formatTranscript(prev));
  }, []);

  const handleSaveMarkdown = () => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic || 'content'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportPdf = () => {
    exportToPDF();
  };

  const handleExportCsv = () => {
    if (questions.length === 0) return;
    const headers = [
      'Type',
      'Question',
      'Option A',
      'Option B',
      'Option C',
      'Option D',
      'Correct Answer',
      'Explanation',
    ];
    const rows = questions.map((q) => [
      q.type,
      q.question,
      q.optionA,
      q.optionB,
      q.optionC,
      q.optionD,
      q.correctAnswer,
      q.explanation,
    ]);
    const csvContent = [
      headers.join(','),
      ...rows.map((row) =>
        row.map((cell) => `"${(cell || '').replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic || 'assignment'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const agentColors = currentAgent ? AGENT_COLORS[currentAgent] : null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.1 }}
        className="flex flex-wrap items-center gap-2"
      >
        {/* Transcript buttons */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenSheet}
              disabled={isGenerating}
              className="gap-1.5"
            >
              <ScrollText className="size-3.5" />
              <span className="hidden sm:inline">Add Transcript</span>
              <span className="sm:hidden">Transcript</span>
              {transcript && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  Added
                </Badge>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            Add a lecture transcript for context-aware generation
          </TooltipContent>
        </Tooltip>

        {/* Export dropdown */}
        <DropdownMenu>
          <AnimatedButton>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    disabled={!content && questions.length === 0}
                  >
                    <Download className="size-3.5" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Export generated content</TooltipContent>
            </Tooltip>
          </AnimatedButton>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleSaveMarkdown} disabled={!content}>
              <FileText className="size-4" />
              Save as .md
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPdf} disabled={!content}>
              <FileDown className="size-4" />
              Export as PDF
            </DropdownMenuItem>
            {contentType === 'assignment' && (
              <DropdownMenuItem
                onClick={handleExportCsv}
                disabled={questions.length === 0}
              >
                <FileDown className="size-4" />
                Export CSV
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Insert Image */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImageDialogOpen(true)}
              disabled={isGenerating}
              className="gap-1.5"
            >
              <ImageIcon className="size-3.5" />
              <span className="hidden sm:inline">Image</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Insert an image from URL or device</TooltipContent>
        </Tooltip>

        {/* Focus mode toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => useAppStore.getState().toggleFocusMode()}
              disabled={!content}
              className="gap-1.5"
            >
              <Maximize2 className="size-3.5" />
              <span className="hidden sm:inline">Focus</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Focus mode — distraction-free editing</TooltipContent>
        </Tooltip>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Batch progress indicator */}
        <AnimatePresence>
          {batchMode && isGenerating && batchTotal > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="flex items-center gap-2"
            >
              <Layers className="size-3.5 text-primary" />
              <span className="text-xs font-medium text-foreground">
                Batch: {batchProgress + 1}/{batchTotal}
              </span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{
                    width: `${((batchProgress + 1) / batchTotal) * 100}%`,
                  }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Generate / Stop buttons */}
        <div className="flex items-center gap-2">
          <AnimatePresence mode="wait">
            {isGenerating && (
              <motion.div
                key="stop"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="gap-1.5"
                        >
                          <Square className="size-3" />
                          Stop
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Stop the current generation</TooltipContent>
                  </Tooltip>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Stop Generation?</AlertDialogTitle>
                      <AlertDialogDescription>
                        The pipeline is currently running. Stopping will lose all
                        progress for unfinished agents.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Continue Generating</AlertDialogCancel>
                      <AlertDialogAction
                        variant="destructive"
                        onClick={stopGeneration}
                      >
                        Stop
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatedButton>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  disabled={isGenerating || isCoolingDown}
                  onClick={handleGenerate}
                  className={`btn-press icon-hover-spin gap-1.5 transition-all duration-300 ${
                    isGenerating && agentColors
                      ? 'bg-amber-600 hover:bg-amber-700 dark:bg-amber-600 dark:hover:bg-amber-700'
                      : ''
                  }`}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" />
                      <span className="max-w-[120px] truncate text-xs">
                        {currentAgent || 'Starting...'}
                      </span>
                    </>
                  ) : isCoolingDown ? (
                    <>
                      <Timer className="size-3.5" />
                      {cooldown}s
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3.5" />
                      {batchMode ? 'Generate Batch' : 'Generate'}
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Generate content using the 7-agent AI pipeline
              </TooltipContent>
            </Tooltip>
          </AnimatedButton>
        </div>
      </motion.div>

      {/* Insert Image Dialog */}
      <InsertImageDialog open={imageDialogOpen} onOpenChange={setImageDialogOpen} />

      {/* Transcript Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <ScrollText className="size-5" />
              Lecture Transcript
            </SheetTitle>
            <SheetDescription>
              Paste text, type, or upload a transcript file (.txt, .srt, .vtt).
              This is optional but significantly improves output quality by
              enabling gap analysis.
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-3 px-4">
            {/* Drop zone for file upload */}
            <TranscriptDropZone
              onFileContent={handleFileContent}
              disabled={isGenerating}
            />

            {/* Textarea with expand/collapse */}
            <div className="relative">
              <div
                className={
                  !transcriptExpanded && needsCollapse && transcriptDraft
                    ? 'relative max-h-[7.5rem] overflow-hidden'
                    : undefined
                }
              >
                <Textarea
                  placeholder="Paste your lecture transcript here..."
                  value={transcriptDraft}
                  onChange={(e) => {
                    setTranscriptDraft(e.target.value);
                  }}
                  className="min-h-[120px] resize-none font-mono text-xs leading-relaxed"
                  rows={transcriptExpanded || !needsCollapse ? 12 : 5}
                />

                {/* Fade gradient when collapsed */}
                {!transcriptExpanded && needsCollapse && transcriptDraft && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-background to-transparent" />
                )}
              </div>

              {/* Show more / Show less toggle */}
              {needsCollapse && transcriptDraft && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setTranscriptExpanded((prev) => !prev)}
                  className="mt-1 h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                >
                  {transcriptExpanded ? (
                    <>
                      <ChevronUp className="size-3" />
                      Show less
                    </>
                  ) : (
                    <>
                      <ChevronDown className="size-3" />
                      Show more
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Word count and auto-format row */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                {transcriptDraft ? (
                  <p className="text-xs text-muted-foreground">
                    {wordCount.toLocaleString()} words
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">No transcript</p>
                )}

                {/* Long transcript warning */}
                {isLongTranscript && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
                  >
                    <AlertTriangle className="size-3" />
                    Long transcript — generation may take longer and cost more
                  </motion.p>
                )}
              </div>

              {/* Auto-format button */}
              {transcriptDraft && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleAutoFormat}
                      className="h-7 gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Wand2 className="size-3" />
                      Clean up
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    Remove timestamps, speaker labels, and markers
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>
          <SheetFooter>
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={handleSaveTranscript}>
              {transcriptDraft ? 'Save Transcript' : 'Clear Transcript'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
