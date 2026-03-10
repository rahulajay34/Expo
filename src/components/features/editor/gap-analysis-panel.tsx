'use client';

import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  GraduationCap,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAppStore } from '@/lib/store';

function QualityBar({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium tabular-nums">{value}/10</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(value / 10) * 100}%` }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className={`absolute inset-y-0 left-0 rounded-full ${color}`}
        />
      </div>
    </div>
  );
}

export function GapAnalysisPanel() {
  const gapAnalysis = useAppStore((s) => s.gapAnalysis);
  const instructorQuality = useAppStore((s) => s.instructorQuality);
  const gapAnalysisExpanded = useAppStore((s) => s.gapAnalysisExpanded);
  const setGapAnalysisExpanded = useAppStore((s) => s.setGapAnalysisExpanded);

  if (!gapAnalysis && !instructorQuality) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="card-lift overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          {/* Header - always visible */}
          <Button
            variant="ghost"
            onClick={() => setGapAnalysisExpanded(!gapAnalysisExpanded)}
            className="flex h-auto w-full items-center justify-between rounded-none px-4 py-3 hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <TrendingUp className="size-4 text-purple-500" />
              <span className="text-sm font-medium">Transcript Analysis</span>
              {gapAnalysis && (
                <div className="flex items-center gap-1.5">
                  <Badge className="h-4 bg-emerald-500/10 px-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                    {gapAnalysis.covered.length} covered
                  </Badge>
                  {gapAnalysis.partial.length > 0 && (
                    <Badge className="h-4 bg-amber-500/10 px-1.5 text-[10px] text-amber-600 dark:text-amber-400">
                      {gapAnalysis.partial.length} partial
                    </Badge>
                  )}
                  {gapAnalysis.missing.length > 0 && (
                    <Badge className="h-4 bg-destructive/10 px-1.5 text-[10px] text-destructive">
                      {gapAnalysis.missing.length} missing
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <ChevronDown
              className={`size-4 text-muted-foreground transition-transform duration-200 ${
                gapAnalysisExpanded ? 'rotate-180' : ''
              }`}
            />
          </Button>

          {/* Content */}
          <AnimatePresence>
            {gapAnalysisExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <CardContent className="space-y-4 border-t pt-4">
                  {/* Gap Analysis Lists */}
                  {gapAnalysis && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {/* Covered */}
                      <div className="space-y-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-500/10">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="size-3.5 text-emerald-500" />
                          <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                            Covered
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {gapAnalysis.covered.length > 0 ? (
                            gapAnalysis.covered.map((topic, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-xs text-foreground/80"
                              >
                                <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-emerald-500" />
                                {topic}
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-muted-foreground italic">
                              None
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Partial */}
                      <div className="space-y-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 dark:bg-amber-500/10">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="size-3.5 text-amber-500" />
                          <span className="text-xs font-medium text-amber-700 dark:text-amber-400">
                            Partial
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {gapAnalysis.partial.length > 0 ? (
                            gapAnalysis.partial.map((topic, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-xs text-foreground/80"
                              >
                                <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-500" />
                                {topic}
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-muted-foreground italic">
                              None
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Missing */}
                      <div className="space-y-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3 dark:bg-destructive/10">
                        <div className="flex items-center gap-1.5">
                          <XCircle className="size-3.5 text-destructive" />
                          <span className="text-xs font-medium text-destructive dark:text-red-400">
                            Missing
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {gapAnalysis.missing.length > 0 ? (
                            gapAnalysis.missing.map((topic, i) => (
                              <li
                                key={i}
                                className="flex items-start gap-1.5 text-xs text-foreground/80"
                              >
                                <XCircle className="mt-0.5 size-3 shrink-0 text-destructive" />
                                {topic}
                              </li>
                            ))
                          ) : (
                            <li className="text-xs text-muted-foreground italic">
                              None
                            </li>
                          )}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Instructor Quality */}
                  {instructorQuality && (
                    <div className="space-y-3 rounded-lg border border-purple-500/20 bg-purple-500/5 p-4 dark:bg-purple-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <GraduationCap className="size-4 text-purple-500" />
                          <span className="text-sm font-medium">
                            Instructor Quality
                          </span>
                        </div>
                        <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                          {instructorQuality.overall}/10 Overall
                        </Badge>
                      </div>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <QualityBar
                          label="Clarity"
                          value={instructorQuality.clarity}
                          color="bg-blue-500"
                        />
                        <QualityBar
                          label="Examples"
                          value={instructorQuality.examples}
                          color="bg-emerald-500"
                        />
                        <QualityBar
                          label="Depth"
                          value={instructorQuality.depth}
                          color="bg-amber-500"
                        />
                        <QualityBar
                          label="Engagement"
                          value={instructorQuality.engagement}
                          color="bg-rose-500"
                        />
                      </div>

                      {instructorQuality.summary && (
                        <p className="text-xs leading-relaxed text-muted-foreground">
                          {instructorQuality.summary}
                        </p>
                      )}

                      {instructorQuality.suggestions &&
                        instructorQuality.suggestions.length > 0 && (
                          <div className="space-y-1">
                            <span className="text-xs font-medium text-muted-foreground">
                              Suggestions:
                            </span>
                            <ul className="space-y-0.5">
                              {instructorQuality.suggestions.map((s, i) => (
                                <li
                                  key={i}
                                  className="text-xs text-muted-foreground"
                                >
                                  - {s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                    </div>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
