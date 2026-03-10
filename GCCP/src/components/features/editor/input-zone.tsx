'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, List, AlertCircle, Ruler, Globe, FileText, X, Layers } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useAppStore } from '@/lib/store';
import { cn } from '@/lib/utils';

export interface InputZoneValidation {
  /** Returns true if valid, false otherwise. Sets error state internally. */
  validate: () => boolean;
  /** Returns the parsed batch topics (one per line, trimmed, non-empty). */
  getBatchTopics: () => string[];
}

/**
 * Shared ref-style accessor so the Toolbar can trigger validation
 * before starting generation. Uses a stable object whose `.current`
 * property is updated only in effects (never during render).
 */
const validationRef: { current: InputZoneValidation | null } = { current: null };

export function getInputZoneValidation(): InputZoneValidation | null {
  return validationRef.current;
}

export function InputZone() {
  const topic = useAppStore((s) => s.topic);
  const subtopics = useAppStore((s) => s.subtopics);
  const setTopic = useAppStore((s) => s.setTopic);
  const setSubtopics = useAppStore((s) => s.setSubtopics);
  const isGenerating = useAppStore((s) => s.isGenerating);
  const contentLength = useAppStore((s) => s.contentLength);
  const setContentLength = useAppStore((s) => s.setContentLength);
  const outputLanguage = useAppStore((s) => s.outputLanguage);
  const setOutputLanguage = useAppStore((s) => s.setOutputLanguage);
  const transcript = useAppStore((s) => s.transcript);
  const setTranscript = useAppStore((s) => s.setTranscript);
  const batchMode = useAppStore((s) => s.batchMode);
  const setBatchMode = useAppStore((s) => s.setBatchMode);

  // Local state for batch topics textarea (stored as raw text, parsed on generate)
  const [batchTopicsText, setBatchTopicsText] = useState('');

  const batchTopicCount = useMemo(() => {
    if (!batchTopicsText.trim()) return 0;
    return batchTopicsText.split('\n').map((l) => l.trim()).filter(Boolean).length;
  }, [batchTopicsText]);

  const transcriptWordCount = useMemo(() => {
    if (!transcript) return 0;
    return transcript.trim().split(/\s+/).filter(Boolean).length;
  }, [transcript]);

  const [topicError, setTopicError] = useState<string | null>(null);
  const [subtopicsWarning, setSubtopicsWarning] = useState<string | null>(null);

  const validate = useCallback((): boolean => {
    // Read latest values from Zustand store (not from render-time closures)
    const state = useAppStore.getState();
    let valid = true;

    if (state.batchMode) {
      // In batch mode, validate that there is at least one topic in the textarea
      if (!batchTopicsText.trim()) {
        setTopicError('Enter at least one topic (one per line)');
        valid = false;
      } else {
        setTopicError(null);
      }
    } else {
      if (!state.topic.trim()) {
        setTopicError('Topic is required');
        valid = false;
      } else {
        setTopicError(null);
      }
    }

    if (!state.subtopics.trim()) {
      setSubtopicsWarning('No subtopics entered. The AI will decide the structure.');
    } else {
      setSubtopicsWarning(null);
    }

    return valid;
  }, [batchTopicsText]);

  const getBatchTopics = useCallback((): string[] => {
    return batchTopicsText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
  }, [batchTopicsText]);

  // Expose validation to sibling components via a stable ref object (in an effect)
  useEffect(() => {
    validationRef.current = { validate, getBatchTopics };
    return () => {
      validationRef.current = null;
    };
  }, [validate, getBatchTopics]);

  const handleTopicChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTopic(e.target.value);
    // Clear error when user starts typing
    if (topicError && e.target.value.trim()) {
      setTopicError(null);
    }
  };

  const handleSubtopicsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSubtopics(e.target.value);
    // Clear warning when user starts typing
    if (subtopicsWarning && e.target.value.trim()) {
      setSubtopicsWarning(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="card-lift border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            {/* Topic input */}
            <div className="space-y-2">
              <Label htmlFor="topic" className="flex items-center gap-2">
                <BookOpen className="size-4 text-muted-foreground" />
                {batchMode ? 'Topics' : 'Topic'}
                <span className="text-xs text-destructive">*</span>
                {/* Batch mode toggle */}
                <span className="ml-auto flex items-center gap-1.5">
                  <Layers className="size-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Batch</span>
                  <Switch
                    size="sm"
                    checked={batchMode}
                    onCheckedChange={(checked) => {
                      setBatchMode(checked);
                      if (checked) {
                        setTopicError(null);
                      }
                    }}
                    disabled={isGenerating}
                  />
                </span>
              </Label>
              <AnimatePresence mode="wait">
                {batchMode ? (
                  <motion.div
                    key="batch"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Textarea
                      id="topic"
                      placeholder="Enter topics, one per line"
                      value={batchTopicsText}
                      onChange={(e) => {
                        setBatchTopicsText(e.target.value);
                        if (topicError && e.target.value.trim()) {
                          setTopicError(null);
                        }
                      }}
                      disabled={isGenerating}
                      aria-invalid={!!topicError}
                      className={cn(
                        'min-h-[80px] resize-none transition-all duration-200 focus:ring-2',
                        topicError && 'border-destructive ring-destructive/20'
                      )}
                      rows={3}
                    />
                    {batchTopicCount > 0 && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-1 text-xs text-muted-foreground"
                      >
                        {batchTopicCount} topic{batchTopicCount === 1 ? '' : 's'} entered
                      </motion.p>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="single"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Input
                      id="topic"
                      placeholder="e.g., Loops in Python, Market Segmentation"
                      value={topic}
                      onChange={handleTopicChange}
                      disabled={isGenerating}
                      aria-invalid={!!topicError}
                      className={cn(
                        'transition-all duration-200 focus:ring-2',
                        topicError && 'border-destructive ring-destructive/20'
                      )}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {topicError ? (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 text-xs text-destructive"
                >
                  <AlertCircle className="size-3" />
                  {topicError}
                </motion.p>
              ) : !batchMode ? (
                <p className="text-xs text-muted-foreground">
                  e.g., Introduction to Machine Learning
                </p>
              ) : null}
            </div>

            {/* Subtopics textarea */}
            <div className="space-y-2">
              <Label htmlFor="subtopics" className="flex items-center gap-2">
                <List className="size-4 text-muted-foreground" />
                Subtopics
                <span className="text-xs text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="subtopics"
                placeholder="Enter subtopics, one per line"
                value={subtopics}
                onChange={handleSubtopicsChange}
                disabled={isGenerating}
                className={cn(
                  'min-h-[38px] resize-none transition-all duration-200 focus:ring-2',
                  subtopicsWarning && 'border-amber-500/50'
                )}
                rows={2}
              />
              {subtopicsWarning ? (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"
                >
                  <AlertCircle className="size-3" />
                  {subtopicsWarning}
                </motion.p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  e.g., Supervised Learning, Neural Networks, Decision Trees
                </p>
              )}
            </div>
          </div>

          {/* Transcript indicator */}
          {transcript && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 pt-1"
            >
              <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1">
                <FileText className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">
                  Transcript added
                </span>
                <Badge variant="secondary" className="ml-1 h-4 px-1.5 text-[10px]">
                  {transcriptWordCount.toLocaleString()} words
                </Badge>
                <button
                  type="button"
                  onClick={() => setTranscript('')}
                  disabled={isGenerating}
                  className="ml-1 rounded-full p-0.5 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  title="Remove transcript"
                >
                  <X className="size-3" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Content Length & Language row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            {/* Content Length selector */}
            <div className="flex items-center gap-1.5">
              <Ruler className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Length:</span>
              <div className="flex gap-1">
                {([
                  { value: 'brief', label: 'Brief', hint: '~1.5k words' },
                  { value: 'standard', label: 'Standard', hint: '~2.5k words' },
                  { value: 'detailed', label: 'Detailed', hint: '~4k words' },
                  { value: 'comprehensive', label: 'Full', hint: '~6k words' },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setContentLength(opt.value)}
                    title={opt.hint}
                    className={cn(
                      'rounded-md px-2 py-0.5 text-xs font-medium transition-all duration-150',
                      contentLength === opt.value
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                      isGenerating && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language selector */}
            <div className="flex items-center gap-1.5">
              <Globe className="size-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Language:</span>
              <select
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value)}
                disabled={isGenerating}
                className={cn(
                  'h-6 rounded-md border border-border/50 bg-muted/50 px-1.5 text-xs font-medium text-foreground transition-colors',
                  'focus:outline-none focus:ring-1 focus:ring-primary',
                  isGenerating && 'opacity-50 cursor-not-allowed'
                )}
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi</option>
                <option value="Hinglish">Hinglish</option>
                {useAppStore.getState().customLanguages.map((lang) => (
                  <option key={lang} value={lang}>{lang}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
