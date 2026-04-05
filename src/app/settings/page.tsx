'use client';

import { useState, useEffect, useRef } from 'react';
import { getStorageStats, shouldWarnStorage, clearAllContent, getAllContent, importContent } from '@/lib/storage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { useTheme, ACCENT_PRESETS, FONT_OPTIONS, type AccentColorId, type FontFamilyId } from '@/lib/theme-context';
import { CustomSelect } from '@/components/CustomSelect';
import { getAllTemplates, saveTemplate, updateTemplate, deleteTemplate, type PromptTemplate } from '@/lib/prompt-templates';
import { motion, useReducedMotion } from 'framer-motion';
import { springTab, staggerContainer, fadeInUp } from '@/lib/motion';

type Theme = 'light' | 'dark' | 'system';

const THEME_OPTIONS: { value: Theme; label: string; icon: React.ReactNode }[] = [
  {
    value: 'light',
    label: 'Light',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    ),
  },
  {
    value: 'dark',
    label: 'Dark',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    ),
  },
  {
    value: 'system',
    label: 'System',
    icon: (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
];

const ABOUT_ITEMS: { label: string; value: string; icon: React.ReactNode }[] = [
  {
    label: 'Application',
    value: 'New-S13n',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    label: 'Version',
    value: '0.1.0',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </svg>
    ),
  },
  {
    label: 'AI Model',
    value: 'Advanced LLM',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a4 4 0 0 1 4-4z" />
        <path d="M5 10h14a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2z" />
        <line x1="8" y1="15" x2="8" y2="20" />
        <line x1="16" y1="15" x2="16" y2="20" />
      </svg>
    ),
  },
  {
    label: 'Stack',
    value: 'Next.js 14 + Tailwind + TS',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    label: 'Storage',
    value: 'Browser localStorage',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <ellipse cx="12" cy="5" rx="9" ry="3" />
        <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
        <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      </svg>
    ),
  },
  {
    label: 'Thinking',
    value: 'Extended enabled',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
];

