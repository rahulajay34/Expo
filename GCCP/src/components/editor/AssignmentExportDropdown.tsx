import { useState, useRef, useEffect } from 'react';
import { FileDown, ChevronDown, Loader2, Check, AlertCircle } from 'lucide-react';
import { AssignmentItem } from '@/types/assignment';

interface AssignmentExportDropdownProps {
  questions: AssignmentItem[];
  showAnswers: boolean;
  disabled?: boolean;
}

type AssignmentExportFormat = 'csv' | 'pdf' | 'docx' | 'markdown';

interface FormatOption {
  format: AssignmentExportFormat;
  label: string;
  description: string;
  icon: string;
  serverRequired?: boolean;
}

const FORMATS: FormatOption[] = [
  { format: 'csv', label: 'CSV', description: 'Spreadsheet import', icon: '📊' },
  { format: 'markdown', label: 'Markdown', description: 'Plain text .md', icon: '📝' },
  { format: 'pdf', label: 'PDF', description: 'Print-ready document', icon: '📄', serverRequired: true },
  { format: 'docx', label: 'Word', description: 'Microsoft Word', icon: '📘', serverRequired: true },
];

/**
 * Generate markdown from assignment questions
 */
function generateMarkdown(questions: AssignmentItem[], showAnswers: boolean): string {
  const lines: string[] = ['# Assignment Questions', ''];

  // Group by type
  const mcsc = questions.filter(q => q.questionType === 'mcsc');
  const mcmc = questions.filter(q => q.questionType === 'mcmc');
  const subjective = questions.filter(q => q.questionType === 'subjective');

  let qNum = 1;

  if (mcsc.length > 0) {
    lines.push('## Multiple Choice (Single Correct)', '');
    for (const q of mcsc) {
      lines.push(`**${qNum}.** ${q.contentBody}`, '');
      ['1', '2', '3', '4'].forEach((key, i) => {
        const optText = q.options[key as unknown as 1|2|3|4] || '';
        const letter = String.fromCharCode(65 + i);
        lines.push(`   ${letter}. ${optText}`);
      });
      lines.push('');
      if (showAnswers) {
        const correctLetter = q.mcscAnswer ? String.fromCharCode(64 + q.mcscAnswer) : '?';
        lines.push(`> **Answer:** ${correctLetter}`);
        if (q.answerExplanation) {
          lines.push(`> **Explanation:** ${q.answerExplanation}`);
        }
        lines.push('');
      }
      qNum++;
    }
  }

  if (mcmc.length > 0) {
    lines.push('## Multiple Choice (Multiple Correct)', '');
    for (const q of mcmc) {
      lines.push(`**${qNum}.** ${q.contentBody}`, '');
      ['1', '2', '3', '4'].forEach((key, i) => {
        const optText = q.options[key as unknown as 1|2|3|4] || '';
        const letter = String.fromCharCode(65 + i);
        lines.push(`   ${letter}. ${optText}`);
      });
      lines.push('');
      if (showAnswers && q.mcmcAnswer) {
        const letters = q.mcmcAnswer.split(',').map(n => String.fromCharCode(64 + parseInt(n.trim()))).join(', ');
        lines.push(`> **Answers:** ${letters}`);
        if (q.answerExplanation) {
          lines.push(`> **Explanation:** ${q.answerExplanation}`);
        }
        lines.push('');
      }
      qNum++;
    }
  }

  if (subjective.length > 0) {
    lines.push('## Subjective Questions', '');
    for (const q of subjective) {
      lines.push(`**${qNum}.** ${q.contentBody}`, '');
      if (showAnswers && q.subjectiveAnswer) {
        lines.push('**Model Answer:**', '', q.subjectiveAnswer, '');
      }
      qNum++;
    }
  }

  return lines.join('\n');
}

/**
 * Generate CSV from assignment questions
 */
