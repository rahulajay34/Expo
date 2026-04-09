'use client';

import { useState, useCallback } from 'react';
import { downloadMarkdown } from '@/lib/export/markdown';
import { downloadPDF } from '@/lib/export/pdf';
import { downloadCSV, parseAssignmentMarkdown } from '@/lib/export/csv';
import { downloadHTML } from '@/lib/export/html';
import { streamCompletion } from '@/lib/ai/client';
import { loadPrompt, fillPrompt } from '@/lib/ai/prompts';
import { useToast } from '@/components/ui/Toast';
import { getContentById } from '@/lib/storage';
import { copyToClipboard, getErrorMessage } from '@/lib/utils';
import { CSVRow } from '@/lib/types';

interface UseExportHandlersParams {
  id: string;
  markdown: string;
  title: string;
  contentType: string;
}

export function useExportHandlers({ id, markdown, title, contentType }: UseExportHandlersParams) {
  const [isExportingCSV, setIsExportingCSV] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [csvExportProgress, setCsvExportProgress] = useState(0);
  const { showToast } = useToast();

  const handleExportMarkdown = useCallback(() => {
    try {
      downloadMarkdown(title || 'content', markdown);
      showToast('Markdown file downloaded', 'success');
    } catch {
      showToast('Failed to download Markdown', 'error');
    }
  }, [title, markdown, showToast]);

  const handleCopyMarkdown = useCallback(async () => {
    try {
      await copyToClipboard(markdown);
      showToast('Markdown copied to clipboard', 'success');
    } catch {
      showToast('Failed to copy to clipboard', 'error');
    }
  }, [markdown, showToast]);

  const handleExportPDF = useCallback(async () => {
    setIsExportingPDF(true);
    try {
      await downloadPDF('markdown-content', title || 'content');
      showToast('PDF exported — check your Downloads folder', 'success');
    } catch {
      showToast('PDF export failed — try again', 'error');
    } finally {
      setIsExportingPDF(false);
    }
  }, [title, showToast]);

  const handleExportCSV = useCallback(() => {
    const rows = parseAssignmentMarkdown(markdown);
    if (rows.length === 0) {
      showToast('No parseable questions found — check that the content uses the structured format', 'info');
      return;
    }
    try {
      downloadCSV(rows, title || 'assignment');
      showToast(`✓ ${rows.length} question${rows.length !== 1 ? 's' : ''} exported to CSV`, 'success');
    } catch {
      showToast('CSV export failed — try again', 'error');
    }
  }, [markdown, title, showToast]);

  const handleExportAICSV = useCallback(async () => {
    const item = getContentById(id);
    if (!item) return;

    showToast('Generating CSV via AI... This may take a few moments.', 'info');

    try {
      const promptTemplate = await loadPrompt('csv_export_prompt.md');
      const content = fillPrompt(promptTemplate, { MARKDOWN_CONTENT: markdown });

      const messages: { role: 'system' | 'user'; content: string }[] = [
        { role: 'system', content: 'You are an expert data parsing assistant.' },
        { role: 'user', content }
      ];

      // Request completion
      let fullResponse = '';
      setCsvExportProgress(0);
      await streamCompletion('minimax', messages, (chunk) => {
        if (chunk.delta) {
          fullResponse += chunk.delta;
          setCsvExportProgress(fullResponse.length);
        }
      });

      // Extract JSON array from LLM response
      let jsonStr = fullResponse.trim();
      const firstBracket = jsonStr.indexOf('[');
      const lastBracket = jsonStr.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
      }

      let rows: unknown[];
      try {
        rows = JSON.parse(jsonStr);
      } catch {
        throw new Error('AI returned malformed JSON — try again or use direct CSV export.');
      }
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('AI produced an empty or invalid CSV array.');
      }

      downloadCSV(rows as CSVRow[], title || 'assignment');
      showToast(`AI CSV exported — ${rows.length} questions exported`, 'success');
    } catch (err: unknown) {
      console.error(err);
      showToast('Failed to export CSV via AI: ' + getErrorMessage(err), 'error');
    }
  }, [id, markdown, title, showToast]);

  const handleExportAICSVWithLoading = useCallback(async () => {
    setIsExportingCSV(true);
    setCsvExportProgress(0);
    try {
      await handleExportAICSV();
    } finally {
      setIsExportingCSV(false);
      setCsvExportProgress(0);
    }
  }, [handleExportAICSV]);

  const handleExportHTML = useCallback(async () => {
    try {
      await downloadHTML(title || 'content');
      showToast('HTML file downloaded', 'success');
    } catch {
      showToast('Failed to download HTML', 'error');
    }
  }, [title, showToast]);

  return {
    handleExportMarkdown,
    handleCopyMarkdown,
    handleExportPDF,
    handleExportCSV,
    handleExportAICSVWithLoading,
    handleExportHTML,
    isExportingCSV,
    isExportingPDF,
    csvExportProgress,
  };
}
