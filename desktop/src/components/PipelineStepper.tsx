import { useState, useEffect, useRef } from 'react';
import type { PipelineStep } from '../types';

interface Props {
  steps: PipelineStep[];
  isGenerating?: boolean;
}

const AGENT_ORDER = [
  'CourseDetector',
  'Analyzer',
  'InstructorQuality',
  'Creator',
  'Sanitizer',
  'Reviewer',
  'Refiner',
  'Formatter',
  'AssignmentSanitizer',
  'MetaQuality',
];

function getStepColor(status: PipelineStep['status']) {
  switch (status) {
    case 'working':
      return 'bg-primary/15 text-primary border-primary/30';
    case 'success':
      return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    case 'error':
      return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
    case 'skipped':
      return 'bg-muted text-muted-foreground border-transparent';
    default:
      return 'bg-muted text-muted-foreground border-transparent';
  }
}

function getStatusIcon(status: PipelineStep['status']) {
  switch (status) {
    case 'working':
      return (
        <span className="inline-block h-3 w-3 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      );
    case 'success':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-green-500">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      );
    case 'error':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      );
    case 'skipped':
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
          <polygon points="5 4 15 12 5 20 5 4" />
          <line x1="19" y1="5" x2="19" y2="19" />
        </svg>
      );
    default:
      return <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />;
  }
}

function ElapsedTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;
  return (
    <span className="text-[11px] tabular-nums text-muted-foreground">
      {mins > 0 ? `${mins}m ${secs}s` : `${secs}s`}
    </span>
  );
}

export function PipelineStepper({ steps, isGenerating = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (steps.length === 1 && steps[0].status === 'working') {
      startTimeRef.current = Date.now();
    }
  }, [steps.length > 0]);

  if (steps.length === 0) return null;

  const completed = steps.filter((s) => s.status === 'success').length;
  const total = Math.max(steps.length, AGENT_ORDER.length);
  const progress = total > 0 ? (completed / total) * 100 : 0;
  const hasWorking = steps.some((s) => s.status === 'working');

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <h3 className="text-sm font-semibold text-foreground whitespace-nowrap">Pipeline</h3>

          {/* Compact pill badges */}
          <div className="flex items-center gap-1 overflow-hidden">
            {steps.slice(-4).map((step, i) => (
              <span
                key={`${step.agent}-${i}`}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${getStepColor(step.status)}`}
              >
                {getStatusIcon(step.status)}
                <span className="truncate max-w-[80px]">{step.agent}</span>
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasWorking && <ElapsedTimer startTime={startTimeRef.current} />}
          <span className="text-[11px] text-muted-foreground">
            {completed}/{total}
          </span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-muted-foreground transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-muted">
        <div
          className={`h-full transition-all duration-500 ease-out ${
            hasWorking ? 'bg-primary' : progress === 100 ? 'bg-green-500' : 'bg-primary'
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Expanded detail view */}
      {expanded && (
        <div className="px-4 py-3 flex flex-col gap-1.5 animate-fade-in">
          {steps.map((step, i) => (
            <div
              key={`${step.agent}-${i}`}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                step.status === 'working'
                  ? 'bg-primary/5'
                  : step.status === 'error'
                  ? 'bg-red-500/5'
                  : ''
              }`}
            >
              <span className="flex-shrink-0 w-4 flex items-center justify-center">
                {getStatusIcon(step.status)}
              </span>
              <span className={`font-medium ${
                step.status === 'working' ? 'text-primary' :
                step.status === 'success' ? 'text-foreground' :
                step.status === 'error' ? 'text-red-600 dark:text-red-400' :
                'text-muted-foreground'
              }`}>
                {step.agent}
              </span>
              {step.message && (
                <span className="flex-1 truncate text-xs text-muted-foreground">
                  {step.message}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
