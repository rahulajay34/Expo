'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, XCircle, X, ArrowLeft, Zap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { usePipeline } from '@/lib/hooks/use-pipeline';

type Severity = 'error' | 'warning';

function getSeverity(error: string): Severity {
  const lower = error.toLowerCase();
  if (
    lower.includes('mismatch') ||
    lower.includes('unrelated') ||
    lower.includes('warning')
  ) {
    return 'warning';
  }
  return 'error';
}

function isRetryable(error: string): boolean {
  const lower = error.toLowerCase();
  return (
    lower.includes('generation failed') ||
    lower.includes('network') ||
    lower.includes('timeout') ||
    lower.includes('rate limit') ||
    lower.includes('server error') ||
    lower.includes('500') ||
    lower.includes('503') ||
    lower.includes('fetch')
  );
}

export function ErrorBanner() {
  const error = useAppStore((s) => s.error);
  const setError = useAppStore((s) => s.setError);
  const setTranscript = useAppStore((s) => s.setTranscript);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const [dismissed, setDismissed] = useState(false);

  const { startGeneration } = usePipeline();

  const isMismatch =
    error?.toLowerCase().includes('mismatch') ||
    error?.toLowerCase().includes('unrelated');

  const severity = error ? getSeverity(error) : 'error';
  const retryable = error ? isRetryable(error) : false;

  const handleGenerateWithout = () => {
    setTranscript('');
    setError(null);
    setDismissed(false);
  };

  const handleGoBack = () => {
    setError(null);
    setDismissed(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleRetry = () => {
    setError(null);
    setDismissed(false);
    startGeneration();
  };

  // Reset dismissed state when a new error arrives
  const displayError = error && !dismissed;

  const SeverityIcon = severity === 'warning' ? AlertTriangle : XCircle;
  const borderColor =
    severity === 'warning'
      ? 'border-amber-500/30 dark:border-amber-500/20'
      : 'border-destructive/30 dark:border-destructive/20';
  const bgColor =
    severity === 'warning'
      ? 'bg-amber-500/5 dark:bg-amber-500/10'
      : 'bg-destructive/5 dark:bg-destructive/10';
  const iconColor =
    severity === 'warning'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-destructive';
  const textColor =
    severity === 'warning'
      ? 'text-amber-700 dark:text-amber-300'
      : 'text-destructive';

  return (
    <AnimatePresence>
      {displayError && (
        <motion.div
          initial={{ opacity: 0, y: -8, height: 0 }}
          animate={{ opacity: 1, y: 0, height: 'auto' }}
          exit={{ opacity: 0, y: -8, height: 0 }}
          transition={{ duration: 0.25 }}
          className="overflow-hidden"
        >
          <div
            className={`flex items-start gap-3 rounded-lg border px-4 py-3 ${borderColor} ${bgColor}`}
          >
            <SeverityIcon className={`mt-0.5 size-4 shrink-0 ${iconColor}`} />
            <div className="flex-1 space-y-2">
              <p className={`text-sm font-medium ${textColor}`}>{error}</p>
              <div className="flex flex-wrap gap-2">
                {isMismatch && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGenerateWithout}
                      className="h-7 gap-1.5 text-xs"
                    >
                      <Zap className="size-3" />
                      Generate without transcript
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleGoBack}
                      className="h-7 gap-1.5 text-xs"
                    >
                      <ArrowLeft className="size-3" />
                      Go back
                    </Button>
                  </>
                )}
                {retryable && !isGenerating && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetry}
                    className="h-7 gap-1.5 text-xs"
                  >
                    <RotateCcw className="size-3" />
                    Retry
                  </Button>
                )}
              </div>
            </div>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={handleDismiss}
              className={`shrink-0 ${iconColor} opacity-70 hover:opacity-100`}
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
