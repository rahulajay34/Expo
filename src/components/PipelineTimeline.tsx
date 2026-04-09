'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { springSnappy, springBouncy, springGentle, reducedMotionTransition } from '@/lib/motion';

type StageId = 'creator' | 'reviewer' | 'refiner';
type StageStatus = 'pending' | 'active' | 'complete' | 'skipped';

interface PipelineTimelineProps {
  currentStage: 'creator' | 'reviewer' | 'refiner' | 'complete' | null;
  skippedStages?: string[];
  startTime?: number;
}

const STAGES: { id: StageId; label: string }[] = [
  { id: 'creator', label: 'Creator' },
  { id: 'reviewer', label: 'Reviewer' },
  { id: 'refiner', label: 'Refiner' },
];

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/** SVG animated checkmark with stroke-dashoffset reveal */
function AnimatedCheckmark({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <motion.svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={reducedMotion ? reducedMotionTransition : springBouncy}
    >
      <motion.polyline
        points="4 12 10 18 20 6"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={reducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut', delay: 0.05 }}
      />
    </motion.svg>
  );
}

/** Dash icon for skipped stages */
function DashIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="3" strokeLinecap="round">
      <line x1="6" y1="12" x2="18" y2="12" />
    </svg>
  );
}

/** Pulsing ring around the active node */
function PulsingRing({ reducedMotion }: { reducedMotion: boolean }) {
  if (reducedMotion) return null;
  return (
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{
        border: '2px solid var(--accent)',
        opacity: 0,
      }}
      animate={{
        scale: [1, 1.6, 1.8],
        opacity: [0.5, 0.15, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeOut',
      }}
    />
  );
}

function StageNode({
  status,
  reducedMotion,
}: {
  status: StageStatus;
  reducedMotion: boolean;
}) {
  const size = 28;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Pulsing ring for active state */}
      {status === 'active' && <PulsingRing reducedMotion={reducedMotion} />}

      {/* Node circle */}
      <motion.div
        className="rounded-full flex items-center justify-center border-2"
        style={{ width: size, height: size }}
        initial={false}
        animate={{
          borderColor:
            status === 'active' || status === 'complete' ? 'var(--accent)' : 'var(--border)',
          backgroundColor:
            status === 'complete' ? 'var(--accent)' : 'transparent',
          opacity: status === 'pending' ? 0.4 : status === 'skipped' ? 0.5 : 1,
          boxShadow:
            status === 'active' ? '0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent)' : '0 0 0 0px transparent',
        }}
        transition={reducedMotion ? reducedMotionTransition : springSnappy}
      >
        <AnimatePresence mode="wait">
          {status === 'complete' && (
            <motion.div key="check" className="flex items-center justify-center">
              <AnimatedCheckmark reducedMotion={reducedMotion} />
            </motion.div>
          )}
          {status === 'active' && (
            <motion.div
              key="dot"
              className="rounded-full"
              style={{
                width: 8,
                height: 8,
                backgroundColor: 'var(--accent)',
              }}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              transition={reducedMotion ? reducedMotionTransition : { type: 'spring', stiffness: 400, damping: 15 }}
            />
          )}
          {status === 'skipped' && (
            <motion.div
              key="dash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={reducedMotion ? reducedMotionTransition : { duration: 0.2 }}
            >
              <DashIcon />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

function ConnectorLine({
  filled,
  reducedMotion,
}: {
  filled: boolean;
  reducedMotion: boolean;
}) {
  return (
    <div className="relative flex-1 mx-1.5 sm:mx-2" style={{ height: 2, minWidth: 24 }}>
      {/* Background line */}
      <div
        className="absolute inset-0 rounded-full"
        style={{ backgroundColor: 'var(--border)' }}
      />
      {/* Fill line */}
      <motion.div
        className="absolute inset-0 rounded-full origin-left"
        style={{ backgroundColor: 'var(--accent)' }}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: filled ? 1 : 0 }}
        transition={reducedMotion ? reducedMotionTransition : {
          ...springGentle,
          stiffness: 120,
          damping: 18,
        }}
      />
    </div>
  );
}

