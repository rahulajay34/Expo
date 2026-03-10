'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, FileText, ClipboardList, Hash } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAppStore } from '@/lib/store';

type ContentType = 'lecture' | 'pre-read' | 'assignment';

const TABS: { value: ContentType; label: string; icon: React.ReactNode; tooltip: string }[] = [
  { value: 'lecture', label: 'Lecture', icon: <BookOpen className="size-4" />, tooltip: 'Detailed lecture content with examples and key takeaways' },
  { value: 'pre-read', label: 'Pre-Read', icon: <FileText className="size-4" />, tooltip: 'Introductory material to build foundational awareness' },
  { value: 'assignment', label: 'Assignment', icon: <ClipboardList className="size-4" />, tooltip: 'Assessment questions with multiple choice and subjective types' },
];

export function ContentTabs() {
  const contentType = useAppStore((s) => s.contentType);
  const setContentType = useAppStore((s) => s.setContentType);
  const mcscCount = useAppStore((s) => s.mcscCount);
  const mcmcCount = useAppStore((s) => s.mcmcCount);
  const subjectiveCount = useAppStore((s) => s.subjectiveCount);
  const setMcscCount = useAppStore((s) => s.setMcscCount);
  const setMcmcCount = useAppStore((s) => s.setMcmcCount);
  const setSubjectiveCount = useAppStore((s) => s.setSubjectiveCount);
  const isGenerating = useAppStore((s) => s.isGenerating);

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.05 }}
      className="space-y-3"
    >
      <Tabs
        value={contentType}
        onValueChange={(v) => setContentType(v as ContentType)}
      >
        <TabsList variant="line" className="w-full justify-start">
          {TABS.map((tab) => (
            <Tooltip key={tab.value}>
              <TooltipTrigger asChild>
                <TabsTrigger
                  value={tab.value}
                  disabled={isGenerating}
                  className="gap-2"
                >
                  {tab.icon}
                  {tab.label}
                </TabsTrigger>
              </TooltipTrigger>
              <TooltipContent>{tab.tooltip}</TooltipContent>
            </Tooltip>
          ))}
        </TabsList>
      </Tabs>

      <AnimatePresence mode="wait">
        {contentType === 'assignment' && (
          <motion.div
            key="assignment-counts"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-4 rounded-lg border border-border/50 bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <Hash className="size-3.5 text-muted-foreground" />
                <Label htmlFor="mcsc-count" className="text-xs whitespace-nowrap">
                  MCSC
                </Label>
                <Input
                  id="mcsc-count"
                  type="number"
                  min={0}
                  max={20}
                  value={mcscCount}
                  onChange={(e) => setMcscCount(parseInt(e.target.value) || 0)}
                  disabled={isGenerating}
                  className="h-7 w-16 text-center text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <Hash className="size-3.5 text-muted-foreground" />
                <Label htmlFor="mcmc-count" className="text-xs whitespace-nowrap">
                  MCMC
                </Label>
                <Input
                  id="mcmc-count"
                  type="number"
                  min={0}
                  max={20}
                  value={mcmcCount}
                  onChange={(e) => setMcmcCount(parseInt(e.target.value) || 0)}
                  disabled={isGenerating}
                  className="h-7 w-16 text-center text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <Hash className="size-3.5 text-muted-foreground" />
                <Label htmlFor="subjective-count" className="text-xs whitespace-nowrap">
                  Subjective
                </Label>
                <Input
                  id="subjective-count"
                  type="number"
                  min={0}
                  max={10}
                  value={subjectiveCount}
                  onChange={(e) => setSubjectiveCount(parseInt(e.target.value) || 0)}
                  disabled={isGenerating}
                  className="h-7 w-16 text-center text-xs"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
