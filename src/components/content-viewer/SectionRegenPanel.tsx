'use client';

import { useState, useCallback } from 'react';
import { streamCompletion } from '@/lib/ai/client';
import { buildSectionRegenMessages } from '@/lib/ai/prompts';
import { updateContent } from '@/lib/storage';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { ContentType } from '@/lib/types';

interface SectionRegenPanelProps {
  id: string;
  markdown: string;
  contentType: ContentType;
  regenSection: { heading: string; level: number };
  onClose: () => void;
  onMarkdownUpdate: (newMarkdown: string) => void;
}

export function SectionRegenPanel({
  id,
  markdown,
  contentType,
  regenSection,
  onClose,
  onMarkdownUpdate,
}: SectionRegenPanelProps) {
  const [regenInstructions, setRegenInstructions] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const { showToast } = useToast();

  const executeSectionRegen = useCallback(async () => {
    setIsRegenerating(true);

    try {
      // Find section boundaries in markdown
      const lines = markdown.split('\n');
      const headingPrefix = '#'.repeat(regenSection.level) + ' ';
      let sectionStart = -1;
      let sectionEnd = lines.length;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (sectionStart === -1) {
          // Find the heading line
          if (line.startsWith(headingPrefix) && line.slice(headingPrefix.length).trim() === regenSection.heading.trim()) {
            sectionStart = i;
          }
        } else {
          // Find the end: next heading of same or higher level
          const match = line.match(/^(#{1,6})\s/);
          if (match && match[1].length <= regenSection.level) {
            sectionEnd = i;
            break;
          }
        }
      }

      if (sectionStart === -1) {
        showToast('Could not find section in content', 'error');
        return;
      }

      const sectionContent = lines.slice(sectionStart + 1, sectionEnd).join('\n').trim();
      const messages = buildSectionRegenMessages(
        markdown,
        regenSection.heading,
        sectionContent,
        contentType,
        regenInstructions.trim() || undefined,
      );

      let newContent = '';
      await streamCompletion('minimax', messages, (chunk) => {
        newContent += chunk.delta;
      });

      // Splice new content back
      const newLines = [
        ...lines.slice(0, sectionStart + 1), // everything up to and including the heading
        '',
        newContent.trim(),
        '',
        ...lines.slice(sectionEnd), // everything after the section
      ];
      const newMarkdown = newLines.join('\n');
      onMarkdownUpdate(newMarkdown);

      // Auto-save
      updateContent(id, { markdown: newMarkdown });
      showToast('Section regenerated', 'success');
    } catch (err) {
      showToast(`Regeneration failed: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    } finally {
      setIsRegenerating(false);
      onClose();
    }
  }, [regenSection, regenInstructions, markdown, contentType, id, showToast, onClose, onMarkdownUpdate]);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Regenerate: ${regenSection.heading}`}
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-primary mb-1.5">
            Instructions (optional)
          </label>
          <textarea
            value={regenInstructions}
            onChange={(e) => setRegenInstructions(e.target.value)}
            placeholder="e.g., Add more examples, make shorter, include a code snippet..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-text-primary placeholder:text-text-secondary resize-none focus:outline-none focus:ring-2 focus:ring-accent"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isRegenerating}>
            Cancel
          </Button>
          <Button onClick={executeSectionRegen} disabled={isRegenerating}>
            {isRegenerating ? 'Regenerating...' : 'Regenerate'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