function generateCSV(questions: AssignmentItem[]): string {
  const headers = ['Type', 'Question', 'Option1', 'Option2', 'Option3', 'Option4', 'Answer', 'Explanation'];
  const rows = questions.map(q => {
    const answer = q.questionType === 'mcsc' 
      ? (q.mcscAnswer?.toString() || '') 
      : q.questionType === 'mcmc' 
      ? (q.mcmcAnswer || '') 
      : (q.subjectiveAnswer || '');
    return [
      q.questionType,
      q.contentBody.replace(/"/g, '""'),
      (q.options[1] || '').replace(/"/g, '""'),
      (q.options[2] || '').replace(/"/g, '""'),
      (q.options[3] || '').replace(/"/g, '""'),
      (q.options[4] || '').replace(/"/g, '""'),
      answer.replace(/"/g, '""'),
      (q.answerExplanation || '').replace(/"/g, '""')
    ].map(v => `"${v}"`).join(',');
  });
  return [headers.join(','), ...rows].join('\n');
}

export function AssignmentExportDropdown({ questions, showAnswers, disabled }: AssignmentExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check server availability
  useEffect(() => {
    fetch('/api/export')
      .then(res => res.json())
      .then(data => setServerAvailable(data.pandocInstalled))
      .catch(() => setServerAvailable(false));
  }, []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset status
  useEffect(() => {
    if (exportStatus !== 'idle') {
      const timer = setTimeout(() => {
        setExportStatus('idle');
        setErrorMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [exportStatus]);

  const handleExport = async (format: AssignmentExportFormat) => {
    if (questions.length === 0 || isExporting) return;
    
    setIsExporting(true);
    setIsOpen(false);
    setErrorMessage(null);

    try {
      if (format === 'csv') {
        const csv = generateCSV(questions);
        downloadFile(csv, 'assignment.csv', 'text/csv');
        setExportStatus('success');
      } else if (format === 'markdown') {
        const md = generateMarkdown(questions, showAnswers);
        downloadFile(md, `assignment${showAnswers ? '_with_answers' : ''}.md`, 'text/markdown');
        setExportStatus('success');
      } else {
        // Server conversion for PDF/DOCX
        const markdown = generateMarkdown(questions, showAnswers);
        const response = await fetch('/api/export', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            content: markdown, 
            format, 
            title: `Assignment${showAnswers ? ' (With Answers)' : ''}` 
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Export failed');
        }

        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `assignment${showAnswers ? '_with_answers' : ''}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setExportStatus('success');
      }
    } catch (error: any) {
      console.error('Assignment export error:', error);
      setExportStatus('error');
      setErrorMessage(error.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || isExporting || questions.length === 0}
        className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-150 transform-gpu active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
          ${exportStatus === 'success' 
            ? 'text-green-700 bg-green-50 border-green-200' 
            : exportStatus === 'error'
            ? 'text-red-700 bg-red-50 border-red-200'
            : 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'}`}
      >
        {isExporting ? (
          <Loader2 size={14} className="animate-spin" />
        ) : exportStatus === 'success' ? (
          <Check size={14} />
        ) : exportStatus === 'error' ? (
          <AlertCircle size={14} />
        ) : (
          <FileDown size={14} />
        )}
        {isExporting ? 'Exporting...' : exportStatus === 'success' ? 'Downloaded!' : 'Export'}
        <ChevronDown size={12} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 right-0 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 animate-in fade-in slide-in-from-top-2">
          <div className="px-3 py-1.5 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Export As</span>
          </div>
          
          {FORMATS.map(opt => {
            const unavailable = opt.serverRequired && !serverAvailable;
            return (
              <button
                key={opt.format}
                onClick={() => handleExport(opt.format)}
                disabled={unavailable}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors
                  ${unavailable ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'hover:bg-emerald-50 cursor-pointer'}`}
              >
                <span className="text-lg">{opt.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500">
                    {unavailable ? 'Pandoc required' : opt.description}
                  </div>
                </div>
              </button>
            );
          })}

          <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-500">
            {showAnswers ? '✓ Includes answers' : '○ Without answers'}
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="absolute z-50 mt-1 right-0 w-56 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
          {errorMessage}
        </div>
      )}
    </div>
  );
}
