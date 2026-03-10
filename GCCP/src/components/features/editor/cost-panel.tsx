'use client';

import { useState } from 'react';
import { DollarSign, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AnimatedNumber } from '@/components/ui/animated-number';
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAppStore } from '@/lib/store';
import type { AgentName } from '@/lib/types';

/** Canonical display order of the 7 pipeline agents. */
const AGENT_ORDER: AgentName[] = [
  'CourseDetector',
  'Analyzer',
  'Creator',
  'Sanitizer',
  'Reviewer',
  'Refiner',
  'Formatter',
];

/** Human-friendly labels for each agent. */
const AGENT_LABELS: Record<AgentName, string> = {
  CourseDetector: 'Course Detector',
  Analyzer: 'Analyzer',
  Creator: 'Creator',
  Sanitizer: 'Sanitizer',
  Reviewer: 'Reviewer',
  Refiner: 'Refiner',
  Formatter: 'Formatter',
};

/** Format a token count with comma separators (e.g. 1,234). */
function formatTokens(n: number): string {
  return n.toLocaleString('en-US');
}

/** Format a cost value to 6 decimal places (e.g. $0.000123). */
function formatCost(n: number): string {
  return `$${n.toFixed(6)}`;
}

export function CostPanel() {
  const [open, setOpen] = useState(false);
  const costDetails = useAppStore((s) => s.costDetails);
  const isGenerating = useAppStore((s) => s.isGenerating);

  // Only render when generation has completed and there are per-agent entries
  const hasData =
    !isGenerating &&
    costDetails.totalCost > 0 &&
    Object.keys(costDetails.perAgent).length > 0;

  if (!hasData) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="card-lift overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        {/* Header trigger -- always visible */}
        <Button
          variant="ghost"
          onClick={() => setOpen((prev) => !prev)}
          className="flex h-auto w-full items-center justify-between rounded-none px-4 py-3 hover:bg-muted/50"
        >
          <div className="flex items-center gap-2">
            <DollarSign className="size-4 text-emerald-500" />
            <span className="text-sm font-medium">Cost Breakdown</span>
            <AnimatedNumber
              value={costDetails.totalCost}
              format={(n) => `$${n.toFixed(6)}`}
              duration={0.8}
              className="text-xs tabular-nums text-muted-foreground"
            />
          </div>
          <ChevronDown
            className={`size-4 text-muted-foreground transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </Button>

        {/* Collapsible body */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <CardContent className="border-t px-2 pt-2 pb-3">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs">Agent</TableHead>
                      <TableHead className="text-right text-xs">
                        Input Tokens
                      </TableHead>
                      <TableHead className="text-right text-xs">
                        Output Tokens
                      </TableHead>
                      <TableHead className="text-right text-xs">
                        Cost ($)
                      </TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {AGENT_ORDER.map((agent) => {
                      const entry = costDetails.perAgent[agent];
                      if (!entry) return null;
                      return (
                        <TableRow
                          key={agent}
                          className="hover:bg-muted/30"
                        >
                          <TableCell className="text-xs text-muted-foreground">
                            {AGENT_LABELS[agent]}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {formatTokens(entry.inputTokens)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {formatTokens(entry.outputTokens)}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {formatCost(entry.cost)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>

                  <TableFooter>
                    <TableRow className="font-medium">
                      <TableCell className="text-xs">Total</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        <AnimatedNumber
                          value={costDetails.totalInputTokens}
                          format={(n) => Math.round(n).toLocaleString('en-US')}
                          duration={0.8}
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        <AnimatedNumber
                          value={costDetails.totalOutputTokens}
                          format={(n) => Math.round(n).toLocaleString('en-US')}
                          duration={0.8}
                        />
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        <AnimatedNumber
                          value={costDetails.totalCost}
                          format={(n) => `$${n.toFixed(6)}`}
                          duration={0.8}
                        />
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}
