'use client';

import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import { motion } from 'framer-motion';
import { InputZone } from './input-zone';
import { ContentTabs } from './content-tabs';
import { Toolbar } from './toolbar';
import { ErrorBanner } from './error-banner';
import { DraftBanner } from './draft-banner';
import { GapAnalysisPanel } from './gap-analysis-panel';
import { ContentArea } from './content-area';
import { FocusModeOverlay } from './focus-mode';
import { CostPanel } from './cost-panel';
import { QualityScore } from './quality-score';
import { ApiKeyBanner } from './api-key-banner';
import { PipelineStepper } from '@/components/features/pipeline/pipeline-stepper';
import { useAppStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import { useTemporaryTitle } from '@/lib/hooks/use-notifications';
import { useFaviconBadge } from '@/lib/hooks/use-favicon-badge';
import { useAutoSave } from '@/lib/hooks/use-auto-save';

// ---------------------------------------------------------------------------
// Skeleton placeholder shown during initial client hydration
// ---------------------------------------------------------------------------

function EditorWorkspaceSkeleton() {
  return (
    <div className="flex h-full flex-col gap-4 p-4 md:p-6">
      {/* Input Zone skeleton — two input-shaped bars in a 2-column grid */}
      <Card className="border-border/50 bg-card/80">
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-[4.5rem] w-full rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content Tabs skeleton — tab bar */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b pb-2">
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-24 rounded-md" />
          <Skeleton className="h-8 w-28 rounded-md" />
        </div>
      </div>

      {/* Toolbar skeleton */}
      <div className="flex items-center gap-2">
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-9 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      {/* Content area skeleton — multiple text-line placeholders */}
      <div className="flex-1 rounded-lg border-2 border-border/50 bg-card p-4">
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[95%]" />
          <Skeleton className="h-4 w-[88%]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[72%]" />
          <Skeleton className="h-4 w-[90%]" />
          <Skeleton className="h-4 w-[60%]" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-[85%]" />
          <Skeleton className="h-4 w-[78%]" />
        </div>
      </div>
    </div>
  );
}

export function EditorWorkspace() {
  const isGenerating = useAppStore((s) => s.isGenerating);
  const steps = useAppStore((s) => s.steps);
  const error = useAppStore((s) => s.error);
  const content = useAppStore((s) => s.content);
  const activeGenerationId = useAppStore((s) => s.activeGenerationId);
  const setTemporaryTitle = useTemporaryTitle();
  const faviconBadge = useFaviconBadge();

  // Auto-save editor state to localStorage every 10 seconds
  useAutoSave();

  // Track previous generating state to detect transitions
  const prevGeneratingRef = useRef(false);
  const prevErrorRef = useRef<string | null>(null);

  useEffect(() => {
    const wasGenerating = prevGeneratingRef.current;
    const prevError = prevErrorRef.current;

    if (isGenerating) {
      // Generation started or still running
      document.title = 'Generating... | GCCP';
      faviconBadge.showGenerating();
    } else if (wasGenerating && !isGenerating) {
      // Generation just finished
      const currentError = useAppStore.getState().error;
      if (currentError) {
        setTemporaryTitle('Error | GCCP', 5000);
        faviconBadge.showError(5000);
      } else {
        setTemporaryTitle('Ready! | GCCP', 5000);
        faviconBadge.showComplete(5000);
      }
    } else if (error && error !== prevError && !isGenerating) {
      // Error set outside of generation flow
      setTemporaryTitle('Error | GCCP', 5000);
      faviconBadge.showError(5000);
    }

    prevGeneratingRef.current = isGenerating;
    prevErrorRef.current = error;
  }, [isGenerating, error, setTemporaryTitle, faviconBadge]);

  // Warn when navigating away with unsaved content
  const handleBeforeUnload = useCallback(
    (e: BeforeUnloadEvent) => {
      // Content exists but hasn't been saved to archives yet
      if (content && activeGenerationId === null) {
        e.preventDefault();
      }
    },
    [content, activeGenerationId]
  );

  useEffect(() => {
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [handleBeforeUnload]);

  // Hydration guard — show skeleton on server / first client render
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  if (!hydrated) {
    return <EditorWorkspaceSkeleton />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex h-full flex-col gap-4 p-4 md:p-6"
    >
      {/* API Key Warning */}
      <div className="api-key-banner">
        <ApiKeyBanner />
      </div>

      {/* Draft Restore Banner */}
      <DraftBanner />

      {/* Input Zone */}
      <div className="input-zone">
        <InputZone />
      </div>

      {/* Content Type Tabs */}
      <div className="content-tabs">
        <ContentTabs />
      </div>

      {/* Toolbar */}
      <div className="editor-toolbar">
        <Toolbar />
      </div>

      {/* Error Banner */}
      <div className="error-banner">
        <ErrorBanner />
      </div>

      {/* Pipeline Stepper - shown when generating or when steps exist */}
      {(isGenerating || steps.length > 0) && (
        <div className="pipeline-stepper">
          <PipelineStepper />
        </div>
      )}

      {/* Gap Analysis Panel */}
      <div className="gap-analysis-panel">
        <GapAnalysisPanel />
      </div>

      {/* Main Content Area */}
      <div className="flex-1">
        <ContentArea />
      </div>

      {/* Focus Mode Overlay — fullscreen zen mode for the content area */}
      <FocusModeOverlay>
        <ContentArea />
      </FocusModeOverlay>

      {/* Quality Score — shown after generation completes */}
      <div className="quality-score">
        <QualityScore />
      </div>

      {/* Per-Agent Cost Breakdown */}
      <div className="cost-panel">
        <CostPanel />
      </div>
    </motion.div>
  );
}