export default function SettingsPage() {
  const [showClearModal, setShowClearModal] = useState(false);
  const [stats, setStats] = useState({ usedBytes: 0, maxBytes: 5 * 1024 * 1024, itemCount: 0 });
  const [warnStorage, setWarnStorage] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<string | null>(null);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateContent, setNewTemplateContent] = useState('');
  const [showNewTemplate, setShowNewTemplate] = useState(false);
  const { theme, setTheme, accentColor, setAccentColor, fontFamily, setFontFamily } = useTheme();
  const { showToast } = useToast();
  const prefersReducedMotion = useReducedMotion();

  const refreshStats = () => {
    setStats(getStorageStats());
    setWarnStorage(shouldWarnStorage());
  };

  useEffect(() => {
    setMounted(true);
    refreshStats();
    setTemplates(getAllTemplates());

    const handleFocus = () => refreshStats();
    window.addEventListener('focus', handleFocus);
    const handleStorage = () => refreshStats();
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleClearStorage = () => {
    clearAllContent();
    const fresh = getStorageStats();
    setStats(fresh);
    setWarnStorage(false);
    setShowClearModal(false);
  };

  const importInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = () => {
    const items = getAllContent();
    const backup = { version: 1, exportedAt: new Date().toISOString(), items };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `news13n-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      document.body.appendChild(a);
      a.click();
    } finally {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    showToast(`Backup downloaded (${items.length} item${items.length !== 1 ? 's' : ''})`, 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        const items: import('@/lib/types').ContentItem[] = Array.isArray(parsed)
          ? parsed
          : (parsed.items && Array.isArray(parsed.items) ? parsed.items : null);
        if (!items) throw new Error('Invalid backup file');
        const { imported, skipped } = importContent(items);
        refreshStats();
        showToast(`Imported ${imported} item${imported !== 1 ? 's' : ''}${skipped > 0 ? ` (${skipped} skipped)` : ''}`, 'success');
      } catch {
        showToast('Invalid backup file', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const usedMB = (stats.usedBytes / (1024 * 1024)).toFixed(2);
  const maxMB = (stats.maxBytes / (1024 * 1024)).toFixed(0);
  const usagePercent = Math.min((stats.usedBytes / stats.maxBytes) * 100, 100);

  const storageBarColor =
    usagePercent > 80
      ? 'from-danger/80 to-danger'
      : usagePercent > 50
        ? 'from-warning/80 to-warning'
        : 'from-accent/80 to-accent';

  if (!mounted) {
    return (
      <div className="h-full flex flex-col">
        <header className="flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4 border-b border-border bg-background shrink-0">
          <div>
            <Skeleton className="h-9 w-32 mb-2" />
            <Skeleton className="h-4 w-56" />
          </div>
        </header>
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
            <Card className="p-6 space-y-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-8 w-full" />
            </Card>
            <Card className="p-6 space-y-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-full rounded-full" />
            </Card>
            <Card className="p-6 space-y-3">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-20 w-full" />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="h-full flex flex-col"
      variants={prefersReducedMotion ? undefined : staggerContainer}
      initial={prefersReducedMotion ? undefined : 'hidden'}
      animate={prefersReducedMotion ? undefined : 'visible'}
    >
      <motion.header
        className="flex items-center justify-between px-4 sm:px-8 py-4 sm:py-6 border-b border-border bg-background shrink-0"
        variants={prefersReducedMotion ? undefined : fadeInUp}
      >
        <div>
          <h1 className="text-[36px] font-bold tracking-[-0.02em] leading-[1.1] text-text-primary">Settings</h1>
          <p className="text-base font-normal text-text-secondary mt-1">Appearance, storage, and application info</p>
        </div>
      </motion.header>

      <motion.div className="flex-1 overflow-auto" variants={prefersReducedMotion ? undefined : fadeInUp}>
        <div className="max-w-2xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">

          {/* ─── Appearance ─── */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
              <h2 className="type-section-label">Appearance</h2>
            </div>
            <p className="text-xs text-text-secondary mb-5">Choose how the app looks across all your devices.</p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <span className="text-sm text-text-primary font-medium">Theme</span>
              <div className="flex bg-sidebar rounded-full p-1 gap-0.5 flex-wrap sm:flex-nowrap dark:bg-[rgba(0,0,0,0.25)] dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.3)]">
                {THEME_OPTIONS.map(({ value, label, icon }) => (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`
                      relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium
                      transition-colors duration-200 ease-out
                      ${theme === value
                        ? 'text-white'
                        : 'text-text-secondary hover:text-text-primary'
                      }
                    `}
                  >
                    {theme === value && (
                      <motion.span
                        layoutId="themeToggle"
                        className="absolute inset-0 rounded-full bg-accent shadow-sm"
                        transition={springTab}
                      />
                    )}
                    <span className="relative z-10 flex items-center gap-1.5">
                      {icon}
                      {label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border mt-5 pt-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
                <span className="text-sm text-text-primary font-medium">Accent Color</span>
                <div className="flex items-center gap-2">
                  {ACCENT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setAccentColor(preset.id)}
                      className="relative w-7 h-7 rounded-full border-2 transition-all hover:scale-110"
                      style={{
                        backgroundColor: preset.light,
                        borderColor: accentColor === preset.id ? 'var(--text-primary)' : 'transparent',
                      }}
                      title={preset.label}
                    >
                      {accentColor === preset.id && (
                        <svg className="absolute inset-0 m-auto" width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 7.5l2.5 2.5L11 4.5" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* ─── Typography ─── */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <polyline points="4 7 4 4 20 4 20 7" />
                <line x1="9" y1="20" x2="15" y2="20" />
                <line x1="12" y1="4" x2="12" y2="20" />
              </svg>
              <h2 className="type-section-label">Typography</h2>
            </div>
            <p className="text-xs text-text-secondary mb-5">Choose the font family used across the app.</p>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0">
              <span className="text-sm text-text-primary font-medium">Font Family</span>
              <CustomSelect
                value={fontFamily}
                onChange={(v) => setFontFamily(v as FontFamilyId)}
                className="w-[220px]"
                options={FONT_OPTIONS.map((font) => ({
                  value: font.id,
                  label: `${font.label}${font.isSerif ? ' (serif)' : ''}${font.isDefault ? ' (default)' : ''}`,
                  preview: (
                    <span style={{ fontFamily: font.family }}>
                      {font.label}{font.isSerif ? ' (serif)' : ''}{font.isDefault ? ' (default)' : ''}
                    </span>
                  ),
                }))}
              />
            </div>

            {/* Preview */}
            <div className="mt-4 p-3 border border-border rounded-md bg-sidebar">
              <p className="text-sm text-text-primary" style={{ fontFamily: 'var(--font-custom)' }}>
                The quick brown fox jumps over the lazy dog. 0123456789
              </p>
              <p className="text-xs text-text-secondary mt-1" style={{ fontFamily: 'var(--font-custom)' }}>
                This is how your content will look with the selected font.
              </p>
            </div>
          </Card>

          {/* ─── Prompt Templates ─── */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
                <h2 className="type-section-label">Prompt Templates</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowNewTemplate(true); setNewTemplateName(''); setNewTemplateContent(''); }}
              >
                + Add
              </Button>
            </div>
            <p className="text-xs text-text-secondary mb-4">Reusable instructions that guide how AI generates your content.</p>

            {showNewTemplate && (
              <div className="mb-4 p-3 border border-accent/30 rounded-md bg-accent/5 space-y-2">
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  placeholder="Template name"
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background text-text-primary"
                  autoFocus
                />
                <textarea
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  placeholder="e.g., Always use Indian English spellings. Target undergraduate CS students. Include real-world examples from Indian tech companies."
                  rows={3}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background text-text-primary placeholder:text-text-secondary resize-none"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowNewTemplate(false)}>Cancel</Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (!newTemplateName.trim() || !newTemplateContent.trim()) return;
                      saveTemplate({ name: newTemplateName.trim(), content: newTemplateContent.trim() });
                      setTemplates(getAllTemplates());
                      setShowNewTemplate(false);
                    }}
                    disabled={!newTemplateName.trim() || !newTemplateContent.trim()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            )}

            {templates.length === 0 && !showNewTemplate && (
              <p className="text-xs text-text-secondary italic">No templates yet. Add one to use it during content generation.</p>
            )}

            <div className="space-y-2">
              {templates.map((t) => (
                <div key={t.id} className="p-3 border border-border rounded-md bg-sidebar">
                  {editingTemplate === t.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        defaultValue={t.name}
                        onBlur={(e) => {
                          updateTemplate(t.id, { name: e.target.value.trim() || t.name });
                          setTemplates(getAllTemplates());
                        }}
                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-text-primary"
                      />
                      <textarea
                        defaultValue={t.content}
                        onBlur={(e) => {
                          updateTemplate(t.id, { content: e.target.value.trim() || t.content });
                          setTemplates(getAllTemplates());
                        }}
                        rows={3}
                        className="w-full px-2 py-1 text-sm border border-border rounded bg-background text-text-primary resize-none"
                      />
                      <Button variant="ghost" size="sm" onClick={() => setEditingTemplate(null)}>Done</Button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-text-primary">{t.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingTemplate(t.id)}
                            className="p-1 rounded hover:bg-background text-text-secondary hover:text-text-primary transition-colors"
                            title="Edit"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => { deleteTemplate(t.id); setTemplates(getAllTemplates()); }}
                            className="p-1 rounded hover:bg-background text-text-secondary hover:text-danger transition-colors"
                            title="Delete"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-text-secondary mt-1 line-clamp-2">{t.content}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* ─── AI Model ─── */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <path d="M12 2a4 4 0 0 1 4 4v1a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V6a4 4 0 0 1 4-4z" />
                <path d="M5 10h14a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1a2 2 0 0 1 2-2z" />
                <line x1="8" y1="15" x2="8" y2="20" />
                <line x1="16" y1="15" x2="16" y2="20" />
              </svg>
              <h2 className="type-section-label">AI Model</h2>
            </div>
            <p className="text-xs text-text-secondary mb-5">Content is generated using an advanced AI model with extended thinking.</p>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center shrink-0">
                <span className="text-accent text-base font-bold">AI</span>
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary">Advanced LLM</div>
                <div className="text-xs text-text-secondary">Extended thinking enabled &middot; API key managed via environment</div>
              </div>
              <span className="ml-auto text-xs text-success font-medium flex items-center gap-1.5 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-success" />
                Active
              </span>
            </div>
          </Card>

          {/* ─── Storage ─── */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <ellipse cx="12" cy="5" rx="9" ry="3" />
                <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
              </svg>
              <h2 className="type-section-label">Storage</h2>
            </div>
            <p className="text-xs text-text-secondary mb-5">
              Content is stored in your browser&apos;s localStorage (~5 MB limit).
            </p>

            {/* Usage meter */}
            <div className="bg-sidebar rounded-lg p-4 mb-5">
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-sm text-text-primary font-medium">Storage used</span>
                <div className="text-right">
                  <span className="text-lg font-bold text-text-primary">{usagePercent.toFixed(1)}%</span>
                  <span className="text-xs text-text-secondary ml-2">{usedMB} / {maxMB} MB</span>
                </div>
              </div>

              <div className="w-full bg-border dark:bg-[rgba(255,255,255,0.12)] rounded-full h-3 overflow-hidden">
                <div
                  className={`h-3 rounded-full transition-all duration-500 bg-gradient-to-r ${storageBarColor}`}
                  style={{ width: `${usagePercent}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-text-secondary mt-2">
                <span>{stats.itemCount} item{stats.itemCount !== 1 ? 's' : ''} stored</span>
                <span>{(stats.maxBytes - stats.usedBytes) > 0 ? ((stats.maxBytes - stats.usedBytes) / (1024 * 1024)).toFixed(2) : '0.00'} MB remaining</span>
              </div>
            </div>

            {warnStorage && (
              <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-md mb-5">
                <span className="text-warning text-sm">&#9888;</span>
                <p className="text-xs text-warning">
                  Storage is getting full. Consider deleting old content or exporting important items first.
                </p>
              </div>
            )}

            {/* Backup / Restore */}
            <div className="flex items-center gap-3 mb-5">
              <Button variant="secondary" size="sm" onClick={handleBackup} disabled={stats.itemCount === 0}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Backup
              </Button>
              <Button variant="secondary" size="sm" onClick={() => importInputRef.current?.click()}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Restore
              </Button>
              <span className="text-xs text-text-secondary">Export or import all content as JSON</span>
            </div>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={handleImport}
            />

            {/* Danger zone */}
            <div className="border-t border-border pt-4">
              <Button variant="danger" size="sm" onClick={() => setShowClearModal(true)} disabled={stats.itemCount === 0}>
                Clear All Content
              </Button>
              <p className="text-xs text-text-secondary mt-1.5">
                This will permanently delete all {stats.itemCount} saved item{stats.itemCount !== 1 ? 's' : ''}.
              </p>
            </div>
          </Card>

          {/* ─── About ─── */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-1">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <h2 className="type-section-label">About</h2>
            </div>
            <p className="text-xs text-text-secondary mb-5">Application details and environment info.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ABOUT_ITEMS.map(({ label, value, icon }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 bg-sidebar rounded-lg p-3"
                >
                  <div className="w-8 h-8 bg-accent/10 rounded-md flex items-center justify-center shrink-0 text-accent">
                    {icon}
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] text-text-secondary leading-tight">{label}</div>
                    <div className="text-xs font-medium text-text-primary leading-tight mt-0.5 truncate">{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </motion.div>

      <Modal isOpen={showClearModal} onClose={() => setShowClearModal(false)} title="Clear All Content">
        <p className="text-sm text-text-secondary mb-2">
          This will permanently delete all <strong>{stats.itemCount} saved item{stats.itemCount !== 1 ? 's' : ''}</strong>
          {' '}from your browser storage.
        </p>
        <p className="text-xs text-danger mb-6">This cannot be undone. Make sure to export anything you want to keep first.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowClearModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleClearStorage}>Clear All</Button>
        </div>
      </Modal>
    </motion.div>
  );
}