function ElapsedTimer({
  startTime,
  active,
  reducedMotion,
}: {
  startTime: number | undefined;
  active: boolean;
  reducedMotion: boolean;
}) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!active || !startTime) {
      setElapsed(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Set initial elapsed
    setElapsed(Math.floor((Date.now() - startTime) / 1000));

    intervalRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [active, startTime]);

  return (
    <AnimatePresence>
      {active && (
        <motion.span
          className="text-[10px] tabular-nums font-medium"
          style={{ color: 'var(--accent)' }}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -2 }}
          transition={reducedMotion ? reducedMotionTransition : springSnappy}
        >
          {formatElapsed(elapsed)}
        </motion.span>
      )}
    </AnimatePresence>
  );
}

export function PipelineTimeline({ currentStage, skippedStages = [], startTime }: PipelineTimelineProps) {
  const reducedMotion = useReducedMotion() ?? false;
  const [visible, setVisible] = useState(true);
  const completedAtRef = useRef<number | null>(null);

  // Derive status for each stage
  const getStatus = useCallback((stageId: StageId): StageStatus => {
    if (skippedStages.includes(stageId)) return 'skipped';

    const stageOrder: StageId[] = ['creator', 'reviewer', 'refiner'];
    const stageIdx = stageOrder.indexOf(stageId);
    const currentIdx = currentStage === 'complete' ? 3 : currentStage ? stageOrder.indexOf(currentStage) : -1;

    if (currentIdx === -1) return 'pending';
    if (stageIdx < currentIdx) return skippedStages.includes(stageId) ? 'skipped' : 'complete';
    if (stageIdx === currentIdx) return currentStage === 'complete' ? 'complete' : 'active';
    return 'pending';
  }, [currentStage, skippedStages]);

  // Handle fade-out after completion
  useEffect(() => {
    if (currentStage === 'complete') {
      if (!completedAtRef.current) {
        completedAtRef.current = Date.now();
      }
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    } else if (currentStage) {
      completedAtRef.current = null;
      setVisible(true);
    }
  }, [currentStage]);

  // Don't render if no stage is active
  if (!currentStage) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="px-4 sm:px-8 py-3 border-b border-border shrink-0 cv-auto"
          style={{ backgroundColor: 'var(--sidebar)' }}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={reducedMotion ? reducedMotionTransition : springGentle}
          aria-label="Pipeline progress"
          role="progressbar"
        >
          <div className="max-w-md mx-auto flex items-center gap-0">
            {STAGES.map((stage, i) => {
              const status = getStatus(stage.id);
              const isActive = status === 'active';
              const isConnectorFilled = (() => {
                // The connector after a stage is filled when that stage is complete or skipped
                const s = getStatus(stage.id);
                return s === 'complete' || s === 'skipped';
              })();

              return (
                <div key={stage.id} className="flex items-center" style={{ flex: i < STAGES.length - 1 ? '1 1 0' : '0 0 auto' }}>
                  {/* Stage column */}
                  <div className="flex flex-col items-center gap-1" style={{ minWidth: 48 }}>
                    <StageNode status={status} reducedMotion={reducedMotion} />
                    <motion.span
                      className="text-[11px] leading-tight text-center"
                      style={{
                        color: isActive || status === 'complete' ? 'var(--accent)' : 'var(--text-secondary)',
                        fontWeight: isActive ? 600 : status === 'complete' ? 500 : 400,
                        textDecoration: status === 'skipped' ? 'line-through' : 'none',
                        opacity: status === 'pending' ? 0.5 : status === 'skipped' ? 0.6 : 1,
                      }}
                      initial={false}
                      animate={{
                        color: isActive || status === 'complete' ? 'var(--accent)' : 'var(--text-secondary)',
                        opacity: status === 'pending' ? 0.5 : status === 'skipped' ? 0.6 : 1,
                      }}
                      transition={reducedMotion ? reducedMotionTransition : springSnappy}
                    >
                      {stage.label}
                    </motion.span>
                    <div style={{ height: 16 }}>
                      <ElapsedTimer
                        startTime={startTime}
                        active={isActive}
                        reducedMotion={reducedMotion}
                      />
                    </div>
                  </div>

                  {/* Connector line */}
                  {i < STAGES.length - 1 && (
                    <div className="flex-1 flex items-center pb-7">
                      <ConnectorLine filled={isConnectorFilled} reducedMotion={reducedMotion} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
