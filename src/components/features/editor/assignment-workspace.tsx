'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TableIcon,
  LayoutGrid,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
  Pencil,
} from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';

type ViewMode = 'table' | 'card';

interface Question {
  id: string;
  type: 'MCSC' | 'MCMC' | 'Subjective';
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
}

// ---------------------------------------------------------------------------
// Inline editable cell for table view
// ---------------------------------------------------------------------------
function EditableCell({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onChange(draft);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onChange(draft);
            setEditing(false);
          }
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        className="h-7 min-w-[100px] text-xs"
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="group/edit relative w-full cursor-text truncate rounded-sm px-1 py-0.5 text-left text-xs hover:bg-muted/50"
      title={value || 'Click to edit'}
    >
      {value || <span className="text-muted-foreground italic">Empty</span>}
      <Pencil className="absolute right-0.5 top-1/2 size-2.5 -translate-y-1/2 text-muted-foreground/0 transition-colors group-hover/edit:text-muted-foreground/60" />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Inline editable text for card view (supports multiline via textarea)
// ---------------------------------------------------------------------------
function EditableText({
  value,
  onChange,
  multiline = false,
  className = '',
  inputClassName = '',
}: {
  value: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  className?: string;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  // Auto-resize textarea via ref callback
  const textareaRefCallback = useCallback(
    (node: HTMLTextAreaElement | null) => {
      if (node) {
        node.style.height = 'auto';
        node.style.height = `${node.scrollHeight}px`;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [draft],
  );

  const commit = useCallback(() => {
    onChange(draft);
    setEditing(false);
  }, [draft, onChange]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  if (editing) {
    if (multiline) {
      return (
        <Textarea
          ref={textareaRefCallback}
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              cancel();
            }
            // Shift+Enter for newline, Enter alone to commit
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              commit();
            }
          }}
          className={`min-h-[2.5rem] resize-none text-sm ${inputClassName}`}
        />
      );
    }

    return (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit();
          if (e.key === 'Escape') cancel();
        }}
        className={`h-8 text-sm ${inputClassName}`}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className={`group/edit relative cursor-text rounded-sm px-1 py-0.5 text-left transition-colors hover:bg-muted/50 ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-muted-foreground italic">Empty</span>}
      <Pencil className="ml-1.5 inline-block size-3 text-muted-foreground/0 transition-colors group-hover/edit:text-muted-foreground/60" />
    </button>
  );
}

// Column helper created once outside component to avoid impure function call during render
const columnHelper = createColumnHelper<Question>();

// ---------------------------------------------------------------------------
// Table View Component
// ---------------------------------------------------------------------------
function TableView() {
  const questions = useAppStore((s) => s.questions);
  const updateQuestion = useAppStore((s) => s.updateQuestion);
  const addQuestion = useAppStore((s) => s.addQuestion);
  const removeQuestion = useAppStore((s) => s.removeQuestion);
  const showAnswers = useAppStore((s) => s.showAnswers);
  const topic = useAppStore((s) => s.topic);

  const columns = useMemo(() => {
    const cols = [
      columnHelper.accessor('type', {
        header: 'Type',
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={`text-[10px] ${
              row.original.type === 'MCSC'
                ? 'border-blue-500/30 text-blue-600 dark:text-blue-400'
                : row.original.type === 'MCMC'
                  ? 'border-purple-500/30 text-purple-600 dark:text-purple-400'
                  : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {row.original.type}
          </Badge>
        ),
        size: 80,
      }),
      columnHelper.accessor('question', {
        header: 'Question',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.question}
            onChange={(val) =>
              updateQuestion(row.original.id, { question: val })
            }
          />
        ),
        size: 250,
      }),
      columnHelper.accessor('optionA', {
        header: 'Option A',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.optionA}
            onChange={(val) =>
              updateQuestion(row.original.id, { optionA: val })
            }
          />
        ),
        size: 150,
      }),
      columnHelper.accessor('optionB', {
        header: 'Option B',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.optionB}
            onChange={(val) =>
              updateQuestion(row.original.id, { optionB: val })
            }
          />
        ),
        size: 150,
      }),
      columnHelper.accessor('optionC', {
        header: 'Option C',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.optionC}
            onChange={(val) =>
              updateQuestion(row.original.id, { optionC: val })
            }
          />
        ),
        size: 150,
      }),
      columnHelper.accessor('optionD', {
        header: 'Option D',
        cell: ({ row }) => (
          <EditableCell
            value={row.original.optionD}
            onChange={(val) =>
              updateQuestion(row.original.id, { optionD: val })
            }
          />
        ),
        size: 150,
      }),
    ];

    if (showAnswers) {
      cols.push(
        columnHelper.accessor('correctAnswer', {
          header: 'Correct Answer',
          cell: ({ row }) => (
            <EditableCell
              value={row.original.correctAnswer}
              onChange={(val) =>
                updateQuestion(row.original.id, { correctAnswer: val })
              }
            />
          ),
          size: 120,
        })
      );
      cols.push(
        columnHelper.accessor('explanation', {
          header: 'Explanation',
          cell: ({ row }) => (
            <EditableCell
              value={row.original.explanation}
              onChange={(val) =>
                updateQuestion(row.original.id, { explanation: val })
              }
            />
          ),
          size: 200,
        })
      );
    }

    return cols;
  }, [showAnswers, updateQuestion]);

  const table = useReactTable({
    data: questions,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const handleAddRow = () => {
    addQuestion({
      id: crypto.randomUUID(),
      type: 'MCSC',
      question: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correctAnswer: '',
      explanation: '',
    });
  };

  const handleExportCsv = () => {
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

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={handleAddRow} className="gap-1.5">
          <Plus className="size-3.5" />
          Add Row
        </Button>
        <div className="flex-1" />
        <Button
          size="sm"
          variant="outline"
          onClick={handleExportCsv}
          disabled={questions.length === 0}
          className="gap-1.5"
        >
          <Download className="size-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <ScrollArea className="flex-1 rounded-lg border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() }}
                    className="text-xs"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
                <TableHead className="w-10" />
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                  <TableCell>
                    <Button
                      size="icon-xs"
                      variant="ghost"
                      onClick={() => removeQuestion(row.original.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length + 1}
                  className="h-32 text-center text-sm text-muted-foreground"
                >
                  No questions generated yet. Click Generate to create questions.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card View Component
// ---------------------------------------------------------------------------
function CardView() {
  const questions = useAppStore((s) => s.questions);
  const updateQuestion = useAppStore((s) => s.updateQuestion);
  const showAnswers = useAppStore((s) => s.showAnswers);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [explanationOpen, setExplanationOpen] = useState(true);

  const question = questions[currentIndex];

  if (questions.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <LayoutGrid className="size-10 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">
          No questions generated yet.
        </p>
      </div>
    );
  }

  if (!question) return null;

  const correctAnswers = question.correctAnswer.split(',').map((a) => a.trim());
  const options = [
    { label: 'A', key: 'optionA' as const, value: question.optionA },
    { label: 'B', key: 'optionB' as const, value: question.optionB },
    { label: 'C', key: 'optionC' as const, value: question.optionC },
    { label: 'D', key: 'optionD' as const, value: question.optionD },
  ];

  return (
    <div className="flex h-full flex-col items-center gap-4">
      {/* Navigation */}
      <div className="flex w-full items-center justify-between">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setCurrentIndex(Math.max(0, currentIndex - 1))}
          disabled={currentIndex === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="size-4" />
          Previous
        </Button>
        <span className="text-sm text-muted-foreground">
          {currentIndex + 1} of {questions.length}
        </span>
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setCurrentIndex(Math.min(questions.length - 1, currentIndex + 1))
          }
          disabled={currentIndex === questions.length - 1}
          className="gap-1.5"
        >
          Next
          <ChevronRight className="size-4" />
        </Button>
      </div>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.2 }}
          className="w-full max-w-2xl"
        >
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base leading-relaxed">
                  <EditableText
                    value={question.question}
                    onChange={(val) =>
                      updateQuestion(question.id, { question: val })
                    }
                    multiline
                    className="w-full text-base font-semibold leading-relaxed"
                    inputClassName="font-semibold"
                  />
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`shrink-0 ${
                    question.type === 'MCSC'
                      ? 'border-blue-500/30 text-blue-600 dark:text-blue-400'
                      : question.type === 'MCMC'
                        ? 'border-purple-500/30 text-purple-600 dark:text-purple-400'
                        : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {question.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {question.type !== 'Subjective' ? (
                <div className="space-y-2">
                  {options.map((opt, idx) => {
                    const isCorrect = showAnswers && correctAnswers.some(
                      (a) =>
                        a === opt.label ||
                        a === String(idx + 1)
                    );
                    return (
                      <div
                        key={opt.label}
                        className={`flex items-start gap-3 rounded-lg border px-4 py-3 transition-colors ${
                          isCorrect
                            ? 'border-emerald-500/50 bg-emerald-500/5 dark:bg-emerald-500/10'
                            : 'border-border/50'
                        }`}
                      >
                        <span
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                            isCorrect
                              ? 'bg-emerald-500 text-white'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="flex-1 text-sm">
                          <EditableText
                            value={opt.value}
                            onChange={(val) =>
                              updateQuestion(question.id, { [opt.key]: val })
                            }
                            className="w-full"
                          />
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : showAnswers ? (
                <div className="rounded-lg border border-border/50 bg-muted/30 p-4">
                  <p className="text-xs font-medium text-muted-foreground mb-2">
                    Model Answer / Rubric:
                  </p>
                  <EditableText
                    value={question.correctAnswer}
                    onChange={(val) =>
                      updateQuestion(question.id, { correctAnswer: val })
                    }
                    multiline
                    className="w-full text-sm"
                  />
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border/50 bg-muted/10 p-4">
                  <p className="text-sm text-muted-foreground italic">
                    Model answer hidden. Toggle &quot;Show Answers&quot; to reveal.
                  </p>
                </div>
              )}

              {/* Correct answer (editable) -- only for non-Subjective when answers shown */}
              {showAnswers && question.type !== 'Subjective' && (
                <div className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2">
                  <span className="text-xs font-medium text-muted-foreground shrink-0">
                    Correct:
                  </span>
                  <EditableText
                    value={question.correctAnswer}
                    onChange={(val) =>
                      updateQuestion(question.id, { correctAnswer: val })
                    }
                    className="text-xs font-mono"
                  />
                </div>
              )}

              {/* Collapsible explanation -- only when answers shown */}
              {showAnswers && (
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExplanationOpen(!explanationOpen)}
                    className="h-7 w-full justify-between gap-1.5 text-xs"
                  >
                    Explanation
                    <ChevronDown
                      className={`size-3.5 transition-transform ${
                        explanationOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                  <AnimatePresence>
                    {explanationOpen && question.explanation && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="rounded-lg bg-muted/30 p-3">
                          <EditableText
                            value={question.explanation}
                            onChange={(val) =>
                              updateQuestion(question.id, { explanation: val })
                            }
                            multiline
                            className="w-full text-xs leading-relaxed text-muted-foreground"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Assignment Workspace
// ---------------------------------------------------------------------------
export function AssignmentWorkspace() {
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const showAnswers = useAppStore((s) => s.showAnswers);
  const setShowAnswers = useAppStore((s) => s.setShowAnswers);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col gap-3"
    >
      {/* Top bar: view mode tabs + answer key toggle */}
      <div className="flex items-center justify-between gap-4">
        <Tabs
          value={viewMode}
          onValueChange={(v) => setViewMode(v as ViewMode)}
        >
          <TabsList variant="line">
            <TabsTrigger value="table" className="gap-1.5">
              <TableIcon className="size-3.5" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="card" className="gap-1.5">
              <LayoutGrid className="size-3.5" />
              Card View
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Answer key toggle */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={showAnswers ? 'default' : 'outline'}
            onClick={() => setShowAnswers(!showAnswers)}
            className="gap-1.5"
          >
            {showAnswers ? (
              <Eye className="size-3.5" />
            ) : (
              <EyeOff className="size-3.5" />
            )}
            {showAnswers ? 'Teacher View' : 'Student View'}
          </Button>
          <label
            htmlFor="answer-toggle"
            className="hidden text-xs text-muted-foreground sm:block"
          >
            Answers
          </label>
          <Switch
            id="answer-toggle"
            checked={showAnswers}
            onCheckedChange={setShowAnswers}
          />
        </div>
      </div>

      {/* View content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'table' ? (
            <motion.div
              key="table"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <TableView />
            </motion.div>
          ) : (
            <motion.div
              key="card"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-full"
            >
              <CardView />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
